# Bolo, Dekho, Jaano — AgriYield Voice Slice

**Catalyst Solo AI Hackathon (Unstop × Makers Need More) — Sat Nov 15, 2026, 7-hour online sprint.**
**Participant:** Umar Shareef (solo). **Demo:** a farmer speaks a question in Urdu (or uploads a photo of a crop problem) → taps one button → hears and sees one clear Urdu answer with the weather, soil and price facts behind it.

Live demo URL: _(added after Vercel deploy — see Deploy below)_

## What is new here (the Catalyst work)

This repo is a **vertical slice, not a resubmission** of AgriYield Advisor:

| New in this slice | Where |
|---|---|
| Urdu voice input — browser Web Speech API, `ur-PK`, live transcript shown on screen | `app/page.tsx` (mic button) |
| Spoken Urdu answer — SpeechSynthesis, `ur-PK` voice when the browser has one, with a stop button | `app/page.tsx` (`speak` / `stopSpeaking`), `lib/voice.ts` (`pickUrduVoice`, `cleanTextForSpeech`) |
| Crop-photo turn — upload/capture → one Urdu answer, with an explicit "a photo alone cannot diagnose" limit | `app/api/photo/route.ts`, `lib/photo.ts`, `lib/voice.ts` (`photoFallbackAnswer`, `buildPhotoPrompt`) |
| Single-screen Urdu-first UI (RTL) — one question, one answer, sources labelled, Method & limits always visible | `app/page.tsx`, `app/globals.css` |
| Photo + voice helpers and their tests | `lib/voice.ts`, `lib/voice.test.ts`, `lib/photo.ts`, `lib/photo.test.ts` |

## What is reused (disclosed, not hidden)

The **answer engine** is reused from AgriYield Advisor (DATANOVA 2026 submission, live at https://agriyield-advisor.vercel.app/): `lib/agent.ts`, `lib/orchestrate.ts`, `lib/intent.ts`, `lib/weather.ts`, `lib/soil.ts`, `lib/market.ts`, `lib/yield.ts`, `lib/revenue.ts`, `lib/plan.ts`, `lib/compare.ts`, `lib/backtest.ts`, `lib/districts.ts`, `lib/timeout.ts`, `data/*.json`, and their tests — copied verbatim from `~/workspace/datanova/app/`, with the same house rules (see that app's `AGENTS.md`): every number comes from a named live source, a dated reference dataset, or a fitted model whose method is shown; market prices are labelled REFERENCE, never live; Gemini is optional (`GEMINI_API_KEY` at deploy time only) and the deterministic fallback is always labelled.

**Why this is a distinct entry:** the Catalyst demo is one new capability the base app does not have — a farmer who cannot type can now use it by voice and by photo. The engine is the grounding; the slice is the new front door. No DATANOVA artefact (submission text, video, Devpost page) is reused or resubmitted here.

**Reuse-rule note (honest):** the Catalyst Unstop page publishes no rule about prior/ongoing work. This is being confirmed in the Telegram group before the event (see `RISKS.md` §3). If reuse is banned, the fallback is to rebuild this same demo path as a fresh standalone page inside the 7-hour window, voice turn only.

## The two demo turns

1. **Voice (primary):** tap 🎙️, speak _"گندم کی فصل کو اس ہفتے کتنا پانی چاہیے؟"_ → transcript appears → tap "جواب سنو" → written + spoken Urdu answer (7-day water need, weather, soil, dated price reference), every fact labelled with its source.
2. **Photo (secondary):** upload/take one photo (e.g. yellowing wheat leaves) → tap "تصویر سے پہچانو" → one Urdu answer: what is most likely visible, what to check next, and what a photo alone cannot confirm. Needs the live Gemini call when a key is set; without it, an honest deterministic checklist answer is returned and labelled as fallback.

Full verbatim script: `docs/DEMO-SCRIPT.md`. Pitch: `PITCH-SCRIPT.md`.

## Honesty rules (carried over from AgriYield)

- Live data is labelled live (Open-Meteo weather, ISRIC SoilGrids soil); market prices are dated REFERENCE (AMIS Punjab), never today's rate.
- Yield forecast is a trend baseline with a band, never a single magic number; revenue is GROSS, before costs, never profit.
- The photo turn never diagnoses a disease and never prescribes a pesticide.
- A failed live source degrades to an honest "unavailable", never an invented number.

## Run locally

```bash
npm install
npm test        # vitest — engine tests + voice/photo tests
npm run dev     # http://localhost:3000
npm run build   # production build check
```

Optional env var (deploy time only, never committed): `GEMINI_API_KEY` — enables the Gemini-primary answer and the Gemini photo turn. Without it, everything works on the labelled deterministic fallback.

## Deploy (Vercel, free tier)

1. Create a public GitHub repo and push this folder (no secrets — `.gitignore` excludes `.env*`, `node_modules`, `.next`).
2. In Vercel: Add New Project → import the repo → framework Next.js → deploy (no env vars required; add `GEMINI_API_KEY` later if available).
3. Verify the public URL cold: open it in a second browser, run Turn 1 (typed question first), then Turn 2 (photo). Record the ≤3-min demo video from the live URL.

## Files

- `app/page.tsx` — the voice slice UI · `app/layout.tsx` · `app/globals.css`
- `app/api/ask/route.ts` — voice/text turn · `app/api/photo/route.ts` — photo turn
- `lib/voice.ts` + `lib/voice.test.ts` · `lib/photo.ts` + `lib/photo.test.ts` (NEW)
- `lib/*.ts` + `data/*.json` — AgriYield engine, reused verbatim (see above)
- `DEMO-PLAN.md` · `PITCH-SCRIPT.md` · `RISKS.md` · `SCAFFOLD.md` · `STATUS-2026-11-12.md` · `docs/DEMO-SCRIPT.md`
