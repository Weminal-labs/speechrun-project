# Feature: Codebase Ingestion

> **Status:** `complete`
> **Phase:** v1
> **Last updated:** 2026-04-01

---

## Summary

Codebase Ingestion is the backend core of SpeechRun — the engine that turns a GitHub URL into structured, AI-generated context that the podcast agents can talk about. This feature covers two interdependent layers: (1) the backend scaffold that makes any Cloudflare Worker logic possible (wrangler config, Durable Object bindings, R2 binding, Workers entry point, WebSocket routing), and (2) the codebase analysis pipeline itself (GitHub URL parsing and validation, repo tree fetching, key file selection and content fetching, Workers AI context generation, and storage in Durable Object SQLite). The backend scaffold is a hard prerequisite — it must exist before any GitHub fetching or AI inference can be wired up. Together, these two layers form the foundation that Phase 3 (dialogue generation) and Phase 4 (audio generation) build directly on top of.

---

## Users

All users — anyone who pastes a GitHub URL into the app. This is the first backend action triggered in the user journey. The user never sees most of this feature directly; they see its output (generated context in the sidebar) and its success state (the pipeline completing and the podcast beginning to generate). This feature sits between the UI input (Phase 1) and the audio output (Phases 3–4).

---

## User Stories

- As a **developer**, I want to paste a public GitHub URL and have the app automatically fetch and analyse the repo so that I don't have to manually upload files or configure anything.
- As a **developer**, I want the app to identify the most important files in a repo so that the generated podcast focuses on the architecture and key logic rather than boilerplate noise.
- As a **developer**, I want a structured context summary (tech stack, architecture, key components) to appear in the sidebar so that I can follow the AI conversation with reference material.
- As a **developer**, I want the system to validate my URL immediately and tell me clearly if the repo can't be fetched so that I'm not left waiting for a silent failure.
- As a **developer**, I want the backend to store the generated context durably so that the podcast agents (Nova and Aero) can access it consistently throughout the generation session.

---

## Behaviour

### Happy Path

1. User types or pastes a GitHub URL into the terminal-style input field in the center panel and submits (Enter key or button click).
2. The frontend sends a POST request to the Workers API with the raw URL string.
3. The Worker parses and validates the URL: confirms it is a valid `github.com` URL, extracts the `owner` and `repo` segments, rejects anything else.
4. The Worker creates (or retrieves) a Durable Object instance keyed to a session ID. This DO instance will hold all state for this ingestion run.
5. The Worker calls the GitHub REST API to fetch the repo's default branch ref and the full file tree (`GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1`).
6. The Worker filters the tree to identify key files using a priority ruleset (see Edge Cases). This produces a list of up to 20 file paths to fetch.
7. For each selected file path, the Worker fetches raw content via the GitHub Contents API (`GET /repos/{owner}/{repo}/contents/{path}`). Files are fetched in parallel where possible.
8. The Worker assembles the file contents into a structured prompt and submits it to Workers AI (Llama 3.1 70B or equivalent) for context generation. The prompt instructs the model to produce a JSON context object covering: project summary, tech stack, key architectural decisions, notable components, code quality observations, and potential discussion topics for the podcast.
9. The Workers AI response is parsed, validated as JSON, and stored in the Durable Object's SQLite store under a `context` record keyed to the session.
10. The Worker returns a success response to the frontend containing the session ID and the generated context object.
11. The frontend displays the context in the left sidebar panel and transitions the UI to the "ready to generate podcast" state.
12. The Durable Object instance persists the context and session state, ready for the dialogue generation step (Phase 3).

### Edge Cases & Rules

**URL validation**
- Accept only URLs matching `https://github.com/{owner}/{repo}` — with or without a trailing slash, with or without `.git` suffix (strip `.git` if present).
- Accept URLs with additional path segments (e.g. `/tree/main`, `/blob/main/README.md`) but extract only `owner` and `repo` — ignore the rest.
- Reject URLs with query strings injected in the owner or repo segments.
- Reject non-github.com domains entirely (no gitlab.com, bitbucket.org, etc. — v1 is GitHub only).
- Reject if owner or repo segments contain characters outside `[A-Za-z0-9_.-]`.
- Reject if owner or repo are empty strings.
- All URL validation happens server-side in the Worker, not just the client.

**Repo access**
- If the GitHub API returns 404, the repo does not exist or is private. Return a user-facing error: "Repository not found. Make sure it is public and the URL is correct."
- If the GitHub API returns 403 or 429 (rate limited), return: "GitHub is temporarily unavailable. Please try again in a moment."
- If the repo exists but has zero files (empty repo), return: "This repository appears to be empty. Nothing to analyse."
- Public repos only. No GitHub authentication token is used for repo fetching in v1. The Worker makes unauthenticated requests to the GitHub REST API (60 requests/hour per IP limit applies).

**File tree filtering — key file selection rules**
- Always include: `README.md`, `README.txt`, `package.json`, `wrangler.toml`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `requirements.txt`, `Gemfile` — whichever are present.
- Always include: any file at the root level with extension `.md`.
- Prioritise files in directories named `src/`, `lib/`, `app/`, `core/`, `server/`.
- Deprioritise and skip: `node_modules/`, `.git/`, `dist/`, `build/`, `coverage/`, `__pycache__/`, `.next/`, `.nuxt/`, `vendor/`.
- Deprioritise and skip: binary files (images, fonts, compiled assets) — detect by extension: `.png`, `.jpg`, `.gif`, `.svg`, `.ico`, `.woff`, `.woff2`, `.ttf`, `.eot`, `.mp3`, `.mp4`, `.pdf`.
- Cap at 20 files total. If more than 20 candidate files exist after filtering, sort by directory depth (shallower first) and take the first 20.
- Cap individual file content at 50 KB. If a file exceeds 50 KB, truncate to the first 50 KB and append a `[TRUNCATED]` marker before passing to the LLM.

**Workers AI / LLM**
- If the Workers AI inference call fails or times out, return: "Failed to analyse the repository. Please try again."
- If the LLM response is not valid JSON (parse error), retry once with a stricter JSON-only prompt. If the second attempt also fails, return the error to the client rather than storing malformed data.
- The LLM prompt must explicitly instruct the model to return only a JSON object with no surrounding prose. Use a system prompt that enforces this.

**Durable Object session management**
- Each ingestion run gets a unique session ID (UUID v4, generated by the Worker on POST).
- The session ID is returned to the frontend and stored in the browser (in memory or sessionStorage — not localStorage, not cookies).
- If a user submits a new URL while a previous session exists, a new session ID is generated — old sessions are not reused.
- Durable Object instances have no manual expiry in v1. Cloudflare's platform eviction handles cleanup.

**Concurrency**
- Individual file fetches from GitHub may be parallelised using `Promise.all`, but total concurrent outbound GitHub requests from a single Worker invocation must not exceed 10.
- If the tree contains more than 200 files (before filtering), apply filtering logic before fetching any content — never fetch the full tree content first.

**Error states shown to user**
- Invalid URL format: "That doesn't look like a valid GitHub URL. Try: https://github.com/owner/repo"
- Repo not found / private: "Repository not found. Make sure it is public and the URL is correct."
- Empty repo: "This repository appears to be empty. Nothing to analyse."
- GitHub rate limited: "GitHub is temporarily unavailable. Please try again in a moment."
- Analysis failed: "Failed to analyse the repository. Please try again."
- All error states must be shown inline in the center panel, near the input field, in terminal-style text.

---

## Connections

- **Depends on:** ASCII Terminal UI (T1–T11) — the frontend shell must exist before any ingestion flow can be wired to the UI.
- **Directly precedes:** Dialogue Generation (Phase 3) — Nova and Aero agents read the context stored by this feature from the Durable Object SQLite store.
- **Directly precedes:** Audio Generation (Phase 4) — audio generation depends on the dialogue produced in Phase 3, which depends on the context produced here.
- **Shares data with:** Context Sidebar feature — the JSON context object produced here is displayed in the left sidebar panel.
- **Shares data with:** Conversation Panel — session ID returned by this feature is used by the WebSocket connection in Phase 3.
- **Creates:** The Durable Object instance that persists throughout the entire podcast generation session.
- **Writes to:** Durable Object SQLite — `context` record with structured AI-generated analysis.
- **Reads from:** GitHub REST API — repo tree and file contents.
- **Reads from:** Workers AI — LLM inference for context generation.
- **Binds (but does not yet use):** R2 bucket — binding is declared in wrangler.toml in this feature but audio storage is not used until Phase 4.

---

## MVP vs Full Version

| Aspect | MVP (v1) | Full Version |
|--------|----------|--------------|
| Repo access | Public repos only, unauthenticated | Private repos via GitHub OAuth |
| URL input | Single `https://github.com/owner/repo` form | Support for branch, tag, or subdirectory URLs |
| File selection | Heuristic priority rules, cap 20 files | Smarter ranking — semantic file importance scoring |
| File size limit | Hard truncate at 50 KB per file | Chunked context with multi-pass summarisation |
| LLM model | Workers AI Llama 3.1 70B (or best available) | Configurable model with fallback chain |
| Context schema | Single JSON object (summary, stack, components, topics) | Richer schema with file-level annotations |
| Error handling | User-facing error messages for known failure modes | Retry logic with exponential backoff |
| GitHub rate limiting | Unauthenticated (60 req/hr per IP) | Authenticated with a server-side GitHub App token (5000 req/hr) |
| Session storage | Durable Object SQLite, no expiry | TTL-based session expiry and cleanup |
| Progress feedback | Loading state shown while analysis runs | Streamed progress updates via WebSocket ("Fetching tree... Analysing files... Generating context...") |
| Parallelism | Up to 10 concurrent file fetches | Adaptive concurrency based on repo size |
| R2 binding | Declared in wrangler.toml, unused | Active — audio files written in Phase 4 |

---

## Security Considerations

**URL validation and SSRF prevention**
- The GitHub URL must be strictly validated server-side before any outbound fetch is made. Only requests to `https://api.github.com` are permitted from the file fetching logic. The user-supplied URL must never be used directly as a fetch target — owner and repo are extracted and re-assembled into a canonical API URL by the Worker.
- Reject any URL where the owner or repo segment contains path traversal sequences (`..`, `%2e%2e`, `/`, `%2f`).
- Reject URLs with non-ASCII characters in owner/repo segments after decoding.

**Input validation**
- Validate input type (string), maximum length (512 characters), and format on the server before any processing. Return a 400 with a plain error message if validation fails.
- Reject unexpected fields in the POST request body — only accept the `url` field.

**Secrets**
- Workers AI binding credentials are managed by Cloudflare — no API key is stored in code or environment variables.
- GitHub API calls in v1 are unauthenticated. If a GitHub token is added in a future version, it must be stored as a Cloudflare Workers Secret (`wrangler secret put`), never in wrangler.toml or source code.
- ElevenLabs API key (used in later phases) must be stored as a Cloudflare Workers Secret — never hardcoded, never in source.

**Rate limiting**
- The `/api/ingest` endpoint should apply basic rate limiting per IP (using a Durable Object counter or Cloudflare's built-in rate limiting if available at the plan tier) to prevent a single client from exhausting the GitHub unauthenticated API quota or driving up Workers AI costs.
- Target limit: 5 ingestion requests per IP per 10-minute window in v1.

**LLM prompt injection**
- File contents from the GitHub repo are user-controlled in that users choose which repo to fetch. File contents must be inserted into the LLM prompt inside a clearly delimited block (e.g. XML-style tags: `<file_content>...</file_content>`) to reduce the risk of prompt injection overriding the system instructions.
- The system prompt must not be dynamically constructed from user input.

**Sensitive data**
- No user data is collected or stored. The only data persisted is the AI-generated context for the repo — no personal information, no IP addresses, no usage logs beyond what Cloudflare's platform records by default.
- File contents fetched from GitHub must not be logged in full. Log only file paths and byte counts for debugging.

---

## Tasks

> Granular implementation steps for this feature.
> Each task has a global T-number that matches TASK-LIST.md.
> Keep status here in sync with the central task list.
>
> Status: [ ] todo  [~] in progress  [x] done  [-] blocked  [>] deferred

| Task # | Status | What needs to be done |
|--------|--------|-----------------------|
| T12 | `[x]` | Create `wrangler.toml` with Worker name, compatibility date, Durable Object binding (`SpeechRunSession`), R2 bucket binding (`AUDIO`), and Workers AI binding (`AI`) |
| T13 | `[x]` | Create the Cloudflare Workers entry point (`src/worker.ts`): request router handling `POST /api/ingest`, `GET /api/session/:id`, and WebSocket upgrade at `/ws/:id`; all other routes return 404 |
| T14 | `[x]` | Create the `SpeechRunSession` Durable Object class (`src/do/session.ts`) with SQLite schema init: `sessions` table (id, repo_url, status, created_at) and `context` table (session_id, json_data, created_at) |
| T15 | `[x]` | Implement GitHub URL parser and validator (`src/lib/github-url.ts`): extract owner/repo, reject invalid formats, enforce character allowlist, strip `.git` suffix, return typed result or error string |
| T16 | `[x]` | Implement GitHub repo tree fetcher (`src/lib/github-tree.ts`): fetch default branch ref, fetch recursive file tree, return flat array of file path + size + type; handle 404, 403, 429 from GitHub |
| T17 | `[x]` | Implement key file selector (`src/lib/file-selector.ts`): apply priority rules (README, config files, src/ depth-first), skip binary extensions and ignored directories, cap at 20 files |
| T18 | `[x]` | Implement file content fetcher (`src/lib/github-files.ts`): fetch up to 20 files in parallel (max 10 concurrent), decode base64 content from GitHub Contents API, truncate to 50 KB with `[TRUNCATED]` marker |
| T19 | `[x]` | Implement Workers AI context generator (`src/lib/context-generator.ts`): assemble structured prompt with file contents inside delimited blocks, call Workers AI binding, parse and validate JSON response, retry once on parse failure |
| T20 | `[x]` | Wire the full ingestion pipeline into the `POST /api/ingest` handler: validate URL → create DO session → fetch tree → select files → fetch contents → generate context → store in DO SQLite → return session ID and context |
| T21 | `[>]` | Add server-side rate limiting to `POST /api/ingest`: track request counts per IP using a Durable Object counter, reject with 429 after 5 requests per IP per 10-minute window |
| T22 | `[x]` | Connect the frontend `ConversationPanel` URL input to `POST /api/ingest`: on submit, show loading state, call the API, display generated context in `ContextSidebar`, handle and display all error states inline |

---

## User Acceptance Tests

> Plain-English browser tests generated after this feature is built.
> The full interactive checklist lives in codebase-ingestion-uat.md once generated.
>
> UAT status: `pending`

**UAT Status:** `pending`

**Last tested:** —

**Outcome:** —

---

## Open Questions

- [ ] Which Workers AI model to use for context generation — `@cf/meta/llama-3.1-70b-instruct` is the preference stated in SCOPE.md, but availability and latency at the Workers free tier should be confirmed before T19.
- [ ] Should the Workers AI call use streaming inference or wait for the full response? Streaming would allow faster progress feedback but complicates JSON parsing. For v1 (no streamed progress), non-streaming is simpler — confirm this is acceptable.
- [ ] Rate limiting implementation: does the target Cloudflare plan tier include Cloudflare Rate Limiting rules, or does a Durable Object counter need to be built manually? (T21 assumes a DO counter as fallback.)
- [ ] What is the desired context JSON schema? A concrete schema (field names and types) should be agreed before T19 so the LLM prompt and the frontend display can be built consistently. Proposed: `{ summary: string, techStack: string[], architecture: string, keyComponents: { name: string, description: string }[], codeQuality: string, podcastTopics: string[] }`.
- [ ] Should the session ID be stored in the browser via `sessionStorage` (cleared on tab close) or held only in React state (cleared on page refresh)? sessionStorage is safer for navigation but React state is simpler. Confirm before T22.

---

## Notes

- The backend scaffold tasks (T12–T14) are prerequisites for everything else in this feature. They should be completed and verified as a working `wrangler dev` environment before any pipeline logic (T15–T20) is started.
- The file selection heuristic in T17 intentionally errs toward shallow, widely-named files. The goal is not exhaustive coverage but enough signal for a good 5–10 minute podcast conversation. The LLM should be told it is generating topics for a podcast, not a code review.
- Workers AI `@cloudflare/workers-types` must be included for TypeScript bindings (`Env` interface with `AI`, `AUDIO`, and `SPEECHRUN_SESSION` properties). Set this up in T12/T13 before any AI or DO calls.
- GitHub's Contents API returns file content as base64-encoded strings. T18 must decode these using `atob()` or a Buffer equivalent in the Workers runtime.
- The `wrangler.toml` R2 binding should use a bucket name that matches the actual R2 bucket created in the Cloudflare dashboard. This bucket does not need to exist during local `wrangler dev` (R2 is mocked locally), but must be created before `wrangler deploy`.

---

## Archive

<!-- Outdated content goes here — never delete, just move down -->
