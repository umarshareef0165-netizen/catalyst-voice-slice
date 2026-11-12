/**
 * Crop comparison — all three yield-model crops side by side for one
 * district, so a farmer can compare what to sow. Every row reuses the
 * same fitted forecast, the same backtest and the same reference prices
 * as the single-crop views — no new numbers are introduced here, only
 * the same numbers placed next to each other. Rice has no single
 * reference price (three varieties), so its revenue cell is null and the
 * UI says why instead of picking a variety.
 */
import { getMarket, type MarketCrop } from "./market";
import { forecastYield, YIELD_CROPS, type YieldCrop } from "./yield";
import { backtestCrop } from "./backtest";
import { estimateRevenue, type RevenueEstimate } from "./revenue";

export interface CropComparisonRow {
  crop: YieldCrop;
  nameEn: string;
  nameUr: string;
  forecast: number;
  bandLow: number;
  bandHigh: number;
  targetYear: number;
  rmse: number;
  backtestMae: number;
  backtestNaiveMae: number;
  lastValue: number;
  lastYear: number;
  revenue: RevenueEstimate | null;
  noRevenueReason: string | null;
}

export interface CropComparison {
  districtSlug: string;
  rows: CropComparisonRow[];
  note: string;
}

export function compareCrops(districtSlug: string): CropComparison {
  const rows: CropComparisonRow[] = YIELD_CROPS.map((crop) => {
    const forecast = forecastYield(crop);
    const backtest = backtestCrop(crop);
    const market = getMarket(crop as MarketCrop, districtSlug);
    const revenue = estimateRevenue(forecast, market);
    return {
      crop,
      nameEn: forecast.nameEn,
      nameUr: forecast.nameUr,
      forecast: forecast.forecast,
      bandLow: forecast.bandLow,
      bandHigh: forecast.bandHigh,
      targetYear: forecast.targetYear,
      rmse: forecast.rmse,
      backtestMae: backtest.trendMae,
      backtestNaiveMae: backtest.naiveMae,
      lastValue: forecast.lastValue,
      lastYear: forecast.lastYear,
      revenue,
      noRevenueReason: revenue
        ? null
        : "No single reference price — the dataset lists three rice varieties, so no variety was picked.",
    };
  });
  return {
    districtSlug,
    rows,
    note: "Forecasts are national-average trend baselines (FAO/OWID 1961–2024); prices are dated REFERENCE (AMIS Punjab, 2–3 Nov 2026), never live. Gross revenue is before costs.",
  };
}
