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

---

## Backlog

Tasks that are planned but not started yet. Ordered by priority.

| # | Status | Task | Feature | Notes |
|---|--------|------|---------|-------|

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
