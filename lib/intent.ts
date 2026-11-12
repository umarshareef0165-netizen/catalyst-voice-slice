/**
 * Lightweight intent detection for farmer questions.
 * Handles Urdu script, Roman Urdu, and English — keyword based, no LLM.
 * The agent never guesses a crop or district it cannot find: it returns
 * null and the orchestrator falls back to the UI-selected values.
 */
import { districtFromText, type District } from "./districts";

export type CropKey = "wheat" | "rice" | "maize" | "cotton" | "sugarcane";
export type Intent =
  | "irrigation"
  | "rain"
  | "sowing"
  | "price"
  | "yield"
  | "weather"
  | "fertilizer"
  | "general";

export interface DetectedIntent {
  language: "ur" | "roman" | "en";
  intents: Intent[];
  crop: CropKey | null;
  district: District | null;
}

const CROP_WORDS: Array<{ key: CropKey; words: string[] }> = [
  { key: "wheat", words: ["wheat", "gandum", "gandam", "گندم"] },
  { key: "rice", words: ["rice", "chawal", "chaval", "munji", "مونجی", "چاول"] },
  { key: "maize", words: ["maize", "makai", "makkai", "corn", "مکئی"] },
  { key: "cotton", words: ["cotton", "kapas", "kapass", "phutti", "کپاس"] },
  { key: "sugarcane", words: ["sugarcane", "ganna", "gana", "sugar cane", "گنا"] },
];

const INTENT_WORDS: Array<{ intent: Intent; words: string[] }> = [
  {
    intent: "irrigation",
    words: ["pani", "پانی", "irrigat", "sinchai", "sichai", "water", "abpashi", "آبپاشی"],
  },
  {
    intent: "rain",
    words: ["barish", "بارش", "rain", "barsaat", "barsat", "موسم"],
  },
  {
    intent: "sowing",
    words: ["sow", "sowing", "bovai", "bowai", "بوائی", "kasht", "کاشت", "beej", "بیج", "plant"],
  },
  {
    intent: "price",
    words: ["qeemat", "قیمت", "price", "rate", "mandi", "منڈی", "bech", "sell", "bhao", "بھاؤ"],
  },
  {
    intent: "yield",
    words: ["paidawar", "پیداوار", "yield", "production", "fasil", "فصل"],
  },
  {
    intent: "weather",
    words: ["mausam", "موسم", "weather", "temperature", "garmi", "sardi", "thand", "گرمی", "سردی"],
  },
  {
    intent: "fertilizer",
    words: ["khaad", "کھاد", "fertilizer", "fertiliser", "urea", "dap", "یوریا"],
  },
];

export function detectLanguage(text: string): "ur" | "roman" | "en" {
  // Urdu script lives in the Arabic Unicode block.
  if (/[\u0600-\u06FF]/.test(text)) return "ur";
  const romanMarkers =
    /\b(pani|barish|gandum|fasal|paidawar|qeemat|mandi|khaad|bovai|kab|kaisay|kaise|kya|hai|dun|dain|mujhe|meri|mera|is|haftay|aaj|kal)\b/i;
  if (romanMarkers.test(text)) return "roman";
  return "en";
}

export function detectIntent(question: string): DetectedIntent {
  const language = detectLanguage(question);
  const lower = question.toLowerCase();
  const intents: Intent[] = [];
  for (const { intent, words } of INTENT_WORDS) {
    if (words.some((w) => lower.includes(w.toLowerCase()) || question.includes(w))) {
      intents.push(intent);
    }
  }
  let crop: CropKey | null = null;
  for (const { key, words } of CROP_WORDS) {
    if (words.some((w) => lower.includes(w.toLowerCase()) || question.includes(w))) {
      crop = key;
      break;
    }
  }
  const district = districtFromText(question);
  return {
    language,
    intents: intents.length > 0 ? intents : ["general"],
    crop,
    district,
  };
}
