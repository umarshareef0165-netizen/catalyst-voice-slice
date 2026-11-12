import { describe, it, expect, vi, afterEach } from "vitest";
import {
  deterministicAnswer,
  buildPrompt,
  answerWithGemini,
  type AnswerContext,
} from "./agent";

const CTX: AnswerContext = {
  question: "Is haftay gandum ko pani kab dun?",
  language: "roman",
  districtNameEn: "Faisalabad",
  districtNameUr: "فیصل آباد",
  crop: "wheat",
  cropNameEn: "Wheat",
  cropNameUr: "گندم",
  weather: {
    ok: true,
    days: [
      {
        date: "2026-11-07",
        tMaxC: 28.5,
        tMinC: 14,
        precipMm: 0,
        precipProbPct: 5,
        humidityPct: 55,
        windKmh: 12,
        et0Mm: 3.1,
      },
    ],
    advice: {
      action: "irrigate",
      bestDay: "2026-11-07",
      rainNext48hMm: 0,
      rainDaysNext3: [],
      hottestDay: { date: "2026-11-07", tMaxC: 28.5 },
      water: {
        days: 1,
        et0SumMm: 3.1,
        rainSumMm: 0,
        netMm: 3.1,
        litresPerAcre: 12545,
        litresPerHectare: 31000,
        complete: true,
        method: "Net need = max(0, sum(ET0) − sum(rain)).",
      },
      reasonEn: "No rain expected — irrigate on 2026-11-07 in the early morning.",
      reasonUr: "بارش متوقع نہیں — 2026-11-07 کو صبح سویرے پانی دیں۔",
    },
  },
  soil: { ok: true, summary: "pH 7.8 (Alkaline); texture Loam." },
  market: null,
  yieldForecast: {
    crop: "wheat",
    nameEn: "Wheat",
    nameUr: "گندم",
    method: "Linear trend on FAO/OWID Pakistan series.",
    targetYear: 2025,
    forecast: 3.3,
    bandLow: 3.1,
    bandHigh: 3.5,
    rmse: 0.12,
    mae: 0.09,
    lastValue: 3.2683,
    lastYear: 2024,
    avg5: 3.03,
    avg10: 2.93,
    trendPerYear: 0.037,
    seriesLast10: [],
    backtest: {
      crop: "wheat",
      holdoutYears: [2020, 2021, 2022, 2023, 2024],
      fitThroughYear: 2019,
      predictions: [],
      trendMae: 0.11,
      trendRmse: 0.13,
      naiveMae: 0.25,
      avg5Mae: 0.22,
      method: "Trend fitted excluding the last 5 seasons.",
    },
    source: "Our World in Data (FAO)",
  },
  revenue: {
    crop: "wheat",
    priceUsed: "district",
    pricePer40kg: 5150,
    pricePerTonne: 128750,
    grossPerHa: 424875,
    bandLowPerHa: 399125,
    bandHighPerHa: 450625,
    published: "2026-11-02",
    source: "AMIS Punjab",
    method: "Gross revenue/ha = forecast yield × reference price per tonne.",
  },
  planSteps: [
    {
      date: "2026-11-07",
      titleEn: "Irrigate — early morning",
      titleUr: "پانی دیں — صبح سویرے",
      detailEn: "No rain expected.",
      detailUr: "بارش متوقع نہیں۔",
    },
  ],
};

describe("deterministicAnswer", () => {
  it("composes a Roman Urdu answer containing the cited numbers", () => {
    const text = deterministicAnswer(CTX);
    expect(text).toContain("2026-11-07");
    expect(text).toContain("28.5");
    expect(text).toContain("3.3");
    expect(text).toContain("3.1");
    expect(text).toContain("3.5");
    // Water need and gross revenue (before costs) are part of the answer.
    expect(text).toContain("3.1 mm");
    expect(text).toContain("424,875");
    expect(text).toContain("kharchon se PEHLE");
  });

  it("says plainly when weather is unavailable instead of inventing it", () => {
    const noWeather: AnswerContext = {
      ...CTX,
      weather: { ok: false, error: "Open-Meteo daily request limit reached." },
    };
    const text = deterministicAnswer(noWeather);
    expect(text).toContain("dastiyab nahi");
    expect(text).not.toContain("28.5");
  });

  it("renders an English answer when the language is English", () => {
    const text = deterministicAnswer({ ...CTX, language: "en" });
    expect(text).toContain("District: Faisalabad");
    expect(text).toContain("3.3 t/ha");
    expect(text).toContain("Backtest on held-out 2020–2024");
    expect(text).toContain("BEFORE costs");
  });
});

describe("buildPrompt", () => {
  it("grounds the prompt in tool data and forbids invention", () => {
    const prompt = buildPrompt(CTX);
    expect(prompt).toContain("Use ONLY the numbers in the TOOL DATA");
    expect(prompt).toContain("3.3");
    expect(prompt).toContain("Is haftay gandum ko pani kab dun?");
    expect(prompt).toContain("Roman Urdu");
  });
});

describe("answerWithGemini retry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retries on 503 then succeeds", async () => {
    const ok = new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: "Test answer." }] } }],
      }),
      { status: 200 },
    );
    const fail = new Response("high demand", { status: 503 });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(fail)
      .mockResolvedValueOnce(ok);
    vi.stubGlobal("fetch", fetchMock);
    const out = await answerWithGemini("prompt", "fake-key");
    expect(out).toBe("Test answer.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws after 2 failed attempts (retry budget is capped)", async () => {
    const fail = new Response("high demand", { status: 503 });
    const fetchMock = vi.fn().mockResolvedValue(fail);
    vi.stubGlobal("fetch", fetchMock);
    await expect(answerWithGemini("prompt", "fake-key")).rejects.toThrow("503");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up fast when Gemini hangs instead of stalling the answer", async () => {
    // A fetch that never resolves unless its abort signal fires.
    const fetchMock = vi.fn(
      (_url: string, opts?: { signal?: AbortSignal }) =>
        new Promise<never>((_resolve, reject) => {
          const signal = opts?.signal;
          if (!signal) return; // never resolves
          if (signal.aborted) reject(signal.reason);
          else
            signal.addEventListener("abort", () => reject(signal.reason), {
              once: true,
            });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const start = Date.now();
    await expect(
      answerWithGemini("prompt", "fake-key", { timeoutMs: 50, maxAttempts: 2 }),
    ).rejects.toThrow("aborted due to timeout");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // 2 attempts x 50ms + 500ms backoff — must stay well under 2s.
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
