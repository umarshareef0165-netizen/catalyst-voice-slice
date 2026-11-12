# Catalyst Solo AI Hackathon — Demo Plan

**Event:** Sat Nov 15, 2026 — 7-hour online sprint (Unstop × Makers Need More)
**Event window:** Fri Nov 14, 7:30 PM PT – Sat Nov 15, 6:30 AM PT
= Sat Nov 15, 9:00 AM–8:00 PM IST = Sat Nov 15, 8:30 AM–7:30 PM PKT
**Exact 7-hour slot inside that window: UNVERIFIED** — confirm from the Telegram pinned messages (see RISKS.md).
**Participant:** Umar Shareef — REGISTERED Nov 7, 2026, solo, free.
**Prize:** ₹15,000 (~$160) to the winner(s); finalists may work with the MnM core team; certificates + pre-placement interviews advertised (India-focused, UNVERIFIED for a Pakistan-based participant).
**Prepared:** Thu Nov 12, 2026. **Status: plan + scaffold only — NO demo feature code built** (reuse rule unverified; see SCAFFOLD.md).

---

## 1. The pick — AgriYield Voice Slice

### Pick justification

**Picked idea: a 7-hour vertical slice of AgriYield Advisor — "Bolo, Dekho, Jaano" (Speak, See, Know): Urdu voice + crop-photo input → one spoken + written farming answer.**

Why this is the most demoable of the three candidates in 7 hours:

- **It starts from a working, live product, not a blank page.** AgriYield Advisor is already live at https://agriyield-advisor.vercel.app/ and already submitted to DATANOVA (Nov 9): Urdu-first ask box, live 7-day weather (Open-Meteo, 25 Punjab districts), live soil data (ISRIC SoilGrids), dated REFERENCE market prices, a backtested yield model, irrigation water need, and a Gemini-primary agent with a labelled deterministic fallback. A fresh build in 7 hours can only ever be a sketch; a slice of this is a *complete, runnable demo* on day one.
- **The new slice is exactly one visible capability, and it is the capability the base app does not yet have:** a farmer speaks a question in Urdu (or photographs a crop problem) and gets an answer back in Urdu — spoken aloud as well as written. That is a single, watchable moment a judge can follow without any explanation, which is precisely what wins a beginner-friendly field with no published criteria: clear, complete, runnable.
- **It reuses the hardest parts for free.** Grounding (weather, soil, prices, yield model) already exists and is already honest (dated REFERENCE prices, gross revenue never profit, Method & limits section). The 7 hours go only into the new input/output layer — voice in, voice out, photo in — instead of rebuilding data plumbing.
- **It is the honest story.** The demo is "AgriYield, now usable by a farmer who cannot type" — a real accessibility gap for Pakistan's smallholder farmers, most of whom are more comfortable speaking than typing in Urdu script. That is a one-sentence problem a judge remembers.
- **Why not the alternatives?** A CareSooner-style explainer in a new domain would mean a new knowledge base + new safety rules in 7 hours — a fresh build with no live asset behind it. ShepherdAI is already earmarked for the AI for Church Hackathon (due Nov 27) and building it now would split that track's preparation and risk presenting the same project twice. The AgriYield slice keeps every track's asset distinct.

### The one-sentence demo path

> A farmer speaks one question in Urdu (or uploads one photo of a crop problem) → taps one button → hears and sees one clear Urdu answer with the weather, soil and price facts behind it.

### What could go wrong

1. **Reuse rule.** The Unstop page says nothing about prior/ongoing work. If the rules require code written only inside the 7 hours, the slice as planned (built on AgriYield) could be disqualified — **this is the single biggest risk; it must be confirmed in the Telegram group before the event, and the fallback is to build the same slice as a fresh standalone page in the window.**
2. **Voice reliability on the day.** Urdu speech recognition (ur-PK) and text-to-speech quality vary by browser/device; a failed live voice turn in front of judges kills the demo. Mitigation: typed Urdu/Roman Urdu input is always available as the backup path, and the demo video is recorded with the working path.
3. **Photo understanding needs an LLM call.** If the Gemini key/quota fails mid-sprint, the photo path dies. Mitigation: the voice/text path works on the deterministic fallback alone; the photo path is the *second* demo turn, never the only one.
4. **Timezone / slot confusion.** The event runs overnight PT and daytime PKT; showing up for the wrong 7 hours is a total loss. Mitigation: confirm the exact slot from the pinned messages and block the full window + 1-hour buffer (see RISKS.md).

---

## 2. The single demo path, step by step

The demo has **exactly two turns** — one primary, one secondary. Nothing else is shown live.

**Turn 1 — Voice (primary, the whole pitch):**
1. Judge/user opens the deployed demo page (one URL, no login, no setup).
2. They tap the microphone button and speak one question in Urdu, e.g. *"Gandum ki fasal ko is haftay kitna pani chahiye?"* (How much water does the wheat crop need this week?)
3. The spoken question appears as transcribed Urdu text on screen (so the judge sees what was heard).
4. They tap one button: **"Jawab Suno" / Get answer**.
5. The app answers in Urdu — written on screen **and** spoken aloud — giving: (a) the irrigation water need for the week, (b) the 7-day weather behind it, (c) the soil fact behind it, (d) one dated market-price reference if relevant. Each fact is labelled with its source.
6. A small "Method & limits" line stays visible: what is live data, what is a dated reference, what the answer is not (never a diagnosis, never a profit promise).

**Turn 2 — Photo (secondary, only if Turn 1 works):**
1. The user uploads (or takes) one photo of a crop problem, e.g. yellowing wheat leaves.
2. One button: **"Tasveer se pehchano" / Identify from photo**.
3. The app returns one Urdu answer: what the image most likely shows, what to check next, and what it cannot confirm from a photo alone — with the same spoken-audio option.

**If anything fails live:** fall back to the typed question (same answer path, same screen) and narrate the failure honestly — "voice input failed on this device; the typed path gives the same answer." Never fake a voice turn.

---

## 3. Features in scope

| # | Feature | Notes |
|---|---|---|
| 1 | Voice input (Urdu, ur-PK) via browser speech recognition, with live transcript shown | Primary input; typed Urdu/Roman Urdu/English always available as backup |
| 2 | One-question → one-answer flow reusing AgriYield's existing grounding (weather, soil, dated prices, yield/irrigation logic) | No new data sources; no new model training |
| 3 | Spoken Urdu answer (text-to-speech) + written Urdu answer on the same screen | The "speak, see, know" moment |
| 4 | Photo upload → one Urdu answer about the visible crop problem, with an explicit "cannot confirm from a photo alone" limit | Secondary turn; LLM-backed; degrades gracefully to text-only if the call fails |
| 5 | Source labels on every fact (live vs dated REFERENCE) + visible Method & limits line | Carried over from AgriYield; this is the honesty that DATANOVA already accepted |
| 6 | Deployed public URL + short demo video (≤3 min) recorded from the live app | The showcase artefact, recorded even if the format turns out not to require it |

## Explicitly OUT of scope

- Any new crop, district, or data source beyond what AgriYield already covers.
- User accounts, login, history, or saved chats.
- A second language UI, a mobile app, or offline mode.
- Any ML model training or fine-tuning (nothing is trained in 7 hours).
- Profit promises, yield guarantees, disease diagnosis, or pesticide prescriptions — the answer must say what it cannot do.
- Dashboard, admin panel, analytics, or multi-user features.
- Rebuilding AgriYield itself — the slice is a new front door on the existing engine, not a rewrite.
- Any feature that does not appear on the demo path above. If it is not in Turn 1 or Turn 2, it does not get built.

---

## 4. Tech stack (reuse his existing stack)

- **Base:** AgriYield Advisor as it stands — live at https://agriyield-advisor.vercel.app/ (Vercel-hosted web app; Gemini-primary agent with labelled deterministic-template fallback; Open-Meteo weather; ISRIC SoilGrids soil data; dated AMIS Punjab REFERENCE prices; FAO/OWID yield series). *Exact framework/version to be confirmed from the AgriYield repo at build time — do not assume; the scaffold in this folder is framework-agnostic boilerplate.*
- **New in the slice:** browser Web Speech API (SpeechRecognition `ur-PK` + SpeechSynthesis `ur-PK`) for voice in/out — no new paid service; image upload → existing Gemini call path for the photo turn.
- **Deploy:** Vercel (same as AgriYield) — one public URL, no login wall.
- **Video:** screen recording of the live deployed app (his screen/voice), ≤3 min, uploaded publicly (YouTube).
- **Repo:** see SCAFFOLD.md — generic skeleton only, pre-built before the event window; the demo feature code is written inside the 7 hours, not before.

---

## 5. The 7-hour schedule (hour by hour)

Times are relative to the confirmed 7-hour slot start (Hour 0). All times assume the slot confirmed from Telegram; if the slot is the full 9:00 AM–8:00 PM IST window, Hour 0 = 9:00 AM IST = Sat Nov 15, 8:30 AM PKT = Fri Nov 14, 7:30 PM PT.

| Hour | Clock (if slot = 9 AM IST) | Work | Exit criterion |
|---|---|---|---|
| **0–1** | 9:00–10:00 AM IST / 8:30–9:30 AM PKT / 7:30–8:30 PM PT Fri | **LOCK the demo path.** Confirm the slot, submission format and reuse rule from the pinned messages one last time. Write the two demo turns verbatim (exact Urdu question, exact expected answer shape). Pick the one photo to use. No code yet. | Demo path written down in one page; the exact question + photo chosen. |
| **1–2** | 10:00–11:00 AM IST | Voice input + transcript display, wired to the existing AgriYield answer path. Typed input already works — verify it first, then add voice. | Speaking a question shows the transcript and returns the existing text answer. |
| **2–3** | 11:00 AM–12:00 PM IST | Spoken Urdu answer (TTS) + source labels on the answer screen. | Answer is heard in Urdu and seen in Urdu with sources labelled. |
| **3–4** | 12:00–1:00 PM IST | Photo upload → one Urdu answer, with the "cannot confirm" limit. | Photo turn returns one Urdu answer end to end. |
| **4–5** | 1:00–2:00 PM IST | Polish the single path only: loading states, error fallbacks (voice fails → typed path; LLM fails → deterministic fallback), Method & limits line. Cut anything not on the demo path. | Every failure mode shows an honest fallback, never a blank screen. |
| **5–6** | 2:00–3:00 PM IST | **Deploy + verify live.** Deploy to Vercel, open the public URL on a second device/browser, run Turn 1 and Turn 2 live. Record the short demo video (≤3 min) from the live app. | Public URL works cold; video recorded and uploaded. |
| **6–7** | 3:00–4:00 PM IST | **FREEZE + SUBMIT + PRESENT.** Code freeze at the start of this hour — no new features after Hour 6, only submission text. Submit in the confirmed format; present/showcase as instructed. | Submission confirmed (screenshot the confirmation); showcase done. |

### The freeze-an-hour-early rule

- **Code freeze is at the end of Hour 6 (one hour before the slot ends), not at the deadline.** After the freeze, only submission-form text and the presentation may change. Any bug found after the freeze is either fixed by deleting the broken turn from the demo (fall back to the typed path) or left as-is and disclosed — never fixed with a rushed patch.
- **Rehearse the 3-minute pitch** (PITCH-SCRIPT.md) at least twice in Hour 6, out loud, timed, against the live URL — not against localhost.

### Schedule guardrails

- Buffer (due Fri Nov 13, 11:59 PM PT) and DSH CareSooner edits (due Fri Nov 14, 11:45 PM PT) are locked **before** this event starts. No Catalyst work touches Nov 13 or Nov 14 daytime PKT until those two are done.
- If the reuse rule comes back as "fresh code only", the Hour 0–1 lock changes: the slice is rebuilt as a standalone page in-window using the same demo path, and Hours 1–5 shrink to the voice turn only (drop the photo turn first).
- If the exact slot is not the 9 AM IST start, shift this table by the confirmed start time; the relative hours do not change.
