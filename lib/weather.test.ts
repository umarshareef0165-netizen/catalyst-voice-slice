import { describe, it, expect } from "vitest";
import {
  parseForecast,
  irrigationAdvice,
  buildForecastUrl,
  type DayForecast,
} from "./weather";

/**
 * Fixture shaped EXACTLY per Open-Meteo's documented daily-forecast schema.
 * This is a TEST FIXTURE (not real weather) — it only proves the parser and
 * the advice logic. Live data is fetched at runtime.
 */
const FIXTURE = {
  latitude: 31.42,
  longitude: 73.08,
  timezone: "Asia/Karachi",
  daily: {
    time: ["2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"],
    temperature_2m_max: [28.5, 29.0, 26.0, 27.5],
    temperature_2m_min: [14.0, 13.5, 12.0, 13.0],
    precipitation_sum: [0, 0, 4.2, 0.5],
    precipitation_probability_max: [5, 10, 80, 20],
    relative_humidity_2m_mean: [55, 52, 70, 60],
    wind_speed_10m_max: [12, 14, 18, 10],
    et0_fao_evapotranspiration: [3.1, 3.2, 2.4, 3.0],
  },
};

describe("parseForecast", () => {
  it("parses the documented Open-Meteo daily schema", () => {
    const f = parseForecast(FIXTURE, 31.42, 73.08);
    expect(f.source).toBe("Open-Meteo");
    expect(f.days).toHaveLength(4);
    expect(f.days[0]).toEqual({
      date: "2026-11-07",
      tMaxC: 28.5,
      tMinC: 14,
      precipMm: 0,
      precipProbPct: 5,
      humidityPct: 55,
      windKmh: 12,
      et0Mm: 3.1,
    });
    expect(f.days[2].precipMm).toBe(4.2);
  });

  it("throws on an Open-Meteo error body", () => {
    expect(() =>
      parseForecast({ error: true, reason: "Daily API request limit exceeded." }, 31.42, 73.08),
    ).toThrow("Daily API request limit exceeded");
  });

  it("throws when no daily data is present", () => {
    expect(() => parseForecast({}, 31.42, 73.08)).toThrow("no daily forecast");
  });

  it("builds a forecast URL with the right parameters", () => {
    const url = buildForecastUrl(31.42, 73.08);
    expect(url).toContain("api.open-meteo.com/v1/forecast");
    expect(url).toContain("latitude=31.42");
    expect(url).toContain("Asia%2FKarachi");
    expect(url).toContain("forecast_days=7");
  });
});

describe("fetchForecast timeout", () => {
  /** A fetch that never resolves unless its abort signal fires. */
  const hangingFetch = (_url: string, opts?: { signal?: AbortSignal }) =>
    new Promise<never>((_resolve, reject) => {
      const signal = opts?.signal;
      if (!signal) return; // never resolves
      if (signal.aborted) reject(signal.reason);
      else
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
    });

  it("degrades fast when Open-Meteo hangs instead of stalling the answer", async () => {
    const { fetchForecast } = await import("./weather");
    const start = Date.now();
    await expect(
      fetchForecast(31.42, 73.08, hangingFetch as typeof fetch, 50),
    ).rejects.toThrow("Open-Meteo");
    expect(Date.now() - start).toBeLessThan(2000);
  });
});

describe("irrigationAdvice", () => {
  const days: DayForecast[] = parseForecast(FIXTURE, 31.42, 73.08).days;

  it("says wait when rain is expected in the next 3 days", () => {
    const a = irrigationAdvice(days);
    expect(a.action).toBe("wait");
    expect(a.rainDaysNext3).toContain("2026-11-09");
    expect(a.rainNext48hMm).toBe(0); // rain is day 3, outside 48h
    expect(a.reasonEn).toContain("2026-11-09");
  });

  it("says irrigate on the coolest dry morning when no rain is coming", () => {
    const dry = days.slice(0, 2);
    const a = irrigationAdvice(dry);
    expect(a.action).toBe("irrigate");
    // 2026-11-07 max 28.5°C is cooler than 2026-11-08 max 29.0°C.
    expect(a.bestDay).toBe("2026-11-07");
    expect(a.rainNext48hMm).toBe(0);
  });

  it("says watch when forecast values are missing", () => {
    const missing: DayForecast[] = [
      { date: "2026-11-07", tMaxC: null, tMinC: null, precipMm: null, precipProbPct: null, humidityPct: null, windKmh: null, et0Mm: null },
    ];
    const a = irrigationAdvice(missing);
    expect(a.action).toBe("watch");
    expect(a.bestDay).toBeNull();
  });
});
