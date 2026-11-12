import { describe, it, expect } from "vitest";
import { buildPlan } from "./plan";
import { todayPk, addDays } from "./weather";

describe("buildPlan", () => {
  it("never includes a past-dated step for an old sowing date", () => {
    const today = todayPk();
    const plan = buildPlan({
      crop: "wheat",
      forecastDays: null,
      sowingDate: "2025-11-01",
    });
    for (const step of plan) {
      expect(step.date >= today).toBe(true);
    }
    expect(plan.some((s) => s.titleEn.includes("21 days after sowing"))).toBe(false);
  });

  it("includes the crown-root step for a recent sowing date", () => {
    const today = todayPk();
    const sowing = addDays(today, -5);
    const plan = buildPlan({ crop: "wheat", forecastDays: null, sowingDate: sowing });
    const crown = plan.find((s) => s.titleEn.includes("21 days after sowing"));
    expect(crown).toBeDefined();
    expect(crown?.date).toBe(addDays(sowing, 21));
  });

  it("says the wheat sowing window is open in November", () => {
    const plan = buildPlan({ crop: "wheat", forecastDays: null });
    const sowing = plan[0];
    expect(sowing.titleEn).toContain("Sowing window");
    expect(sowing.detailEn).toContain("25 Oct");
  });

  it("builds an irrigation step from a dry forecast", () => {
    const days = [
      { date: "2026-11-07", tMaxC: 28, tMinC: 14, precipMm: 0, precipProbPct: 5, humidityPct: 55, windKmh: 12, et0Mm: 3.1 },
      { date: "2026-11-08", tMaxC: 29, tMinC: 13, precipMm: 0, precipProbPct: 10, humidityPct: 52, windKmh: 14, et0Mm: 3.2 },
      { date: "2026-11-09", tMaxC: 27, tMinC: 12, precipMm: 0, precipProbPct: 5, humidityPct: 60, windKmh: 10, et0Mm: 3.0 },
    ];
    const plan = buildPlan({ crop: "wheat", forecastDays: days });
    expect(plan.some((s) => s.titleEn.startsWith("Irrigate"))).toBe(true);
  });
});
