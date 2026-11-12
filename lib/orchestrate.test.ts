import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { askQuestion } from "./orchestrate";

const WEATHER_FIXTURE = {
  latitude: 31.42,
  longitude: 73.08,
  timezone: "Asia/Karachi",
  daily: {
    time: ["2026-11-07", "2026-11-08", "2026-11-09"],
    temperature_2m_max: [28.5, 29.0, 26.0],
    temperature_2m_min: [14.0, 13.5, 12.0],
    precipitation_sum: [0, 0, 4.2],
    precipitation_probability_max: [5, 10, 80],
    relative_humidity_2m_mean: [55, 52, 70],
    wind_speed_10m_max: [12, 14, 18],
    et0_fao_evapotranspiration: [3.1, 3.2, 2.4],
  },
};

const SOIL_FIXTURE = {
  properties: {
    layers: [
      {
        name: "phh2o",
        unit_measure: { d_factor: 10, target_units: "-" },
        depths: [{ label: "0-5cm", values: { mean: 78 } }],
      },
      {
        name: "clay",
        unit_measure: { d_factor: 10, target_units: "%" },
        depths: [{ label: "0-5cm", values: { mean: 320 } }],
      },
      {
        name: "sand",
        unit_measure: { d_factor: 10, target_units: "%" },
        depths: [{ label: "0-5cm", values: { mean: 450 } }],
      },
      {
        name: "silt",
        unit_measure: { d_factor: 10, target_units: "%" },
        depths: [{ label: "0-5cm", values: { mean: 230 } }],
      },
    ],
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  delete process.env.GEMINI_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("askQuestion (mocked live tools, no Gemini key)", () => {
  it("answers a Roman Urdu irrigation question with cited numbers", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("open-meteo")) return Promise.resolve(jsonResponse(WEATHER_FIXTURE));
      if (url.includes("isric")) return Promise.resolve(jsonResponse(SOIL_FIXTURE));
      return Promise.reject(new Error(`unexpected URL ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);

    const r = await askQuestion({
      question: "Is haftay gandum ko pani kab dun?",
      districtSlug: "faisalabad",
    });
    expect(r.district.slug).toBe("faisalabad");
    expect(r.crop).toBe("wheat");
    expect(r.answer.source).toBe("fallback"); // no key configured
    expect(r.answer.fallbackReason).toContain("No Gemini API key");
    expect(r.tools.weather.status).toBe("ok");
    expect(r.tools.soil.status).toBe("ok");
    expect(r.tools.yield.status).toBe("ok");
    expect(r.tools.yield.data?.targetYear).toBe(2025);
    expect(r.citations.length).toBeGreaterThanOrEqual(3);
    expect(r.citations.some((c) => c.source.includes("Open-Meteo"))).toBe(true);
    expect(r.citations.some((c) => c.source.includes("SoilGrids"))).toBe(true);
    expect(r.plan.length).toBeGreaterThanOrEqual(3);
    // The answer contains the real forecast numbers, not invented ones.
    // (25-season trend: wheat 2025 forecast = 3.12 t/ha.)
    expect(r.answer.text).toContain("28.5");
    expect(r.answer.text).toContain("3.12");
  });

  it("still answers honestly when the weather service fails", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("open-meteo")) {
        return Promise.resolve(
          jsonResponse({ error: true, reason: "Daily API request limit exceeded." }, 429),
        );
      }
      if (url.includes("isric")) return Promise.resolve(jsonResponse(SOIL_FIXTURE));
      return Promise.reject(new Error(`unexpected URL ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);

    const r = await askQuestion({
      question: "When should I irrigate my wheat?",
      districtSlug: "faisalabad",
    });
    expect(r.tools.weather.status).toBe("unavailable");
    expect(r.tools.soil.status).toBe("ok");
    // The answer must not contain the fixture's temperatures.
    expect(r.answer.text).not.toContain("28.5");
    expect(r.answer.text).not.toContain("29.0");
    expect(r.answer.text).toMatch(/unavailable|dastiyab nahi/i);
    // The plan still exists but says the forecast is unavailable.
    expect(r.plan.some((s) => s.titleEn.toLowerCase().includes("unavailable"))).toBe(true);
  });

  it("answers a price question with reference (not live) market data", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("open-meteo")) return Promise.resolve(jsonResponse(WEATHER_FIXTURE));
      if (url.includes("isric")) return Promise.resolve(jsonResponse(SOIL_FIXTURE));
      return Promise.reject(new Error(`unexpected URL ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);

    const r = await askQuestion({
      question: "Faisalabad mein gandum ka rate kya hai?",
      districtSlug: "faisalabad",
    });
    expect(r.intents).toContain("price");
    expect(r.tools.market.status).toBe("ok");
    expect(r.tools.market.data?.districtPrice).toBe(5150);
    expect(r.answer.text).toContain("5,150");
    expect(r.answer.text).toMatch(/REFERENCE|حوالہ/i);
  });

  it("rejects an empty question", async () => {
    await expect(askQuestion({ question: "   " })).rejects.toThrow("required");
  });
});
