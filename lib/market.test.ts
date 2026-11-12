import { describe, it, expect } from "vitest";
import { getMarket } from "./market";

describe("getMarket (curated reference dataset, AMIS Punjab 2–3 Nov 2026)", () => {
  it("returns the Faisalabad wheat reference price with its source", () => {
    const m = getMarket("wheat", "faisalabad");
    expect(m.kind).toBe("reference");
    expect(m.districtPrice).toBe(5150);
    expect(m.punjabAverage).toBe(4546);
    expect(m.published).toBe("2026-11-02");
    expect(m.source).toContain("AMIS Punjab");
    expect(m.govtIndicative).toBe(4500);
    expect(m.comparisonEn).toContain("above the government's indicative price");
  });

  it("falls back to the Punjab average when the district has no row", () => {
    const m = getMarket("wheat", "lahore");
    expect(m.districtPrice).toBeNull();
    expect(m.punjabAverage).toBe(4546);
    expect(m.comparisonEn).toContain("Punjab average");
  });

  it("returns maize and rice reference ranges", () => {
    const maize = getMarket("maize", null);
    expect(maize.punjabAverage).toBe(2790);
    expect(maize.rangeLow).toBe(2240);
    const rice = getMarket("rice", null);
    expect(rice.varieties).toHaveLength(3);
    expect(rice.varieties?.find((v) => v.name === "basmati")?.high).toBe(5100);
  });

  it("returns the cotton spot rate", () => {
    const cotton = getMarket("cotton", null);
    expect(cotton.spot).toBe(17800);
  });
});
