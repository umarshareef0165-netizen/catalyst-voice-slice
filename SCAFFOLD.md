# Catalyst Solo AI Hackathon — Scaffold Plan

**Purpose:** everything that can be prepared *before* the 7-hour window, so the window itself is spent on the AI feature + demo, not on setup.
**Hard boundary:** this is generic boilerplate ONLY. **No demo feature code is built here** — the reuse rule (whether prior/ongoing work may be reused) is UNVERIFIED, and the demo feature itself is written inside the event window, not before it. If the Telegram group confirms reuse is allowed, the slice is built onto AgriYield; if it requires fresh code, the same demo path is built as a standalone page in-window (see DEMO-PLAN.md §5 guardrails).

---

## 1. Repo structure (skeleton — in this folder)

```
catalyst-2026/
├── DEMO-PLAN.md          # the plan (this track's working doc)
├── PITCH-SCRIPT.md       # 3-minute pitch + failure lines
├── SCAFFOLD.md           # this file
├── RISKS.md              # risk list + guardrails
├── STATUS-2026-11-12.md  # done / blocked tracker
├── app/
│   ├── page.tsx          # starter UI shell (generic placeholder only)
│   └── layout.tsx        # minimal layout (title, lang="ur", dir note)
├── public/
│   └── README.md         # placeholder for the demo photo asset (added in-window)
├── docs/
│   └── DEMO-SCRIPT.md    # the two demo turns, verbatim (written Hour 0–1)
└── vercel.json           # deploy config (framework preset filled at deploy time)
```

**What the skeleton contains:** directory layout, a minimal starter page with a heading + one button placeholder + a note that the demo feature is added in-window, a minimal layout, and deploy config. **What it deliberately does NOT contain:** voice recognition code, TTS wiring, photo-upload handling, any call to Gemini/ weather/ soil APIs, any AgriYield code copied in, any answer logic. Those are the demo feature, and they are written in Hours 1–5 of the event window.

## 2. Deploy config

- **Target:** Vercel (same host as AgriYield Advisor), free tier, one public URL, no login wall, no auth gating that could block judges.
- **vercel.json:** kept minimal in this skeleton (framework preset to be set when the real app is connected at deploy time — do not hardcode a framework here; the AgriYield repo's framework/version must be confirmed from that repo before connecting).
- **Pre-event deploy check (Nov 13–14, after Buffer is submitted):** verify a Vercel deploy from this skeleton succeeds end to end (a "hello" page), so deploy itself is a known-good step on event day. Delete or replace the placeholder page in-window; never submit the placeholder.
- **Environment:** no secrets are stored in this repo. Any API key needed in-window (e.g. the Gemini key AgriYield already uses) is set in Vercel env vars at deploy time, never pasted in chat and never committed. If the key is unavailable in-window, the demo runs on the labelled deterministic fallback alone — the voice/text turn must work without it.

## 3. Starter UI shell (what it is and is not)

- **It is:** one page, Urdu-first heading ("Bolo, Dekho, Jaano"), one microphone button placeholder, one text-input placeholder, one answer-area placeholder, one "Method & limits" line. Large tap targets, mobile-readable, no login.
- **It is not:** the demo. The placeholders do nothing until the feature code is written in-window. Do not record a video of the shell, do not show it to judges, do not mistake it for progress.
- **Accessibility note for the build:** the farmer-facing UI must work by voice + one tap; every answer must be readable at a glance and speakable aloud. Keep the page to one screen — no navigation, no menus, no second page.

## 4. Pre-event checklist (Nov 13–14, after Buffer is submitted)

- [ ] Skeleton deploy to Vercel verified (placeholder page loads at a public URL).
- [ ] AgriYield repo located; framework/version + Gemini call path + fallback behaviour confirmed from the repo (not assumed).
- [ ] Demo photo shortlisted (one clear crop-problem photo, e.g. yellowing wheat leaves) — stored locally, not yet wired in.
- [ ] Exact Urdu demo question written down and tested once against the *existing* AgriYield text path (typed), so the expected answer shape is known before the event.
- [ ] Microphone + speaker tested on the actual demo device/browser (ur-PK speech recognition + synthesis availability varies — find out before the clock starts).
- [ ] Telegram + WhatsApp joins done by him; pinned instructions pasted (see STATUS-2026-11-12.md).

## 5. In-window build order (summary — detail in DEMO-PLAN.md §5)

1. Hour 0–1: lock demo path, write `docs/DEMO-SCRIPT.md` verbatim.
2. Hours 1–3: voice in → existing answer path → spoken Urdu answer.
3. Hour 3–4: photo turn.
4. Hour 4–5: fallbacks + polish only.
5. Hour 5–6: deploy, verify live on a second device, record video.
6. Hour 6–7: freeze, submit, present. No code after the freeze.
