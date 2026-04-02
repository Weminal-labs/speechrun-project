# Code Review: Cloudflare Workers Foundation

## Scope
- Files: `worker/index.ts`, `wrangler.jsonc`, `tsconfig.worker.json`, `vite.config.ts`, `package.json`
- LOC: ~50 net additions
- Focus: New backend foundation integration

## Overall Assessment

Clean, minimal foundation. Follows YAGNI/KISS well. A few issues worth addressing before merge.

---

## Critical Issues

None.

## High Priority

### H1. `tsc -b` does not type-check worker code (tsconfig.worker.json)

**File:** `tsconfig.json`, `package.json:8`

`tsc -b` (project references mode) requires a `"references"` array in the root `tsconfig.json` pointing to `tsconfig.worker.json`. Without it, `npm run build` runs `tsc -b` which only checks `src/` (the root tsconfig's `include`). Worker code is never type-checked during build.

**Impact:** Type errors in `worker/` will silently pass CI/build and only surface at deploy time.

**Fix:** Add to `tsconfig.json`:
```json
"references": [
  { "path": "./tsconfig.worker.json" }
]
```
And ensure `tsconfig.worker.json` has `"composite": true` in `compilerOptions` (required for project references).

Alternatively, add a separate script: `"typecheck:worker": "tsc --noEmit -p tsconfig.worker.json"` and chain it in `build`.

### H2. Worker `Env` interface inherits DOM types from parent tsconfig

**File:** `tsconfig.worker.json:3-4`

`tsconfig.worker.json` extends `tsconfig.json`, which includes `"lib": ["ES2020", "DOM", "DOM.Iterable"]`. This means the worker code has access to DOM globals (`document`, `window`, `localStorage`, etc.) that do not exist in the Workers runtime. Any accidental use of DOM APIs will compile fine but crash at runtime.

**Impact:** False sense of type safety. DOM API usage won't be caught by the compiler.

**Fix:** Override `lib` in `tsconfig.worker.json`:
```json
"compilerOptions": {
  "types": ["@cloudflare/workers-types"],
  "lib": ["ES2020"],
  "noEmit": true
}
```

## Medium Priority

### M1. No CORS headers on API responses

**File:** `worker/index.ts:14,18`

If the frontend ever makes `fetch()` calls to `/api/health` during development with a different origin (e.g., Vite dev server proxy misconfiguration, or testing from a different port), requests will fail silently due to missing CORS headers. Not blocking for same-origin production deployment, but worth noting for local dev ergonomics.

**Impact:** Low for now (same-origin in production), but will become an issue when real API endpoints are added.

**Recommendation:** Defer until actual API endpoints are added, but document the need.

### M2. Missing `ctx` (ExecutionContext) parameter

**File:** `worker/index.ts:10`

The fetch handler signature is `fetch(request, _env)` but omits the third parameter `ctx: ExecutionContext`. While not required for this simple handler, `ExportedHandler<Env>` expects it. The `satisfies` check passes because the parameter is optional in the type, but when real async work is added (e.g., `ctx.waitUntil()`), developers may not realize it's available.

**Impact:** Minor. Informational for future development.

## Low Priority

### L1. Hardcoded version string

**File:** `worker/index.ts:14`

`version: '0.1.0'` is duplicated from `package.json`. Will drift over time.

**Impact:** Minor inconsistency. In Workers runtime there's no easy way to import `package.json`, so this is acceptable for now. Consider injecting via build-time define if versioning becomes important.

### L2. `compatibility_date` is set to future date

**File:** `wrangler.jsonc:4`

`"compatibility_date": "2026-03-17"` -- verify this is a valid published compatibility date. If this date is ahead of the latest Cloudflare runtime release, deployments may behave unexpectedly or use a fallback date.

**Impact:** Likely fine, but worth confirming against Cloudflare's compatibility date list.

## Info

### I1. SPA routing interaction looks correct

`wrangler.jsonc` sets `"not_found_handling": "single-page-application"`, which means non-API, non-asset routes serve `index.html`. The worker's catch-all `return new Response('Not found', { status: 404 })` at line 21 only triggers for requests that reach the worker (i.e., `/api/*` routes). SPA routes are handled by the assets config before reaching the worker. This is correct.

### I2. Plugin ordering in vite.config.ts

`cloudflare()` is last in the plugins array, which is the recommended position per Cloudflare docs. Correct.

---

## Positive Observations

- `satisfies ExportedHandler<Env>` -- good use of TypeScript's `satisfies` for type checking without widening
- Clean separation: API routes return JSON, non-API returns plain text 404
- No secrets, no env vars, no PII exposure
- Minimal dependencies -- only what's needed
- `wrangler.jsonc` uses JSONC format correctly for future comments

## Recommended Actions (priority order)

1. **[H1]** Wire `tsconfig.worker.json` into the build pipeline so worker code is type-checked
2. **[H2]** Override `lib` to exclude DOM types from worker compilation target
3. **[M2]** Add `_ctx: ExecutionContext` parameter for discoverability (optional)

## Unresolved Questions

- Is `compatibility_date: "2026-03-17"` a valid published date, or should it be set to today's actual date?
- Will the `tsc -b` approach (project references) or a separate `typecheck:worker` script be preferred for CI?
