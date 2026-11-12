/**
 * Market prices — a CURATED REFERENCE dataset, not a live feed.
 *
 * Source: AMIS Punjab mandi reports, 2–3 Nov 2026 (via Zarat Ghar).
 * Prices move daily and vary by quality and moisture, so this panel is
 * always labelled REFERENCE with its publication date. It is never
 * presented as today's live rate.
 */
import marketRef from "../data/market-reference.json";

export type MarketCrop = "wheat" | "rice" | "maize" | "cotton";

export interface MarketResult {
  kind: "reference";
  crop: MarketCrop;
  nameEn: string;
  nameUr: string;
  unit: string;
  currency: string;
  published: string;
  source: string;
  punjabAverage: number | null;
  rangeLow: number | null;
  rangeHigh: number | null;
  districtPrice: number | null;
  district: string | null;
  varieties: Array<{ name: string; low: number; high: number }> | null;
  spot: number | null;
  govtIndicative: number | null;
  govtIndicativeNote: string | null;
  /** Simple comparison vs the government indicative price (wheat only). */
  comparisonEn: string | null;
  comparisonUr: string | null;
  note: string;
}

const CROP_META: Record<MarketCrop, { nameEn: string; nameUr: string }> = {
  wheat: { nameEn: "Wheat", nameUr: "گندم" },
  rice: { nameEn: "Rice (paddy)", nameUr: "چاول" },
  maize: { nameEn: "Maize", nameUr: "مکئی" },
  cotton: { nameEn: "Cotton (spot)", nameUr: "کپاس" },
};

export const MARKET_CROPS: MarketCrop[] = ["wheat", "rice", "maize", "cotton"];

export function getMarket(crop: MarketCrop, districtSlug: string | null): MarketResult {
  const ref = marketRef as unknown as Record<string, unknown>;
  const crops = ref.crops as Record<string, Record<string, unknown>>;
  const row = crops[crop];
  const meta = CROP_META[crop];
  const districtPrice =
    districtSlug !== null &&
    row.by_district &&
    typeof (row.by_district as Record<string, unknown>)[districtSlug] === "number"
      ? ((row.by_district as Record<string, number>)[districtSlug] as number)
      : null;

  const varieties =
    row.varieties !== undefined
      ? Object.entries(row.varieties as Record<string, { low: number; high: number }>).map(
          ([name, v]) => ({ name, low: v.low, high: v.high }),
        )
      : null;

  const punjabAverage =
    typeof row.punjab_average === "number" ? (row.punjab_average as number) : null;
  const govtIndicative =
    typeof row.govt_indicative_2027_crop === "number"
      ? (row.govt_indicative_2027_crop as number)
      : null;

  let comparisonEn: string | null = null;
  let comparisonUr: string | null = null;
  const priceToCompare = districtPrice ?? punjabAverage;
  if (crop === "wheat" && govtIndicative !== null && priceToCompare !== null) {
    const diff = priceToCompare - govtIndicative;
    if (diff >= 0) {
      comparisonEn = `The ${districtPrice !== null ? "district" : "Punjab average"} price (Rs. ${priceToCompare.toLocaleString()}) is Rs. ${diff.toLocaleString()} above the government's indicative price for the 2027 crop (Rs. ${govtIndicative.toLocaleString()}) — selling now is at or above the indicative level.`;
      comparisonUr = `${districtPrice !== null ? "ضلع" : "پنجاب کی اوسط"} قیمت (روپے ${priceToCompare.toLocaleString()}) حکومت کی 2027 کی فصل کے لیے اشارتی قیمت (روپے ${govtIndicative.toLocaleString()}) سے روپے ${diff.toLocaleString()} زیادہ ہے — اب بیچنا اشارتی سطح پر یا اس سے اوپر ہے۔`;
    } else {
      comparisonEn = `The ${districtPrice !== null ? "district" : "Punjab average"} price (Rs. ${priceToCompare.toLocaleString()}) is Rs. ${Math.abs(diff).toLocaleString()} below the government's indicative price for the 2027 crop (Rs. ${govtIndicative.toLocaleString()}) — holding may be worth considering if you can store safely.`;
      comparisonUr = `${districtPrice !== null ? "ضلع" : "پنجاب کی اوسط"} قیمت (روپے ${priceToCompare.toLocaleString()}) حکومت کی 2027 کی فصل کے لیے اشارتی قیمت (روپے ${govtIndicative.toLocaleString()}) سے روپے ${Math.abs(diff).toLocaleString()} کم ہے — اگر محفوظ ذخیرہ کر سکتے ہیں تو رکنا بہتر ہو سکتا ہے۔`;
    }
  }

  return {
    kind: "reference",
    crop,
    nameEn: meta.nameEn,
    nameUr: meta.nameUr,
    unit: String(ref.unit),
    currency: String(ref.currency),
    published: String(ref.published),
    source: String(
      (ref.sources as Record<string, string>)[crop] ?? "AMIS Punjab",
    ),
    punjabAverage,
    rangeLow: typeof row.range_low === "number" ? (row.range_low as number) : null,
    rangeHigh: typeof row.range_high === "number" ? (row.range_high as number) : null,
    districtPrice,
    district: districtSlug,
    varieties,
    spot: typeof row.spot === "number" ? (row.spot as number) : null,
    govtIndicative,
    govtIndicativeNote:
      typeof row.govt_indicative_note === "string"
        ? (row.govt_indicative_note as string)
        : null,
    comparisonEn,
    comparisonUr,
    note: String(ref.note),
  };
}
