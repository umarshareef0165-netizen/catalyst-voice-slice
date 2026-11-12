# Demo script — the two turns, verbatim

**Event:** Catalyst Solo AI Hackathon, Sat Nov 15, 2026. **Demo URL:** _(live Vercel URL, added at deploy time)_.
**Setup before the demo:** district = فیصل آباد (Faisalabad), crop = گندم (Wheat). Microphone + speaker tested on the demo device. Typed backup of the Turn 1 question ready to paste.

---

## Turn 1 — Voice (primary, the whole pitch)

1. Open the deployed demo page (one URL, no login, no setup).
2. Tap the 🎙️ **"بولیں"** button and speak, clearly and slowly, in Urdu:

   > **"گندم کی فصل کو اس ہفتے کتنا پانی چاہیے؟"**
   > (How much water does the wheat crop need this week?)

3. The spoken question appears as transcribed Urdu text on screen — point at it so the judge sees what was heard.
4. Tap **"جواب سنو"**.
5. The app answers in Urdu — **written on screen and spoken aloud** — giving:
   - (a) the irrigation water need for the week (net mm + litres per acre, ET0 minus rain),
   - (b) the 7-day weather behind it (Open-Meteo, live),
   - (c) the soil fact behind it (ISRIC SoilGrids, live),
   - (d) one dated market-price reference if relevant (AMIS Punjab, labelled REFERENCE, never live).
   - Each fact is labelled with its source. The answer badge shows **Gemini** or **Deterministic fallback** — whichever actually answered.
6. A "طریقہ اور حدود" (Method & limits) line stays visible at the bottom of the page.

**Expected answer shape (fallback wording, values live):** district + crop line, then weather (today's max/min, rain), soil (pH, texture, organic carbon), market reference price if asked, yield forecast band, 7-day water need in mm and litres/acre, gross revenue estimate (before costs) if computable, and the dated plan steps. If a live source fails, the answer says so and gives only what is known.

**If voice fails live:** say "Voice input didn't catch that on this device — the typed path gives the same answer" and type the same question (the sample chip pastes it in one tap). Never fake a voice turn.

---

## Turn 2 — Photo (secondary, only if Turn 1 works)

1. Tap **"تصویر چنیں"** and upload (or take) **one photo of yellowing wheat leaves** (file: `public/demo-photo.jpg` — chosen before the event).
2. Optional note: **"پتے پیلے ہو رہے ہیں"** (The leaves are turning yellow).
3. Tap **"تصویر سے پہچانو"**.
4. The app returns **one Urdu answer**: what the image most likely shows, what to check next (leaf colour, spots, wilting, how much of the field is affected), and honestly what a photo alone **cannot confirm** — with the same 🔊 spoken-audio option.

**Expected answer shape (Gemini):** short Urdu description of what is visible, 3–4 checks, the cannot-confirm limit, no disease name presented as certain, no pesticide prescription. **(Fallback, no key):** the deterministic checklist answer, labelled "Deterministic fallback".

**If the photo turn fails live:** say "The photo path needs the live AI call and it isn't responding right now — the voice turn you just saw runs on the fallback alone, so the core demo stands."

---

## Backup (always ready)

- Same Turn 1 question typed (sample chip on the page pastes it in one tap).
- Demo video (≤3 min) recorded from the live app, played only if the live page fails to load.
