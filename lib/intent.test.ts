import { describe, it, expect } from "vitest";
import { detectIntent, detectLanguage } from "./intent";

describe("detectLanguage", () => {
  it("detects Urdu script", () => {
    expect(detectLanguage("اس ہفتے گندم کو پانی کب دوں؟")).toBe("ur");
  });
  it("detects Roman Urdu", () => {
    expect(detectLanguage("Is haftay gandum ko pani kab dun?")).toBe("roman");
  });
  it("detects English", () => {
    expect(detectLanguage("When should I irrigate my wheat?")).toBe("en");
  });
});

describe("detectIntent", () => {
  it("detects irrigation + wheat in Roman Urdu", () => {
    const d = detectIntent("Is haftay gandum ko pani kab dun?");
    expect(d.language).toBe("roman");
    expect(d.intents).toContain("irrigation");
    expect(d.crop).toBe("wheat");
  });

  it("detects irrigation + wheat in Urdu script", () => {
    const d = detectIntent("اس ہفتے گندم کو پانی کب دوں؟");
    expect(d.language).toBe("ur");
    expect(d.intents).toContain("irrigation");
    expect(d.crop).toBe("wheat");
  });

  it("detects price + district", () => {
    const d = detectIntent("Faisalabad mein gandum ka rate kya hai?");
    expect(d.intents).toContain("price");
    expect(d.crop).toBe("wheat");
    expect(d.district?.slug).toBe("faisalabad");
  });

  it("detects sowing + yield in English", () => {
    const d = detectIntent("When should I sow wheat and what yield can I expect?");
    expect(d.language).toBe("en");
    expect(d.intents).toContain("sowing");
    expect(d.intents).toContain("yield");
    expect(d.crop).toBe("wheat");
  });

  it("falls back to general with no crop when nothing matches", () => {
    const d = detectIntent("Hello, what can you do?");
    expect(d.intents).toEqual(["general"]);
    expect(d.crop).toBeNull();
    expect(d.district).toBeNull();
  });

  it("detects a Lahore district mention in Urdu", () => {
    const d = detectIntent("لاہور میں موسم کیسا ہے؟");
    expect(d.district?.slug).toBe("lahore");
    expect(d.intents).toContain("weather");
  });
});
