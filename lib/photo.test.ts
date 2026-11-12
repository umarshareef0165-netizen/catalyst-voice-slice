import { describe, expect, it } from "vitest";
import { answerPhoto } from "./photo";

describe("photo turn", () => {
  it("returns the labelled deterministic fallback when no Gemini key is set", async () => {
    const saved = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const result = await answerPhoto({
        imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        mimeType: "image/png",
        question: "پتے پیلے ہو رہے ہیں",
        cropEn: "Wheat",
        cropUr: "گندم",
        districtEn: "Faisalabad",
        districtUr: "فیصل آباد",
      });
      expect(result.source).toBe("fallback");
      expect(result.text).toContain("تشخیص نہیں کر سکتا");
      expect(result.text).toContain("گندم");
      expect(result.fallbackReason).toContain("No Gemini API key");
    } finally {
      if (saved !== undefined) process.env.GEMINI_API_KEY = saved;
    }
  });
});
