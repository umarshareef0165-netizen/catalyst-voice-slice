import { describe, it, expect } from "vitest";
import {
  parseSoil,
  soilValue,
  textureClass,
  phInterpretation,
  socInterpretation,
} from "./soil";

/** Real SoilGrids response captured 2026-11-06 for Faisalabad (31.42, 73.08). */
const REAL_RESPONSE = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [73.08, 31.42] },
  properties: {
    layers: [
      {
        name: "phh2o",
        unit_measure: { d_factor: 10, mapped_units: "pH*10", target_units: "-" },
        depths: [
          { label: "0-5cm", values: { mean: null } },
          { label: "5-15cm", values: { mean: null } },
        ],
      },
      {
        name: "clay",
        unit_measure: { d_factor: 10, mapped_units: "g/kg", target_units: "%" },
        depths: [
          { label: "0-5cm", values: { mean: null } },
          { label: "5-15cm", values: { mean: null } },
        ],
      },
    ],
  },
};

/** Fixture with real values, to test d_factor conversion. */
const VALUED_RESPONSE = {
  properties: {
    layers: [
      {
        name: "phh2o",
        unit_measure: { d_factor: 10, target_units: "-" },
        depths: [
          { label: "0-5cm", values: { mean: 78 } },
          { label: "5-15cm", values: { mean: 81 } },
        ],
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
      {
        name: "soc",
        unit_measure: { d_factor: 10, target_units: "g/kg" },
        depths: [{ label: "0-5cm", values: { mean: 85 } }],
      },
    ],
  },
};

describe("parseSoil", () => {
  it("parses the real captured response and keeps null means as null", () => {
    const s = parseSoil(REAL_RESPONSE, 31.42, 73.08);
    expect(s.source).toBe("ISRIC SoilGrids");
    expect(s.availableCount).toBe(0);
    expect(soilValue(s, "phh2o")).toBeNull();
    expect(soilValue(s, "clay")).toBeNull();
  });

  it("divides by d_factor to get target units", () => {
    const s = parseSoil(VALUED_RESPONSE, 31.42, 73.08);
    expect(soilValue(s, "phh2o")).toBeCloseTo(7.8);
    expect(soilValue(s, "phh2o", "5-15cm")).toBeCloseTo(8.1);
    expect(soilValue(s, "clay")).toBeCloseTo(32);
    expect(soilValue(s, "soc")).toBeCloseTo(8.5);
    expect(s.availableCount).toBe(5);
  });

  it("throws when no layers are present", () => {
    expect(() => parseSoil({}, 31.42, 73.08)).toThrow("no soil layers");
  });
});

describe("soil interpretation", () => {
  it("classifies texture from sand/silt/clay", () => {
    expect(textureClass(45, 30, 25)).toBe("Clay");
    expect(textureClass(10, 75, 15)).toBe("Sandy");
    expect(textureClass(15, 25, 60)).toBe("Silty");
    expect(textureClass(20, 40, 40)).toBe("Loam");
    expect(textureClass(null, 40, 40)).toBeNull();
  });

  it("interprets pH", () => {
    expect(phInterpretation(7.8)).toContain("Alkaline");
    expect(phInterpretation(6.8)).toContain("Neutral");
    expect(phInterpretation(null)).toBeNull();
  });

  it("interprets organic carbon", () => {
    expect(socInterpretation(8.5)).toContain("Low");
    expect(socInterpretation(25)).toContain("High");
    expect(socInterpretation(null)).toBeNull();
  });
});

describe("fetchSoil fan-out", () => {
  it("merges one-property responses and tolerates a failed property", async () => {
    const { fetchSoil } = await import("./soil");
    const fetchMock = async (url: string) => {
      const prop = new URL(url).searchParams.get("property") ?? "";
      if (prop === "clay") {
        return new Response("Internal Server Error", { status: 500 });
      }
      const body = {
        properties: {
          layers: [
            {
              name: prop,
              unit_measure: { d_factor: 10, target_units: prop === "phh2o" ? "-" : "%" },
              depths: [{ label: "0-5cm", values: { mean: prop === "phh2o" ? 78 : 300 } }],
            },
          ],
        },
      };
      return new Response(JSON.stringify(body), { status: 200 });
    };
    const s = await fetchSoil(31.42, 73.08, fetchMock as typeof fetch);
    expect(s.properties.length).toBe(7); // 8 minus the failed clay
    expect(soilValue(s, "phh2o")).toBeCloseTo(7.8);
    expect(soilValue(s, "clay")).toBeNull();
    expect(s.availableCount).toBe(7);
  });

  it("throws when every property request fails", async () => {
    const { fetchSoil } = await import("./soil");
    const fetchMock = async () =>
      new Response("Internal Server Error", { status: 500 });
    await expect(
      fetchSoil(31.42, 73.08, fetchMock as typeof fetch),
    ).rejects.toThrow();
  });

  it("degrades fast when SoilGrids hangs instead of stalling the answer", async () => {
    const { fetchSoil } = await import("./soil");
    // A fetch that never resolves unless its abort signal fires.
    const hangingFetch = (_url: string, opts?: { signal?: AbortSignal }) =>
      new Promise<never>((_resolve, reject) => {
        const signal = opts?.signal;
        if (!signal) return; // never resolves
        if (signal.aborted) reject(signal.reason);
        else
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
      });
    const start = Date.now();
    await expect(
      fetchSoil(31.42, 73.08, hangingFetch as typeof fetch, 50),
    ).rejects.toThrow();
    // All 8 property fetches hang in parallel and abort together.
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
