# SpeechRun

> Let Your Code Talking

**SpeechRun** is an AI-powered "code podcast" app for the Cloudflare x ElevenLabs hackathon. Paste a GitHub URL, and two AI personas — Nova (PM) and Aero (Dev) — have a natural conversation about your codebase. The result is a podcast-style audio exploration of code architecture, patterns, and design decisions.

## Features

- **Two AI Personas:** Nova (product-focused) and Aero (developer-focused) discuss code together
- **Real Voice Audio:** Natural speech synthesis via ElevenLabs (not robot TTS)
- **Structured Context:** Architectural overview and pattern analysis alongside podcast
- **Terminal Aesthetic:** Developer-native UI with ASCII art and monospace typography
- **Real-Time Updates:** WebSocket integration for live transcript and audio player
- **Fast Turnaround:** From GitHub URL to playable podcast in under 2 minutes

## Tech Stack

### Frontend
- **React 19** + **TypeScript 6** — Type-safe component UI
- **Vite 8** — Lightning-fast dev server and optimized builds
- **Tailwind CSS 4** — Utility-first styling with custom theme
- **JetBrains Mono** — Monospace font for terminal aesthetic

### Backend (Planned)
- **Cloudflare Workers** — Serverless edge compute for API handling
- **Durable Objects** — Stateful agents (Orchestrator, Nova, Aero) with WebSocket and SQLite
- **Workers AI** — LLM inference (Llama 3.1 70B) for dialogue and context generation
- **R2 Storage** — Audio file persistence (S3-compatible object storage)
- **GitHub REST API** — Repository fetching and analysis
- **ElevenLabs API** — Text-to-speech voice synthesis

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- A Cloudflare account (for deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/speechrun.git
cd speechrun

# Install dependencies
npm install
```

### Development

```bash
# Start the dev server with hot reload
npm run dev

# Open browser to http://localhost:5173
```

### Build

```bash
# Compile TypeScript and build optimized bundle
npm run build

# Preview production build locally
npm run preview
```

## Project Structure

```
speechrun/
├── src/
│   ├── main.tsx                 # React 19 entry point
│   ├── App.tsx                  # Root component (3-panel layout)
│   ├── index.css                # Global styles and theme tokens
│   └── components/
│       ├── terminal-chrome.tsx    # Window chrome
│       ├── ascii-logo.tsx         # ASCII header
│       ├── tab-nav.tsx            # Tab navigation
│       ├── context-sidebar.tsx    # Left panel (context)
│       ├── conversation-panel.tsx # Center panel (transcript + audio)
│       └── sandbox-panel.tsx      # Right panel (mini-app)
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript strict mode config
├── tailwind.config.ts           # Tailwind theme with custom tokens
├── index.html                   # HTML entry point
├── docs/                        # Documentation
└── context/                     # Setup and design docs (not in build)
```

## Current Status

**Phase 1 Complete:** Frontend scaffold and UI shell
- React 19 + TypeScript + Vite + Tailwind all set up
- 3-panel layout with custom terminal aesthetic
- All components are visual skeletons (no state, no API calls yet)

**Phases 2-6 (Planned):** Backend agents, dialogue, audio, deployment
- See [Project Roadmap](./docs/project-roadmap.md) for details

## Design

### Color Theme

The app uses a custom terminal-inspired color palette:

| Token | Color | Usage |
|-------|-------|-------|
| `terminal-bg` | #1a237e | Background |
| `terminal-text` | #e8eaf6 | Default text |
| `terminal-accent` | #7986cb | Interactive elements |
| `terminal-border` | #3949ab | Borders, dividers |
| `terminal-dim` | #5c6bc0 | Secondary text |
| `terminal-bright` | #c5cae9 | Bright accents |

### Layout

- **Left Panel (20%):** Repository context (file tree, architecture)
- **Center Panel (50%):** Conversation transcript and audio player
- **Right Panel (30%):** Mini-app sandbox (stretch goal)

Font: **JetBrains Mono** (monospace, ~16px base)

## Documentation

- [Project Overview & PDR](./docs/project-overview-pdr.md) — Product requirements and success metrics
- [Codebase Summary](./docs/codebase-summary.md) — File structure and dependency overview
- [Code Standards](./docs/code-standards.md) — TypeScript, React, Tailwind conventions
- [System Architecture](./docs/system-architecture.md) — Frontend and planned backend design
- [Project Roadmap](./docs/project-roadmap.md) — 6-phase plan with tasks and timeline

## Contributing

### Code Quality

- **TypeScript strict mode** required — no `any`, `@ts-ignore`, or `@ts-expect-error` without justification
- **Functional components** only — no class components
- **Default exports** for components, **named exports** for utilities
- **Comments explain why, not what** — code should be self-documenting

### Before Committing

```bash
# Check TypeScript
npm run build

# Code review via: docs/code-standards.md
```

See [Code Standards](./docs/code-standards.md) for full conventions.

## Environment Variables

Currently, no environment variables are required for Phase 1 (frontend-only).

Future phases will require:
- `GITHUB_TOKEN` — GitHub API authentication
- `ELEVENLABS_API_KEY` — ElevenLabs text-to-speech API key
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID (deployment)
- `CLOUDFLARE_API_TOKEN` — Cloudflare API token (deployment)

## Deployment

Phase 6 (coming soon) will deploy to Cloudflare Workers.

```bash
# Requires: Wrangler CLI, Cloudflare account
wrangler publish
```

## Hackathon Context

**Hackathon:** Cloudflare x ElevenLabs
**Goal:** MVP code podcast app from GitHub URL to playable podcast in under 2 minutes
**Constraint:** No external databases; use Cloudflare Durable Objects + R2
**Timeline:** MVP target is 3-4 weeks of full-time development

## Roadmap Highlights

| Phase | Goal | Status |
|-------|------|--------|
| 1 | UI scaffold | Done |
| 2 | GitHub + Workers AI | Planned |
| 3 | Nova + Aero agents | Planned |
| 4 | ElevenLabs audio | Planned |
| 5 | WebSocket + frontend integration | Planned |
| 6 | Polish & deploy | Planned |

See [Project Roadmap](./docs/project-roadmap.md) for detailed tasks and timeline.

## Stretch Goals (Post-Hackathon)

- Text to Dialogue API (single multi-speaker audio file)
- Waveform visualization and transcript-audio sync
- Sandbox mini-app code generation
- Voice cloning for custom agent voices
- Share/embed podcasts
- Private repo support (GitHub OAuth)
- User accounts and saved history

## License

MIT License — See LICENSE file for details.

## Support

For questions or issues:
1. Check [Codebase Summary](./docs/codebase-summary.md) and [System Architecture](./docs/system-architecture.md)
2. Review [Code Standards](./docs/code-standards.md) for development conventions
3. Open an issue on GitHub

## Authors

Built for the Cloudflare x ElevenLabs hackathon.
