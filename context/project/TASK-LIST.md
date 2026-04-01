# Task List

> The single source of truth for what needs to be done.
> Updated by Claude after every meaningful piece of work.
> Each task links to the feature file it belongs to.
>
> **Status keys:**
> `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` blocked · `[>]` deferred

---

## How Tasks Are Numbered

Tasks are numbered globally across the whole project: T1, T2, T3...
They never get renumbered — a completed task keeps its number forever.
This means you can reference "T12" in a commit message or conversation and
it always points to the same thing.

---

## Active Sprint

Tasks currently being worked on or up next.

<!-- Claude: keep this section short — max 5-7 tasks at a time -->

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T33 | `[ ]` | Rewrite context-generator.ts for StructuredContext schema | [panel-redesign](../features/panel-redesign.md) | Wave 1 — backend foundation |
| T34 | `[ ]` | Update DO schema: add feature_id + topic_type columns | [panel-redesign](../features/panel-redesign.md) | Wave 1 |
| T35 | `[ ]` | Rewrite dialogue-orchestrator.ts for feature-anchored topics | [panel-redesign](../features/panel-redesign.md) | Wave 1 |
| T36 | `[ ]` | Update turn-generator.ts: feature context in prompts | [panel-redesign](../features/panel-redesign.md) | Wave 2 |
| T37 | `[ ]` | Update turn-coordinator.ts: complexity-based distribution | [panel-redesign](../features/panel-redesign.md) | Wave 2 |

---

## Backlog

Tasks that are planned but not started yet. Ordered by priority.

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|
| T38 | `[ ]` | Update worker/index.ts: wire feature data through pipeline | [panel-redesign](../features/panel-redesign.md) | Wave 2 |
| T39 | `[ ]` | Update App.tsx: expand AppState with outline, progressLog, activeFeatureId | [panel-redesign](../features/panel-redesign.md) | Wave 3 |
| T40 | `[ ]` | Build ContextPanel.tsx: collapsible tree with feature highlighting | [panel-redesign](../features/panel-redesign.md) | Wave 3 |
| T41 | `[ ]` | Build OperationsPanel.tsx: progress log, features status, active workers | [panel-redesign](../features/panel-redesign.md) | Wave 3 |
| T42 | `[ ]` | Update ConversationPanel.tsx: feature section headers | [panel-redesign](../features/panel-redesign.md) | Wave 3 |
| T43 | `[ ]` | Update TabNav.tsx: rename Sandbox to Operations | [panel-redesign](../features/panel-redesign.md) | Wave 3 |
| T29 | `[>]` | Add WebSocket turn-push to DO | [multi-agent-dialogue](../features/multi-agent-dialogue.md) | Deferred |
| T30 | `[>]` | Add rate limiting to POST /api/generate-dialogue | [multi-agent-dialogue](../features/multi-agent-dialogue.md) | Deferred |

---

## Blocked

Tasks that can't proceed until something else is resolved.

| # | Task | Feature | Blocked by |
|---|------|---------|------------|
| — | — | — | — |

---

## Completed

Finished tasks — kept for reference and audit trail.

| # | Task | Feature | Completed |
|---|------|---------|-----------|
| T1 | Scaffold Vite + React + TypeScript project with Tailwind CSS | [ascii-terminal-ui](../features/ascii-terminal-ui.md) | 2026-03-28 |
| T2 | Add custom Tailwind color tokens and JetBrains Mono font | [ascii-terminal-ui](../features/ascii-terminal-ui.md) | 2026-03-28 |
| T3 | Build TerminalChrome component | [ascii-terminal-ui](../features/ascii-terminal-ui.md) | 2026-03-28 |
| T4 | Build AsciiLogo component | [ascii-terminal-ui](../features/ascii-terminal-ui.md) | 2026-03-28 |
| T5 | Build TabNav component | [ascii-terminal-ui](../features/ascii-terminal-ui.md) | 2026-03-28 |
| T6 | Build 3-panel layout shell | [ascii-terminal-ui](../features/ascii-terminal-ui.md) | 2026-03-28 |
| T7 | Build ContextSidebar skeleton | [ascii-terminal-ui](../features/ascii-terminal-ui.md) | 2026-03-28 |
| T8 | Build ConversationPanel skeleton | [ascii-terminal-ui](../features/ascii-terminal-ui.md) | 2026-03-28 |
| T9 | Build AudioPlayer skeleton | [ascii-terminal-ui](../features/ascii-terminal-ui.md) | 2026-03-28 |
| T10 | Build SandboxPanel skeleton | [ascii-terminal-ui](../features/ascii-terminal-ui.md) | 2026-03-28 |
| T11 | Compose all components into App.tsx | [ascii-terminal-ui](../features/ascii-terminal-ui.md) | 2026-03-28 |
| T12 | Create `wrangler.toml` with DO, R2, AI bindings | [codebase-ingestion](../features/codebase-ingestion.md) | 2026-04-01 |
| T13 | Create Workers entry point (`worker/index.ts`) with request router | [codebase-ingestion](../features/codebase-ingestion.md) | 2026-04-01 |
| T14 | Create SpeechRunSession Durable Object with SQLite schema | [codebase-ingestion](../features/codebase-ingestion.md) | 2026-04-01 |
| T15 | Implement GitHub URL parser and validator | [codebase-ingestion](../features/codebase-ingestion.md) | 2026-04-01 |
| T16 | Implement GitHub repo tree fetcher | [codebase-ingestion](../features/codebase-ingestion.md) | 2026-04-01 |
| T17 | Implement key file selector | [codebase-ingestion](../features/codebase-ingestion.md) | 2026-04-01 |
| T18 | Implement file content fetcher | [codebase-ingestion](../features/codebase-ingestion.md) | 2026-04-01 |
| T19 | Implement Workers AI context generator | [codebase-ingestion](../features/codebase-ingestion.md) | 2026-04-01 |
| T20 | Wire full ingestion pipeline into POST /api/ingest | [codebase-ingestion](../features/codebase-ingestion.md) | 2026-04-01 |
| T21 | Add server-side rate limiting to POST /api/ingest | [codebase-ingestion](../features/codebase-ingestion.md) | 2026-04-01 (deferred) |
| T22 | Connect frontend to POST /api/ingest with loading/error states | [codebase-ingestion](../features/codebase-ingestion.md) | 2026-04-01 |
| T23 | Extend DO SQLite schema: dialogue_outline + dialogue_turns tables | [multi-agent-dialogue](../features/multi-agent-dialogue.md) | 2026-04-01 |
| T24 | Implement dialogue orchestrator (topic outline generation) | [multi-agent-dialogue](../features/multi-agent-dialogue.md) | 2026-04-01 |
| T25 | Implement Nova turn generator (PM persona) | [multi-agent-dialogue](../features/multi-agent-dialogue.md) | 2026-04-01 |
| T26 | Implement Aero turn generator (Dev persona) | [multi-agent-dialogue](../features/multi-agent-dialogue.md) | 2026-04-01 |
| T27 | Implement turn coordinator (schedule ~24 turns across topics) | [multi-agent-dialogue](../features/multi-agent-dialogue.md) | 2026-04-01 |
| T28 | Implement POST /api/generate-dialogue route handler | [multi-agent-dialogue](../features/multi-agent-dialogue.md) | 2026-04-01 |
| T31 | Wire frontend ConversationPanel to display dialogue turns | [multi-agent-dialogue](../features/multi-agent-dialogue.md) | 2026-04-01 |

---

## How to Add a Task

Claude adds tasks using this format:

```
| T[N] | `[ ]` | [What needs to be done — specific and actionable] | [context/features/feature-name.md](../features/feature-name.md) | [any notes] |
```

Rules:
- One task = one clear, completable action
- Link to the feature file if the task belongs to a feature
- Tasks that span multiple features get a note explaining the dependency
- "Implement @auth" is too vague — "Build login form with email/password validation" is a task
- When a task is done, move it to Completed — never delete tasks

---

## Task States

Claude updates task status automatically as work progresses:

| Symbol | Meaning | When to use |
|--------|---------|-------------|
| `[ ]` | Todo | Not started |
| `[~]` | In progress | Currently being worked on |
| `[x]` | Done | Completed and verified |
| `[-]` | Blocked | Waiting on something else |
| `[>]` | Deferred | Decided to push to later phase |
