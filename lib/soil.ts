import { UPSTREAM_TIMEOUT_MS } from "./timeout";

/**
 * Soil data via ISRIC SoilGrids v2.0 (free, no key, CC-BY).
 * https://rest.isric.org/soilgrids/v2.0/docs
 *
 * The service is intermittently slow / returns HTTP 500 from some networks,
 * and individual property means can be null for a point. The parser handles
 * all of that: null means "not reported for this point", a failed fetch is
 * reported as unavailable — never invented soil.
 */

export interface SoilDepthValue {
  depth: string; // e.g. "0-5cm"
  mean: number | null; // converted to target units, or null when not reported
}

export interface SoilProperty {
  name: string;
  label: string;
  unit: string;
  values: SoilDepthValue[];
}

export interface SoilResult {
  source: "ISRIC SoilGrids";
  sourceUrl: string;
  latitude: number;
  longitude: number;
  properties: SoilProperty[];
  /** Properties that returned a value for at least one depth. */
  availableCount: number;
}

export class SoilError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "SoilError";
    this.status = status;
  }
}

export const SOIL_PROPERTIES = [
  { name: "phh2o", label: "Soil pH (water)", unit: "pH" },
  { name: "clay", label: "Clay", unit: "%" },
  { name: "sand", label: "Sand", unit: "%" },
  { name: "silt", label: "Silt", unit: "%" },
  { name: "soc", label: "Soil organic carbon", unit: "g/kg" },
  { name: "nitrogen", label: "Total nitrogen", unit: "g/kg" },
  { name: "cec", label: "Cation exchange capacity", unit: "cmol(c)/kg" },
  { name: "bdod", label: "Bulk density", unit: "g/cm³" },
] as const;

const SOILGRIDS_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query";

export function buildSoilUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    lon: String(lon),
    lat: String(lat),
    property: SOIL_PROPERTIES.map((p) => p.name).join(","),
    depth: "0-5cm",
    value: "mean",
  });
  return `${SOILGRIDS_URL}?${params.toString()}`;
}

/** Parse a SoilGrids properties/query JSON body. Pure. */
export function parseSoil(json: unknown, lat: number, lon: number): SoilResult {
  const body = json as {
    properties?: {
      layers?: Array<{
        name?: string;
        unit_measure?: { d_factor?: number; target_units?: string };
        depths?: Array<{
          label?: string;
          values?: { mean?: number | null };
        }>;
      }>;
    };
  };
  const layers = body?.properties?.layers;
  if (!Array.isArray(layers)) {
    throw new SoilError("SoilGrids returned no soil layers.");
  }
  const labelByName = new Map<string, (typeof SOIL_PROPERTIES)[number]>(
    SOIL_PROPERTIES.map((p) => [p.name, p]),
  );
  const properties: SoilProperty[] = layers.map((layer) => {
    const meta = labelByName.get(layer.name ?? "");
    const dFactor = layer.unit_measure?.d_factor ?? 1;
    const values: SoilDepthValue[] = (layer.depths ?? []).map((d) => ({
      depth: d.label ?? "?",
      mean:
        typeof d.values?.mean === "number" ? d.values.mean / dFactor : null,
    }));
    return {
      name: layer.name ?? "?",
      label: meta?.label ?? layer.name ?? "?",
      unit: meta?.unit ?? layer.unit_measure?.target_units ?? "",
      values,
    };
  });
  return {
    source: "ISRIC SoilGrids",
    sourceUrl: buildSoilUrl(lat, lon),
    latitude: lat,
    longitude: lon,
    properties,
    availableCount: properties.filter((p) =>
      p.values.some((v) => v.mean !== null),
    ).length,
  };
}

/**
 * Fetch soil properties for a point.
 *
 * SoilGrids is fetched ONE PROPERTY AT A TIME (8 parallel requests, topsoil
 * 0–5 cm only). Verified 2026-11-06: multi-property queries return
 * HTTP 500 from this network, and a two-depth query returns empty layers,
 * while single-property / single-depth queries return 200. Individual
 * failures are tolerated — a property that fails is simply not reported.
 * If every request fails, the whole call throws.
 *
 * Each property fetch is capped at `timeoutMs` (default 8s — see
 * lib/timeout.ts): the 8 requests run in parallel, so the whole call
 * degrades in ~8s even when the service is hanging.
 */
export async function fetchSoil(
  lat: number,
  lon: number,
  fetchFn: typeof fetch = fetch,
  timeoutMs: number = UPSTREAM_TIMEOUT_MS,
): Promise<SoilResult> {
  const results = await Promise.allSettled(
    SOIL_PROPERTIES.map(async (prop) => {
      const params = new URLSearchParams({
        lon: String(lon),
        lat: String(lat),
        property: prop.name,
        depth: "0-5cm",
        value: "mean",
      });
      const res = await fetchFn(`${SOILGRIDS_URL}?${params.toString()}`, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        throw new SoilError(
          `SoilGrids returned HTTP ${res.status} for ${prop.name}.`,
          res.status,
        );
      }
      const json = await res.json();
      const layers = (
        json as {
          properties?: {
            layers?: Array<unknown>;
          };
        }
      ).properties?.layers;
      if (!Array.isArray(layers) || layers.length === 0) return null;
      return layers[0];
    }),
  );
  const layers = results
    .filter(
      (r): r is PromiseFulfilledResult<unknown> =>
        r.status === "fulfilled" && r.value !== null,
    )
    .map((r) => r.value);
  if (layers.length === 0) {
    const firstError = results.find((r) => r.status === "rejected");
    throw new SoilError(
      firstError
        ? (firstError as PromiseRejectedResult).reason instanceof Error
          ? ((firstError as PromiseRejectedResult).reason as Error).message
          : "SoilGrids returned no soil layers."
        : "SoilGrids returned no soil layers.",
    );
  }
  return parseSoil({ properties: { layers } }, lat, lon);
}

/** Find the mean of a property at a depth (e.g. "0-5cm"), or null. */
export function soilValue(
  soil: SoilResult,
  name: string,
  depth = "0-5cm",
): number | null {
  const prop = soil.properties.find((p) => p.name === name);
  return prop?.values.find((v) => v.depth === depth)?.mean ?? null;
}

/** Simplified USDA texture class from sand/silt/clay percentages. */
export function textureClass(
  clay: number | null,
  sand: number | null,
  silt: number | null,
): string | null {
  if (clay === null || sand === null || silt === null) return null;
  if (clay >= 40) return "Clay";
  if (sand >= 70) return "Sandy";
  if (silt >= 50) return "Silty";
  if (clay >= 27 && sand <= 45) return "Clay loam";
  if (sand >= 45 && clay < 27) return "Sandy loam";
  if (silt >= 40 && clay >= 12 && sand < 40) return "Silt loam";
  return "Loam";
}

export function phInterpretation(ph: number | null): string | null {
  if (ph === null) return null;
  if (ph < 5.5) return "Acidic — most Punjab crops prefer a higher pH.";
  if (ph < 6.5) return "Slightly acidic — good for most crops.";
  if (ph <= 7.5) return "Neutral — good for most crops.";
  if (ph <= 8.5) return "Alkaline — typical of Punjab soils; watch zinc and iron availability.";
  return "Strongly alkaline — check with your local extension office before sowing.";
}

export function socInterpretation(soc: number | null): string | null {
  if (soc === null) return null;
  if (soc < 10) return "Low organic carbon — farmyard manure / green manure will help.";
  if (soc <= 20) return "Medium organic carbon.";
  return "High organic carbon — good soil health.";
}
