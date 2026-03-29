# Phase 2: Create Worker & Verify

## Context Links

- [Research Report](./research/researcher-260329-0000-cloudflare-workers-setup.md)
- [Phase 1](./phase-01-install-and-configure.md)

## Overview

- **Priority:** P1
- **Status:** Pending
- **Description:** Create minimal Worker entry point with health check endpoint. Verify full-stack dev server works.

## Key Insights

- Worker entry file exports a `default` object with `fetch` handler
- No router library needed for foundation — raw Request/Response sufficient
- CORS not needed when using Vite plugin (same origin)
- Env interface is the type-safe way to declare future bindings (DO, R2, secrets)

## Requirements

### Functional
- `/api/health` returns 200 OK
- Frontend still renders correctly at root `/`
- Worker handles unknown `/api/*` routes with 404

### Non-functional
- Worker code type-checks with `@cloudflare/workers-types`
- Clean separation: `worker/` directory for backend, `src/` for frontend

## Related Code Files

### Files to Create
- `worker/index.ts` — Worker entry point with fetch handler

## Implementation Steps

1. Create `worker/` directory

2. Create `worker/index.ts` with minimal handler:
   ```typescript
   interface Env {
     // Future bindings: ORCHESTRATOR, NOVA, AERO (Durable Objects), AUDIO_BUCKET (R2)
   }

   export default {
     async fetch(request: Request, env: Env): Promise<Response> {
       const url = new URL(request.url);

       if (url.pathname === '/api/health') {
         return Response.json({ status: 'ok', version: '0.1.0' });
       }

       // Unknown API routes
       if (url.pathname.startsWith('/api/')) {
         return Response.json({ error: 'Not found' }, { status: 404 });
       }

       // Non-API routes handled by Vite/static assets
       return new Response('Not found', { status: 404 });
     }
   } satisfies ExportedHandler<Env>;
   ```

3. Verify dev server:
   ```bash
   npm run dev
   # Test: curl http://localhost:5173/api/health
   # Expected: {"status":"ok","version":"0.1.0"}
   # Test: open http://localhost:5173 in browser
   # Expected: SpeechRun terminal UI renders
   ```

4. Verify build:
   ```bash
   npm run build
   # Should compile both client + worker without errors
   ```

## Todo List

- [ ] Create worker/index.ts with health check endpoint
- [ ] Verify `npm run dev` serves both frontend + worker
- [ ] Verify `curl /api/health` returns 200
- [ ] Verify frontend renders at root `/`
- [ ] Verify `npm run build` succeeds

## Success Criteria

- `npm run dev` starts unified dev server (Vite + Workers runtime)
- `GET /api/health` returns `{"status":"ok","version":"0.1.0"}`
- Frontend UI renders unchanged at `/`
- `npm run build` compiles both client and worker without errors
- No TypeScript errors in `worker/` directory

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Worker fetch handler conflicts with Vite dev routes | Low | Medium | Only handle `/api/*` prefix; let Vite serve everything else |
| Build output directory mismatch | Medium | Low | Verify `wrangler.jsonc` assets.directory matches Vite build output |

## Security Considerations

- Health endpoint returns no sensitive data
- Env interface is empty — no secrets exposed
- API routes return generic error messages (no stack traces)

## Next Steps

After this phase, the project is ready for:
- Phase 2 (Roadmap): Codebase Ingestion — add GitHub API proxy endpoint to worker
- Phase 3 (Roadmap): Multi-Agent Dialogue — add Durable Object bindings for Nova/Aero agents
- Phase 4 (Roadmap): Audio Generation — add R2 binding for audio storage
