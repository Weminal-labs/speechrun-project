# Setup Scratchpad

## What they told me in Phase 1
- platform: Web app (deployed on Cloudflare Workers)
- stack preference: React + Vite frontend, Cloudflare Workers + Durable Objects backend, TypeScript
- hosting: Cloudflare Workers
- needs data storage: Yes — Durable Object SQLite for context/transcripts, R2 for audio files
- auth: None — no user accounts, open tool
- team size: Team (building with others)
- tools already chosen: ElevenLabs (voice AI), Cloudflare Workers AI, GitHub REST API, Tailwind CSS, @cloudflare/agents SDK
- budget: Own API keys — Cloudflare account + ElevenLabs API key ready to go

## What I know about the idea (Phase 2+)
- core idea: Users provide a GitHub URL, two AI agents (Nova the PM, Aero the Dev) analyze the codebase and generate a podcast-style voice conversation about the code
- problem: Understanding a new codebase is time-consuming and boring — reading docs/code is a slog
- current solution: Unknown — manual code reading, existing code explainers?
- primary user: Developers who want to quickly understand a codebase
- user type count: Single — developers/engineers
- key differentiator: Two distinct AI personas having a natural conversation about code, with real voice audio — not just text summaries
- most important feature: GitHub URL -> generated audio podcast conversation about the code

## Features (Phase 3)
- From plan:
  - Codebase ingestion (GitHub URL -> repo analysis)
  - Context generation (Arche-style structured context)
  - Multi-agent dialogue (Nova PM + Aero Dev conversation)
  - ElevenLabs audio generation (text-to-speech podcast)
  - 3-panel layout UI
  - Sandbox mini-app generation (stretch)

## Design (Phase 4)
- tone: Dark theme, clean monospace aesthetic
- references: Inspired by Sunil Pai's "After WIMP" concept
- hard nos: Unknown
