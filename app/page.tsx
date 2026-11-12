"use client";

/**
 * Bolo, Dekho, Jaano — the AgriYield Voice Slice (Catalyst Solo AI Hackathon).
 *
 * NEW in this repo (the Catalyst demo layer): Urdu voice input via the
 * browser Web Speech API (SpeechRecognition, ur-PK), a spoken Urdu answer
 * (SpeechSynthesis, ur-PK voice when available), a crop-photo turn, and
 * this single-screen Urdu-first UI. The answer engine underneath is the
 * AgriYield Advisor pipeline (Open-Meteo weather, ISRIC SoilGrids soil,
 * dated AMIS Punjab reference prices, FAO/OWID yield trend) — see README.md.
 *
 * Honesty rules carried over from AgriYield: every number comes from a
 * named source, prices are labelled REFERENCE (never live), the answer
 * says what it cannot do, and a failed live source degrades to an honest
 * "unavailable" instead of an invented number.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { DISTRICTS } from "@/lib/districts";
import type { AskResult } from "@/lib/orchestrate";
import type { PhotoAnswer } from "@/lib/photo";
import {
  cleanTextForSpeech,
  pickUrduVoice,
  SPEECH_RECOGNITION_LANG,
  SPEECH_SYNTHESIS_LANG,
} from "@/lib/voice";

/** Minimal SpeechRecognition typing (not in the TS DOM lib everywhere). */
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const CROPS = [
  { key: "wheat", en: "Wheat", ur: "گندم" },
  { key: "rice", en: "Rice", ur: "چاول" },
  { key: "maize", en: "Maize", ur: "مکئی" },
  { key: "cotton", en: "Cotton", ur: "کپاس" },
  { key: "sugarcane", en: "Sugarcane", ur: "گنا" },
] as const;

const SAMPLE_QUESTION = "گندم کی فصل کو اس ہفتے کتنا پانی چاہیے؟";

export default function Home() {
  const [district, setDistrict] = useState("faisalabad");
  const [crop, setCrop] = useState("wheat");
  const [question, setQuestion] = useState("");
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  // Capability detection is derived during render, not set in an effect:
  // on the server it is null, in the browser true/false. null and true
  // render identically (button enabled, no notice), so there is no
  // hydration mismatch on a supporting browser.
  const speechCtor =
    typeof window === "undefined"
      ? null
      : ((window as unknown as {
          SpeechRecognition?: SpeechRecognitionConstructor;
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
        }).SpeechRecognition ??
        (window as unknown as {
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
        }).webkitSpeechRecognition ??
        null);
  const micSupported =
    typeof window === "undefined" ? null : speechCtor !== null;
  const ttsSupported =
    typeof window === "undefined" ? null : "speechSynthesis" in window;
  const [urduVoice, setUrduVoice] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoNote, setPhotoNote] = useState("");
  const [photoAsking, setPhotoAsking] = useState(false);
  const [photoAnswer, setPhotoAnswer] = useState<PhotoAnswer | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voicesRef = useRef<Array<{ lang: string; name: string }>>([]);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis
        .getVoices()
        .map((v) => ({ lang: v.lang, name: v.name }));
      voicesRef.current = voices;
      setUrduVoice(pickUrduVoice(voices) !== null);
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.speechSynthesis.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    const Ctor = speechCtor;
    if (!Ctor) {
      setMicError("اس براؤزر میں آواز کی پہچان دستیاب نہیں — لکھ کر پوچھیں۔");
      return;
    }
    setMicError(null);
    setTranscript("");
    const rec = new Ctor();
    rec.lang = SPEECH_RECOGNITION_LANG;
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (interim) setTranscript(interim);
      if (finalText.trim()) {
        setQuestion((prev) =>
          prev.trim() ? `${prev.trim()} ${finalText.trim()}` : finalText.trim(),
        );
        setTranscript("");
      }
    };
    rec.onerror = (event) => {
      setListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setMicError("مائیکروفون کی اجازت نہیں ملی — براؤزر کی اجازت دیں یا لکھ کر پوچھیں۔");
      } else if (event.error === "no-speech") {
        setMicError("کچھ سنائی نہیں دیا — دوبارہ بولیں یا لکھ کر پوچھیں۔");
      } else {
        setMicError(`آواز کی پہچان ناکام رہی (${event.error}) — لکھ کر پوچھیں۔`);
      }
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setMicError("مائیکروفون شروع نہیں ہوا — لکھ کر پوچھیں۔");
    }
  }, [speechCtor]);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      cleanTextForSpeech(text),
    );
    utterance.lang = SPEECH_SYNTHESIS_LANG;
    const voice = pickUrduVoice(window.speechSynthesis.getVoices());
    if (voice) {
      const match = window.speechSynthesis
        .getVoices()
        .find((v) => v.name === voice.name && v.lang === voice.lang);
      if (match) utterance.voice = match;
    }
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const ask = useCallback(async () => {
    const q = question.trim();
    if (!q || asking) return;
    stopListening();
    stopSpeaking();
    setAsking(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, district, crop }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Server error (${res.status}).`);
      setResult(data as AskResult);
    } catch (err) {
      setError(`جواب نہیں مل سکا: ${(err as Error).message}`);
    } finally {
      setAsking(false);
    }
  }, [question, district, crop, asking, stopListening, stopSpeaking]);

  const onPhotoChange = (file: File | null) => {
    setPhotoFile(file);
    setPhotoAnswer(null);
    setPhotoError(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const askPhoto = useCallback(async () => {
    if (!photoFile || photoAsking) return;
    setPhotoAsking(true);
    setPhotoError(null);
    setPhotoAnswer(null);
    try {
      const form = new FormData();
      form.append("image", photoFile);
      form.append("question", photoNote);
      form.append("district", district);
      form.append("crop", crop);
      const res = await fetch("/api/photo", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Server error (${res.status}).`);
      setPhotoAnswer(data as PhotoAnswer);
    } catch (err) {
      setPhotoError(`تصویر کا جواب نہیں مل سکا: ${(err as Error).message}`);
    } finally {
      setPhotoAsking(false);
    }
  }, [photoFile, photoNote, district, crop, photoAsking]);

  return (
    <main dir="rtl" lang="ur">
      <header className="hero">
        <div className="container">
          <h1>بولو، دیکھو، جانو</h1>
          <p className="sub">
            کسان بول کر پوچھے — اردو میں جواب سنے اور دیکھے۔ موسم، مٹی اور منڈی
            کے اعداد کے ساتھ۔
          </p>
          <p className="muted" style={{ color: "#d7e8d7" }}>
            AgriYield Voice Slice · Catalyst Solo AI Hackathon · 15 نومبر 2026
          </p>
        </div>
      </header>

      <div className="container">
        <section className="card" aria-label="سوال پوچھیں">
          <h2>🎙️ بول کر پوچھیں</h2>
          <div className="row">
            <div>
              <label htmlFor="district">ضلع</label>
              <select
                id="district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              >
                {DISTRICTS.map((d) => (
                  <option key={d.slug} value={d.slug}>
                    {d.nameUr} ({d.nameEn})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="crop">فصل</label>
              <select
                id="crop"
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
              >
                {CROPS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.ur} ({c.en})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className={listening ? "mic listening" : "mic"}
              onClick={listening ? stopListening : startListening}
              disabled={micSupported === false}
            >
              {listening ? "⏹ روکیں — سن رہا ہوں…" : "🎙️ بولیں"}
            </button>
            {micSupported === false && (
              <span className="muted">
                اس براؤزر میں آواز کی پہچان نہیں ہے — نیچے لکھ کر پوچھیں۔
              </span>
            )}
          </div>
          {transcript && (
            <p className="transcript" aria-live="polite">
              آپ نے کہا: {transcript}
            </p>
          )}
          {micError && <p className="error">{micError}</p>}

          <label htmlFor="question">یا یہاں لکھیں — اردو، رومن اردو یا انگریزی</label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="مثال: گندم کی فصل کو اس ہفتے کتنا پانی چاہیے؟"
            dir="auto"
          />
          <div className="chips">
            <button type="button" onClick={() => setQuestion(SAMPLE_QUESTION)}>
              {SAMPLE_QUESTION}
            </button>
          </div>

          <button
            type="button"
            className="ask"
            onClick={ask}
            disabled={asking || !question.trim()}
          >
            {asking ? "جواب تیار ہو رہا ہے…" : "جواب سنو"}
          </button>
          {error && <p className="error">{error}</p>}
        </section>

        {result && (
          <section className="card" aria-label="جواب">
            <h2>
              جواب
              <span
                className={
                  result.answer.source === "gemini" ? "badge gemini" : "badge fallback"
                }
              >
                {result.answer.source === "gemini"
                  ? "Gemini"
                  : "Deterministic fallback"}
              </span>
            </h2>
            {result.answer.fallbackReason && (
              <p className="muted">{result.answer.fallbackReason}</p>
            )}
            <p className="answer" dir="auto">
              {result.answer.text}
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                className="speak"
                onClick={() => speak(result.answer.text)}
                disabled={ttsSupported === false || speaking}
              >
                🔊 جواب سنو
              </button>
              {speaking && (
                <button type="button" className="speak stop" onClick={stopSpeaking}>
                  ⏹ روکیں
                </button>
              )}
              {ttsSupported === false && (
                <span className="muted">اس براؤزر میں بول کر جواب نہیں چلتا۔</span>
              )}
              {!urduVoice && ttsSupported && (
                <span className="muted">
                  اردو آواز دستیاب نہیں — براؤزر کی ڈیفالٹ آواز استعمال ہوگی۔
                </span>
              )}
            </div>

            {result.citations.length > 0 && (
              <>
                <h3>ذرائع — ہر عدد کا ماخذ</h3>
                <ul className="cites">
                  {result.citations.map((c, i) => (
                    <li key={i}>
                      <strong>{c.label}:</strong> {c.detail}{" "}
                      <span className="muted">({c.source})</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {result.plan.length > 0 && (
              <>
                <h3>آپ کا منصوبہ</h3>
                <ol className="plan">
                  {result.plan.map((s, i) => (
                    <li key={i}>
                      <span className="date">{s.date}:</span> {s.titleUr} —{" "}
                      {s.detailUr}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        )}

        <section className="card" aria-label="تصویر سے پہچانیں">
          <h2>📷 تصویر سے پہچانیں</h2>
          <p className="muted">
            فصل کی کوئی پریشانی دکھائی دے تو ایک تصویر بھیجیں — ایک اردو جواب
            ملے گا: کیا دکھائی دے رہا ہے، آگے کیا دیکھیں، اور تصویر اکیلی کیا
            ثابت نہیں کر سکتی۔
          </p>
          <label htmlFor="photo">تصویر چنیں (کیمرہ بھی چلتا ہے)</label>
          <input
            id="photo"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
          />
          {photoPreview && (
            <Image
              src={photoPreview}
              alt="اپ لوڈ کی گئی فصل کی تصویر"
              className="photo-preview"
              width={640}
              height={480}
              unoptimized
            />
          )}
          <label htmlFor="photo-note">تصویر کے ساتھ نوٹ (اختیاری)</label>
          <textarea
            id="photo-note"
            value={photoNote}
            onChange={(e) => setPhotoNote(e.target.value)}
            placeholder="مثال: پتے پیلے ہو رہے ہیں"
            dir="auto"
          />
          <button
            type="button"
            className="ask"
            onClick={askPhoto}
            disabled={photoAsking || !photoFile}
          >
            {photoAsking ? "تصویر دیکھی جا رہی ہے…" : "تصویر سے پہچانو"}
          </button>
          {photoError && <p className="error">{photoError}</p>}
          {photoAnswer && (
            <div style={{ marginTop: 14 }}>
              <h3>
                تصویر کا جواب
                <span
                  className={
                    photoAnswer.source === "gemini"
                      ? "badge gemini"
                      : "badge fallback"
                  }
                >
                  {photoAnswer.source === "gemini"
                    ? "Gemini"
                    : "Deterministic fallback"}
                </span>
              </h3>
              {photoAnswer.fallbackReason && (
                <p className="muted">{photoAnswer.fallbackReason}</p>
              )}
              <p className="answer" dir="auto">
                {photoAnswer.text}
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  className="speak"
                  onClick={() => speak(photoAnswer.text)}
                  disabled={ttsSupported === false || speaking}
                >
                  🔊 جواب سنو
                </button>
                {speaking && (
                  <button type="button" className="speak stop" onClick={stopSpeaking}>
                    ⏹ روکیں
                  </button>
                )}
              </div>
              <p className="muted">
                یاد رکھیں: تصویر اکیلی بیماری کی تشخیص نہیں کر سکتی — یہ جواب
                صرف رہنمائی ہے۔
              </p>
            </div>
          )}
        </section>

        <footer>
          <p>
            <strong>طریقہ اور حدود:</strong> موسم براہ راست ہے (Open-Meteo،
            اگلے 7 دن)؛ مٹی براہ راست ہے (ISRIC SoilGrids)؛ منڈی کی قیمتیں
            حوالہ ہیں (AMIS Punjab، تاریخ کے ساتھ — براہ راست ریٹ نہیں)؛
            پیداوار کا اندازہ ٹرینڈ بیس لائن ہے (FAO/OWID سیریز)۔ یہ بیماری کی
            تشخیص نہیں ہے، منافع کا وعدہ نہیں ہے، اور ضلع کے مرکز کے نقاط
            استعمال ہوتے ہیں۔
          </p>
          <p>
            انجن: AgriYield Advisor (DATANOVA 2026) — نیا کام اس سلائس میں:
            اردو آواز ان پٹ، بولا ہوا اردو جواب، تصویر والا رخ، اور یہ ایک
            صفحے والا اردو انٹرفیس۔
          </p>
        </footer>
      </div>
    </main>
  );
}
