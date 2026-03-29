# Cloudflare Workers Setup Research
**Date:** 2026-03-29 | **For:** SpeechRun (Vite 8 + React 19 + TypeScript 6)

---

## Executive Summary

**RECOMMENDATION: Single-repo setup with `@cloudflare/vite-plugin`**
- Add Workers backend to existing Vite project (no monorepo needed yet)
- One `npm run dev` command runs Vite + Workers simultaneously
- Vite plugin handles dev server routing to Worker runtime
- Minimal config changes to your existing stack

**Why:** Hackathon projects benefit from simplicity. Monorepo adds overhead you don't need until you have multiple independent services. Single repo also simplifies deployment—one `wrangler deploy` pushes both frontend assets + Worker code.

---

## Research Findings

### Q1: How to Add Workers to Existing Vite + React Project?

**Status:** ANSWERED ✓

**Setup approach:** Use `@cloudflare/vite-plugin` in your existing `vite.config.ts`.

**Project structure:**
```
speechrun-project/
├── src/                    # Your existing React app
│   ├── App.tsx
│   ├── main.tsx
│   └── ...
├── worker/                 # NEW: Worker backend
│   ├── index.ts           # Entry point
│   └── routes/            # Optional: API routes
├── vite.config.ts         # UPDATED: Add cloudflare plugin
├── wrangler.jsonc         # NEW: Worker config
├── package.json           # UPDATED: Add wrangler + types
├── tsconfig.json          # Existing (shared config)
└── tsconfig.worker.json   # NEW: Worker-specific types
```

**Why not separate repo?**
- Single deployment artifact (frontend + Worker)
- Shared TypeScript config easier
- One dev loop for full-stack dev
- Only split when you have 2+ independent workers or different deploy cadence

---

### Q2: Dev Workflow — Can wrangler dev and vite dev run together?

**Status:** ANSWERED ✓

**Short answer:** YES — via the Vite plugin's unified dev server.

**How it works:**
1. You run: `npm run dev` (single command)
2. Vite starts its dev server
3. `@cloudflare/vite-plugin` starts Workers runtime locally (inside Vite)
4. Both run in the same process, no proxy needed
5. HMR works for both client (React) and server (Worker) code

**Configuration in `vite.config.ts`:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    cloudflare()  // Run Workers runtime locally
  ],
})
```

**The plugin:** `@cloudflare/vite-plugin` (available for Vite 8 ✓)

**Dev server behavior:**
- Static assets served by Vite
- `/api/*` routes handled by Worker code
- SPA routing: 404s on unknown routes → fallback to `index.html` for React Router
- Configure this in `wrangler.jsonc`: `"assets.not_found_handling": "single-page-application"`

**Deploy workflow:**
```bash
npm run dev      # Local dev (Vite + Workers together)
npm run build    # Compiles client + Worker to /dist
npm run preview  # Test the build in local Workers runtime
npm run deploy   # npm exec wrangler deploy (pushes to Cloudflare)
```

---

### Q3: Minimal wrangler.jsonc for DO + R2 Support

**Status:** ANSWERED ✓

**Minimal config for future DO/R2 extensibility:**

```jsonc
{
  // Required
  "name": "speechrun-worker",
  "main": "./worker/index.ts",
  "compatibility_date": "2026-03-29",

  // For Durable Objects and R2
  "env": {
    "production": {},
    "development": {
      // Local development bindings go here if needed
    }
  },

  // Static assets
  "assets": {
    "directory": "./dist/public",
    "not_found_handling": "single-page-application"
  },

  // Optional: Compatibility flags for new runtime features
  "compatibility_flags": [
    // Add as needed for latest APIs
  ]
}
```

**For Durable Objects (when you add them):**
```jsonc
{
  "durable_objects": {
    "bindings": [
      {
        "name": "COUNTER",
        "class_name": "Counter",
        "script_name": "speechrun-worker"
      }
    ]
  }
}
```

**For R2 (when you add it):**
```jsonc
{
  "r2_buckets": [
    {
      "binding": "BUCKET",
      "bucket_name": "speechrun-media"
    }
  ]
}
```

**Node.js compatibility:** Already built-in to Cloudflare Workers. No extra flags needed for `node:*` imports.

---

### Q4: Minimal Worker Entry File (TypeScript)

**Status:** ANSWERED ✓

**Minimal `worker/index.ts`:**

```typescript
import { Router } from 'itty-router'

interface Env {
  // Bindings go here
  // COUNTER?: DurableObjectNamespace
  // BUCKET?: R2Bucket
}

const router = Router<Request, [Env]>()

// Health check
router.get('/api/health', () => new Response('OK', { status: 200 }))

// Example API endpoint
router.post('/api/transcribe', async (req, env) => {
  const { audio } = await req.json<{ audio: string }>()

  // Example: Call ElevenLabs API here
  const response = {
    status: 'success',
    transcript: 'Sample transcript',
    timestamp: new Date().toISOString()
  }

  return Response.json(response)
})

// Fallback for unmatched routes
router.all('*', () => new Response('Not Found', { status: 404 }))

export default {
  fetch: (req: Request, env: Env) => router.handle(req, env)
}
```

**CORS setup for local dev (add if needed):**

```typescript
const addCorsHeaders = (response: Response): Response => {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return response
}

router.options('*', () => new Response(null, { status: 200 }))

export default {
  fetch: (req: Request, env: Env) => {
    const response = router.handle(req, env)
    return addCorsHeaders(response)
  }
}
```

**Type definitions:** `@cloudflare/workers-types` (install in next step)

---

### Q5: Project Structure — Monorepo vs Single Repo?

**Status:** ANSWERED ✓

**VERDICT: Single repo for this phase**

| Aspect | Single Repo | Monorepo |
|--------|-------------|----------|
| **Setup time** | 10 min | 30 min |
| **Dev command** | `npm run dev` | Multiple: `npm run dev:worker`, `npm run dev:frontend` |
| **Deploy** | `wrangler deploy` | Multiple commands per service |
| **Shared code** | Import directly | Workspace complexity |
| **When to use** | MVP, hackathon | 3+ independent services |

**Hackathon recommendation:** Single repo. You'll have:
- React frontend (SPA)
- One Worker (handles API + ElevenLabs integration)
- Optional: Durable Objects (later)

When/if you add a second worker or scheduled job, split then.

---

## Implementation Checklist

```bash
# 1. Install dependencies
npm install -D @cloudflare/vite-plugin wrangler @cloudflare/workers-types

# 2. Create worker directory structure
mkdir -p worker

# 3. Update vite.config.ts
# → Add cloudflare() plugin (see code above)

# 4. Create wrangler.jsonc
# → Copy minimal config from Q3 above

# 5. Create worker/index.ts
# → Copy from Q4 above

# 6. Create tsconfig.worker.json
# → See next section

# 7. Update package.json scripts
# → Add "deploy": "wrangler deploy"

# 8. Test locally
npm run dev

# 9. Deploy to production
npm run build && npm run deploy
```

---

## TypeScript Configuration

**Create `tsconfig.worker.json`:**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["worker/**/*.ts"]
}
```

Your existing `tsconfig.json` (for React) stays unchanged.

---

## Testing the Setup Locally

```bash
# Terminal 1: Dev server (runs both Vite + Worker)
npm run dev

# Terminal 2: Test the Worker
curl http://localhost:5173/api/health
# Expected: "OK"

curl -X POST http://localhost:5173/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{"audio":"base64-encoded-data"}'
# Expected: { "status": "success", "transcript": "...", "timestamp": "..." }
```

---

## Deployment Checklist

Before first deploy:

1. **Create Cloudflare account** if you haven't already
2. **Authenticate wrangler:**
   ```bash
   npx wrangler login
   ```
3. **Verify Worker name in `wrangler.jsonc`** matches your Cloudflare project
4. **Build locally:**
   ```bash
   npm run build
   ```
5. **Preview the build:**
   ```bash
   npm run preview
   ```
6. **Deploy:**
   ```bash
   npm run deploy
   # or: npm exec wrangler deploy
   ```

---

## Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| Single repo, not monorepo | Hackathon phase simplicity; one dev loop |
| Vite plugin, not separate wrangler dev | Unified dev server; HMR for both client + server |
| `wrangler.jsonc` not `wrangler.toml` | Better comments support; modern standard |
| itty-router as router example | Lightweight (2KB); Cloudflare recommended; pairs well with Workers |
| CORS headers optional | Only needed if frontend calls from different domain; local dev doesn't need it |

---

## Unresolved Questions

1. **ElevenLabs integration specifics:** Does SpeechRun call ElevenLabs from the Worker or directly from React? (Affects whether you need API keys in Worker bindings)
2. **State persistence:** Will you use Durable Objects for session state, or prefer a lightweight in-memory approach for MVP?
3. **Deployment domain:** Will SpeechRun use a `*.workers.dev` subdomain, or a custom domain? (Affects wrangler.jsonc `routes` configuration)

---

## Sources
- [React + Vite · Cloudflare Workers docs](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/)
- [Vite plugin · Cloudflare Workers docs](https://developers.cloudflare.com/workers/vite-plugin/)
- [Tutorial - React SPA with an API · Cloudflare Workers docs](https://developers.cloudflare.com/workers/vite-plugin/tutorial/)
- [Getting started · Cloudflare Durable Objects docs](https://developers.cloudflare.com/durable-objects/get-started/)
- [Configuration - Wrangler · Cloudflare Workers docs](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Advanced setups · Cloudflare Workers docs](https://developers.cloudflare.com/workers/ci-cd/builds/advanced-setups/)
