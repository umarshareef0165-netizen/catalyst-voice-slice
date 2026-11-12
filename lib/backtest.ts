/**
 * Backtest — an honest out-of-sample check of the yield trend model.
 *
 * Method: fit the same linear trend (lib/yield.ts `fitTrend`, most recent
 * 25 seasons) on the series EXCLUDING the last `holdoutYears` seasons,
 * then forecast each held-out year from that single pre-holdout fit and
 * compare against the real observed yield. Two simple baselines are
 * scored the same way so the trend's skill is visible, not just claimed:
 *   - naive: predict the last pre-holdout observed yield every year;
 *   - 5-year average: predict the mean of the last 5 pre-holdout years.
 * All errors are computed on REAL observed yields from the FAO/OWID
 * Pakistan series (1961–2024) shipped in data/yield-series.json. Nothing
 * here is a claim about future accuracy — it is what the model WOULD
 * have scored on 2020–2024 had it been fitted in 2019.
 */
import { fitTrend, getSeries, type YieldCrop, type YieldPoint } from "./yield";

export interface BacktestPrediction {
  year: number;
  actual: number;
  trend: number;
}

export interface BacktestResult {
  crop: YieldCrop;
  /** Years held out (the most recent seasons). */
  holdoutYears: number[];
  /** Last year the fit was allowed to see. */
  fitThroughYear: number;
  predictions: BacktestPrediction[];
  trendMae: number;
  trendRmse: number;
  naiveMae: number;
  avg5Mae: number;
  method: string;
}

const METHOD =
  "Trend fitted on the series excluding the last 5 seasons, forecast for each held-out year, scored against the real observed yield. Baselines: naive (last observed value) and 5-year average.";

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/** Backtest a raw series. Pure — the fixture in the test proves the maths. */
export function backtestSeries(
  series: YieldPoint[],
  crop: YieldCrop,
  holdoutYears = 5,
): BacktestResult {
  const sorted = [...series].sort((a, b) => a.year - b.year);
  if (sorted.length < 10 + holdoutYears) {
    throw new Error("Not enough yield data to backtest.");
  }
  const train = sorted.slice(0, sorted.length - holdoutYears);
  const holdout = sorted.slice(sorted.length - holdoutYears);
  const fit = fitTrend(train);
  const lastObserved = train[train.length - 1].yield_t_ha;
  const avg5 =
    train.slice(-5).reduce((s, p) => s + p.yield_t_ha, 0) / 5;
  const predictions: BacktestPrediction[] = holdout.map((p) => ({
    year: p.year,
    actual: p.yield_t_ha,
    trend: round3(fit.intercept + fit.slope * p.year),
  }));
  const errors = predictions.map((p) => p.trend - p.actual);
  const trendMae = errors.reduce((s, e) => s + Math.abs(e), 0) / errors.length;
  const trendRmse = Math.sqrt(
    errors.reduce((s, e) => s + e * e, 0) / errors.length,
  );
  const naiveMae =
    holdout.reduce((s, p) => s + Math.abs(lastObserved - p.yield_t_ha), 0) /
    holdout.length;
  const avg5Mae =
    holdout.reduce((s, p) => s + Math.abs(avg5 - p.yield_t_ha), 0) /
    holdout.length;
  return {
    crop,
    holdoutYears: holdout.map((p) => p.year),
    fitThroughYear: train[train.length - 1].year,
    predictions,
    trendMae: round3(trendMae),
    trendRmse: round3(trendRmse),
    naiveMae: round3(naiveMae),
    avg5Mae: round3(avg5Mae),
    method: METHOD,
  };
}

/** Backtest one crop from the shipped FAO/OWID series. */
export function backtestCrop(crop: YieldCrop, holdoutYears = 5): BacktestResult {
  return backtestSeries(getSeries(crop), crop, holdoutYears);
}
