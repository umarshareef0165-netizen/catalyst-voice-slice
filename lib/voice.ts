/**
 * Voice-slice helpers (NEW in this repo — the Catalyst demo layer).
 *
 * Pure functions only, so they are unit-testable in Node. The browser-only
 * wiring (SpeechRecognition / SpeechSynthesis) lives in app/page.tsx and
 * calls these helpers for voice picking and text cleanup.
 */

export const SPEECH_RECOGNITION_LANG = "ur-PK";
export const SPEECH_SYNTHESIS_LANG = "ur-PK";

/** A voice record as returned by speechSynthesis.getVoices(). */
export interface SpeechVoice {
  lang: string;
  name: string;
}

/**
 * Pick the best Urdu voice for the spoken answer: exact ur-PK first,
 * then any ur-* voice, else null (the browser default is used and the
 * UI says the spoken answer may not be Urdu).
 */
export function pickUrduVoice(voices: SpeechVoice[]): SpeechVoice | null {
  if (voices.length === 0) return null;
  const exact = voices.find((v) => v.lang.toLowerCase() === "ur-pk");
  if (exact) return exact;
  const anyUrdu = voices.find((v) =>
    v.lang.toLowerCase().startsWith("ur"),
  );
  return anyUrdu ?? null;
}

/**
 * Clean answer text for text-to-speech: collapse whitespace, drop
 * markdown-style bullets, and cap the length so a long answer does not
 * become a 5-minute monologue. The written answer on screen is never
 * truncated — only the spoken version is.
 */
export function cleanTextForSpeech(text: string, maxChars = 1500): string {
  const cleaned = text
    .replace(/[*#`>|]/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxChars) return cleaned;
  const cut = cleaned.slice(0, maxChars);
  const lastStop = Math.max(
    cut.lastIndexOf("۔"),
    cut.lastIndexOf("."),
    cut.lastIndexOf("!"),
  );
  return (lastStop > maxChars * 0.5 ? cut.slice(0, lastStop + 1) : cut) + "…";
}

/** Max photo upload size for the photo turn (5 MB). */
export const MAX_PHOTO_BYTES = 5_000_000;

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

/**
 * Deterministic photo fallback (used when there is no Gemini key, or the
 * Gemini call fails): an honest Urdu answer that says what a photo alone
 * CANNOT confirm, what to check next, and how to ask the same thing by
 * voice instead. Never a diagnosis, never a pesticide prescription.
 */
export function photoFallbackAnswer(
  cropUr: string,
  districtUr: string,
): string {
  return [
    `میں تصویر سے فصل کی بیماری کی تشخیص نہیں کر سکتا — تصویر اکیلی کافی نہیں ہوتی۔`,
    `آپ کی فصل: ${cropUr}، ضلع: ${districtUr}۔`,
    `براہ کرم یہ دیکھیں اور بتائیں:`,
    `1) پتے پیلے ہیں یا دھبے ہیں؟ دھبے کس رنگ کے ہیں؟`,
    `2) پتے مرجھا رہے ہیں یا صرف رنگ بدلا ہے؟`,
    `3) پودے کے کتنے حصے متاثر ہیں — کچھ پتے یا پوری فصل؟`,
    `4) حال ہی میں پانی یا کھاد کب دی تھی؟`,
    `یہی سوال آپ بول کر بھی پوچھ سکتے ہیں — مائیکروفون دبا کر بتائیں کہ آپ کو کیا نظر آ رہا ہے، اور میں موسم، مٹی اور منڈی کے اعداد کے ساتھ جواب دوں گا۔`,
    `نوٹ: یہ طبی تشخیص نہیں ہے۔ اگر فصل تیزی سے خراب ہو رہی ہے تو اپنے علاقے کے زرعی ماہر سے رابطہ کریں۔`,
  ].join("\n");
}

/**
 * Strict prompt for the Gemini multimodal photo turn: Urdu answer, only
 * what the image shows, explicit "cannot confirm" limit, no diagnosis,
 * no pesticide prescription.
 */
export function buildPhotoPrompt(input: {
  question: string;
  cropEn: string;
  cropUr: string;
  districtEn: string;
  districtUr: string;
}): string {
  return [
    "You are AgriYield Advisor, an AI data agent for smallholder farmers in Punjab, Pakistan.",
    "A farmer uploaded a photo of a crop problem. Answer in Urdu script (اردو).",
    `Crop: ${input.cropEn} (${input.cropUr}). District: ${input.districtEn} (${input.districtUr}).`,
    input.question.trim()
      ? `Farmer's note with the photo: ${input.question.trim()}`
      : "The farmer gave no note with the photo.",
    "STRICT RULES:",
    "1. Describe only what is visible in the photo. Never invent a disease name, a cause, or a treatment.",
    "2. Say clearly what the photo alone CANNOT confirm (a photo cannot diagnose a disease).",
    "3. Give 3–4 concrete things the farmer should check next (leaf colour, spots, wilting, how much of the field is affected).",
    "4. Never prescribe a pesticide or a dose. Never promise a yield or a cure.",
    "5. Keep it short and plain — what is most likely visible, what to check next, what it cannot confirm.",
    "Answer now, in Urdu.",
  ].join("\n");
}
