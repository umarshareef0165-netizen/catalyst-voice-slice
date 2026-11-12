import { UPSTREAM_TIMEOUT_MS } from "./timeout";

/**
 * Live weather via Open-Meteo (free, no key).
 * https://open-meteo.com/en/docs — daily forecast, Asia/Karachi timezone.
 *
 * NOTE: Open-Meteo enforces a daily request limit per egress IP. From the
 * build VM the shared proxy IP is already over its limit, so live calls can
 * fail there with HTTP 429 "Daily API request limit exceeded". The app must
 * handle that honestly (weather marked unavailable) — it never invents
 * weather. On Vercel the egress IP is different and the same code works.
 */

export interface DayForecast {
  date: string; // YYYY-MM-DD
  tMaxC: number | null;
  tMinC: number | null;
  precipMm: number | null;
  precipProbPct: number | null;
  humidityPct: number | null;
  windKmh: number | null;
  et0Mm: number | null;
}

export interface ForecastResult {
  source: "Open-Meteo";
  sourceUrl: string;
  latitude: number;
  longitude: number;
  timezone: "Asia/Karachi";
  days: DayForecast[];
}

export class WeatherError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "WeatherError";
    this.status = status;
  }
}

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export function buildForecastUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "precipitation_probability_max",
      "relative_humidity_2m_mean",
      "wind_speed_10m_max",
      "et0_fao_evapotranspiration",
    ].join(","),
    timezone: "Asia/Karachi",
    forecast_days: "7",
  });
  return `${OPEN_METEO_URL}?${params.toString()}`;
}

/** Parse an Open-Meteo daily-forecast JSON body into typed days. Pure. */
export function parseForecast(json: unknown, lat: number, lon: number): ForecastResult {
  const body = json as {
    daily?: Record<string, Array<number | null>>;
    error?: boolean;
    reason?: string;
  };
  if (body?.error) {
    throw new WeatherError(`Open-Meteo error: ${body.reason ?? "unknown"}`);
  }
  const daily = body?.daily;
  const dates = daily?.time as unknown as string[] | undefined;
  if (!daily || !Array.isArray(dates) || dates.length === 0) {
    throw new WeatherError("Open-Meteo returned no daily forecast.");
  }
  const pick = (key: string, i: number): number | null => {
    const arr = daily[key];
    if (!Array.isArray(arr)) return null;
    const v = arr[i];
    return typeof v === "number" ? v : null;
  };
  const days: DayForecast[] = dates.map((date, i) => ({
    date,
    tMaxC: pick("temperature_2m_max", i),
    tMinC: pick("temperature_2m_min", i),
    precipMm: pick("precipitation_sum", i),
    precipProbPct: pick("precipitation_probability_max", i),
    humidityPct: pick("relative_humidity_2m_mean", i),
    windKmh: pick("wind_speed_10m_max", i),
    et0Mm: pick("et0_fao_evapotranspiration", i),
  }));
  return {
    source: "Open-Meteo",
    sourceUrl: buildForecastUrl(lat, lon),
    latitude: lat,
    longitude: lon,
    timezone: "Asia/Karachi",
    days,
  };
}

/**
 * Fetch the 7-day forecast. The fetch is capped at `timeoutMs` (default
 * 8s — see lib/timeout.ts): a slow Open-Meteo degrades to "weather
 * unavailable" instead of stalling the whole answer.
 */
export async function fetchForecast(
  lat: number,
  lon: number,
  fetchFn: typeof fetch = fetch,
  timeoutMs: number = UPSTREAM_TIMEOUT_MS,
): Promise<ForecastResult> {
  let res: Response;
  try {
    res = await fetchFn(buildForecastUrl(lat, lon), {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    throw new WeatherError(
      `Could not reach Open-Meteo: ${(error as Error).message}`,
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new WeatherError(
        "Open-Meteo daily request limit reached for this server — weather is unavailable right now, try again later.",
        429,
      );
    }
    throw new WeatherError(
      `Open-Meteo returned HTTP ${res.status}: ${text.slice(0, 160)}`,
      res.status,
    );
  }
  return parseForecast(await res.json(), lat, lon);
}

export interface IrrigationAdvice {
  /** "wait" = rain is coming, hold off; "irrigate" = no rain, water now; "watch" = uncertain. */
  action: "wait" | "irrigate" | "watch";
  /** The single best day to irrigate in the next 3 days, or null if waiting. */
  bestDay: string | null;
  rainNext48hMm: number;
  rainDaysNext3: string[];
  hottestDay: { date: string; tMaxC: number } | null;
  /** ET0-based water need for the forecast window (see waterNeed). */
  water: WaterNeed;
  reasonEn: string;
  reasonUr: string;
}

/**
 * Irrigation water need, derived ONLY from the forecast's own numbers.
 *
 * Method: over the forecast window, crop water demand is approximated by
 * the FAO reference evapotranspiration (ET0, mm/day, already fetched from
 * Open-Meteo) and rain supplies part of it. Net need = max(0, sum(ET0) −
 * sum(rain)) in mm. Unit conversions are exact, not estimates: 1 mm over
 * 1 hectare = 10,000 litres; 1 mm over 1 acre = 4,046.86 litres
 * (1 acre = 4,046.86 m² × 0.001 m). This is the REFERENCE (ET0) demand —
 * a real crop's need is ET0 × a crop coefficient, which varies by growth
 * stage and is NOT applied here because no stage-specific coefficient is
 * sourced in this app; the UI labels the figure as reference demand.
 * If any ET0 or rain value is missing, the result is incomplete (nulls),
 * never a guess.
 */
export interface WaterNeed {
  /** Number of forecast days summed. */
  days: number;
  et0SumMm: number | null;
  rainSumMm: number | null;
  /** Net irrigation need in mm (0 when rain covers ET0). Null when incomplete. */
  netMm: number | null;
  litresPerAcre: number | null;
  litresPerHectare: number | null;
  complete: boolean;
  method: string;
}

const WATER_METHOD =
  "Net need = max(0, sum(ET0) − sum(rain)) over the forecast window; 1 mm = 10,000 L/ha = 4,046.86 L/acre. Reference (ET0) demand only — no crop coefficient applied.";

export function waterNeed(days: DayForecast[]): WaterNeed {
  const window = days.slice(0, 7);
  const complete = window.every((d) => d.et0Mm !== null && d.precipMm !== null);
  if (!complete || window.length === 0) {
    return {
      days: window.length,
      et0SumMm: null,
      rainSumMm: null,
      netMm: null,
      litresPerAcre: null,
      litresPerHectare: null,
      complete: false,
      method: WATER_METHOD,
    };
  }
  const et0SumMm = round1(window.reduce((s, d) => s + (d.et0Mm ?? 0), 0));
  const rainSumMm = round1(window.reduce((s, d) => s + (d.precipMm ?? 0), 0));
  const netMm = round1(Math.max(0, et0SumMm - rainSumMm));
  return {
    days: window.length,
    et0SumMm,
    rainSumMm,
    netMm,
    litresPerAcre: Math.round(netMm * 4046.86),
    litresPerHectare: Math.round(netMm * 10000),
    complete: true,
    method: WATER_METHOD,
  };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * Irrigation advice computed ONLY from the forecast numbers.
 * Rules (transparent, shown in the UI):
 * - Rain >= 2 mm expected in the next 48h (or >= 50% probability with >= 1 mm)
 *   -> wait, let the rain do the work.
 * - Otherwise -> irrigate on the coolest of the next 3 mornings, early morning.
 * - If any forecast value is missing -> "watch" (uncertain), never a guess.
 */
export function irrigationAdvice(days: DayForecast[]): IrrigationAdvice {
  const next3 = days.slice(0, 3);
  const next2 = days.slice(0, 2);
  const rainNext48hMm = next2.reduce((s, d) => s + (d.precipMm ?? 0), 0);
  const rainDaysNext3 = next3
    .filter(
      (d) =>
        (d.precipMm ?? 0) >= 2 ||
        ((d.precipProbPct ?? 0) >= 50 && (d.precipMm ?? 0) >= 1),
    )
    .map((d) => d.date);
  const missing = next3.some((d) => d.precipMm === null || d.tMaxC === null);
  let hottestDay: { date: string; tMaxC: number } | null = null;
  for (const d of next3) {
    if (d.tMaxC !== null && (!hottestDay || d.tMaxC > hottestDay.tMaxC)) {
      hottestDay = { date: d.date, tMaxC: d.tMaxC };
    }
  }

  if (missing) {
    return {
      action: "watch",
      bestDay: null,
      rainNext48hMm,
      rainDaysNext3,
      hottestDay,
      water: waterNeed(days),
      reasonEn:
        "Some forecast values are missing, so no firm irrigation call can be made — check again when the forecast is complete.",
      reasonUr:
        "موسم کی کچھ قدریں دستیاب نہیں ہیں، اس لیے پانی کا پکا فیصلہ نہیں ہو سکتا — مکمل پیش گوئی ملنے پر دوبارہ دیکھیں۔",
    };
  }

  if (rainDaysNext3.length > 0) {
    return {
      action: "wait",
      bestDay: null,
      rainNext48hMm,
      rainDaysNext3,
      hottestDay,
      water: waterNeed(days),
      reasonEn: `Rain is expected on ${rainDaysNext3.join(", ")} (${rainNext48hMm.toFixed(1)} mm in the next 48 hours) — hold off irrigation and let the rain work.`,
      reasonUr: `اگلے 48 گھنٹوں میں ${rainNext48hMm.toFixed(1)} ملی میٹر بارش متوقع ہے (${rainDaysNext3.join("، ")}) — پانی روک لیں، بارش اپنا کام کرے گی۔`,
    };
  }

  // Driest/coolest morning in the next 3 days.
  const best = [...next3].sort(
    (a, b) => (a.tMaxC ?? 99) - (b.tMaxC ?? 99),
  )[0];
  return {
    action: "irrigate",
    bestDay: best.date,
    rainNext48hMm,
    rainDaysNext3,
    hottestDay,
    water: waterNeed(days),
    reasonEn: `No rain expected in the next 3 days (0.0 mm forecast) — irrigate on ${best.date} in the early morning, when it is coolest (max ${best.tMaxC}°C that day).`,
    reasonUr: `اگلے 3 دن بارش متوقع نہیں ہے (0.0 ملی میٹر) — ${best.date} کو صبح سویرے پانی دیں، جب موسم سب سے ٹھنڈا ہوگا (اس دن زیادہ سے زیادہ ${best.tMaxC}°C)۔`,
  };
}

/** Today in Asia/Karachi, as YYYY-MM-DD. */
export function todayPk(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Add n days to a YYYY-MM-DD date string. */
export function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00+05:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
