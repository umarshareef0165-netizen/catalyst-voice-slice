/**
 * Revenue estimate — gross revenue per hectare, derived ONLY from numbers
 * the app already shows, with the derivation stated.
 *
 * gross = forecast yield (t/ha, national average, FAO/OWID trend baseline)
 *         × reference price per tonne.
 * The reference price is per 40 kg (1 maund), so price per tonne =
 * price per 40 kg × 25. The price used is the district price when the
 * dataset has one, else the Punjab average, else the spot rate; rice has
 * no single price (three varieties in the reference dataset) so no
 * estimate is given for it — null, never a picked variety.
 *
 * This is GROSS revenue BEFORE costs (seed, fertilizer, water, labour,
 * transport) and BEFORE any yield gap between the national average and
 * the farmer's own field. It is an estimate for comparing crops, not a
 * promise of income. The band uses the yield forecast's uncertainty band.
 */
import type { MarketResult } from "./market";
import type { YieldForecast } from "./yield";

export interface RevenueEstimate {
  crop: string;
  /** Which price was used: "district" | "punjab average" | "spot". */
  priceUsed: "district" | "punjab average" | "spot";
  pricePer40kg: number;
  pricePerTonne: number;
  grossPerHa: number;
  bandLowPerHa: number;
  bandHighPerHa: number;
  published: string;
  source: string;
  method: string;
}

const METHOD =
  "Gross revenue/ha = forecast yield (t/ha, national-average trend baseline) × reference price per tonne (price per 40 kg × 25). BEFORE costs; national average yield, not the farmer's field.";

export function estimateRevenue(
  forecast: YieldForecast,
  market: MarketResult | null,
): RevenueEstimate | null {
  if (!market) return null;
  let pricePer40kg: number | null = null;
  let priceUsed: RevenueEstimate["priceUsed"] | null = null;
  if (market.districtPrice !== null) {
    pricePer40kg = market.districtPrice;
    priceUsed = "district";
  } else if (market.punjabAverage !== null) {
    pricePer40kg = market.punjabAverage;
    priceUsed = "punjab average";
  } else if (market.spot !== null) {
    pricePer40kg = market.spot;
    priceUsed = "spot";
  }
  if (pricePer40kg === null || priceUsed === null) return null;
  const pricePerTonne = pricePer40kg * 25;
  return {
    crop: forecast.crop,
    priceUsed,
    pricePer40kg,
    pricePerTonne,
    grossPerHa: Math.round(forecast.forecast * pricePerTonne),
    bandLowPerHa: Math.round(forecast.bandLow * pricePerTonne),
    bandHighPerHa: Math.round(forecast.bandHigh * pricePerTonne),
    published: market.published,
    source: market.source,
    method: METHOD,
  };
}
