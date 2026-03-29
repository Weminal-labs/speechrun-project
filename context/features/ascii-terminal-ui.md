# Feature: ASCII Terminal UI

> **Status:** `draft`
> **Phase:** v1
> **Last updated:** 2026-03-28

---

## Summary

The ASCII Terminal UI is the complete visual shell of the SpeechRun app. It establishes a developer-native aesthetic modelled on a terminal emulator: deep blueprint-blue background, monospace font throughout, ASCII art logo, terminal window chrome, and command-line style text conventions. The app is structured as a 3-panel layout — context sidebar (left), conversation and audio player (center), sandbox (right) — all rendered inside the terminal frame. This feature covers the project scaffold (Vite + React + TypeScript + Tailwind) and every visual UI shell component, short of functional data or backend wiring. Its purpose is to give developers a UI they immediately feel at home in, and to set the visual foundation every other feature builds on top of.

---

## Users

All users — anyone who lands on the app. This is the first and only thing a user sees. The aesthetic is specifically aimed at developers and engineering managers who are culturally fluent with terminal interfaces.

---

## User Stories

- As a **developer**, I want the app to look and feel like a terminal so that it immediately signals this is a tool made for people like me, not a generic SaaS product.
- As a **developer**, I want to see a 3-panel layout on load so that I can understand the app's structure at a glance — context on the left, conversation in the center, sandbox on the right.
- As a **developer**, I want to see a large ASCII art "SPEECHRUN" logo so that the branding is bold and in keeping with the terminal aesthetic.
- As a **developer**, I want monospace fonts and command-line style prompts (~ $ and .: prefixes) throughout so that every piece of text feels native to the terminal environment.
- As a **developer**, I want tab navigation between panels or sections so that I can orient myself and switch focus without the UI feeling like a standard web app.

---

## Behaviour

### Happy Path

1. User opens the app in a browser.
2. The full viewport is filled with a deep blueprint-blue background (#1a237e or nearest Tailwind equivalent).
3. A terminal window chrome is rendered: a title bar at the top displaying "speechrun — zsh" with standard macOS-style window controls (red/yellow/green circles, decorative only).
4. Below the title bar, a tab navigation row displays navigation items styled as thin-bordered, monospace tab buttons.
5. Below the tabs, the ASCII art "SPEECHRUN" logo renders in large block characters, centred or top-aligned in the header area.
6. Below the logo, the main content area splits into three columns:
   - Left panel: Context sidebar skeleton — a narrow column with a monospace heading and placeholder content lines using the `.:` prefix convention.
   - Center panel: Conversation panel skeleton — wider column containing a GitHub URL input area at the top (styled as a terminal prompt line), placeholder conversation transcript lines, and an audio player skeleton pinned to the bottom.
   - Right panel: Sandbox panel skeleton — equal-width column with a monospace heading and placeholder content.
7. All text uses JetBrains Mono (or a fallback monospace stack). No serif or sans-serif fonts appear anywhere.
8. All borders, dividers, and panel edges use thin single-pixel lines styled to look like ASCII box-drawing characters or minimal terminal window borders.

### Edge Cases & Rules

- The layout must not break on viewport widths below 1024px — at minimum, it should collapse gracefully (panels stack or a horizontal scroll appears). Responsive breakpoints are a v1 nice-to-have but not required for the hackathon demo, which targets desktop.
- The ASCII logo must render correctly across all modern browsers. Use a `<pre>` block with a fixed monospace font rather than a CSS-generated or image-based logo. Avoid canvas.
- The terminal window chrome title bar is purely decorative — the three window control dots do nothing on click.
- Tab navigation buttons in the header row are rendered but navigation behaviour (routing, panel switching) is wired up as part of their individual feature builds. For this feature, tabs render in their default/idle state only.
- The GitHub URL input area in the center panel renders as a styled input field with a `~ $` prompt prefix. It is visually correct in this feature but is not functionally wired — that belongs to the GitHub URL input feature.
- Audio player skeleton shows the player chrome (waveform placeholder bar, play/pause button outline, timestamp zeroes) but contains no functional audio logic.
- Panel heights must fill the available viewport height below the header chrome. Panels should not overflow vertically without a scrollbar on the panel itself (not the whole page).
- Color palette is fixed: background #1a237e (blueprint blue), text primary #e8eaf6 (near-white lavender), accent #7986cb (mid-blue), border lines #3949ab (slightly lighter blue). These exact hex values should be added as Tailwind custom color tokens.
- No emoji anywhere in the UI. The aesthetic is strictly ASCII and monospace.

---

## Connections

- **Foundation for all other features** — every other v1 feature (GitHub URL input, conversation display, audio player, context sidebar content, sandbox) renders inside this UI shell. Nothing else can be built or visually tested until this scaffold exists.
- **Depends on:** Project scaffold (Vite + React + TypeScript + Tailwind) — must exist before any component work starts.
- **Triggers:** All other feature build tasks depend on this being complete.
- **Shares data with:** None at this stage — this is a pure UI shell with no data wiring.

---

## MVP vs Full Version

| Aspect | MVP (v1) | Full Version |
|--------|----------|--------------|
| Background color | Deep blueprint blue (#1a237e) | Same |
| Terminal window chrome | Title bar with "speechrun — zsh" and decorative dots | Animated typing effect in title bar |
| ASCII logo | Static `<pre>` block logo | Animated ASCII logo on load |
| Font | JetBrains Mono via Google Fonts or CDN | Self-hosted variable font with fallback stack |
| 3-panel layout | Fixed 3-column flex/grid layout, desktop only | Responsive — collapsible sidebar, mobile-friendly |
| Tab navigation | Renders visually, no routing logic | Fully wired tab switching with active states and routing |
| Panel content | Skeleton placeholders with `.:` prefix lines | Full live data |
| Audio player | Visual skeleton only | Fully functional with waveform visualisation |
| GitHub URL input | Styled terminal prompt input, not wired | Wired to repo fetch flow |
| Border style | Thin CSS borders styled to match ASCII terminal | True ASCII box-drawing characters using Unicode |
| Color tokens | Custom Tailwind config | Design token system with CSS variables |
| Scrollbars | Browser default (styled dark) | Custom thin scrollbars matching terminal aesthetic |

---

## Security Considerations

- The GitHub URL input field rendered in this feature is visual-only at this stage. When it is wired up in its own feature, the URL must be validated server-side before any fetch is attempted. Client-side validation in the input component is UX only.
- No user data is collected, stored, or transmitted by this feature. The UI shell is entirely static.
- No API keys or secrets are referenced or embedded in any frontend component. All external service credentials remain server-side environment variables.
- No user-generated content is rendered at this stage, so XSS risk is not applicable to this feature in isolation. When dynamic content is introduced in later features, sanitisation rules from SECURITY.md apply.

---

## Tasks

> Granular implementation steps for this feature.
> Each task has a global T-number that matches TASK-LIST.md.
> Keep status here in sync with the central task list.
>
> Status: [ ] todo  [~] in progress  [x] done  [-] blocked  [>] deferred

| Task # | Status | What needs to be done |
|--------|--------|-----------------------|
| T1 | `[x]` | Scaffold Vite + React + TypeScript project with Tailwind CSS configured and a working dev server |
| T2 | `[x]` | Add custom Tailwind color tokens for the terminal palette (blueprint blue #1a237e, text #e8eaf6, accent #7986cb, border #3949ab) and configure JetBrains Mono as the base font |
| T3 | `[x]` | Build the TerminalChrome component: outer window frame, title bar with "speechrun — zsh" label, and three decorative window-control dots (red/yellow/green) |
| T4 | `[x]` | Build the AsciiLogo component: large block-character "SPEECHRUN" rendered in a `<pre>` tag with fixed monospace font and correct terminal color |
| T5 | `[x]` | Build the TabNav component: a row of thin-bordered monospace tab buttons in their default/idle visual state (no routing logic yet) |
| T6 | `[x]` | Build the 3-panel layout shell: a flex or CSS grid container that fills viewport height below the header and divides into left (context), center (conversation), and right (sandbox) columns with terminal-style border dividers |
| T7 | `[x]` | Build the ContextSidebar skeleton: left panel with a monospace section heading and 4-6 placeholder lines prefixed with `.:` |
| T8 | `[x]` | Build the ConversationPanel skeleton: center panel with a `~ $` prompt-styled GitHub URL input field (visual only, not wired) and placeholder conversation transcript lines |
| T9 | `[x]` | Build the AudioPlayer skeleton: bottom-of-center-panel component showing play/pause button outline, a flat placeholder progress bar, and zeroed timestamp text — no audio logic |
| T10 | `[x]` | Build the SandboxPanel skeleton: right panel with a monospace section heading and placeholder content block |
| T11 | `[x]` | Compose all components into App.tsx, verify full layout renders correctly in the browser with all terminal styling applied end-to-end |

---

## User Acceptance Tests

> Plain-English browser tests generated after this feature is built.
> The full interactive checklist lives in ascii-terminal-ui-uat.md once generated.
>
> UAT status: `pending`

**UAT Status:** `pending`

**Last tested:** —

**Outcome:** —

---

## Open Questions

- [ ] Exact ASCII art block font style for the SPEECHRUN logo — figlet-style block letters, or a custom hand-crafted ASCII layout? Confirm before T4.
- [ ] Should the tab nav items in T5 have labels matching the three panels (Context / Conversation / Sandbox), or does the first version show different groupings (e.g. by workflow step)?
- [ ] JetBrains Mono loading strategy — Google Fonts CDN (fast to set up, external dependency) or bundled via npm (`@fontsource/jetbrains-mono`)? Recommend npm for offline/edge reliability.
- [ ] Panel width ratio — is a fixed split (e.g. 20% / 50% / 30%) acceptable for v1, or does the center panel need to be wider to accommodate the conversation transcript comfortably?

---

## Notes

- The Midday app (midday.ai) is the visual reference for this aesthetic. Key elements to borrow: deep dark background, terminal window chrome framing the entire UI, thin-border tab row, monospace text throughout.
- The `.:` prefix convention for output lines and `~ $` for input prompts are standard terminal conventions. Use them consistently across all panels so the aesthetic is coherent.
- Tailwind's `font-mono` utility class points to the system monospace stack by default. Override this in `tailwind.config.ts` to use JetBrains Mono as the first entry in the font stack.
- Consider using CSS custom properties (variables) for the color tokens in addition to Tailwind config — this makes it easy to theme or adjust colors without rerunning the build.

---

## Archive

<!-- Outdated content goes here — never delete, just move down -->
