/**
 * Sowing & irrigation planner — dated steps built from the crop calendar
 * and the live forecast. Every step is dated (Asia/Karachi dates) and its
 * basis is named. The calendar is the standard Punjab crop calendar
 * (PARC / UAF extension guidance): sowing windows and irrigation stages
 * for each crop. It is guidance, not a live measurement — the UI labels it.
 */
import { addDays, irrigationAdvice, todayPk, type DayForecast } from "./weather";
import type { CropKey } from "./intent";

export interface PlanStep {
  date: string; // YYYY-MM-DD
  titleEn: string;
  titleUr: string;
  detailEn: string;
  detailUr: string;
  basis: string;
}

interface CropCalendar {
  nameEn: string;
  nameUr: string;
  sowingWindow: { start: string; end: string; labelEn: string; labelUr: string };
  irrigationStages: string[];
  fertilizerNoteEn: string;
  fertilizerNoteUr: string;
}

export const CROP_CALENDARS: Record<CropKey, CropCalendar> = {
  wheat: {
    nameEn: "Wheat",
    nameUr: "گندم",
    sowingWindow: {
      start: "10-25",
      end: "11-30",
      labelEn: "Sowing window: 25 Oct – 30 Nov (best 1–15 Nov)",
      labelUr: "بوائی کا وقت: 25 اکتوبر – 30 نومبر (بہترین 1–15 نومبر)",
    },
    irrigationStages: [
      "Crown-root stage (~21 days after sowing)",
      "Tillering",
      "Booting",
      "Grain filling",
    ],
    fertilizerNoteEn:
      "Standard guidance: all DAP at sowing; urea in 2–3 splits (first at crown-root stage). Confirm the dose with your local extension office for your soil.",
    fertilizerNoteUr:
      "معیاری ہدایت: ڈی اے پی بوائی کے وقت؛ یوریا 2–3 قسطوں میں (پہلی قسط تاج جڑ کے مرحلے پر)۔ مقدار اپنی مٹی کے لیے مقامی زرعی دفتر سے تصدیق کریں۔",
  },
  rice: {
    nameEn: "Rice",
    nameUr: "چاول",
    sowingWindow: {
      start: "05-15",
      end: "07-31",
      labelEn: "Nursery: mid-May – June; transplanting: July",
      labelUr: "پنیری: مئی کے وسط – جون؛ منتقلی: جولائی",
    },
    irrigationStages: ["Nursery", "Transplanting", "Tillering", "Panicle initiation"],
    fertilizerNoteEn:
      "Standard guidance: DAP at transplanting; urea in splits at tillering and panicle initiation.",
    fertilizerNoteUr:
      "معیاری ہدایت: ڈی اے پی منتقلی کے وقت؛ یوریا قسطوں میں (ٹیلرنگ اور پینیکل کے وقت)۔",
  },
  maize: {
    nameEn: "Maize",
    nameUr: "مکئی",
    sowingWindow: {
      start: "02-01",
      end: "03-15",
      labelEn: "Spring sowing: Feb – mid-Mar (autumn: Jul – Aug)",
      labelUr: "بہار کی بوائی: فروری – مارچ کے وسط (خزاں: جولائی – اگست)",
    },
    irrigationStages: ["Germination", "Knee-high", "Tasseling", "Grain filling"],
    fertilizerNoteEn:
      "Standard guidance: DAP at sowing; urea in 2 splits (knee-high and tasseling).",
    fertilizerNoteUr:
      "معیاری ہدایت: ڈی اے پی بوائی کے وقت؛ یوریا 2 قسطوں میں (گھٹنے کی اونچائی اور ٹیسلنگ پر)۔",
  },
  cotton: {
    nameEn: "Cotton",
    nameUr: "کپاس",
    sowingWindow: {
      start: "04-01",
      end: "05-31",
      labelEn: "Sowing: April – May",
      labelUr: "بوائی: اپریل – مئی",
    },
    irrigationStages: ["Germination", "Squaring", "Flowering", "Boll formation"],
    fertilizerNoteEn:
      "Standard guidance: DAP at sowing; urea in splits at squaring and flowering.",
    fertilizerNoteUr:
      "معیاری ہدایت: ڈی اے پی بوائی کے وقت؛ یوریا قسطوں میں (مربع اور پھول کے وقت)۔",
  },
  sugarcane: {
    nameEn: "Sugarcane",
    nameUr: "گنا",
    sowingWindow: {
      start: "02-01",
      end: "03-31",
      labelEn: "Spring planting: Feb – Mar (autumn: Sep – Oct)",
      labelUr: "بہار کی کاشت: فروری – مارچ (خزاں: ستمبر – اکتوبر)",
    },
    irrigationStages: ["Germination", "Tillering", "Grand growth", "Maturity"],
    fertilizerNoteEn:
      "Standard guidance: DAP at planting; urea in splits during tillering and grand growth.",
    fertilizerNoteUr:
      "معیاری ہدایت: ڈی اے پی کاشت کے وقت؛ یوریا قسطوں میں (ٹیلرنگ اور بڑی نشوونما پر)۔",
  },
};

function inWindow(todayMmDd: string, start: string, end: string): boolean {
  // Windows do not cross the year boundary for these crops.
  return todayMmDd >= start && todayMmDd <= end;
}

export interface PlanInput {
  crop: CropKey;
  forecastDays: DayForecast[] | null;
  sowingDate?: string; // YYYY-MM-DD, if the farmer gave one
}

export function buildPlan(input: PlanInput): PlanStep[] {
  const cal = CROP_CALENDARS[input.crop];
  const today = todayPk();
  const mmdd = today.slice(5);
  const steps: PlanStep[] = [];

  // 1. Sowing window status.
  const open = inWindow(mmdd, cal.sowingWindow.start, cal.sowingWindow.end);
  steps.push({
    date: today,
    titleEn: open
      ? `Sowing window is open now — ${cal.nameEn}`
      : `Sowing window — ${cal.nameEn}`,
    titleUr: open
      ? `بوائی کا وقت ابھی کھلا ہے — ${cal.nameUr}`
      : `بوائی کا وقت — ${cal.nameUr}`,
    detailEn: cal.sowingWindow.labelEn + (open ? " You are inside the window." : " You are outside the window — wait for the next window."),
    detailUr: cal.sowingWindow.labelUr + (open ? " آپ اس وقت کے اندر ہیں۔" : " آپ اس وقت سے باہر ہیں — اگلے وقت کا انتظار کریں۔"),
    basis: "Standard Punjab crop calendar (PARC/UAF guidance)",
  });

  // 2. Irrigation from the live forecast.
  if (input.forecastDays && input.forecastDays.length > 0) {
    const advice = irrigationAdvice(input.forecastDays);
    if (advice.action === "wait") {
      steps.push({
        date: input.forecastDays[0].date,
        titleEn: "Hold off irrigation — rain is coming",
        titleUr: "پانی روک لیں — بارش آ رہی ہے",
        detailEn: advice.reasonEn,
        detailUr: advice.reasonUr,
        basis: "Open-Meteo 7-day forecast",
      });
    } else if (advice.action === "irrigate" && advice.bestDay) {
      steps.push({
        date: advice.bestDay,
        titleEn: "Irrigate — early morning",
        titleUr: "پانی دیں — صبح سویرے",
        detailEn: advice.reasonEn,
        detailUr: advice.reasonUr,
        basis: "Open-Meteo 7-day forecast",
      });
    } else {
      steps.push({
        date: today,
        titleEn: "Irrigation — check the forecast again",
        titleUr: "پانی — پیش گوئی دوبارہ دیکھیں",
        detailEn: advice.reasonEn,
        detailUr: advice.reasonUr,
        basis: "Open-Meteo 7-day forecast",
      });
    }
    // Next irrigation checkpoint in 7 days.
    steps.push({
      date: addDays(today, 7),
      titleEn: "Re-check the forecast before the next irrigation",
      titleUr: "اگلے پانی سے پہلے پیش گوئی دوبارہ دیکھیں",
      detailEn: "Weather changes fast — re-check rain and temperature before watering again.",
      detailUr: "موسم تیزی سے بدلتا ہے — دوبارہ پانی دینے سے پہلے بارش اور درجہ حرارت دوبارہ دیکھیں۔",
      basis: "Open-Meteo 7-day forecast",
    });
  } else {
    steps.push({
      date: today,
      titleEn: "Irrigation — forecast unavailable",
      titleUr: "پانی — پیش گوئی دستیاب نہیں",
      detailEn:
        "The live forecast could not be fetched right now, so no irrigation day is set. Do not water on a guess — check the forecast again shortly.",
      detailUr:
        "براہ راست پیش گوئی ابھی نہیں مل سکی، اس لیے پانی کا دن مقرر نہیں کیا گیا۔ اندازے پر پانی نہ دیں — تھوڑی دیر بعد پیش گوئی دوبارہ دیکھیں۔",
      basis: "Open-Meteo (unavailable)",
    });
  }

  // 3. Fertilizer timing (standard guidance).
  steps.push({
    date: addDays(today, 1),
    titleEn: "Fertilizer timing",
    titleUr: "کھاد کا وقت",
    detailEn: cal.fertilizerNoteEn,
    detailUr: cal.fertilizerNoteUr,
    basis: "Standard Punjab guidance — confirm dose locally",
  });

  // 4. If a sowing date was given, anchor the first irrigation stage —
  //    but only if that stage is still ahead of us.
  if (input.sowingDate) {
    const crownRoot = addDays(input.sowingDate, 21);
    if (crownRoot >= today) {
      steps.push({
        date: crownRoot,
        titleEn: "First key irrigation stage (~21 days after sowing)",
        titleUr: "پہلا اہم پانی کا مرحلہ (بوائی کے ~21 دن بعد)",
        detailEn: `You sowed on ${input.sowingDate}. The crown-root stage falls around ${crownRoot} — the most important irrigation for ${cal.nameEn}. Confirm with the forecast that week.`,
        detailUr: `آپ نے ${input.sowingDate} کو بوائی کی۔ تاج جڑ کا مرحلہ تقریباً ${crownRoot} کو آئے گا — ${cal.nameUr} کے لیے سب سے اہم پانی۔ اس ہفتے پیش گوئی سے تصدیق کریں۔`,
        basis: "Sowing date you gave + standard crop stages",
      });
    }
  }

  return steps.sort((a, b) => a.date.localeCompare(b.date));
}
