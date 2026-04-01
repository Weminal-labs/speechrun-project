---
title: "Multi-Agent Dialogue System"
description: "Full pipeline: GitHub ingestion, Nova+Aero dialogue, ElevenLabs audio, real-time frontend"
status: pending
priority: P1
effort: 11h
branch: main
tags: [agents-sdk, durable-objects, workers-ai, elevenlabs, websocket]
created: 2026-03-29
---

# Multi-Agent Dialogue System

## Context
- [Research: Workers AI Multi-Agent](../260329-2256-cloudflare-workers-foundation/reports/researcher-260401-2052-cf-workers-ai-multi-agent.md)
- [Research: Cloudflare Agents SDK](../260329-2256-cloudflare-workers-foundation/reports/researcher-260401-2052-cloudflare-agents-multiagent.md)
- [System Architecture](../../docs/system-architecture.md)
- [Code Standards](../../docs/code-standards.md)

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | Agents SDK Setup & DO Config | 1h | Pending | [phase-01](phase-01-agents-sdk-setup.md) |
| 2 | GitHub Codebase Ingestion | 2h | Pending | [phase-02](phase-02-github-ingestion.md) |
| 3 | Multi-Agent Dialogue Generation | 3h | Pending | [phase-03](phase-03-multi-agent-dialogue.md) |
| 4 | ElevenLabs Audio + R2 Storage | 2h | Pending | [phase-04](phase-04-elevenlabs-audio.md) |
| 5 | Frontend WebSocket Integration | 2h | Pending | [phase-05](phase-05-frontend-integration.md) |
| 6 | Integration Testing & Polish | 1h | Pending | [phase-06](phase-06-integration-polish.md) |

## Dependency Graph

```
Phase 1 (SDK setup)
    ↓
Phase 2 (GitHub ingestion) ──→ Phase 3 (dialogue) ──→ Phase 4 (audio)
                                                            ↓
                                                      Phase 5 (frontend)
                                                            ↓
                                                      Phase 6 (polish)
```

## Key Decisions
- **Agents SDK over raw Durable Objects** — eliminates ~300 LOC boilerplate per agent
- **Orchestrator Hub pattern** — single coordination point, Nova/Aero are stateless per-generation
- **Sequential turns (not parallel)** — dialogue must be coherent; Aero responds to Nova
- **Batch TTS after dialogue** — simpler than per-turn streaming; MVP-appropriate
- **useAgent() hook** — built-in WebSocket state sync, no custom WS code needed

## Rollback Strategy
Each phase is independently deployable. Revert = remove DO bindings from wrangler.jsonc + delete agent files. Frontend skeletons remain functional without backend.
