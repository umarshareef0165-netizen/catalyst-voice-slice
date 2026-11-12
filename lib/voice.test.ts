import { describe, expect, it } from "vitest";
import {
  buildPhotoPrompt,
  cleanTextForSpeech,
  isImageMime,
  MAX_PHOTO_BYTES,
  photoFallbackAnswer,
  pickUrduVoice,
  SPEECH_RECOGNITION_LANG,
  SPEECH_SYNTHESIS_LANG,
} from "./voice";

describe("voice helpers", () => {
  it("uses ur-PK for speech recognition and synthesis", () => {
    expect(SPEECH_RECOGNITION_LANG).toBe("ur-PK");
    expect(SPEECH_SYNTHESIS_LANG).toBe("ur-PK");
  });

  it("picks an exact ur-PK voice first", () => {
    const voices = [
      { lang: "en-US", name: "English" },
      { lang: "ur-IN", name: "Urdu India" },
      { lang: "ur-PK", name: "Urdu Pakistan" },
    ];
    expect(pickUrduVoice(voices)).toEqual({
      lang: "ur-PK",
      name: "Urdu Pakistan",
    });
  });

  it("falls back to any ur-* voice, then null", () => {
    expect(
      pickUrduVoice([
        { lang: "en-US", name: "English" },
        { lang: "ur-IN", name: "Urdu India" },
      ]),
    ).toEqual({ lang: "ur-IN", name: "Urdu India" });
    expect(pickUrduVoice([{ lang: "en-US", name: "English" }])).toBeNull();
    expect(pickUrduVoice([])).toBeNull();
  });

  it("cleans text for speech without touching the written answer", () => {
    expect(cleanTextForSpeech("  پانی  10 ملی میٹر   ہے۔  ")).toBe(
      "پانی 10 ملی میٹر ہے۔",
    );
    expect(cleanTextForSpeech("See https://example.com/x for more")).not.toContain(
      "https://",
    );
    const long = "الف ".repeat(1000);
    const cleaned = cleanTextForSpeech(long);
    expect(cleaned.length).toBeLessThanOrEqual(1501);
    expect(cleaned.endsWith("…")).toBe(true);
  });

  it("caps photo uploads at 5 MB and accepts image/* only", () => {
    expect(MAX_PHOTO_BYTES).toBe(5_000_000);
    expect(isImageMime("image/jpeg")).toBe(true);
    expect(isImageMime("image/png")).toBe(true);
    expect(isImageMime("application/pdf")).toBe(false);
    expect(isImageMime("video/mp4")).toBe(false);
  });

  it("photo fallback never diagnoses and always says what it cannot confirm", () => {
    const text = photoFallbackAnswer("گندم", "فیصل آباد");
    expect(text).toContain("تشخیص نہیں کر سکتا");
    expect(text).toContain("گندم");
    expect(text).toContain("فیصل آباد");
    expect(text).toContain("زرعی ماہر");
    expect(text.toLowerCase()).not.toContain("pesticide");
  });

  it("photo prompt is Urdu, strict, and names crop + district", () => {
    const prompt = buildPhotoPrompt({
      question: "پتے پیلے ہو رہے ہیں",
      cropEn: "Wheat",
      cropUr: "گندم",
      districtEn: "Faisalabad",
      districtUr: "فیصل آباد",
    });
    expect(prompt).toContain("اردو");
    expect(prompt).toContain("Wheat");
    expect(prompt).toContain("Faisalabad");
    expect(prompt).toContain("پتے پیلے ہو رہے ہیں");
    expect(prompt).toContain("CANNOT confirm");
    expect(prompt).toContain("Never prescribe a pesticide");
  });
});
