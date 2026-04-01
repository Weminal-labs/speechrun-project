# Feature: Multi-Agent Dialogue

> **Status:** `draft`
> **Phase:** v1
> **Last updated:** 2026-04-01

---

## Summary

Multi-Agent Dialogue is Phase 3 of SpeechRun — the engine that transforms a structured codebase context (produced by Phase 2 ingestion) into a natural, turn-by-turn spoken conversation between two AI personas. An orchestrator first generates a topic outline of 8–12 discussion points from the `CodebaseContext`. It then drives sequential dialogue generation: alternating between Nova (PM perspective) and Aero (Dev perspective), one turn at a time, with each turn being 2–4 sentences of conversational speech plus an emotion tag for ElevenLabs delivery. Turns are stored in the Durable Object's SQLite store as they are generated and streamed to the frontend via WebSocket. The resulting dialogue — typically 20–30 turns — reads and sounds like a real podcast episode: the hosts reference each other's points, ask follow-up questions, and occasionally push back. This output feeds directly into Phase 4 (audio generation via ElevenLabs TTS).

---

## Users

All users — anyone who has successfully submitted a GitHub URL and received a generated codebase context. This feature triggers automatically after Phase 2 completes; users do not initiate it separately. The user's experience is watching conversation bubbles appear in the center panel as the dialogue streams in, then being able to listen to each turn.

---

## User Stories

- As a **developer**, I want two AI hosts to automatically start a conversation about my codebase after it's been analysed so that I can listen to a podcast-style breakdown without any further input from me.
- As a **developer**, I want the conversation to feel natural and back-and-forth — not a list of facts — so that it is genuinely engaging to listen to rather than dry and robotic.
- As a **developer**, I want to see the dialogue appear in the conversation panel as it generates so that I can start reading ahead while audio is being prepared, rather than waiting for everything to finish.
- As a **developer**, I want each speaker's turn to have a clear persona — one talking about product impact and user value, the other about implementation details — so that the conversation covers both the "why" and the "how" of the codebase.
- As a **developer**, I want the full dialogue stored so that Phase 4 can generate audio for each turn, and I can replay any turn later in the session.

---

## Behaviour

### Happy Path

1. Phase 2 completes and returns `{ sessionId, context }` to the frontend. The frontend stores `sessionId` in React state and displays the context in the left sidebar.
2. The frontend immediately sends `POST /api/generate-dialogue` with `{ sessionId }`.
3. The Worker retrieves the `SpeechRunSession` Durable Object for that `sessionId` and reads the stored `CodebaseContext` from SQLite.
4. The Worker calls the **Orchestrator** logic: sends the full `CodebaseContext` to Workers AI with the orchestrator prompt. The model returns a JSON topic outline — an ordered array of 8–12 topic objects, each with a `title` and `description`.
5. The Worker stores the topic outline in the DO SQLite `dialogue_outline` table keyed to `sessionId`.
6. The Worker begins sequential turn generation. For each turn (targeting 20–30 total turns distributed across the topic outline):
   a. Determine the current speaker (Nova or Aero, alternating, Nova always goes first).
   b. Determine the current topic (advance topic roughly every 2–3 turns per speaker).
   c. Assemble a turn prompt: system prompt for the current speaker's persona + the topic outline for context + the last 4 turns of conversation history for coherence.
   d. Call Workers AI with the turn prompt. The model returns a JSON object: `{ text: string, emotion: EmotionTag }`.
   e. Parse and validate the turn response.
   f. Store the turn in the DO SQLite `dialogue_turns` table: `{ id, sessionId, speaker, text, emotion, turnOrder, topicIndex, createdAt }`.
   g. Push the new turn to the frontend via WebSocket: `{ type: "turn", turn: { speaker, text, emotion, turnOrder } }`.
7. After all turns are generated, the Worker sends a WebSocket message `{ type: "dialogue_complete", totalTurns: N }` and updates the session status in SQLite to `"dialogue_ready"`.
8. The frontend receives each turn in real time, renders it as a chat bubble in the conversation panel (Nova on the left, Aero on the right), and queues it for Phase 4 audio generation.

### Edge Cases & Rules

**Orchestrator output**
- The orchestrator must return valid JSON only. If the LLM response is not valid JSON, retry once with a stricter prompt. If the second attempt also fails, return a 500 error: "Failed to generate podcast outline. Please try again."
- The topic outline must have at least 5 topics. If the parsed array has fewer than 5 entries, treat it as a parse failure and retry.
- Topic descriptions must be non-empty strings. Strip any topics with empty or whitespace-only descriptions before proceeding.
- The orchestrator is called once per session. If the Worker is interrupted after outline generation but before all turns are generated, it must be able to resume from the last stored turn without regenerating the outline.

**Turn generation**
- Turns are generated one at a time — never batch multiple turns in a single LLM call.
- The conversation history window passed to each turn prompt is capped at the last 4 turns (to stay within Workers AI token limits). This means early context is not lost — the topic outline and system prompt carry the structural continuity.
- Each turn must be 2–4 sentences. If the LLM returns a single sentence or more than 6 sentences, do not retry — accept the turn but log a warning. The audio TTS step tolerates this.
- Each turn must include an `emotion` field from the allowed set: `"curious"`, `"enthusiastic"`, `"thoughtful"`, `"matter-of-fact"`, `"amused"`, `"concerned"`, `"impressed"`. If the field is missing or contains an unrecognised value, default to `"matter-of-fact"` rather than failing.
- If a single turn LLM call fails (network error, timeout, or non-parseable response), retry once. If the retry also fails, skip the turn and continue to the next — do not halt the whole dialogue. Log the skipped turn.
- Nova always takes turn 1. After turn 1, speakers alternate strictly: Nova (odd turns), Aero (even turns).
- Total turns: target 24 (12 per speaker). The orchestrator prompt requests 8–12 topics; the turn coordinator allocates approximately 2 turns per speaker per topic, trimming or extending at topic boundaries.

**Session state**
- Before generating, check the session status in DO SQLite. If status is already `"dialogue_ready"`, return the existing turns without regenerating. This prevents duplicate generation if the frontend sends the request twice.
- If status is `"dialogue_in_progress"`, return a 409 Conflict with `{ error: "Dialogue generation already in progress for this session" }`.
- If the session does not exist or has no stored `CodebaseContext`, return a 404 with `{ error: "Session not found or context not generated. Run ingestion first." }`.

**WebSocket delivery**
- The Worker sends turns over the existing WebSocket connection to the frontend. If no WebSocket is connected when a turn is generated, the turn is still stored in SQLite — it will be delivered on reconnect via a catch-up query.
- WebSocket messages use the envelope format: `{ type: string, payload: object }`.
- If the WebSocket connection drops mid-generation, the frontend can reconnect and call `GET /api/session/:id` to retrieve all stored turns to date.

**Prompt injection defence**
- The `CodebaseContext` fields (summary, techStack, architecture, etc.) were generated by Workers AI in Phase 2 — they are AI-generated, not raw user input. However, they are still inserted into prompts inside clearly delimited XML-style tags: `<context>...</context>`, `<history>...</history>`. This limits any residual injection risk from adversarial repo content that influenced the context generation.
- The `text` field returned by each turn LLM call is stored verbatim. It must be HTML-escaped before rendering in the frontend.

**Frontend rendering**
- Each turn rendered in the conversation panel must show: speaker name ("Nova" or "Aero"), the turn text, and an emotion indicator (a subtle label or icon). The emotion is not spoken aloud in v1 — it is passed to ElevenLabs as a voice style in Phase 4.
- Turns must render in `turnOrder` sequence. WebSocket delivery is sequential, but the frontend must guard against out-of-order rendering by sorting on `turnOrder`.

---

## Orchestrator Prompt Design

The orchestrator is called once at the start of dialogue generation. Its job is to read the `CodebaseContext` and produce a structured topic outline.

**System prompt (orchestrator):**
```
You are the producer of a technical podcast called SpeechRun. You are given an AI-generated analysis of a software codebase. Your job is to produce a structured topic outline for a 10-15 minute podcast episode in which two hosts discuss the codebase.

The two hosts are:
- Nova: a product manager. She focuses on user value, business impact, architecture trade-offs from a product lens, and what the project does for its users.
- Aero: a software developer. He focuses on implementation details, language and framework choices, code quality, technical debt, and how things are built.

Your output must be a JSON array of 8-12 topic objects. Each topic must have:
- "title": a short, punchy topic name (e.g. "The WebSocket Architecture", "Why Durable Objects?")
- "description": 1-2 sentences explaining what the hosts should cover on this topic and what angle makes it interesting

The topics must flow naturally as a podcast — start with an overview, build toward the interesting technical choices, include at least one moment of genuine debate or contrast between PM and Dev perspectives, and end with a summary or "so what" reflection.

Return ONLY the JSON array. No preamble. No commentary. No markdown fences.
```

**User message (orchestrator):**
```
<context>
Project summary: {context.summary}
Tech stack: {context.techStack.join(", ")}
Architecture: {context.architecture}
Key components: {context.keyComponents.map(c => c.name + ": " + c.description).join("\n")}
Code quality: {context.codeQuality}
Suggested topics: {context.podcastTopics.join(", ")}
</context>

Generate the podcast topic outline now.
```

---

## Agent Persona Prompts

Each turn is generated with a persona-specific system prompt. The current topic and recent conversation history are inserted as the user message.

### Nova — System Prompt

```
You are Nova, a product manager co-hosting a technical podcast called SpeechRun. You are discussing a real software project with your co-host Aero, a software developer.

Your personality:
- Curious and enthusiastic about what products do for users
- You connect technical decisions to business impact and user experience
- You ask good questions — you often prompt Aero to explain things more clearly
- You occasionally challenge assumptions or suggest there might be a simpler approach
- You are warm, articulate, and occasionally funny
- You speak in natural conversational English — no jargon unless Aero introduced it first

Your job in this turn:
- Respond naturally to what Aero just said (if this is not the first turn)
- Advance the current topic from a product or user perspective
- Keep your response to 2-4 sentences — this is spoken audio, not an essay

Your response must be a JSON object with exactly two fields:
- "text": your spoken dialogue (2-4 sentences, plain English, no stage directions)
- "emotion": one of: "curious", "enthusiastic", "thoughtful", "matter-of-fact", "amused", "concerned", "impressed"

Return ONLY the JSON object. No preamble. No markdown.
```

### Aero — System Prompt

```
You are Aero, a software developer co-hosting a technical podcast called SpeechRun. You are discussing a real software project with your co-host Nova, a product manager.

Your personality:
- Precise and knowledgeable about technical implementation
- You enjoy explaining how things work under the hood
- You sometimes get enthusiastic about clever design decisions or flag technical debt honestly
- You gently push back on oversimplifications — but you are never condescending
- You are direct, slightly dry, and occasionally self-deprecating about the messy realities of software
- You speak in natural conversational English — you can use technical terms but always briefly explain them

Your job in this turn:
- Respond naturally to what Nova just said (if this is not the first turn)
- Advance the current topic from a technical implementation perspective
- Keep your response to 2-4 sentences — this is spoken audio, not an essay

Your response must be a JSON object with exactly two fields:
- "text": your spoken dialogue (2-4 sentences, plain English, no stage directions)
- "emotion": one of: "curious", "enthusiastic", "thoughtful", "matter-of-fact", "amused", "concerned", "impressed"

Return ONLY the JSON object. No preamble. No markdown.
```

### Turn User Message (both agents)

```
<topic>
Current topic: {currentTopic.title}
What to cover: {currentTopic.description}
</topic>

<history>
{last4Turns.map(t => t.speaker + ": " + t.text).join("\n\n")}
</history>

{speakerName}, it is your turn. Respond now.
```

---

## Data Model

### `dialogue_outline` table (new — stored in DO SQLite)

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `session_id` | TEXT NOT NULL | FK to sessions.id |
| `topic_index` | INTEGER NOT NULL | 0-based ordering |
| `title` | TEXT NOT NULL | Short topic name |
| `description` | TEXT NOT NULL | 1-2 sentence coverage guide |
| `created_at` | INTEGER NOT NULL | Unix timestamp |

### `dialogue_turns` table (new — stored in DO SQLite)

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `session_id` | TEXT NOT NULL | FK to sessions.id |
| `turn_order` | INTEGER NOT NULL | 1-based, globally sequential |
| `speaker` | TEXT NOT NULL | `"Nova"` or `"Aero"` |
| `text` | TEXT NOT NULL | Spoken dialogue text |
| `emotion` | TEXT NOT NULL | ElevenLabs delivery hint |
| `topic_index` | INTEGER NOT NULL | FK to dialogue_outline.topic_index |
| `audio_url` | TEXT | NULL until Phase 4 populates it |
| `created_at` | INTEGER NOT NULL | Unix timestamp |

### `sessions` table (existing — add new status values)

The existing `sessions` table `status` column must support two new values:
- `"dialogue_in_progress"` — generation has started but not completed
- `"dialogue_ready"` — all turns stored, ready for audio generation

Existing values: `"pending"`, `"ingesting"`, `"ready"`, `"error"` (from Phase 2).

### TypeScript types

```typescript
type EmotionTag =
  | "curious"
  | "enthusiastic"
  | "thoughtful"
  | "matter-of-fact"
  | "amused"
  | "concerned"
  | "impressed";

interface DialogueTurn {
  id: number;
  sessionId: string;
  turnOrder: number;
  speaker: "Nova" | "Aero";
  text: string;
  emotion: EmotionTag;
  topicIndex: number;
  audioUrl: string | null;
  createdAt: number;
}

interface DialogueOutlineTopic {
  topicIndex: number;
  title: string;
  description: string;
}

interface TurnWebSocketMessage {
  type: "turn";
  payload: {
    speaker: "Nova" | "Aero";
    text: string;
    emotion: EmotionTag;
    turnOrder: number;
    topicIndex: number;
  };
}

interface DialogueCompleteMessage {
  type: "dialogue_complete";
  payload: {
    totalTurns: number;
  };
}
```

---

## Connections

- **Depends on:** Codebase Ingestion (Phase 2) — reads `CodebaseContext` from `SpeechRunSession` DO SQLite. Will fail with 404 if context has not been stored.
- **Depends on:** `SpeechRunSession` Durable Object (T14) — all state (outline, turns, session status) is stored in the DO SQLite instance created during ingestion.
- **Depends on:** Worker entry point and request router (T13) — adds a new `POST /api/generate-dialogue` route.
- **Depends on:** WebSocket infrastructure (declared in T13, used here for the first time) — turns are pushed to the frontend over the session WebSocket.
- **Triggers:** Audio Generation (Phase 4) — Phase 4 reads the `dialogue_turns` table and calls ElevenLabs TTS for each turn, then populates the `audio_url` field.
- **Shares data with:** Conversation Panel (frontend) — turn text and emotion are rendered as chat bubbles. Audio URL (added in Phase 4) is used by the AudioPlayer.
- **Writes to:** DO SQLite `dialogue_outline` table (new) and `dialogue_turns` table (new).
- **Reads from:** DO SQLite `context` table (written by Phase 2).
- **Reads from:** Workers AI — orchestrator call (one per session) + one LLM call per turn.

---

## MVP vs Full Version

| Aspect | MVP (v1) | Full Version |
|--------|----------|--------------|
| Orchestrator | One Workers AI call, returns topic JSON array | Multi-step planning: outline, then turn budget allocation, then per-topic depth scoring |
| Topic count | 8–12 topics, hard-coded in orchestrator prompt | Dynamic — scales with repo complexity and codebase size |
| Turn count | Fixed target of ~24 turns (12 per speaker) | Configurable episode length (short: 10 turns, full: 30+ turns) |
| Turn generation | Sequential, one LLM call per turn | Parallel where conversation history permits (e.g. generate 2–3 turns ahead on different topics) |
| History window | Last 4 turns passed to each turn prompt | Summarised rolling context of all prior turns, preserving key reference points |
| Emotion tags | 7 allowed values, defaulted if missing | Richer ElevenLabs SSML-style delivery instructions per turn |
| Speaker alternation | Strict alternation: Nova, Aero, Nova, Aero… | Variable rhythm — allow 2 turns in a row when one speaker is on a roll, then hand off |
| Resumability | Basic: skip already-stored turns on retry | Full: checkpoint state per topic, resume from any point after interruption |
| WebSocket delivery | Push each turn as it's generated | Push with typing indicator ("Aero is thinking...") between turns |
| Frontend display | Chat bubbles with speaker name and emotion label | Animated bubble-in effect, emotion expressed as colour/icon |
| Error recovery | Log and skip a failed turn, continue generating | Retry failed turns up to 3 times with backoff, surface partial failure to frontend |
| LLM model | Workers AI Llama 3.1 8B FP8 | Upgrade to Llama 3.1 70B or a fine-tuned dialogue model |

---

## Security Considerations

**Input validation**
- `POST /api/generate-dialogue` accepts a JSON body with a single `sessionId` field (UUID string). Validate that `sessionId` is a non-empty string matching UUID v4 format (`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`) before any DO lookup. Return 400 for invalid format.
- Reject any request body containing unexpected fields.
- Maximum body size: 256 bytes. Reject larger bodies with 413.

**Session isolation**
- The Worker must only access the DO instance keyed to the provided `sessionId`. Because there are no user accounts, any client that knows a session ID can trigger dialogue generation for that session. This is acceptable for the hackathon MVP (public tool, no sensitive data). Session IDs are UUIDs — not guessable in practice.

**Prompt injection**
- The `CodebaseContext` fields passed into both the orchestrator prompt and the per-turn prompts must be inserted inside XML-delimited blocks (`<context>`, `<history>`, `<topic>`). This prevents any residual adversarial content from Phase 2's LLM output from leaking into or overriding the persona system prompts.
- The system prompt for Nova and Aero must be treated as a static string — it must never be constructed from session data or user input.

**LLM output sanitisation**
- The `text` field from each turn response must be HTML-escaped before storage in SQLite and before rendering in the frontend. Do not trust the LLM to produce safe HTML.
- The `emotion` field must be validated against the allowed enum before storage. Any value not in the allowed set is replaced with `"matter-of-fact"`.

**Rate limiting**
- `POST /api/generate-dialogue` is computationally expensive (24+ LLM calls per request). It must be rate limited: maximum 2 dialogue generation requests per session. Track this in DO SQLite (`generation_attempts` column on the session row). Return 429 if exceeded.
- Additionally, since there are no user accounts, apply a per-IP rate limit: maximum 3 generation requests per IP per hour using the same DO counter pattern used in Phase 2.

**Secrets**
- Workers AI binding is Cloudflare-managed. No API keys in source.
- The ElevenLabs API key (used in Phase 4) must be stored as a Cloudflare Workers Secret. Phase 3 does not use it, but the binding should be declared now and kept out of source code.

---

## Tasks

> Granular implementation steps for this feature.
> Each task has a global T-number that matches TASK-LIST.md.
> Keep status here in sync with the central task list.
>
> Status: [ ] todo  [~] in progress  [x] done  [-] blocked  [>] deferred

| Task # | Status | What needs to be done |
|--------|--------|-----------------------|
| T23 | `[x]` | Extend `SpeechRunSession` DO SQLite schema: add `dialogue_outline` and `dialogue_turns` tables |
| T24 | `[x]` | Implement orchestrator logic (`worker/lib/dialogue-orchestrator.ts`) |
| T25 | `[x]` | Implement Nova turn generator (combined with Aero in `worker/lib/turn-generator.ts`) |
| T26 | `[x]` | Implement Aero turn generator (combined with Nova in `worker/lib/turn-generator.ts`) |
| T27 | `[x]` | Implement turn coordinator (`worker/lib/turn-coordinator.ts`) |
| T28 | `[x]` | Implement `POST /api/generate-dialogue` route handler |
| T29 | `[>]` | WebSocket turn-push — deferred, using HTTP polling for hackathon |
| T30 | `[>]` | Rate limiting for dialogue generation — deferred for hackathon |
| T31 | `[x]` | Wire frontend ConversationPanel to display dialogue turns |
| T32 | `[ ]` | End-to-end integration test |

---

## User Acceptance Tests

> Plain-English browser tests generated after this feature is built.
> The full interactive checklist lives in multi-agent-dialogue-uat.md once generated.
>
> UAT status: `pending`

**UAT Status:** `pending`

**Last tested:** —

**Outcome:** —

---

## Open Questions

- [ ] Workers AI model for dialogue generation: the prompt specifies `@cf/meta/llama-3.1-8b-instruct-fp8` (as used in Phase 2). Is this model capable of reliably returning structured JSON `{ text, emotion }` in the persona voice? If not, the 70B model may be needed for turn generation even if the 8B model is acceptable for context generation. This should be tested before T25/T26.
- [ ] Should the orchestrator and turn generation run entirely within a single `POST /api/generate-dialogue` request (blocking for the full 24+ LLM calls), or should generation be kicked off as a background DO alarm that the frontend polls? A single long-running Worker request risks hitting Cloudflare's 30-second CPU time limit. Recommendation: use a DO alarm or a `waitUntil` pattern to continue generation after the initial response is sent.
- [ ] ElevenLabs voice IDs for Nova and Aero are not yet confirmed. Phase 3 does not call ElevenLabs, but the `emotion` tag values should be validated against what ElevenLabs actually supports before the allowed enum is finalised. Coordinate with Phase 4 spec.
- [ ] The WebSocket infrastructure is declared in T13 but not yet exercised. Confirm the WebSocket upgrade and connection management in `SpeechRunSession` DO is working before T29 depends on it.
- [ ] HTML-escaping turn text: should this happen at storage time (stored escaped in SQLite) or at render time (stored raw, escaped in the React component)? Recommendation: store raw, escape at render — this preserves the original LLM output for debugging and allows Phase 4 (TTS) to use unescaped text.

---

## Notes

- The 30-second CPU time limit on Cloudflare Workers is the single biggest architectural risk in this feature. A single Workers invocation cannot reliably complete 24+ sequential LLM calls. The `waitUntil` API or a Durable Object alarm should be used to extend execution. This must be resolved before T28.
- The conversation history window of 4 turns is a deliberate token budget constraint. The Llama 3.1 8B FP8 model has a context window limit; including more history per turn would risk truncation. If the 70B model is used, this window can be increased.
- Nova and Aero's system prompts are static strings intentionally. They must never be built from user input or session data — this protects against prompt injection from adversarial repo content.
- The `audio_url` column in `dialogue_turns` is NULL until Phase 4 populates it. Phase 3 writes the column as NULL; Phase 4 updates it after TTS. This is intentional — it decouples Phase 3 and Phase 4 builds.
- Turn text should be passed to ElevenLabs TTS verbatim — no further processing in Phase 4. Write dialogue that sounds good when spoken: no markdown, no code blocks, no parenthetical asides, no footnotes.

---

## Archive

<!-- Outdated content goes here — never delete, just move down -->
