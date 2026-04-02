# Architecture Decision Log

> Log significant decisions here as they are made.
> Never delete entries — add a "superseded by" note instead.

## Decision Template

**Decision:** [What was decided]
**Date:** [When]
**Context:** [Why this decision needed to be made]
**Options Considered:** [What else was evaluated]
**Rationale:** [Why this option was chosen]
**Consequences:** [What this means going forward]

---

## D1: Worker Code Layout — Separate Directory Structure

**Decision:** Place Worker code in `worker/` directory (not `src/worker.ts`), with subdirectories for Durable Objects (`worker/do/`), library modules (`worker/lib/`), and configuration in the root.

**Date:** 2026-04-01

**Context:** Needed to structure the codebase to cleanly separate frontend (React) and backend (Cloudflare Workers) code, with different TypeScript configurations and build targets.

**Options Considered:**
- Single `src/` with frontend and worker code side-by-side (rejected — mixing concerns)
- Worker code at project root (rejected — no clear organization)
- Worker as separate git submodule (rejected — overhead for hackathon timeline)

**Rationale:** Separate `worker/` directory mirrors the existing `src/` for the React app, making it clear what runs where. Subdirectories for DOs and libraries scale better than a flat structure and follow Cloudflare's conventions.

**Consequences:** Two separate `tsconfig.json` files required (`tsconfig.app.json` for React, `tsconfig.worker.json` for Workers). Build pipeline and import paths must account for this dual structure.

---

## D2: Durable Object Class — Plain ES Class Instead of Agent SDK

**Decision:** Implement `SpeechRunSession` as a plain `DurableObject` class, not using the `@cloudflare/agents` SDK's Agent class.

**Date:** 2026-04-01

**Context:** The agents SDK was available but adds complexity and opinionated patterns. Needed a simple, synchronous state store for context and session data during the hackathon.

**Options Considered:**
- Agent class from @cloudflare/agents SDK (rejected — adds unnecessary abstraction; Agent class is designed for agent-driven workflows, not simple storage)
- External database like Postgres (rejected — adds operational overhead; Durable Objects with SQLite are simpler and on-platform)

**Rationale:** A plain `DurableObject` subclass gives us SQLite persistence and WebSocket support with minimal boilerplate. The agents SDK is overkill for Phase 2's requirements; it can be adopted in Phase 3 if dialogue generation needs agent patterns.

**Consequences:** WebSocket and state management are explicit in the DO code rather than hidden behind Agent abstractions. Easier to debug but requires more manual wiring in Phase 3.

---

## D3: Workers AI Model Selection — Llama 3.1 8B FP8

**Decision:** Use `@cf/meta/llama-3.1-8b-instruct-fp8` as the default LLM model for context generation.

**Date:** 2026-04-01

**Context:** Original scope stated preference for Llama 3.1 70B, but that model is not in the `@cloudflare/workers-types` type definitions. Needed a confirmed-available, performant model for Phase 2.

**Options Considered:**
- Llama 3.1 70B (rejected — not typed; may not be available at Workers free tier; higher latency and cost)
- GPT-3.5 or other proprietary models (rejected — no confirmed Cloudflare binding)
- Llama 3.1 8B FP8 (chosen — confirmed in types, faster, suitable for context summarization)

**Rationale:** 8B model is sufficient for summarizing code context (not doing deep reasoning). FP8 quantization trades minor accuracy for 3x faster inference. Confirmed availability in types reduces integration risk.

**Consequences:** Context generation runs faster and cheaper. May be less sophisticated at edge cases (e.g. complex architectural decisions). Can upgrade to 70B in Phase 3 if podcast quality requires it, or route through AI Gateway for model flexibility.

---

## D4: TypeScript Configuration — Dual tsconfig Setup

**Decision:** Split TypeScript configuration into two files: `tsconfig.app.json` (React frontend) and `tsconfig.worker.json` (Workers backend), with a minimal root `tsconfig.json` that extends both.

**Date:** 2026-04-01

**Context:** Frontend (ES modules, React JSX, DOM types) and backend (CommonJS-compatible Workers runtime, no DOM) have conflicting TypeScript settings. A single tsconfig would force compromises.

**Options Considered:**
- Single tsconfig with union of all settings (rejected — Node and DOM environments conflict; lib bloat)
- Monorepo structure with separate packages (rejected — too heavy for hackathon)
- Dual tsconfig with root extending both (chosen — explicit, minimal overhead)

**Rationale:** Separate files let each environment declare exactly what it needs. Vite respects `tsconfig.app.json` for frontend; Wrangler respects `tsconfig.worker.json` for workers. Clear separation aids IDE hints and catches type errors in the right context.

**Consequences:** Must be careful to place files in the correct directory and reference the right tsconfig in build scripts. IDE may need workspace settings to resolve types correctly, but this is manageable.

---

## D5: Vite Configuration — remoteBindings: false for Local Development

**Decision:** Disable `remoteBindings` in Vite config for local dev, meaning the AI binding is simulated locally and doesn't require remote authentication.

**Date:** 2026-04-01

**Context:** The AI binding in wrangler.toml requires authentication via `wrangler login` and remote Cloudflare account access. For rapid local iteration, this adds friction.

**Options Considered:**
- remoteBindings: true (requires wrangler login; slower feedback loop)
- remoteBindings: false (local simulation; faster iteration but AI calls won't work in dev)
- Conditional based on environment (overly complex for Phase 2)

**Rationale:** Local dev speed is more important than simulating AI calls. Phase 2 focuses on the ingest pipeline infrastructure, not AI output quality. Phase 3 can enable remoteBindings when dialogue generation is wired.

**Consequences:** `wrangler dev` will fail on AI binding calls with "binding not found" unless the binding is mocked or skipped. This is acceptable for Phase 2; Phase 3 will add proper mocking or enable remoteBindings with real auth.

---

## D6: File Selection Algorithm — Score-Based Priority with Binary Detection

**Decision:** Implement file selector using a priority score system (high for README, package.json, files in src/; low for binaries, dist/, node_modules) with a hard cap of 20 files, sorted by directory depth.

**Date:** 2026-04-01

**Context:** Need to identify the most relevant files in a repo for podcast context without requiring per-repo configuration. Must handle diverse project types (Node, Python, Go, Rust, etc.) and avoid noise (node_modules, build output, images).

**Options Considered:**
- Static allowlist of file types (too brittle; misses important files in unusual projects)
- Semantic ranking via embeddings (too complex; requires additional API call)
- Simple heuristic based on file extensions and paths (chosen — fast, deterministic, works for most projects)

**Rationale:** The priority score is easy to tune and doesn't require external calls. Capping at 20 files keeps context generation fast and focused. Sorting by depth (shallower files first) biases toward architecture/README over deep implementation details.

**Consequences:** Some repos with atypical structures may have poor file selection. Can improve in future by adjusting heuristics or adding per-framework rules. For hackathon, this is sufficient.

---

## D7: Session ID Generation — crypto.randomUUID() with idFromName()

**Decision:** Generate session IDs as UUID v4 using `crypto.randomUUID()`, and derive Durable Object IDs via `env.SPEECHRUN_SESSION.idFromName()` to ensure each session gets its own DO instance.

**Date:** 2026-04-01

**Context:** Needed a unique, collision-free way to generate session IDs and bind them to Durable Object instances. Durable Objects are key-addressed; the key must be consistent for a given session.

**Options Considered:**
- Sequential IDs (rejected — requires a global counter, adds latency)
- Timestamp-based IDs (rejected — collision risk, not suitable for distributed env)
- crypto.randomUUID() + idFromName() (chosen — cryptographically strong, deterministic DO lookup)

**Rationale:** UUIDs are collision-resistant by design. Using `idFromName()` with the session ID string ensures the same session ID always maps to the same DO instance, even across Worker invocations.

**Consequences:** Session IDs are 36 characters (UUID format) — slightly verbose but fine for browser storage. No risk of collisions or session leakage.

---

## D8: Rate Limiting — Deferred to Post-Hackathon

**Decision:** Defer server-side rate limiting (T21) to a post-hackathon phase. Not critical for v1 demo.

**Date:** 2026-04-01

**Context:** Originally planned rate limiting per IP to protect against GitHub API quota exhaustion and AI cost spiraling. However, for a hackathon demo with limited users, the risk is low.

**Options Considered:**
- Implement Durable Object counter for rate limiting (rejected — adds latency and complexity; hackathon users unlikely to trigger quota limits)
- Use Cloudflare's native Rate Limiting rules (rejected — may not be available at free tier)
- Defer until post-demo (chosen — focus on core features; revisit for production)

**Rationale:** Hackathon is time-constrained. Rate limiting is a nice-to-have safeguard, not a core feature. Users are expected to be well-behaved; unfamiliar with the app. Can add this quickly in a follow-up pass if needed.

**Consequences:** If a single user or bot hammers the ingest endpoint, they could exhaust GitHub's 60 req/hour unauthenticated limit or drive up Workers AI costs. Unlikely in a hackathon setting, but should be noted in the risk log.
