# Roadmap

> Organized into phases. v1 is the hackathon MVP.

## Phase 1 — Scaffold & Foundation
- Project scaffold from ElevenLabs x Cloudflare starter
- Wrangler config with Durable Object bindings
- Dev environment setup
- ASCII terminal UI shell (3-panel layout)

## Phase 2 — Codebase Ingestion
- GitHub URL parsing and validation
- Repo tree fetching via GitHub REST API
- Key file content fetching
- Context generation via Workers AI (Arche-style)
- Context stored in Durable Object SQLite

## Phase 3 — Multi-Agent Dialogue
- Orchestrator agent (topic outline, turn coordination)
- Nova agent (PM persona)
- Aero agent (Dev persona)
- Turn-by-turn dialogue generation
- Emotion/delivery tag insertion for ElevenLabs

## Phase 4 — Audio Generation
- ElevenLabs TTS integration (per-turn)
- Audio file storage in R2
- Audio URL delivery to frontend

## Phase 5 — Frontend Integration
- WebSocket connection to Durable Objects
- Real-time context sidebar population
- Chat-bubble transcript display
- Audio player with play/pause/progress
- Loading states and progress indicators

## Phase 6 — Polish & Deploy
- Error handling for API failures
- Loading animations
- Deploy to Cloudflare Workers
- Demo with a real open-source repo

---

## Stretch (Post-Hackathon)
- Text to Dialogue API (single multi-speaker audio)
- Waveform visualization
- Transcript-audio sync
- Sandbox mini-app generation
- Share/embed podcasts
