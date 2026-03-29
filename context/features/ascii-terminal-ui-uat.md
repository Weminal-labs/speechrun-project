# UAT Checklist: ASCII Terminal UI

> Generated: 2026-03-28
> Status: pending user sign-off

---

## Test: ASCII Terminal UI

Your app is running at **http://localhost:5173**. Open it in your browser, then work through these steps one at a time.

This is a visual-only test — nothing is wired up yet and nothing should "do" anything. You are checking that everything looks right, is in the right place, and shows the right text.

---

**Step 1 — The page background fills the whole screen in deep blue**

Go to: http://localhost:5173

You should see: The entire browser window is filled with a deep blueprint blue — a dark, rich navy-blue colour. There should be no white, grey, or black areas. The background should reach all four edges of the window.

If it looks wrong, tell me: what colour is the background, and is there any white or default browser styling showing?

---

**Step 2 — The terminal window frame is visible**

Still on the same page — look at the overall layout.

You should see: A large rounded-corner rectangle sitting inside the blue background with a thin blue border around it. It should look like a terminal window or code editor floating on the page. The border is a slightly lighter blue than the background — not white, not black.

---

**Step 3 — The title bar shows the right text and the three coloured dots**

Look at the very top of the terminal window frame.

You should see:
- On the left side of the title bar: three small circles side by side — one red, one yellow, one green (like the window controls on a Mac)
- In the center of the title bar: the text `speechrun — zsh` in a muted, dimmed colour (not bright white)
- The title bar has a thin line underneath it separating it from the rest of the window

If anything is missing or the dots are the wrong colours, tell me which dot looks wrong or if the text is different from `speechrun — zsh`.

---

**Step 4 — The three window-control dots do nothing when clicked**

Try this on purpose:
1. Click the red dot
2. Click the yellow dot
3. Click the green dot

You should see: Nothing happens when you click any of the dots. They are decorative only — no popups, no actions, no changes to the page. This is expected and correct.

---

**Step 5 — The tab navigation row shows three buttons**

Look just below the title bar.

You should see: A row of three equal-width buttons spanning the full width of the terminal window, with thin blue borders between them. The three button labels are:

- `Context`
- `Conversation`
- `Sandbox`

All three are in monospace font (they should look like code text, not a regular website button font).

Try this: Hover your mouse over each button one at a time.

You should see: Each button gets a very subtle background highlight when you hover over it. The text and borders do not change dramatically — just a soft hover state.

---

**Step 6 — The ASCII art SPEECHRUN logo renders correctly**

Look below the tab navigation row.

You should see:
- A command-line style line that reads: `~ $ npx @speechrun/cli@latest` — the `~ $` part should be in a brighter accent blue, and the rest of the text in a lighter colour
- Below that, a large block-character ASCII art logo spelling out `SPEECHRUN` made up of box-drawing characters (thick square letter shapes built from lines and corners)
- Below the logo, a small dim line of text that reads: `v0.1.0 · let your code talking · Cloudflare x ElevenLabs`

The logo should look like text made out of pixel blocks — not an image, not a blurry font, but actual characters arranged to form letters. If the logo looks jumbled, misaligned, or overlapping, that is a bug — tell me what it looks like.

---

**Step 7 — The 3-panel layout is visible below the logo**

Look below the SPEECHRUN logo. The window should be divided into three vertical columns separated by thin blue border lines.

You should see:
- A narrow column on the left (roughly 20% of the width)
- A wide column in the center (roughly 50% of the width)
- A medium column on the right (roughly 30% of the width)

Each column should extend from just below the logo all the way to the bottom of the terminal window. There is a thin vertical line between the left and center columns, and another between the center and right columns.

---

**Step 8 — The left panel (Context sidebar) shows the file tree**

Look at the left column.

You should see:
- A heading at the top that reads `.: context` in an accent blue colour
- Below it, a list of folder and file names in small monospace text, each on its own line:
  - `project/` followed by three indented lines: `.: OVERVIEW.md`, `.: SCOPE.md`, `.: ROADMAP.md`
  - `technical/` followed by two indented lines: `.: STACK.md`, `.: ARCHITECTURE.md`
  - `features/` followed by one indented line: `.: waiting for analysis...`
  - `design/` followed by one indented line: `.: DESIGN_SYSTEM.md`

All the `.:` prefixes should look consistent — they are the terminal-style marker used throughout the app. The text should be small and dimmed, not bright white.

---

**Step 9 — The center panel shows the input prompt and placeholder conversation**

Look at the center column.

You should see at the top: an input field styled as a terminal prompt. It shows `~ $` on the left (in accent blue) and a placeholder text that reads `paste a github url to analyze...` in a dim, muted colour. The field has no border box around it — it blends into the panel background.

Below that, you should see three lines of placeholder conversation:

1. `[Nova]` in orange text, followed by: `Looking at this codebase, the first thing that stands out is the architecture...`
2. `[Aero]` in purple text, followed by: `Right, they're using a pretty clean separation of concerns here...`
3. `[Nova]` in orange text again, followed by: `From a product perspective, I think the most interesting decision is...`

Each speaker's lines should have a thin vertical left-border line beside the text. Above the first speaker line, there should be a dim line that reads `.: waiting for a repository to analyze...`

---

**Step 10 — The audio player skeleton is pinned to the bottom of the center panel**

Look at the very bottom of the center column.

You should see: a thin strip separated from the transcript area by a horizontal line, containing:
- A small square button on the left showing `|>` (a play button symbol in ASCII style) — it has a thin blue border around it
- A thin horizontal bar (progress bar) stretching across the middle — it should appear empty/flat with no fill
- A timestamp on the right reading `00:00 / 00:00` in a dim monospace font

Try this on purpose: Click the `|>` play button.

You should see: Nothing happens — no audio plays, no progress bar moves. This is correct and expected. The player is a visual skeleton only at this stage.

---

**Step 11 — The right panel (Sandbox) shows placeholder content**

Look at the right column.

You should see:
- A heading at the top that reads `.: sandbox` in accent blue
- A bordered rectangular placeholder box below it (roughly 12 rows tall) with two lines of text centred inside it:
  - `.: mini-app will render here`
  - `powered by Cloudflare Workers` (in a dimmer colour below)
- Below the box, two small sections:
  - `.: dependencies` with an indented line: `.: analyzing...`
  - `.: architecture` with an indented line: `.: waiting for analysis...`

---

**Step 12 — All text is in monospace font throughout**

Scan the whole page — title bar, tabs, logo text, panel headings, file names, conversation lines, timestamps, everything.

You should see: Every single piece of text looks like code — fixed-width characters where every letter takes up the same amount of space. No text should look like a regular website or Google Docs — no rounded sans-serif, no serifs.

If any section of text looks like a different font (proportional spacing, rounded letters), tell me which part of the page it is in.

---

**Step 13 — The panels fill the full height of the window**

Resize your browser window taller and shorter.

You should see: The three panels always extend to fill the available height of the terminal window. No panel should stop halfway down the page and leave an empty gap at the bottom. The audio player should always stay stuck to the bottom of the center panel no matter the window height.

---

## When you're done testing

Tell me one of these:
- **"Everything looks good"** — and I'll mark this feature as UAT passed and move on
- **"[Step N] didn't work"** — describe what you saw and I'll fix it
- **"I saw an error"** — copy any red text or error messages visible on the page
- **"Something looks off"** — describe it in plain English (colour, position, text) and I'll investigate
