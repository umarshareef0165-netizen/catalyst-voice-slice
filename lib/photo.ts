/**
 * The photo turn (NEW in this repo — the Catalyst demo layer).
 *
 * A farmer uploads one photo of a crop problem and gets one Urdu answer.
 * Gemini (multimodal) is used when GEMINI_API_KEY is set at deploy time;
 * without a key — or when the call fails — the answer is the honest
 * deterministic fallback from lib/voice.ts, labelled as such. The photo
 * turn NEVER diagnoses a disease and NEVER prescribes a pesticide.
 */
import { GEMINI_MODEL } from "./agent";
import {
  UPSTREAM_TIMEOUT_MS,
  GEMINI_MAX_ATTEMPTS,
  GEMINI_RETRY_DELAY_MS,
} from "./timeout";
import { buildPhotoPrompt, photoFallbackAnswer } from "./voice";

const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface PhotoInput {
  /** Base64-encoded image bytes (no data: prefix). */
  imageBase64: string;
  mimeType: string;
  question?: string;
  cropEn?: string;
  cropUr?: string;
  districtEn?: string;
  districtUr?: string;
}

export interface PhotoAnswer {
  text: string;
  /** "gemini" = real multimodal answer; "fallback" = deterministic template. */
  source: "gemini" | "fallback";
  model?: string;
  fallbackReason?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

async function callGeminiPhotoOnce(
  prompt: string,
  imageBase64: string,
  mimeType: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: imageBase64 } },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 700, temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const error = new Error(
      `Gemini ${GEMINI_MODEL} returned HTTP ${res.status}: ${body.slice(0, 200)}`,
    ) as Error & { status: number };
    error.status = res.status;
    throw error;
  }
  const data = (await res.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini returned an empty answer.");
  return text;
}

/** Run the photo turn: Gemini multimodal first, labelled fallback on failure. */
export async function answerPhoto(input: PhotoInput): Promise<PhotoAnswer> {
  const cropUr = input.cropUr ?? "گندم";
  const districtUr = input.districtUr ?? "فیصل آباد";
  const fallback = (): PhotoAnswer => ({
    text: photoFallbackAnswer(cropUr, districtUr),
    source: "fallback",
    fallbackReason:
      "Photo identification needs the live AI call — deterministic checklist answer instead.",
  });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ...fallback(),
      fallbackReason:
        "No Gemini API key configured — deterministic checklist answer instead (a photo alone cannot diagnose a disease).",
    };
  }
  const prompt = buildPhotoPrompt({
    question: input.question ?? "",
    cropEn: input.cropEn ?? "Wheat",
    cropUr,
    districtEn: input.districtEn ?? "Faisalabad",
    districtUr,
  });
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt++) {
    try {
      const text = await callGeminiPhotoOnce(
        prompt,
        input.imageBase64,
        input.mimeType,
        apiKey,
      );
      return { text, source: "gemini", model: GEMINI_MODEL };
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number }).status;
      const timedOut = (error as Error).name === "TimeoutError";
      const retryable = status === 503 || status === 429 || timedOut;
      if (!retryable || attempt === GEMINI_MAX_ATTEMPTS) break;
      await sleep(GEMINI_RETRY_DELAY_MS);
    }
  }
  const status = (lastError as { status?: number } | null)?.status;
  const reason =
    status === 503
      ? "Gemini overloaded (HTTP 503) — deterministic checklist answer instead."
      : status === 429
        ? "Gemini rate-limited (HTTP 429) — deterministic checklist answer instead."
        : `Gemini unavailable (${(lastError as Error).message.slice(0, 120)}) — deterministic checklist answer instead.`;
  return { ...fallback(), fallbackReason: reason };
}
