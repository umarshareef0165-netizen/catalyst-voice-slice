/**
 * The ask pipeline — the agent's tool-calling core.
 *
 * 1. Detect intent / crop / district from the question (keyword based).
 * 2. Call the read-only tools in parallel (weather, soil, market, yield).
 *    A failed tool never kills the answer: its status is "unavailable" and
 *    the answer says so instead of inventing data.
 * 3. Build the dated sowing/irrigation plan.
 * 4. Compose the cited answer (Gemini if a key is set, else deterministic
 *    templates — both from the same tool results).
 */
import { detectIntent, type CropKey } from "./intent";
import { findDistrict, type District } from "./districts";
import {
  fetchForecast,
  irrigationAdvice,
  type DayForecast,
} from "./weather";
import {
  fetchSoil,
  soilValue,
  textureClass,
  phInterpretation,
  socInterpretation,
  type SoilResult,
} from "./soil";
import { getMarket, type MarketCrop, type MarketResult } from "./market";
import { forecastYield, YIELD_CROPS, type YieldForecast } from "./yield";
import { estimateRevenue, type RevenueEstimate } from "./revenue";
import {
  answerQuestion,
  type AgentAnswer,
  type AnswerContext,
} from "./agent";
import { buildPlan, type PlanStep } from "./plan";

export interface ToolStatus {
  status: "ok" | "unavailable";
  error?: string;
}

export interface Citation {
  label: string;
  detail: string;
  source: string;
}

export interface AskResult {
  question: string;
  language: "ur" | "roman" | "en";
  district: District;
  crop: CropKey;
  cropNameEn: string;
  cropNameUr: string;
  intents: string[];
  answer: AgentAnswer;
  citations: Citation[];
  plan: PlanStep[];
  /** Gross revenue/ha estimate (yield × dated reference price), when computable. */
  revenue: RevenueEstimate | null;
  tools: {
    weather: ToolStatus & { days?: DayForecast[] };
    soil: ToolStatus & { data?: SoilResult };
    market: ToolStatus & { data?: MarketResult };
    yield: ToolStatus & { data?: YieldForecast };
  };
}

const CROP_NAMES: Record<CropKey, { en: string; ur: string }> = {
  wheat: { en: "Wheat", ur: "گندم" },
  rice: { en: "Rice", ur: "چاول" },
  maize: { en: "Maize", ur: "مکئی" },
  cotton: { en: "Cotton", ur: "کپاس" },
  sugarcane: { en: "Sugarcane", ur: "گنا" },
};

const MARKET_CROPS = new Set(["wheat", "rice", "maize", "cotton"]);

export function buildSoilSummary(soil: SoilResult): string {
  const parts: string[] = [];
  const ph = soilValue(soil, "phh2o");
  const clay = soilValue(soil, "clay");
  const sand = soilValue(soil, "sand");
  const silt = soilValue(soil, "silt");
  const soc = soilValue(soil, "soc");
  const nitrogen = soilValue(soil, "nitrogen");
  const cec = soilValue(soil, "cec");
  const bdod = soilValue(soil, "bdod");
  const texture = textureClass(clay, sand, silt);
  if (ph !== null) parts.push(`pH ${ph.toFixed(1)} (${phInterpretation(ph) ?? ""})`);
  if (texture) parts.push(`texture ${texture} (clay ${clay?.toFixed(0)}%, sand ${sand?.toFixed(0)}%, silt ${silt?.toFixed(0)}%)`);
  if (soc !== null) parts.push(`organic carbon ${soc.toFixed(1)} g/kg (${socInterpretation(soc) ?? ""})`);
  if (nitrogen !== null) parts.push(`total nitrogen ${nitrogen.toFixed(2)} g/kg`);
  if (cec !== null) parts.push(`cation exchange capacity ${cec.toFixed(1)} cmol(c)/kg`);
  if (bdod !== null) parts.push(`bulk density ${bdod.toFixed(2)} g/cm³`);
  if (parts.length === 0) {
    return "SoilGrids returned no values for this point (0–5 cm).";
  }
  return parts.join("; ") + " — depth 0–5 cm, ISRIC SoilGrids (250 m).";
}

export interface AskInput {
  question: string;
  districtSlug?: string;
  cropKey?: CropKey;
  sowingDate?: string;
}

export async function askQuestion(input: AskInput): Promise<AskResult> {
  const question = input.question.trim();
  if (!question) throw new Error("A question is required.");
  const detected = detectIntent(question);
  const district = detected.district ?? findDistrict(input.districtSlug ?? "faisalabad");
  const crop: CropKey = detected.crop ?? input.cropKey ?? "wheat";
  const cropName = CROP_NAMES[crop];

  const needsWeather = !detected.intents.every((i) => i === "price");
  const needsMarket =
    detected.intents.includes("price") ||
    detected.intents.includes("general") ||
    detected.intents.includes("yield");

  const [weatherRes, soilRes] = await Promise.allSettled([
    needsWeather
      ? fetchForecast(district.lat, district.lon)
      : Promise.reject(new Error("not needed")),
    fetchSoil(district.lat, district.lon),
  ]);

  const weatherOk = weatherRes.status === "fulfilled";
  const weatherError =
    weatherRes.status === "rejected"
      ? needsWeather
        ? (weatherRes.reason as Error).message
        : "Weather not needed for a price question."
      : undefined;
  const days = weatherOk ? weatherRes.value.days : undefined;
  const advice = weatherOk && days ? irrigationAdvice(days) : undefined;

  const soilOk = soilRes.status === "fulfilled";
  const soilError =
    soilRes.status === "rejected" ? (soilRes.reason as Error).message : undefined;
  const soilData = soilOk ? soilRes.value : undefined;
  const soilSummary = soilData ? buildSoilSummary(soilData) : undefined;

  let market: MarketResult | null = null;
  let marketError: string | undefined;
  if (needsMarket && MARKET_CROPS.has(crop)) {
    try {
      market = getMarket(crop as MarketCrop, district.slug);
    } catch (error) {
      marketError = (error as Error).message;
    }
  } else if (needsMarket) {
    marketError = `No market reference data for ${cropName.en}.`;
  } else {
    marketError = "Market data not needed for this question.";
  }

  let yieldForecast: YieldForecast | null = null;
  let yieldError: string | undefined;
  if ((YIELD_CROPS as string[]).includes(crop)) {
    try {
      yieldForecast = forecastYield(crop as (typeof YIELD_CROPS)[number]);
    } catch (error) {
      yieldError = (error as Error).message;
    }
  } else {
    yieldError = `The yield model covers wheat, rice and maize only (FAO/OWID series). No forecast for ${cropName.en}.`;
  }

  const plan = buildPlan({
    crop,
    forecastDays: days ?? null,
    sowingDate: input.sowingDate,
  });

  const revenue =
    yieldForecast && market ? estimateRevenue(yieldForecast, market) : null;

  const ctx: AnswerContext = {
    question,
    language: detected.language,
    districtNameEn: district.nameEn,
    districtNameUr: district.nameUr,
    crop,
    cropNameEn: cropName.en,
    cropNameUr: cropName.ur,
    weather: { ok: weatherOk, error: weatherError, days, advice },
    soil: { ok: soilOk, error: soilError, summary: soilSummary },
    market,
    yieldForecast,
    yieldUnavailableReason: yieldError,
    revenue,
    planSteps: plan,
  };
  const answer = await answerQuestion(ctx);

  const citations: Citation[] = [];
  if (weatherOk && days && days[0]) {
    const d0 = days[0];
    citations.push({
      label: "Weather today",
      detail: `Max ${d0.tMaxC ?? "?"}°C, min ${d0.tMinC ?? "?"}°C, rain ${d0.precipMm ?? "?"} mm (${d0.precipProbPct ?? "?"}% chance)`,
      source: "Open-Meteo (live)",
    });
    if (advice) {
      citations.push({
        label: "Irrigation advice",
        detail: advice.reasonEn,
        source: "Open-Meteo 7-day forecast (computed)",
      });
    }
  }
  if (soilOk && soilSummary) {
    citations.push({
      label: "Soil (0–5 cm)",
      detail: soilSummary,
      source: "ISRIC SoilGrids (live)",
    });
  }
  if (market) {
    const price = market.districtPrice ?? market.punjabAverage;
    if (price !== null) {
      citations.push({
        label: `Market price — ${market.nameEn} (REFERENCE)`,
        detail: `Rs. ${price.toLocaleString()} ${market.unit}, published ${market.published}`,
        source: market.source,
      });
    }
  }
  if (yieldForecast) {
    citations.push({
      label: `Yield forecast ${yieldForecast.targetYear}`,
      detail: `${yieldForecast.forecast} t/ha (range ${yieldForecast.bandLow}–${yieldForecast.bandHigh}), in-sample RMSE ${yieldForecast.rmse} t/ha`,
      source: yieldForecast.source,
    });
    citations.push({
      label: `Backtest (held-out ${yieldForecast.backtest.holdoutYears.join("–")})`,
      detail: `Trend MAE ${yieldForecast.backtest.trendMae} t/ha vs naive ${yieldForecast.backtest.naiveMae} t/ha and 5-year average ${yieldForecast.backtest.avg5Mae} t/ha`,
      source: "FAO/OWID Pakistan series (out-of-sample)",
    });
  }
  if (revenue) {
    citations.push({
      label: `Gross revenue estimate (before costs)`,
      detail: `Rs. ${revenue.grossPerHa.toLocaleString()} per hectare (range Rs. ${revenue.bandLowPerHa.toLocaleString()}–${revenue.bandHighPerHa.toLocaleString()}) at the ${revenue.priceUsed} reference price of Rs. ${revenue.pricePer40kg.toLocaleString()} per 40 kg`,
      source: `${revenue.source}, published ${revenue.published}`,
    });
  }
  if (weatherOk && advice?.water.complete && advice.water.netMm !== null) {
    citations.push({
      label: "Irrigation water need (next 7 days)",
      detail: `Net ${advice.water.netMm} mm after rain (ET0 ${advice.water.et0SumMm} mm, rain ${advice.water.rainSumMm} mm) — about ${advice.water.litresPerAcre?.toLocaleString()} litres per acre`,
      source: "Open-Meteo ET0 + rain (computed)",
    });
  }

  return {
    question,
    language: detected.language,
    district,
    crop,
    cropNameEn: cropName.en,
    cropNameUr: cropName.ur,
    intents: detected.intents,
    answer,
    citations,
    plan,
    revenue,
    tools: {
      weather: { status: weatherOk ? "ok" : "unavailable", error: weatherError, days },
      soil: { status: soilOk ? "ok" : "unavailable", error: soilError, data: soilData },
      market: {
        status: market ? "ok" : "unavailable",
        error: marketError,
        data: market ?? undefined,
      },
      yield: {
        status: yieldForecast ? "ok" : "unavailable",
        error: yieldError,
        data: yieldForecast ?? undefined,
      },
    },
  };
}
