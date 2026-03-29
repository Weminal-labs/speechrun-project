# Phase 1: Install Dependencies & Configure

## Context Links

- [Research Report](./research/researcher-260329-0000-cloudflare-workers-setup.md)
- [CF Vite Plugin Docs](https://developers.cloudflare.com/workers/vite-plugin/)
- [CF React + Vite Guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/)

## Overview

- **Priority:** P1
- **Status:** Pending
- **Description:** Install wrangler, CF Vite plugin, and worker types. Configure Vite and TypeScript for Workers.

## Key Insights

- `@cloudflare/vite-plugin` runs Workers runtime inside Vite dev server — single `npm run dev` command
- `wrangler.jsonc` supports comments and is the modern config format
- Separate `tsconfig.worker.json` extends base config with CF worker types
- The plugin handles SPA fallback routing via `assets.not_found_handling`

## Requirements

### Functional
- wrangler CLI available via `npx wrangler`
- Vite dev server runs Workers runtime locally
- TypeScript types available for Worker code

### Non-functional
- No breaking changes to existing frontend dev workflow
- `npm run dev` still works as before (now also serves Worker)

## Related Code Files

### Files to Modify
- `package.json` — add devDependencies + deploy script
- `vite.config.ts` — add `cloudflare()` plugin

### Files to Create
- `wrangler.jsonc` — Worker configuration
- `tsconfig.worker.json` — Worker TypeScript config

## Implementation Steps

1. Install devDependencies:
   ```bash
   npm install -D wrangler @cloudflare/vite-plugin @cloudflare/workers-types
   ```

2. Update `vite.config.ts` — add cloudflare plugin:
   ```typescript
   import { cloudflare } from '@cloudflare/vite-plugin'
   // Add cloudflare() to plugins array
   ```

3. Create `wrangler.jsonc` at project root:
   ```jsonc
   {
     "name": "speechrun",
     "main": "./worker/index.ts",
     "compatibility_date": "2026-03-29",
     "assets": {
       "directory": "./dist/client",
       "not_found_handling": "single-page-application"
     }
   }
   ```

4. Create `tsconfig.worker.json`:
   ```json
   {
     "extends": "./tsconfig.json",
     "compilerOptions": {
       "types": ["@cloudflare/workers-types"],
       "noEmit": true
     },
     "include": ["worker/**/*.ts"]
   }
   ```

5. Add `deploy` script to `package.json`:
   ```json
   "deploy": "npm run build && wrangler deploy"
   ```

## Todo List

- [ ] Install wrangler, @cloudflare/vite-plugin, @cloudflare/workers-types
- [ ] Update vite.config.ts with cloudflare() plugin
- [ ] Create wrangler.jsonc
- [ ] Create tsconfig.worker.json
- [ ] Add deploy script to package.json

## Success Criteria

- `npm run dev` starts without errors
- TypeScript compilation passes for worker directory
- No regressions in existing frontend

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Vite plugin incompatible with Vite 8 | Low | High | Check compatibility before install; fallback to separate wrangler dev |
| tsconfig conflict | Low | Medium | Separate tsconfig.worker.json isolates worker types |

## Security Considerations

- No secrets or API keys in config files
- `wrangler.jsonc` contains no sensitive data
- Worker bindings (DO, R2) added later with proper secret management
