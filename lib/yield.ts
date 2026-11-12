/**
 * Yield model — a transparent statistical baseline, fitted on REAL data.
 *
 * Data: Our World in Data (FAO) annual crop yields for Pakistan, 1961–2024
 * (wheat, rice, maize), shipped in data/yield-series.json.
 *
 * Method: ordinary least-squares linear trend of yield on year, fitted at
 * runtime on the MOST RECENT 25 SEASONS of the series (2000–2024). Older
 * seasons reflect farming systems that no longer exist (varieties, inputs,
 * practices), and a full 1961–2024 line under-predicts today's yields for
 * fast-improving crops such as maize. The forecast is the trend value for
 * the target harvest year; the uncertainty band is ±1 residual standard
 * deviation. In-sample RMSE and MAE are computed from the same fit and
 * reported as measured — no accuracy number is claimed beyond what the
 * fit shows.
 *
 * Limits (stated in the UI): national average only. Punjab yields differ
 * from the national average, and no district multiplier is applied because
 * none is published in this dataset. This is a baseline, not a plot-level
 * prediction. Crops without a series (cotton, sugarcane) have no forecast.
 */
import seriesData from "../data/yield-series.json";
import { backtestCrop, type BacktestResult } from "./backtest";

export type YieldCrop = "wheat" | "rice" | "maize";

export interface YieldPoint {
  year: number;
  yield_t_ha: number;
}

export interface TrendFit {
  slope: number; // t/ha per year
  intercept: number;
  rmse: number;
  mae: number;
  n: number;
  firstYear: number;
  lastYear: number;
  residualSd: number;
}

export interface YieldForecast {
  crop: YieldCrop;
  nameEn: string;
  nameUr: string;
  method: string;
  targetYear: number;
  forecast: number; // t/ha
  bandLow: number;
  bandHigh: number;
  rmse: number;
  mae: number;
  lastValue: number;
  lastYear: number;
  avg5: number;
  avg10: number;
  trendPerYear: number;
  seriesLast10: YieldPoint[];
  /** Out-of-sample check: what the same trend would have scored on 2020–2024. */
  backtest: BacktestResult;
  source: string;
}

const CROP_META: Record<YieldCrop, { nameEn: string; nameUr: string }> = {
  wheat: { nameEn: "Wheat", nameUr: "گندم" },
  rice: { nameEn: "Rice", nameUr: "چاول" },
  maize: { nameEn: "Maize", nameUr: "مکئی" },
};

export const YIELD_CROPS: YieldCrop[] = ["wheat", "rice", "maize"];

export function getSeries(crop: YieldCrop): YieldPoint[] {
  const crops = (seriesData as unknown as {
    crops: Record<string, { series: YieldPoint[] }>;
  }).crops;
  return [...(crops[crop]?.series ?? [])].sort((a, b) => a.year - b.year);
}

export function getSeriesSource(): string {
  return (seriesData as unknown as { source: string }).source;
}

/** Least-squares linear fit of yield on year, on the most recent 25 seasons. Pure. */
export function fitTrend(series: YieldPoint[]): TrendFit {
  const window = series.slice(-25);
  const n = window.length;
  if (n < 5) throw new Error("Not enough yield data to fit a trend.");
  const meanX = window.reduce((s, p) => s + p.year, 0) / n;
  const meanY = window.reduce((s, p) => s + p.yield_t_ha, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (const p of window) {
    sxx += (p.year - meanX) ** 2;
    sxy += (p.year - meanX) * (p.yield_t_ha - meanY);
  }
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const residuals = window.map((p) => p.yield_t_ha - (intercept + slope * p.year));
  const rmse = Math.sqrt(
    residuals.reduce((s, r) => s + r * r, 0) / n,
  );
  const mae =
    residuals.reduce((s, r) => s + Math.abs(r), 0) / n;
  const residualSd = Math.sqrt(
    residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, n - 2),
  );
  return {
    slope,
    intercept,
    rmse,
    mae,
    n,
    firstYear: window[0].year,
    lastYear: window[n - 1].year,
    residualSd,
  };
}

function average(series: YieldPoint[], years: number): number {
  const slice = series.slice(-years);
  return slice.reduce((s, p) => s + p.yield_t_ha, 0) / slice.length;
}

/**
 * Forecast the next harvest year. The target year is the year AFTER the
 * last observed year in the series (the next harvest the farmer will reap).
 */
export function forecastYield(crop: YieldCrop): YieldForecast {
  const series = getSeries(crop);
  const fit = fitTrend(series);
  const targetYear = fit.lastYear + 1;
  const forecast = fit.intercept + fit.slope * targetYear;
  const meta = CROP_META[crop];
  return {
    crop,
    nameEn: meta.nameEn,
    nameUr: meta.nameUr,
    method:
      "Linear trend fitted on the most recent 25 seasons of the FAO/OWID Pakistan national yield series (2000–2024). Band = ±1 residual standard deviation. National average only — no district adjustment.",
    targetYear,
    forecast: round2(forecast),
    bandLow: round2(Math.max(0, forecast - fit.residualSd)),
    bandHigh: round2(forecast + fit.residualSd),
    rmse: round3(fit.rmse),
    mae: round3(fit.mae),
    lastValue: series[series.length - 1].yield_t_ha,
    lastYear: fit.lastYear,
    avg5: round2(average(series, 5)),
    avg10: round2(average(series, 10)),
    trendPerYear: round4(fit.slope),
    seriesLast10: series.slice(-10),
    backtest: backtestCrop(crop),
    source: getSeriesSource(),
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}
