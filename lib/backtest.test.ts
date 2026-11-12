import { describe, it, expect } from "vitest";
import { backtestSeries, backtestCrop } from "./backtest";
import type { YieldPoint } from "./yield";

describe("backtestSeries (pure maths, synthetic series)", () => {
  it("scores a perfect linear series with ~zero trend error", () => {
    // yield = 1 + 0.05 × (year − 2000): exactly on a line.
    const series: YieldPoint[] = Array.from({ length: 30 }, (_, i) => ({
      year: 1990 + i,
      yield_t_ha: Math.round((1 + 0.05 * i) * 10000) / 10000,
    }));
    const b = backtestSeries(series, "wheat", 5);
    expect(b.holdoutYears).toEqual([2015, 2016, 2017, 2018, 2019]);
    expect(b.fitThroughYear).toBe(2014);
    expect(b.predictions).toHaveLength(5);
    expect(b.trendMae).toBeLessThan(0.01);
    expect(b.trendRmse).toBeLessThan(0.01);
  });

  it("beats the naive baseline on a trending series with noise", () => {
    // Rising trend + small alternating noise: trend should beat "last value".
    const series: YieldPoint[] = Array.from({ length: 30 }, (_, i) => ({
      year: 1990 + i,
      yield_t_ha: 1 + 0.05 * i + (i % 2 === 0 ? 0.02 : -0.02),
    }));
    const b = backtestSeries(series, "wheat", 5);
    expect(b.trendMae).toBeLessThan(b.naiveMae);
    expect(b.trendMae).toBeGreaterThan(0);
    expect(b.predictions[0].actual).toBeCloseTo(1 + 0.05 * 25 - 0.02, 2); // i=25 is odd → −0.02 noise
  });

  it("throws when the series is too short to hold out 5 years", () => {
    const short: YieldPoint[] = Array.from({ length: 10 }, (_, i) => ({
      year: 2000 + i,
      yield_t_ha: 2,
    }));
    expect(() => backtestSeries(short, "wheat", 5)).toThrow("Not enough yield data");
  });
});

describe("backtestCrop (real FAO/OWID Pakistan series, 1961–2024)", () => {
  it("holds out 2020–2024 and reports measured errors for every crop", () => {
    for (const crop of ["wheat", "rice", "maize"] as const) {
      const b = backtestCrop(crop);
      expect(b.holdoutYears).toEqual([2020, 2021, 2022, 2023, 2024]);
      expect(b.fitThroughYear).toBe(2019);
      expect(b.predictions).toHaveLength(5);
      expect(b.trendMae).toBeGreaterThan(0);
      expect(b.trendMae).toBeLessThan(1);
      expect(b.trendRmse).toBeGreaterThanOrEqual(b.trendMae);
      expect(b.naiveMae).toBeGreaterThan(0);
      expect(b.avg5Mae).toBeGreaterThan(0);
    }
  });

  it("wheat's trend beats both simple baselines on 2020–2024", () => {
    const b = backtestCrop("wheat");
    expect(b.trendMae).toBeLessThan(b.naiveMae);
    expect(b.trendMae).toBeLessThan(b.avg5Mae);
  });
});
