---
title: "Cloudflare Workers Foundation"
description: "Add Cloudflare Workers backend skeleton to existing Vite + React frontend"
status: completed
priority: P1
effort: 2h
branch: main
tags: [infra, backend, cloudflare]
blockedBy: []
blocks: []
created: 2026-03-29
---

# Cloudflare Workers Foundation

## Overview

Add Cloudflare Workers backend to existing SpeechRun frontend. Single-repo setup using `@cloudflare/vite-plugin` for unified dev server. Foundation for future Durable Objects + R2 integration.

## Cross-Plan Dependencies

None.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Install Dependencies & Configure](./phase-01-install-and-configure.md) | Complete |
| 2 | [Create Worker & Verify](./phase-02-create-worker-and-verify.md) | Complete |

## Dependencies

- Cloudflare account (user has one)
- wrangler CLI (installed via npm as devDependency)
- `@cloudflare/vite-plugin` compatible with Vite 8

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Single repo, not monorepo | Hackathon simplicity; one dev loop |
| `@cloudflare/vite-plugin` | Unified dev server; HMR for both client + server |
| `wrangler.jsonc` over `.toml` | Better comment support, modern standard |
| No router library yet | YAGNI; raw fetch handler sufficient for foundation |
| No CORS middleware | Same-origin via Vite plugin; not needed |
