# Feature: Arche-Inspired 3-Panel Redesign

> **Status:** `planned`
> **Phase:** v1
> **Last updated:** 2026-04-01

---

## Summary

Redesign all three panels from generic podcast UI into a structured, feature-driven analysis dashboard. The left panel becomes a collapsible context tree showing discovered features, architecture, and decisions. The center panel conversation is anchored to specific features — Nova and Aero discuss expected behavior, implementation details, and tradeoffs per feature. The right panel becomes a live operations dashboard with progress log, feature status tracking, and active worker states.

This redesign is driven by the Arche framework pattern (https://github.com/joshmillgate/arche) where structured context files drive AI agent behavior.

---

## New Context Schema — `StructuredContext`

Replaces the flat `CodebaseContext` with a hierarchical, feature-centric schema:

```typescript
interface StructuredContext {
  project: {
    name: string
    summary: string
    purpose: string
    primaryLanguage: string
  }

  stack: Array<{
    name: string
    role: string
    category: 'frontend' | 'backend' | 'database' | 'infrastructure' | 'tooling' | 'testing'
  }>

  features: Array<{
    id: string                      // Slug: "user-auth", "api-gateway"
    name: string                    // Human readable: "User Authentication"
    description: string
    status: 'discovered'
    expectedBehavior: string        // How it should work from a user perspective
    implementationNotes: string     // How it's actually built
    complexity: 'low' | 'medium' | 'high'
    relatedFiles: string[]
  }>

  architecture: {
    pattern: string
    description: string
    layers: string[]
    dataFlow: string
  }

  decisions: Array<{
    title: string
    rationale: string
    tradeoff: string
  }>

  quality: {
    strengths: string[]
    concerns: string[]
    overall: string
  }
}
```

---

## Left Panel — Context Panel

Replaces `ContextSidebar.tsx` with `ContextPanel.tsx`.

Terminal-style collapsible tree:

```
.: project
   speechrun v0.1.0
   "AI-powered code podcast generator"

.: stack/
   [frontend]  React, Tailwind CSS
   [backend]   Cloudflare Workers
   [database]  Durable Objects + SQLite

.: features/
   > user-auth .................. [high]
     "Handles login, signup, sessions"
   > api-gateway ............... [medium]
     "Routes requests to microservices"

.: architecture/
   Pattern: Serverless
   Layers: API > Service > Data

.: decisions/
   > SQLite over Postgres
   > Durable Objects over KV

.: quality/
   + Strong type safety
   - No error boundaries
```

Key behaviors:
- Collapsible sections with `>` / `v` toggle
- Feature complexity badges: `[high]`, `[medium]`, `[low]`
- Active feature highlighted (accent color) when being discussed
- Discussed features get `[ok]` checkmark

---

## Center Panel — Feature-Driven Conversation

The dialogue orchestrator generates topics anchored to discovered features. Each turn references a `featureId`.

Updated outline topic:
```typescript
interface DialogueOutlineTopic {
  topicIndex: number
  title: string
  description: string
  featureId: string | null    // Links to features[].id
  type: 'intro' | 'feature' | 'decision' | 'quality' | 'outro'
}
```

Updated turn:
```typescript
interface DialogueTurn {
  turnOrder: number
  speaker: 'Nova' | 'Aero'
  text: string
  emotion: EmotionTag
  topicIndex: number
  featureId: string | null    // Which feature is being discussed
  audioUrl: string | null
}
```

Turn distribution based on complexity:
- `intro` / `outro`: 2 turns each
- `feature` (high complexity): 4 turns
- `feature` (medium): 3 turns
- `feature` (low): 2 turns
- `decision` / `quality`: 2 turns each

---

## Right Panel — Operations Dashboard

Replaces `SandboxPanel.tsx` with `OperationsPanel.tsx`.

Three sections:

### Progress Log (~40% height)
Scrolling terminal-style log:
```
[00:01] Fetching repository tree...
[00:05] Found 847 files, selecting 20 key files...
[00:08] Generating structured context...
[00:15] Context ready: 5 features discovered
[00:19] Nova discussing: Auth System...
[01:45] Dialogue complete: 24 turns generated
```

### Features Status (~35% height)
```
.: features
   [ok] project-overview
   [>>] user-auth           high   << discussing
   [  ] api-gateway         medium
   [  ] data-pipeline       low
```

### Active Workers (~25% height)
```
.: workers
   Orchestrator    idle
   Nova (PM)       speaking . "Auth System"
   Aero (Dev)      idle
```

All state is derived from `AppState` — no new API endpoints needed.

---

## Implementation Waves

### Wave 1: Backend — New Context Schema
| File | Change |
|------|--------|
| `worker/lib/context-generator.ts` | Rewrite prompt + parser for `StructuredContext`. Increase max_tokens to 4096. Add few-shot example. |
| `worker/do/session.ts` | Add `feature_id`, `topic_type` columns. Update types. |
| `worker/lib/dialogue-orchestrator.ts` | Rewrite prompt for feature-anchored topics. Add `featureId`, `type` to outline. |

### Wave 2: Backend — Feature-Driven Dialogue
| File | Change |
|------|--------|
| `worker/lib/turn-generator.ts` | Add feature context to turn prompts. Add `featureId` to output. |
| `worker/lib/turn-coordinator.ts` | Complexity-based turn distribution. Add `featureId` to schedule. |
| `worker/index.ts` | Pass feature data through pipeline. Update response types. |

### Wave 3: Frontend — Panel Redesign
| File | Change |
|------|--------|
| `src/App.tsx` | Expand `AppState` with `outline`, `progressLog`, `activeFeatureId`. |
| `src/components/ContextPanel.tsx` | NEW — replaces ContextSidebar. Collapsible tree with feature highlighting. |
| `src/components/OperationsPanel.tsx` | NEW — replaces SandboxPanel. Progress log + features + workers. |
| `src/components/ConversationPanel.tsx` | Feature section headers between turn groups. |
| `src/components/TabNav.tsx` | Update label: "Sandbox" -> "Operations". |

### What stays the same
- GitHub URL/tree/file modules (no change)
- wrangler.toml, vite.config.ts (no change)
- TerminalChrome, AsciiLogo (no change)

---

## Risks

1. **8B model + complex JSON**: Mitigate with few-shot examples and tolerant parsing (defaults for missing fields)
2. **No WebSocket**: Mitigate by staggering turn rendering with setTimeout after batch response
3. **Feature extraction quality**: Cap at 5-8 features, instruct model to look for concrete patterns (routes, components, models)

---

## Tasks

| Task # | Status | What needs to be done |
|--------|--------|-----------------------|
| T33 | `[ ]` | Rewrite `context-generator.ts`: new `StructuredContext` schema, updated prompt with few-shot example, tolerant parser with defaults |
| T34 | `[ ]` | Update `session.ts` DO schema: add `feature_id` + `topic_type` to dialogue tables, update types |
| T35 | `[ ]` | Rewrite `dialogue-orchestrator.ts`: feature-anchored topic outline with `featureId` and `type` fields |
| T36 | `[ ]` | Update `turn-generator.ts`: add feature context to prompts, add `featureId` to turn output |
| T37 | `[ ]` | Update `turn-coordinator.ts`: complexity-based turn distribution, `featureId` in schedule |
| T38 | `[ ]` | Update `worker/index.ts`: wire feature data through pipeline, update response types |
| T39 | `[ ]` | Update `App.tsx`: expand AppState with `outline`, `progressLog`, `activeFeatureId`, derive active feature |
| T40 | `[ ]` | Build `ContextPanel.tsx`: collapsible tree with project/stack/features/arch/decisions/quality, active feature highlighting |
| T41 | `[ ]` | Build `OperationsPanel.tsx`: progress log, features status, active workers — all derived from AppState |
| T42 | `[ ]` | Update `ConversationPanel.tsx`: feature section headers, show feature name on topic change |
| T43 | `[ ]` | Update `TabNav.tsx`: rename "Sandbox" to "Operations" |

---

## Open Questions

- [ ] Should features be capped at 5, 8, or dynamically based on repo size?
- [ ] Staggered rendering: how fast should turns appear? 200ms? 500ms?
- [ ] Should clicking a feature in the left panel scroll the conversation to its discussion?

---

## Archive

<!-- Outdated content goes here -->
