# Phase 1: Agents SDK Setup & Durable Objects Config

## Context Links
- [Cloudflare Agents SDK Docs](https://developers.cloudflare.com/agents/)
- [Research: Agents SDK](../260329-2256-cloudflare-workers-foundation/reports/researcher-260401-2052-cloudflare-agents-multiagent.md)
- [Current wrangler.jsonc](../../wrangler.jsonc)
- [Current worker/index.ts](../../worker/index.ts)

## Overview
- **Priority:** P1 (blocks all other phases)
- **Status:** Pending
- **Effort:** 1h
- **Description:** Install Agents SDK, configure Durable Object bindings, AI binding, R2 bucket, and create shared type definitions.

## Key Insights
- `@cloudflare/agents` provides Agent base class with `@callable()`, state sync, WebSocket, SQLite
- Agents must be exported from worker entry point alongside the default fetch handler
- R2 bucket must be created via `wrangler r2 bucket create` before binding
- AI binding is zero-config in wrangler.jsonc (`"ai": { "binding": "AI" }`)

## Requirements

### Functional
- Install `@cloudflare/agents` package (runtime dep)
- Update wrangler.jsonc with DO bindings, AI binding, R2 bucket binding
- Create shared TypeScript interfaces in `worker/types.ts`
- Verify `npm run dev` starts without errors

### Non-Functional
- All types must be strict-mode compatible
- No `any` types in shared interfaces

## Related Code Files

| Action | File |
|--------|------|
| Modify | `package.json` |
| Modify | `wrangler.jsonc` |
| Modify | `worker/index.ts` |
| Modify | `tsconfig.worker.json` |
| Create | `worker/types.ts` |

## Implementation Steps

### 1. Install dependencies

```bash
npm install @cloudflare/agents agents-sdk
```

### 2. Create `worker/types.ts`

```typescript
import type { Agent } from '@cloudflare/agents'

export interface Env {
  AI: Ai
  ORCHESTRATOR: DurableObjectNamespace
  NOVA: DurableObjectNamespace
  AERO: DurableObjectNamespace
  AUDIO_BUCKET: R2Bucket
  GITHUB_TOKEN?: string
  ELEVENLABS_API_KEY: string
}

export interface DialogueTurn {
  speaker: 'nova' | 'aero'
  text: string
  audioUrl?: string
  timestamp: number
}

export interface ContextData {
  summary: string
  repoName: string
  fileTree: string[]
  keyFiles: Record<string, string>
  generatedAt: string
}

export interface OrchestratorState {
  repoUrl: string
  status: 'idle' | 'fetching' | 'analyzing' | 'dialoguing' | 'generating-audio' | 'complete' | 'error'
  context: ContextData | null
  turns: DialogueTurn[]
  error: string | null
}

export interface AgentState {
  persona: string
  guidelines: string
}

export interface GenerationResult {
  success: boolean
  turnCount: number
  error?: string
}
```

### 3. Update `wrangler.jsonc`

```jsonc
{
  "name": "speechrun",
  "account_id": "c385e678885a782dee108d4fb163132c",
  "main": "./worker/index.ts",
  "compatibility_date": "2026-03-17",
  "assets": {
    "not_found_handling": "single-page-application"
  },
  "durable_objects": {
    "bindings": [
      { "name": "ORCHESTRATOR", "class_name": "Orchestrator" },
      { "name": "NOVA", "class_name": "Nova" },
      { "name": "AERO", "class_name": "Aero" }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["Orchestrator", "Nova", "Aero"]
    }
  ],
  "ai": {
    "binding": "AI"
  },
  "r2_buckets": [
    {
      "binding": "AUDIO_BUCKET",
      "bucket_name": "speechrun-audio"
    }
  ]
}
```

### 4. Update `worker/index.ts` to export agent classes

```typescript
import type { Env } from './types'

// Agent class exports (created in later phases, stubbed here)
export { Orchestrator } from './agents/orchestrator'
export { Nova } from './agents/nova'
export { Aero } from './agents/aero'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok', version: '0.2.0' })
    }

    if (url.pathname.startsWith('/api/')) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    return new Response('Not found', { status: 404 })
  },
} satisfies ExportedHandler<Env>
```

### 5. Create stub agent files (minimal, compilable)

Create `worker/agents/orchestrator.ts`, `worker/agents/nova.ts`, `worker/agents/aero.ts` as minimal Agent subclasses that compile. Full implementation in phases 2-3.

### 6. Create R2 bucket

```bash
wrangler r2 bucket create speechrun-audio
```

### 7. Set secrets

```bash
wrangler secret put ELEVENLABS_API_KEY
# Optionally: wrangler secret put GITHUB_TOKEN
```

### 8. Verify dev server

```bash
npm run dev
# Confirm no compilation errors, /api/health returns 200
```

## Todo List

- [ ] Install @cloudflare/agents and agents-sdk
- [ ] Create worker/types.ts with shared interfaces
- [ ] Update wrangler.jsonc with DO bindings, AI, R2
- [ ] Update worker/index.ts to export agent classes
- [ ] Create stub agent files (orchestrator, nova, aero)
- [ ] Create R2 bucket via wrangler CLI
- [ ] Set ELEVENLABS_API_KEY secret
- [ ] Update tsconfig.worker.json if needed
- [ ] Verify npm run dev starts cleanly
- [ ] Verify npm run build compiles

## Success Criteria
- `npm run dev` starts without errors
- `npm run build` compiles without TS errors
- `/api/health` returns `{ status: "ok", version: "0.2.0" }`
- wrangler.jsonc has all 3 DO bindings, AI binding, R2 binding

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| @cloudflare/agents version mismatch with wrangler | Medium | High | Pin versions, test immediately |
| R2 bucket creation fails (account limits) | Low | Medium | Use free tier; confirm account has R2 access |
| DO migrations break existing deployment | Low | High | First deploy with DOs; no existing state to lose |

## Security Considerations
- ELEVENLABS_API_KEY stored as wrangler secret (never in code)
- GITHUB_TOKEN optional; unauthenticated GitHub API works for public repos
- No sensitive data in wrangler.jsonc (account_id is public info)
