# Architecture

> The system design as it stands after Phase 2 (Codebase Ingestion).
> Updated as new phases are built. See DECISIONS.md for rationale.

---

## System Overview

SpeechRun is a 3-phase podcast generation system built on Cloudflare Workers, Durable Objects, and Workers AI:

1. **Frontend (Phase 1, complete):** React + Vite + Tailwind — a dark-themed terminal-style UI with three panels: ContextSidebar (left), ConversationPanel (center), and AudioPlayer + SandboxPanel (right).

2. **Codebase Ingestion (Phase 2, complete):** A backend pipeline that takes a GitHub URL, fetches the repo tree and key files, generates a structured context summary via Workers AI, and stores it in a Durable Object's SQLite database.

3. **Dialogue Generation (Phase 3, planned):** Agents (Nova and Aero) use the stored context to generate podcast dialogue, streamed back to the frontend via WebSocket.

4. **Audio Generation (Phase 4, planned):** ElevenLabs Text-to-Dialogue API converts the dialogue into audio files, stored in R2, and played back in the AudioPlayer.

The system is stateless at the Worker level (edge functions are compute-only) and maintains all session state in Durable Objects with SQLite backing.

---

## High-Level Data Flow

### Ingest Flow (Phase 2)

```
User Input (GitHub URL)
    ↓
[Frontend: ConversationPanel]
    ↓
POST /api/ingest { url }
    ↓
[Worker: Request Handler]
    → Validate URL (github-url.ts)
    → Create/fetch DO instance (env.SPEECHRUN_SESSION.get)
    → Fetch repo tree (github-tree.ts)
    → Select key files (file-selector.ts)
    → Fetch file contents (github-files.ts)
    → Generate context via Workers AI (context-generator.ts)
    → Store in DO SQLite
    ↓
Response { sessionId, context }
    ↓
[Frontend: ContextSidebar]
    → Display generated context
    → Ready for dialogue phase
```

### Session State Flow

```
POST /api/ingest → Worker creates UUID session ID
    ↓
Session ID → DO instance via idFromName(sessionID)
    ↓
DO instance → SQLite tables:
    - sessions: { id, repo_url, status, created_at }
    - context: { session_id, json_data, created_at }
    ↓
GET /api/session/:id → Worker retrieves DO → reads SQLite
    ↓
/ws/:id → Worker upgrades to WebSocket → DO handles messages
```

---

## Directory Structure

```
speechrun-project/
├── src/                          # React frontend
│   ├── components/
│   │   ├── AsciiLogo.tsx
│   │   ├── AudioPlayer.tsx
│   │   ├── ConversationPanel.tsx
│   │   ├── ContextSidebar.tsx
│   │   ├── SandboxPanel.tsx
│   │   ├── TabNav.tsx
│   │   └── TerminalChrome.tsx
│   ├── App.tsx
│   └── main.tsx
├── worker/                       # Cloudflare Workers backend
│   ├── index.ts                  # Worker entry point, request router
│   ├── do/
│   │   └── session.ts            # SpeechRunSession Durable Object
│   ├── lib/
│   │   ├── github-url.ts         # URL parsing and validation
│   │   ├── github-tree.ts        # GitHub tree fetching
│   │   ├── github-files.ts       # File content fetching (with concurrency)
│   │   ├── file-selector.ts      # File priority scoring and selection
│   │   ├── context-generator.ts  # Workers AI prompt assembly and LLM call
│   │   └── index.ts              # Shared types and utilities
│   └── env.d.ts                  # TypeScript bindings for Env (DO, R2, AI)
├── wrangler.toml                 # Worker configuration (bindings, routes)
├── vite.config.ts                # Frontend + Worker build config
├── tsconfig.json                 # Root (extends both app and worker)
├── tsconfig.app.json             # React frontend TS config
├── tsconfig.worker.json          # Workers backend TS config
└── package.json
```

---

## Key Components

### Worker Entry Point (`worker/index.ts`)

- **Router:** Handles `POST /api/ingest`, `GET /api/session/:id`, `GET /ws/:id`
- **Error handling:** Returns 404 for unknown routes, 400 for invalid input, 500 for server errors
- **CORS:** Adds CORS headers to all responses (frontend-safe)
- **Env:** Receives Cloudflare bindings via `env` parameter (DO, R2, AI)

### SpeechRunSession Durable Object (`worker/do/session.ts`)

- **Initialization:** Creates SQLite schema on first instantiation
- **Tables:**
  - `sessions`: stores session metadata (id, repo_url, status, created_at)
  - `context`: stores generated AI context (session_id, json_data, created_at)
- **Methods:**
  - `ingest(url)`: orchestrates the full pipeline (fetch, select, generate, store)
  - `getContext()`: retrieves stored context from SQLite
  - `WebSocket`: handles `/ws/:id` upgrades (prepared for Phase 3)

### GitHub Integration

- **github-url.ts:** Parses `https://github.com/owner/repo` URLs, validates owner/repo format, handles `.git` suffixes and extra path segments. Returns `{ owner, repo }` or error string.

- **github-tree.ts:** Fetches GitHub's default branch ref via REST API, then fetches the full recursive file tree. Returns array of `{ path, size, type }`. Handles 404 (not found), 403 (forbidden), 429 (rate limited).

- **github-files.ts:** Takes an array of file paths, fetches content in parallel (max 10 concurrent) via GitHub Contents API. Decodes base64 responses, truncates to 50 KB per file with `[TRUNCATED]` marker. Returns `{ path, content }[]`.

- **file-selector.ts:** Implements priority-based file selection. Scores files by: always-include list (README, package.json, etc.), directory depth, keyword presence (src/, lib/). Skips binaries and ignored dirs. Caps at 20 files. Returns sorted array of paths.

### Workers AI Integration (`context-generator.ts`)

- **Prompt assembly:** Builds a structured prompt with file contents wrapped in XML tags to reduce prompt injection risk.
- **System instructions:** Explicitly instructs the model to output only valid JSON.
- **Model:** Uses `@cf/meta/llama-3.1-8b-instruct-fp8` (confirmed available, fast).
- **Response handling:** Parses JSON response, validates structure, retries once if JSON parse fails.
- **Output schema:** Returns `{ summary, techStack, architecture, keyComponents, codeQuality, podcastTopics }`.

---

## Data Models

### Session Record (SQLite: `sessions` table)

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  repo_url TEXT NOT NULL,
  status TEXT DEFAULT 'ingesting',  -- ingesting, complete, failed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Context Record (SQLite: `context` table)

```sql
CREATE TABLE context (
  session_id TEXT PRIMARY KEY,
  json_data TEXT NOT NULL,  -- JSON context object
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Context JSON Schema

```json
{
  "summary": "A brief overview of what the project does",
  "techStack": ["Node.js", "React", "PostgreSQL"],
  "architecture": "Description of key architectural patterns",
  "keyComponents": [
    { "name": "AuthService", "description": "Handles user authentication" }
  ],
  "codeQuality": "Observations about code patterns, testing, documentation",
  "podcastTopics": ["Why microservices?", "Data persistence strategy", "Error handling patterns"]
}
```

---

## API Contracts

### POST /api/ingest

**Request:**
```json
{ "url": "https://github.com/owner/repo" }
```

**Response (success):**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "context": { ... }
}
```

**Response (error):**
```json
{ "error": "Repository not found. Make sure it is public and the URL is correct." }
```

**Status codes:**
- 200: Success
- 400: Invalid input or malformed URL
- 429: Rate limited (GitHub or internal)
- 500: Server error during ingest

### GET /api/session/:id

**Response:**
```json
{
  "sessionId": "...",
  "status": "complete",
  "context": { ... }
}
```

**Status codes:**
- 200: Session found
- 404: Session not found

### GET /ws/:id (WebSocket)

**Prepared for Phase 3.** Currently returns 501 (not implemented).

---

## Infrastructure & Deployment

- **Hosting:** Cloudflare Workers (edge, globally distributed)
- **Compute:** Worker script runs on each request
- **State:** Durable Objects with SQLite (one instance per session)
- **Storage:** R2 (prepared for Phase 4 audio files)
- **External APIs:** GitHub REST API, Workers AI (Cloudflare), ElevenLabs (Phase 4)

**Local development:** `wrangler dev` starts a local Wrangler server with mocked bindings.

**Production deployment:** `wrangler deploy` publishes to Cloudflare's edge network.

---

## Error Handling

### User-Facing Error Messages

Returned in JSON error responses, displayed in ConversationPanel:

- "That doesn't look like a valid GitHub URL. Try: https://github.com/owner/repo"
- "Repository not found. Make sure it is public and the URL is correct."
- "This repository appears to be empty. Nothing to analyse."
- "GitHub is temporarily unavailable. Please try again in a moment."
- "Failed to analyse the repository. Please try again."

### Logging & Observability

- No full request/response logging (privacy).
- Log file paths and byte counts for debugging (not contents).
- Platform: Cloudflare's built-in logs and Workers Analytics.

---

## Security Assumptions

1. **SSRF prevention:** GitHub URLs are strictly validated; only `api.github.com` is fetched from.
2. **Input validation:** URL length, format, and fields are validated server-side.
3. **Secrets management:** Workers AI and ElevenLabs credentials via Cloudflare secrets (not code).
4. **Prompt injection:** File contents are wrapped in XML tags to reduce injection risk.
5. **Public repos only:** v1 does not support private repos (no auth token needed).
6. **No user data collection:** Only AI-generated context is stored; no IP logs or usage metrics beyond platform defaults.

---

## Known Limitations & Deferred Work

1. **Rate limiting (T21):** Not implemented in v1; deferred post-hackathon.
2. **AI model upgrade:** Currently 8B FP8; can upgrade to 70B if context quality needs it (Phase 3).
3. **Private repo support:** v1 is public-only; authenticated GitHub API in future.
4. **Progress streaming:** No WebSocket progress updates yet ("Fetching tree... Analysing..."); Phase 3 can add this.
5. **remoteBindings:** Disabled in local dev (no real AI calls); enable with auth for testing.
