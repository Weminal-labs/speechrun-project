# UAT: Multi-Agent Dialogue (Phase 2 + Phase 3)

> Generated: 2026-04-01
> UAT Status: `in progress — awaiting user sign-off`

---

## Test: Multi-Agent Dialogue

Your app is running at **http://localhost:5173/**. Open it in your browser, then work through these steps.

---

**Before you start — important note about AI features**

The AI parts of this app (repo analysis and dialogue generation) require a connection to
Cloudflare's AI service. If you have not yet authenticated with Cloudflare by running
`wrangler login`, those steps will return an error — that is expected and not a bug in
the app itself. Steps 1–3 below test the visual interface and error handling without
needing AI. Steps 4–7 require Cloudflare authentication to be working.

---

**Step 1 — The app loads with the right look and feel**

Go to: http://localhost:5173/

You should see:
- A dark navy/dark blue background that fills the whole screen
- An ASCII art logo near the top of the page (a text-art graphic made up of characters like `/`, `\`, `|`)
- Monospace (typewriter-style) font throughout — it should look like a terminal or command line
- A three-panel layout: a narrow left panel, a wide centre panel, and a right panel
- In the centre panel, an input field with a `~ $` prompt symbol to its left
- The left panel is either empty or shows a placeholder label like "context" or "sidebar"

If anything looks wrong: tell me which part looks off and I'll fix it.

---

**Step 2 — The input field is ready to accept a URL**

In the centre panel, click on the input field next to the `~ $` prompt.

Do this:
1. Click anywhere on or near the `~ $` prompt area in the centre panel
2. Check that a text cursor appears inside the field

You should see:
- A blinking text cursor in the input field, showing it is active and ready to type

---

**Step 3 — Typing an invalid URL shows an error inline**

Do this:
1. Click the input field next to the `~ $` prompt
2. Type: `not-a-url`
3. Press Enter

You should see:
- An error message appear directly in the centre panel, below or near the input field
- The message should say something like: `That doesn't look like a valid GitHub URL. Try: https://github.com/owner/repo`
- The message should appear in the same terminal-style text as the rest of the app — not a pop-up or a red alert box
- The input field should remain visible so you can try again

If the error does not appear, or a different message appears, tell me exactly what you see.

---

**Step 4 — Typing a non-existent GitHub repo shows "Repository not found"**

Do this:
1. Click the input field
2. Clear any text already in it
3. Type: `https://github.com/thisowner-definitely-does-not-exist/thisrepo-definitely-does-not-exist`
4. Press Enter

You should see:
- A loading indicator appear first (something like `analyzing...` or a spinner in terminal style)
- Then, after a few seconds, an error message like: `Repository not found. Make sure it is public and the URL is correct.`
- The error appears inline in the centre panel — not a pop-up

If you see a different error message or nothing at all, tell me what you see.

---

**Step 5 — Submitting a valid public GitHub URL starts the analysis**

Note: this step requires Cloudflare authentication to be working. If it is not set up,
you will see a "Failed to analyse the repository" error — that is expected. Skip to
Step 8 if that is your situation.

Do this:
1. Click the input field
2. Clear any text already in it
3. Type: `https://github.com/cloudflare/workers-sdk`
4. Press Enter

You should see (in order):
- The loading state activates immediately — something like `analyzing...` appears in the centre panel
- The input field becomes inactive while loading is happening (you cannot type another URL)
- After 10–30 seconds, the loading message changes to something like `generating podcast...`
- The left sidebar starts to fill in with generated content about the repo

If the app freezes, shows a blank screen, or an unexpected error appears, copy the error
text and tell me exactly what it says.

---

**Step 6 — The left sidebar shows the generated codebase context**

After Step 5 completes, look at the left sidebar panel.

You should see:
- Structured information about the cloudflare/workers-sdk repository
- Sections covering things like: tech stack, architecture summary, key components, or suggested podcast topics
- The content is displayed in terminal-style text — plain text or simple labels, not a styled card layout
- The information refers to the actual repo (mentions JavaScript, TypeScript, Wrangler, or similar tools relevant to that project)

If the sidebar is empty or shows placeholder text like "context will appear here", tell me.

---

**Step 7 — Dialogue bubbles appear in the centre panel**

After the left sidebar fills in (Step 6), watch the centre panel.

You should see (in order):
1. A status message like `generating podcast...` while dialogue is being created
2. After 30–60 seconds, conversation bubbles start appearing in the centre panel
3. The first bubble is from **Nova** — her name should appear in orange text
4. The second bubble is from **Aero** — his name should appear in purple text
5. They alternate: Nova, Aero, Nova, Aero...
6. Each bubble shows a short paragraph of natural-sounding conversational text (2–4 sentences) — it should read like two people talking, not a bulleted list
7. Each bubble has a small label showing an emotion — for example: `curious`, `enthusiastic`, `thoughtful`, `matter-of-fact`, `amused`, `concerned`, or `impressed`
8. After all turns arrive, a message appears like: `podcast dialogue complete (24 turns)` or similar

Tell me if:
- The bubbles never appear (only the loading message stays)
- Nova and Aero are not colour-coded differently
- The emotion labels are missing
- The text looks like code, JSON, or a bulleted list instead of natural conversation

---

**Step 8 — The audio player area is visible but not functional (this is expected)**

Scroll down or look at the bottom or right panel of the app.

You should see:
- An audio player widget — it might show a play button, a progress bar, or speaker names
- The play button does nothing when you click it (audio generation is not built yet — this is Phase 4)

This is not a bug. The audio player is a placeholder for the next phase of development.

You should see: a visible audio player area that looks designed but does not play audio when clicked.

If the audio player widget is completely missing from the page, tell me.

---

**Step 9 — Error handling when AI is unavailable**

Try this on purpose:

If the AI calls are failing because Cloudflare authentication is not set up, do this:
1. Click the input field
2. Type: `https://github.com/cloudflare/workers-sdk`
3. Press Enter

You should see:
- The loading state appears briefly (`analyzing...`)
- Then an error message appears like: `Failed to analyse the repository. Please try again.`
- The error appears inline in the centre panel near the input field
- The input field becomes active again so you can try a different URL

If you see a blank screen, an unformatted error dump, or the app crashes entirely, tell me.

---

## When you're done testing

Tell me one of these:
- **"Everything looks good"** — and I'll move on to the next task
- **"[Step N] didn't work"** — describe what you saw and I'll fix it
- **"I saw an error"** — copy and paste any red text or error messages you see

---

## Quick reference: what each colour means

| Colour | What it is |
|--------|-----------|
| Orange text | Nova speaking (the product manager host) |
| Purple text | Aero speaking (the developer host) |
| Any other terminal-style text | App status messages and prompts |
