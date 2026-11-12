import { describe, it, expect } from "vitest";
import { fitTrend, forecastYield, getSeries, YIELD_CROPS } from "./yield";

describe("yield model (real FAO/OWID Pakistan series, 1961–2024)", () => {
  it("loads 64 years for every supported crop", () => {
    for (const crop of YIELD_CROPS) {
      const s = getSeries(crop);
      expect(s.length).toBe(64);
      expect(s[0].year).toBe(1961);
      expect(s[s.length - 1].year).toBe(2024);
    }
  });

  it("fits a positive trend for wheat with a sane RMSE (last 25 seasons)", () => {
    const fit = fitTrend(getSeries("wheat"));
    expect(fit.slope).toBeGreaterThan(0); // yields rose over 2000–2024
    expect(fit.slope).toBeLessThan(0.05); // t/ha per year — plausible
    expect(fit.rmse).toBeGreaterThan(0);
    expect(fit.rmse).toBeLessThan(0.5);
    expect(fit.n).toBe(25);
    expect(fit.firstYear).toBe(2000);
    expect(fit.lastYear).toBe(2024);
  });

  it("forecasts the next harvest year with a band that contains the trend", () => {
    const f = forecastYield("wheat");
    expect(f.targetYear).toBe(2025);
    expect(f.forecast).toBeGreaterThan(f.lastValue - 0.5);
    expect(f.forecast).toBeLessThan(4.5);
    expect(f.bandLow).toBeLessThan(f.forecast);
    expect(f.bandHigh).toBeGreaterThan(f.forecast);
    expect(f.lastYear).toBe(2024);
    expect(f.lastValue).toBeCloseTo(3.2683, 3);
    expect(f.avg5).toBeGreaterThan(2.8);
    expect(f.avg10).toBeGreaterThan(2.8);
    expect(f.seriesLast10).toHaveLength(10);
  });

  it("forecasts rice and maize too, with different levels", () => {
    const rice = forecastYield("rice");
    const maize = forecastYield("maize");
    expect(maize.forecast).toBeGreaterThan(rice.forecast); // maize yields more
    expect(rice.forecast).toBeGreaterThan(3);
    expect(maize.forecast).toBeGreaterThan(5);
  });
});
