# Codebase Summary

## Project Structure

```
speechrun-project/
├── src/
│   ├── main.tsx              # React 19 entry point
│   ├── App.tsx               # Root component: 3-panel layout
│   ├── index.css             # Global styles: Tailwind + custom theme
│   └── components/
│       ├── TerminalChrome.tsx        # Window chrome/title bar
│       ├── AsciiLogo.tsx             # ASCII block logo
│       ├── TabNav.tsx                # Tab navigation row
│       ├── ContextSidebar.tsx        # Left panel (context display)
│       ├── ConversationPanel.tsx     # Center panel (transcript + audio)
│       └── SandboxPanel.tsx          # Right panel (mini-app preview)
├── worker/
│   └── index.ts              # Cloudflare Worker entry point (/api/health)
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript strict mode config (frontend)
├── tsconfig.worker.json      # TypeScript config (worker)
├── vite.config.ts            # Vite + Cloudflare plugin config
├── wrangler.jsonc            # Cloudflare Workers config
├── index.html                # HTML entry point
└── context/                  # Setup docs (not part of build)
    ├── project/              # Project overview, scope, roadmap
    ├── technical/            # Stack, architecture, API contracts
    ├── developer/            # Conventions, testing, workflow
    ├── design/               # Design system, components, UX patterns
    └── ops/                  # CI/CD, infrastructure, monitoring
```

## Source Files Summary

### Frontend Entry Points

| File | Lines | Purpose |
|------|-------|---------|
| `src/main.tsx` | 10 | React 19 DOM root; mounts App to `#app` |
| `src/App.tsx` | 35 | Root component; 3-panel flex layout |
| `src/index.css` | 48 | Global Tailwind imports, custom color tokens, scrollbar styling |

### Worker (Backend)

| File | Lines | Purpose |
|------|-------|---------|
| `worker/index.ts` | 21 | Cloudflare Worker fetch handler; `/api/health` endpoint, 404 for unknown API routes |

### Components (6 total, ~225 LOC)

| Component | Lines | Purpose | Status |
|-----------|-------|---------|--------|
| `TerminalChrome.tsx` | 25 | Window chrome with title bar, border, status indicator | Skeleton |
| `AsciiLogo.tsx` | 23 | ASCII block art logo, centered display | Skeleton |
| `TabNav.tsx` | 19 | Tab row navigation (Analysis, Results, Settings tabs) | Skeleton |
| `ContextSidebar.tsx` | 30 | Left panel; displays repo context, file tree (placeholder) | Skeleton |
| `ConversationPanel.tsx` | 56 | Center panel; GitHub URL input, transcript area, audio player | Skeleton |
| `SandboxPanel.tsx` | 27 | Right panel; mini-app sandbox preview (placeholder) | Skeleton |

**Current State:** All components are visual skeletons with static HTML; no state management, no real data, no API calls.

### Styling

**Theme tokens (src/index.css):**
- `terminal-bg`: #1a237e (deep blueprint blue)
- `terminal-text`: #e8eaf6 (light lavender text)
- `terminal-accent`: #7986cb (accent purple-blue)
- `terminal-border`: #3949ab (border dark blue)
- `terminal-dim`: #5c6bc0 (dimmed text)
- `terminal-bright`: #c5cae9 (bright accent)

**Font:** JetBrains Mono (via @fontsource)

## Dependencies

### Runtime

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.4 | UI framework |
| `react-dom` | ^19.2.4 | React DOM rendering |
| `@fontsource/jetbrains-mono` | ^5.2.8 | Monospace font |

### Development

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^6.0.2 | Type checking (strict mode) |
| `vite` | ^8.0.3 | Build tool and dev server |
| `@vitejs/plugin-react` | ^6.0.1 | Vite React plugin with SWC |
| `tailwindcss` | ^4.2.2 | Utility CSS framework |
| `@tailwindcss/vite` | ^4.2.2 | Tailwind Vite plugin |
| `@types/react` | ^19.2.14 | React type definitions |
| `@types/react-dom` | ^19.2.3 | React DOM type definitions |
| `wrangler` | ^4.78.0 | Cloudflare Workers CLI and local runtime |
| `@cloudflare/vite-plugin` | ^1.30.2 | Unified Vite + Workers dev server |
| `@cloudflare/workers-types` | ^4.x | TypeScript types for Workers API |

**Note:** No testing framework (Jest, Vitest), linter (ESLint), or formatter (Prettier) configured yet.

## Build & Dev Scripts

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "deploy": "npm run build && wrangler deploy"
}
```

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run dev` | `vite` | Start dev server with hot reload (default: http://localhost:5173) |
| `npm run build` | `tsc -b && vite build` | Compile TS, then build optimized bundle to `dist/` |
| `npm run preview` | `vite preview` | Preview production build locally |
| `npm run deploy` | `npm run build && wrangler deploy` | Build and deploy to Cloudflare Workers |

## TypeScript Configuration

**File:** `tsconfig.json`

Key settings (strict mode enabled):
- `target: ES2020` — Modern JavaScript target
- `strict: true` — All strict type checks enabled
- `noUnusedLocals: true` — Unused variable detection
- `noUnusedParameters: true` — Unused parameter detection
- `module: ESNext` — Modern module syntax
- `jsx: react-jsx` — React 17+ JSX transform

## Current Implementation Status

### Completed (Phase 1)
- Vite + React 19 + TypeScript + Tailwind scaffolding
- Custom color theme and terminal aesthetic
- 3-panel layout with correct proportions (20% / 50% / 30%)
- Window chrome with title bar and status indicator
- ASCII logo component
- Tab navigation UI
- Placeholder components for all three panels
- JetBrains Mono font integration
- Responsive flexbox layout

### Completed (Cloudflare Foundation)
- Cloudflare Workers backend skeleton with `/api/health` endpoint
- `@cloudflare/vite-plugin` for unified dev server (frontend + worker)
- Worker TypeScript config (`tsconfig.worker.json`)
- Wrangler config (`wrangler.jsonc`) with SPA fallback

### Not Started
- Durable Objects (stateful agents)
- GitHub API integration
- Codebase ingestion and analysis
- Multi-agent dialogue generation
- ElevenLabs audio synthesis
- WebSocket communication
- Audio player functionality (beyond skeleton)
- Data persistence (SQLite, R2)
- Error handling and loading states

## File Size Metrics

| Type | Count | Total LOC | Avg LOC |
|------|-------|----------|---------|
| TypeScript/React | 9 | ~225 | ~25 |
| CSS | 1 | 48 | 48 |
| Config | 3+ | - | - |

All source files are well under the 200 LOC target; project is lightweight and maintainable.

## Key Design Files (Context Directory)

While not part of the build, these files document project decisions:

- `context/project/OVERVIEW.md` — Problem, solution, differentiators
- `context/project/ROADMAP.md` — 6-phase roadmap with stretch goals
- `context/project/SCOPE.md` — MVP vs. post-hackathon scope
- `context/technical/STACK.md` — Tech choices and rationale
- `context/technical/ARCHITECTURE.md` — System design (planned)
- `context/developer/CONVENTIONS.md` — Code style and naming
- `context/design/DESIGN_SYSTEM.md` — Color, typography, layout
- `context/design/COMPONENTS.md` — Component architecture

## Installation & Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

No additional environment variables required for Phase 1 (frontend-only). Backend phases will require:
- `GITHUB_TOKEN` — GitHub API authentication
- `ELEVENLABS_API_KEY` — ElevenLabs TTS service
- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` — Deployment credentials

## Next Steps (Phase 2+)

1. Add backend Durable Object definitions (agents)
2. Set up GitHub API integration for repo fetching
3. Implement Workers AI context generation
4. Build dialogue orchestration system
5. Integrate ElevenLabs TTS
6. Add WebSocket support for real-time frontend updates
7. Implement audio player functionality
8. Add error handling and edge case management
