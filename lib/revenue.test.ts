import { describe, it, expect } from "vitest";
import { estimateRevenue } from "./revenue";
import { forecastYield } from "./yield";
import { getMarket } from "./market";
import { compareCrops } from "./compare";

describe("estimateRevenue (gross, before costs — yield × dated reference price)", () => {
  it("prices wheat in Faisalabad from the district reference price", () => {
    const r = estimateRevenue(forecastYield("wheat"), getMarket("wheat", "faisalabad"));
    expect(r).not.toBeNull();
    // Rs. 5,150 per 40 kg × 25 = Rs. 128,750 per tonne.
    expect(r!.priceUsed).toBe("district");
    expect(r!.pricePer40kg).toBe(5150);
    expect(r!.pricePerTonne).toBe(128750);
    // Forecast ≈ 3.12 t/ha → ≈ Rs. 401,700/ha gross, band around it.
    expect(r!.grossPerHa).toBeGreaterThan(350000);
    expect(r!.grossPerHa).toBeLessThan(450000);
    expect(r!.bandLowPerHa).toBeLessThan(r!.grossPerHa);
    expect(r!.bandHighPerHa).toBeGreaterThan(r!.grossPerHa);
    expect(r!.published).toBe("2026-11-02");
    expect(r!.method).toContain("BEFORE costs");
  });

  it("falls back to the Punjab average where the district has no row", () => {
    const r = estimateRevenue(forecastYield("wheat"), getMarket("wheat", "lahore"));
    expect(r!.priceUsed).toBe("punjab average");
    expect(r!.pricePer40kg).toBe(4546);
  });

  it("returns null for rice — three varieties, no single price to pick", () => {
    const r = estimateRevenue(forecastYield("rice"), getMarket("rice", "faisalabad"));
    expect(r).toBeNull();
  });

  it("returns null when there is no market data at all", () => {
    expect(estimateRevenue(forecastYield("wheat"), null)).toBeNull();
  });
});

describe("compareCrops (same numbers, side by side)", () => {
  it("returns all three yield crops for a district", () => {
    const c = compareCrops("faisalabad");
    expect(c.rows).toHaveLength(3);
    expect(c.rows.map((r) => r.crop)).toEqual(["wheat", "rice", "maize"]);
    const wheat = c.rows[0];
    expect(wheat.revenue).not.toBeNull();
    expect(wheat.backtestMae).toBeGreaterThan(0);
    const rice = c.rows[1];
    expect(rice.revenue).toBeNull();
    expect(rice.noRevenueReason).toContain("three rice varieties");
    const maize = c.rows[2];
    expect(maize.forecast).toBeGreaterThan(wheat.forecast);
    expect(maize.revenue).not.toBeNull(); // maize has a Punjab average price
    expect(c.note).toContain("REFERENCE");
  });
});
