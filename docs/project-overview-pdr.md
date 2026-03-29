# SpeechRun: Project Overview & Product Development Requirements

## What It Is

**SpeechRun** ("Let Your Code Talking") is an AI-powered "code podcast" application for the Cloudflare x ElevenLabs hackathon. Users paste a GitHub URL, and two AI personas — Nova (PM) and Aero (Dev) — analyze the codebase and generate a podcast-style voice conversation exploring the code's architecture, patterns, and design decisions.

## The Problem

Understanding an unfamiliar codebase is tedious and time-consuming. Developers spend hours reading documentation, navigating file structures, and reverse-engineering how systems work. Existing code explanation tools produce dry, skimmable text summaries that lack the narrative richness needed for deep learning.

## The Solution

Transform codebase understanding into an engaging podcast experience. Two distinct AI personas conduct a natural, opinionated conversation about the code rather than delivering a monologue. The result is something developers can listen to while commuting, exercising, or stepping away from their screen—making code comprehension passive rather than active work.

## Target Users

- **Primary:** Developers onboarding to unfamiliar codebases (new teams, open-source projects, dependencies)
- **Secondary:** Engineering managers and technical leads evaluating code quality and architecture
- **Tertiary:** Engineering students and junior developers learning architectural patterns

## Key Differentiators

1. **Two-agent dialogue** — Not a monologue; natural back-and-forth between PM and Dev personas with disagreements and collaborative problem-solving
2. **Real voice audio** — ElevenLabs natural speech synthesis, not robot TTS
3. **Structured context** — Arche-style artifact generation alongside podcast (architectural overview, file relationship maps, pattern documentation)
4. **Developer aesthetic** — Terminal/ASCII interface that feels native to engineering culture
5. **Fast turnaround** — Podcast generation from URL to playable audio within 2 minutes

## Success Metrics (Hackathon MVP)

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Time to playable podcast** | < 2 minutes from URL paste | Hackathon demo viability |
| **Audio naturalness** | Distinct, intelligible voices | ElevenLabs quality bar |
| **Context accuracy** | No hallucinated filenames or functions | Credibility for real codebases |
| **UI responsiveness** | < 1s input feedback | Hackathon user experience |
| **Codebase scope** | 10-50 files, max 10k LOC | MVP constraint; larger repos in v2 |

## v1 MVP Scope

### In Scope
- GitHub URL input and public repo fetching (via GitHub REST API)
- Codebase analysis and context generation (via Workers AI)
- Two-agent dialogue generation (Nova PM + Aero Dev)
- ElevenLabs text-to-speech audio generation per dialogue turn
- Audio playback with play/pause and progress controls
- 3-panel layout: context sidebar (left 20%), conversation transcript (center 50%), sandbox preview (right 30%)
- Terminal/ASCII aesthetic with custom color tokens (deep blueprint blue, monospace fonts, ASCII art logo)
- WebSocket real-time updates from backend to frontend
- Deployment to Cloudflare Workers platform

### Out of Scope (Post-Hackathon)
- Text to Dialogue API (multi-speaker single audio file)
- Waveform visualization and transcript-audio sync
- Sandbox mini-app code generation
- Voice cloning for custom agent voices
- User authentication, accounts, or saved history
- Private repository support (requires GitHub OAuth)
- Mobile-native app

## Hackathon Context

**Hackathon:** Cloudflare x ElevenLabs Hackathon
**Platform:** Cloudflare Workers (serverless edge compute)
**Timeline:** MVP completion required for submission
**Constraint:** No external databases; use Cloudflare Durable Objects + R2
**Integration Requirements:** Workers AI for LLM, ElevenLabs API for voice, GitHub REST API for repo access

## Technical Approach

### Frontend
- React 19 + TypeScript (strict mode)
- Vite for dev/build tooling
- Tailwind CSS 4 for styling
- JetBrains Mono font for monospace aesthetic
- WebSocket client for real-time updates

### Backend
- **Cloudflare Workers** — Serverless edge runtime handling HTTP requests
- **Durable Objects** — Stateful agent instances (Orchestrator, Nova, Aero) with built-in SQLite and WebSocket support
- **Workers AI** — LLM inference for dialogue and context generation (Llama 3.1 70B)
- **R2 Object Storage** — Audio file persistence
- **GitHub REST API** — Repository tree and file content fetching
- **ElevenLabs API** — Text-to-speech voice synthesis

### Architecture Pattern
Microservice agents on Durable Objects: request arrives at Workers handler, gets routed to Orchestrator Durable Object, which spins up Nova and Aero agent instances, coordinates dialogue turn-by-turn, stores context/transcripts in SQLite, generates audio via ElevenLabs, and pushes updates to frontend via WebSocket.

## Non-Functional Requirements

| Requirement | Specification | Rationale |
|-------------|---------------|-----------|
| **Latency** | Dialogue generation + audio in < 2 min | Hackathon live demo |
| **Availability** | 99% uptime on Cloudflare edge | Dependency on external APIs (GitHub, ElevenLabs) |
| **Code safety** | No code execution; analysis only | Security: untrusted repo content |
| **Rate limiting** | Self-imposed: 5 repos/hour free | Demo tool; prevent abuse |
| **Accessibility** | WCAG AA where practical | Stretch goal; terminal UI is text-native |

## Acceptance Criteria

The v1 MVP is production-ready when:

1. User pastes GitHub URL, clicks "Generate Podcast"
2. System fetches repo, analyzes codebase via Workers AI
3. Two agents generate 8-12 minute conversation outline
4. ElevenLabs generates audio for each agent turn
5. Audio files stored in R2 with signed URLs
6. Frontend displays transcript in real-time as turns arrive
7. Audio player plays all turns sequentially
8. No crashes, errors logged, graceful failure messages
9. Demo runs on real open-source repo (10-50 files) within 2 minutes
10. Code and docs meet project standards; no linter errors

## Design Principles

1. **Terminal-first** — UI feels native to developers; no gradients, no marketing copy, command-line conventions
2. **No emoji** — Monospace aesthetic incompatible with emoji; all UI via ASCII and text
3. **Desktop-first** — Responsive design is nice-to-have; desktop browser is primary target
4. **Opinionated agents** — Nova and Aero aren't neutral; they discuss trade-offs, best practices, potential improvements
5. **Fast feedback** — Real-time updates; users see progress as context loads and dialogue generates
6. **Honest output** — No hallucinated code; context generation only uses actual repo content

## Success Indicators

- **Hackathon judges** demo the tool on a real open-source repo and hear a coherent, engaging podcast within 2 minutes
- **Audio quality** is clear and distinct between Nova and Aero voices
- **Code repository** is clean, follows TypeScript strict mode, and deploys without errors
- **User feedback** (if time permits) indicates the podcast is actually useful for understanding unfamiliar code
