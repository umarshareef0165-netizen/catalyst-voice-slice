# Catalyst Solo AI Hackathon — Risk List

**Event:** Sat Nov 15, 2026, 7-hour online sprint (Unstop × Makers Need More). Prepared Thu Nov 12, 2026.
**Standing rule:** risks are stated honestly with what would actually break and what the fallback is. No risk is "handled" until its fix is done.

---

## 1. Timezone trap — HIGH

- **Risk:** the event window is Fri Nov 14, 7:30 PM PT – Sat Nov 15, 6:30 AM PT (Sat Nov 15, 9:00 AM–8:00 PM IST / 8:30 AM–7:30 PM PKT), but the exact 7-hour slot inside that window is UNVERIFIED. Showing up for the wrong 7 hours, or running on the wrong clock, is a total loss.
- **Fix:** confirm the exact slot + timezone from the Telegram pinned messages (his-only join). Block the full window + 1-hour buffer on the calendar. Run the day on PKT (his daytime) unless the pinned instructions say otherwise. Never assume the 7 hours are the whole 9 AM–8 PM IST window.

## 2. Submission format unknown — HIGH

- **Risk:** no problem statement, theme, judging criteria, or submission format is published on the Unstop page. It is unknown whether the showcase is a live demo, a video upload, an Unstop submission form, or a community presentation — and what length/format each requires.
- **Fix:** ask in the Telegram group (his-only) before Nov 15. Default preparation covers all formats: a live public URL + a ≤3-minute demo video + a one-page write-up (the demo path in DEMO-PLAN.md), so whichever format is announced, one artefact already exists. Do not build a second artefact until the format is confirmed.

## 3. Reuse rule unknown — HIGH (the single biggest risk)

- **Risk:** the Unstop page says nothing about whether prior/ongoing work may be reused. The entire plan (a vertical slice of AgriYield Advisor, already live and DATANOVA-submitted) depends on reuse being allowed. If the rules require code written only inside the 7 hours, the slice as planned could be disqualified.
- **Fix:** ask in the Telegram group before the event: "May we build on an existing project of ours, or must all code be written inside the 7 hours?" **No demo feature code is built before the answer** (see SCAFFOLD.md). Fallback if reuse is banned: build the same demo path as a fresh standalone page in-window, voice turn only (drop the photo turn first), using the same one-sentence demo path.

## 4. INR payout to Pakistan UNVERIFIED — MEDIUM

- **Risk:** the ₹15,000 (~$160) prize is in Indian rupees; how it is paid (UPI only? bank transfer? international transfer?) and whether a Pakistan-based winner can receive it are both UNVERIFIED. UPI is India-only in practice, and no payout route to Pakistan has been confirmed.
- **Fix:** ask in the Telegram group how the prize is paid and whether Pakistan-based winners are eligible to receive it. Do not assume, and do not let the prize be the reason for the effort: the honest value of this track is the MnM core-team opportunity + certificate + a shipped, rehearsed demo — not the cash.

## 5. Registration-close conflict — MEDIUM

- **Risk:** the close is conflicted across sources — earliest listing says Thu Nov 13, 2026, 18:30 UTC = 10:30 AM PT = 11:30 PM PKT; the Unstop text says only "7 October to 14 November 2026" with no time; a poster says Nov 14; another aggregator says Nov 15, 11:59 PM IST.
- **Fix:** registration is recorded as done Nov 7 (per brief), so this is moot if true — but verify the registration shows as confirmed on Unstop before Nov 13, 10:30 AM PT (the earliest figure). Do not discover a failed registration on Nov 15.

## 6. No published judging criteria — MEDIUM

- **Risk:** with no criteria, the demo cannot be tuned to what judges score. A technically deep build could lose to a clearer one, or vice versa.
- **Fix:** follow the convergent judge-side pattern for short sprints ("you're building a demo, not a product"): one problem, one demo path, one pitch; freeze an hour early; rehearse a 3-minute pitch. In a beginner-friendly field, the differentiator is a clear, complete, runnable demo — that is the bet this plan makes, stated openly.

## 7. Voice reliability on the day — MEDIUM

- **Risk:** Urdu speech recognition (ur-PK) and text-to-speech vary by browser/device; a failed live voice turn in front of judges kills the primary demo.
- **Fix:** test the microphone + speaker on the actual demo device before the event; keep typed Urdu/Roman Urdu input as the always-available backup path; record the demo video from a working run so a live failure still leaves a watchable artefact; use the scripted failure lines in PITCH-SCRIPT.md and never fake a voice turn.

## 8. Photo turn depends on a live LLM call — MEDIUM

- **Risk:** if the Gemini key/quota fails mid-sprint, the photo turn dies.
- **Fix:** the photo turn is the secondary turn, never the only one; the voice/text turn works on the deterministic fallback alone. If the LLM call fails, cut the photo turn from the live demo and say so honestly.

## 9. Cluster collision — GUARDRAIL (not a risk to fix, a boundary to respect)

- **This is the smallest-prize track in the Nov 13–15 cluster — ₹15,000 (~$160). It must NOT cannibalise Buffer (due Fri Nov 13, 11:59 PM PT) or DSH CareSooner edits (due Fri Nov 14, 11:45 PM PT).**
- **Rule:** no Catalyst work on Nov 13 or Nov 14 daytime PKT until Buffer is submitted and the DSH edits are locked. Catalyst preparation in this folder is planning + generic scaffold only, done after Buffer. On Nov 15, Catalyst gets its 7 hours and nothing else — it does not borrow time from HackGlobal, FreshCheck, Code for a Billion, or the CALICO form, all of which also close Nov 15.
- **If a conflict forces a choice on Nov 15:** the submitted/near-submitted tracks (DSH edits, FreshCheck, Code for a Billion) take priority over starting Catalyst, because a finished submission beats a started sprint. Say so plainly at the time; do not silently drop a track.

## 10. Eligibility / interview route — LOW (informational)

- **Risk:** "anyone interested in AI is encouraged to participate" is published, with no country exclusion — but the organiser is India-based, and the advertised pre-placement interviews and MnM core-team opportunity are India-focused and UNVERIFIED for a Pakistan-based participant.
- **Fix:** ask in the Telegram group whether the finalist opportunity and interviews are open to Pakistan-based participants. Do not claim them as outcomes in the pitch.
