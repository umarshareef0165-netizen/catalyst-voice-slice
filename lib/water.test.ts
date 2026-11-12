import { describe, it, expect } from "vitest";
import {
  parseForecast,
  irrigationAdvice,
  waterNeed,
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

describe("waterNeed (ET0 minus rain, from the forecast's own numbers)", () => {
  const days: DayForecast[] = parseForecast(FIXTURE, 31.42, 73.08).days;

  it("computes net need in mm and litres per acre/hectare", () => {
    const w = waterNeed(days);
    // ET0 3.1+3.2+2.4+3.0 = 11.7 mm; rain 0+0+4.2+0.5 = 4.7 mm.
    expect(w.complete).toBe(true);
    expect(w.days).toBe(4);
    expect(w.et0SumMm).toBe(11.7);
    expect(w.rainSumMm).toBe(4.7);
    expect(w.netMm).toBe(7.0);
    // 7.0 mm × 4,046.86 L/acre = 28,328 L; × 10,000 L/ha = 70,000 L.
    expect(w.litresPerAcre).toBe(28328);
    expect(w.litresPerHectare).toBe(70000);
  });

  it("is zero when rain covers ET0", () => {
    const wet: DayForecast[] = days.map((d) => ({ ...d, et0Mm: 1, precipMm: 5 }));
    const w = waterNeed(wet);
    expect(w.netMm).toBe(0);
    expect(w.litresPerAcre).toBe(0);
  });

  it("is incomplete (nulls) when any ET0 or rain value is missing — never a guess", () => {
    const missing: DayForecast[] = [
      { ...days[0], et0Mm: null },
      ...days.slice(1),
    ];
    const w = waterNeed(missing);
    expect(w.complete).toBe(false);
    expect(w.netMm).toBeNull();
    expect(w.litresPerAcre).toBeNull();
  });

  it("rides along on irrigationAdvice", () => {
    const a = irrigationAdvice(days);
    expect(a.water.complete).toBe(true);
    expect(a.water.netMm).toBe(7.0);
  });
});
