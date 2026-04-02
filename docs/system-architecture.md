# System Architecture

## Current State: Frontend-Only SPA (Phase 1)

The application is currently a single-page React application running entirely in the browser. No backend exists yet.

```
User Browser
    ↓
React 19 SPA (Vite)
├── Components (static UI)
├── Local state (useState)
└── Static HTML/CSS (no API calls)
```

## Planned Architecture (Phases 2-6)

Full-stack system running on Cloudflare's platform with edge compute, stateful agents, and real-time communication.

```
User Browser
    ↓
[Vite Dev Server / Cloudflare Workers] (HTTP/HTTPS)
    ↓
Cloudflare Workers
├── Request router
├── Authentication (none for v1)
└── API handlers
    ↓
Durable Objects (Agents)
├── Orchestrator (coordinates workflow)
├── Nova (PM agent)
├── Aero (Dev agent)
└── SQLite database per agent
    ↓
External Services
├── Workers AI (Llama 3.1 70B)
├── GitHub REST API
├── ElevenLabs API
└── Cloudflare R2 (audio storage)
```

## Component Hierarchy (Frontend)

### Layout Structure

```
App (root component, 3-panel flex layout)
├── TerminalChrome (window chrome wrapper)
│   ├── TabNav (tab navigation)
│   ├── AsciiLogo (ASCII art header)
│   └── Main Content (flex container)
│       ├── ContextSidebar (left 20%)
│       │   └── RepoContext (planned)
│       │       ├── FileTree
│       │       ├── ArchitectureMap
│       │       └── PatternHighlights
│       ├── ConversationPanel (center 50%)
│       │   ├── UrlInput
│       │   ├── TranscriptDisplay
│       │   │   └── MessageBubbles (turn-by-turn)
│       │   └── AudioPlayer
│       └── SandboxPanel (right 30%)
│           └── MiniAppPreview (planned)
```

### Component Responsibilities

| Component | Responsibility | Props | State |
|-----------|---|---|---|
| **App** | Root layout, global state | none | None yet |
| **TerminalChrome** | Window border, title bar | children | None |
| **TabNav** | Tab navigation (placeholder) | none | None |
| **AsciiLogo** | ASCII art header | none | None |
| **ContextSidebar** | Left panel container | none | None yet |
| **ConversationPanel** | Center panel (input, transcript, audio) | none | Planned: transcript[], audioUrl, isLoading |
| **SandboxPanel** | Right panel container | none | None yet |

## Data Flow (Planned - Phases 2+)

### Step 1: GitHub URL Input

```
User pastes URL
    ↓
ConversationPanel (input)
    ↓
Validates URL format
    ↓
Sends to Cloudflare Worker
```

### Step 2: Codebase Ingestion

```
Orchestrator Durable Object
    ↓
GitHub REST API call
    ├── Fetch repo metadata
    ├── Fetch file tree
    └── Fetch key files (README, package.json, main source)
    ↓
Store raw repo data in SQLite
    ↓
Workers AI (context generation)
    ├── Analyze file relationships
    ├── Identify architectural patterns
    └── Generate Arche-style context
    ↓
Store context in SQLite
    ↓
WebSocket → Frontend (real-time update)
```

### Step 3: Multi-Agent Dialogue

```
Orchestrator
    ↓
Generates topic outline (turn topics)
    ↓
Orchestrator → Nova Durable Object
    ├── "Give PM perspective on this codebase"
    └── Receives: Nova's turn (text)
    ↓
Orchestrator → Aero Durable Object
    ├── "Respond with dev concerns"
    └── Receives: Aero's turn (text)
    ↓
Repeats for N turns (typically 8-12)
    ↓
Stores dialogue in SQLite
    ↓
WebSocket → Frontend (transcript updates)
```

### Step 4: Audio Generation

```
For each dialogue turn:
    ↓
ElevenLabs API (text-to-speech)
    ├── Input: Turn text + emotion/delivery tags
    ├── Output: Audio file (MP3)
    └── Duration: ~30-60 seconds per turn
    ↓
Upload to R2 (audio storage)
    ↓
Generate signed URL (expiring)
    ↓
Store URL in SQLite
    ↓
WebSocket → Frontend (audio URLs)
```

### Step 5: Frontend Playback

```
Frontend receives audio URLs
    ↓
AudioPlayer queues all turns
    ↓
User clicks Play
    ↓
Sequential playback
    ├── Load turn 1 audio
    ├── Play until end
    ├── Highlight turn in transcript
    └── Load + play turn 2
    ↓
User controls: play, pause, progress bar
```

## Cloudflare Workers Architecture

### HTTP Entry Point

```typescript
// Worker handler receives request
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url)

    if (url.pathname === '/api/generate-podcast') {
      // Route to Orchestrator Durable Object
      const orchestrator = env.ORCHESTRATOR.get(id)
      return orchestrator.fetch(request)
    }

    // Static file serving for SPA
    return env.ASSETS.fetch(request)
  }
}
```

### Durable Objects (Agents)

Three agent types defined as Durable Object classes:

#### Orchestrator
- **Responsibility:** Coordinate entire workflow
- **State:** Repo URL, context, dialogue outline, turn counter
- **Methods:**
  - `fetchRepoData(url)` → calls GitHub API
  - `generateContext()` → calls Workers AI
  - `orchestrateDialogue()` → coordinates Nova + Aero turns
  - `updateFrontend(data)` → WebSocket broadcast
- **Storage:** SQLite table `orchestration_state`

#### Nova (PM Agent)
- **Responsibility:** PM persona in dialogue
- **State:** Codebase context, previous turns, PM guidelines
- **Methods:**
  - `generateTurn(topic, context, previousTurns)` → Workers AI call
  - `insertEmotionTags(text)` → Markup for ElevenLabs
- **Storage:** SQLite table `nova_state`

#### Aero (Dev Agent)
- **Responsibility:** Dev persona in dialogue
- **State:** Codebase context, previous turns, Dev guidelines
- **Methods:**
  - `generateTurn(topic, context, previousTurns)` → Workers AI call
  - `insertEmotionTags(text)` → Markup for ElevenLabs
- **Storage:** SQLite table `aero_state`

### WebSocket Communication

Durable Objects support bidirectional WebSocket over HTTP Upgrade:

```typescript
// Client (browser)
const ws = new WebSocket('wss://speechrun.example.com/ws/podcast-id')

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)

  if (data.type === 'context-update') {
    updateContextSidebar(data.context)
  } else if (data.type === 'transcript-update') {
    addMessageBubble(data.turn)
  } else if (data.type === 'audio-ready') {
    updateAudioPlayer(data.audioUrl)
  }
}

// Server (Durable Object)
websocket.send(JSON.stringify({
  type: 'context-update',
  context: { fileTree, patterns, architecture }
}))
```

## External Service Integration

### GitHub REST API

Used to fetch codebase:

```typescript
const response = await fetch('https://api.github.com/repos/owner/repo')
// Returns: repo metadata, description, language, stars, etc.

const treeResponse = await fetch(
  'https://api.github.com/repos/owner/repo/git/trees/main?recursive=1'
)
// Returns: full file tree

// For each important file:
const fileResponse = await fetch(
  'https://api.github.com/repos/owner/repo/contents/path/to/file'
)
// Returns: base64-encoded content
```

**Rate Limit:** 60 requests/hour (unauthenticated)
**Mitigation:** Batch requests, cache responses in SQLite

### Workers AI (Llama 3.1 70B)

Used for:
1. **Context generation** — Analyze codebase, extract patterns
2. **Dialogue generation** — Nova and Aero turns

```typescript
const response = await env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
  messages: [
    { role: 'system', content: 'You are Nova, a PM...' },
    { role: 'user', content: 'Analyze this codebase: ...' }
  ]
})

const generatedText = response.response
```

**Latency:** ~5-15 seconds per inference
**Cost:** Included in Cloudflare Workers tier (free for hackathon)

### ElevenLabs API

Used to convert dialogue turns to audio:

```typescript
const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/{voice_id}', {
  method: 'POST',
  headers: {
    'xi-api-key': env.ELEVENLABS_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: "Nova's dialogue turn...",
    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
  })
})

const audioBuffer = await response.arrayBuffer()
// Upload to R2
```

**Voices:** 2 distinct voice IDs (one per agent)
**Cost:** Variable per character; hackathon tier included

### Cloudflare R2

Used to store generated audio files:

```typescript
await env.R2_BUCKET.put(
  `podcasts/${podcastId}/turn-${turnNumber}.mp3`,
  audioBuffer,
  {
    httpMetadata: { contentType: 'audio/mpeg' }
  }
)

// Generate signed URL
const url = await env.R2_BUCKET.getSignedUrl(`podcasts/${podcastId}/turn-${turnNumber}.mp3`, {
  expirationTtl: 86400 * 7 // 7 days
})
```

**Storage:** Cheap, S3-compatible, no egress fees within Cloudflare ecosystem

## State Management Strategy

### Frontend State (React)

Phase 1 (current):
- No state (skeleton UI)

Phase 2+:
```typescript
// Global app state (could use Context API or state library)
interface AppState {
  repoUrl: string
  context: ContextData | null
  transcript: Turn[]
  audioUrls: string[]
  currentTurnIndex: number
  isGenerating: boolean
  isPlaying: boolean
  error: string | null
}
```

### Backend State (Durable Object SQLite)

Persisted per podcast generation:

```sql
-- Orchestration state
CREATE TABLE orchestration_state (
  id TEXT PRIMARY KEY,
  repo_url TEXT,
  status TEXT, -- 'fetching', 'analyzing', 'dialoguing', 'generating_audio', 'complete'
  context JSON,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Transcript storage
CREATE TABLE transcript (
  id TEXT PRIMARY KEY,
  orchestration_id TEXT,
  turn_number INTEGER,
  speaker TEXT, -- 'nova' or 'aero'
  text TEXT,
  audio_url TEXT,
  emotion_tags JSON,
  created_at TIMESTAMP
)

-- Agent state (Nova, Aero)
CREATE TABLE agent_state (
  id TEXT PRIMARY KEY,
  agent_name TEXT,
  orchestration_id TEXT,
  context JSON,
  previous_turns JSON,
  created_at TIMESTAMP
)
```

## Security Considerations

### Input Validation
- Validate GitHub URLs (user-provided)
- Reject non-HTTPS GitHub URLs
- Limit repo size to prevent abuse (10-50k LOC)

### API Keys
- Store in Cloudflare environment variables (not in code)
- Rotate keys annually
- Use limited scopes (GitHub: read-only, ElevenLabs: TTS only)

### Rate Limiting
- Implement per-IP rate limiting (5 requests/hour)
- Reject repos larger than 50k LOC
- Timeout Durable Object operations after 30 minutes

### CORS
- Serve frontend from same origin as Workers
- No cross-origin requests needed (Workers act as proxy)

### Data Privacy
- No user accounts; no data persistence beyond podcast generation
- Auto-delete Durable Object state after 24 hours
- R2 audio files expire after 7 days

## Deployment Architecture

### Development Environment
```
npm run dev
  ↓
Vite dev server (localhost:5173)
  ↓
Static frontend only; no backend yet
```

### Production Environment (Phase 6+)
```
GitHub → npm run build → Wrangler publish
  ↓
Cloudflare Workers
├── Global CDN (static frontend)
├── Edge compute (Workers)
├── Durable Objects (regional)
├── R2 (object storage)
└── D1 (SQLite via Durable Objects)
```

## Known Limitations & Future Improvements

### Current Limitations
- Frontend-only; backend not started
- No real API communication yet
- No data persistence
- No error boundaries or fallbacks
- No loading states or progress indicators
- No mobile optimization

### Phase 2+ Improvements
- Real GitHub API integration
- Workers AI for context and dialogue
- ElevenLabs audio generation
- Durable Object agents with SQLite
- WebSocket real-time updates
- Audio player functionality
- Error handling and user feedback
- Loading animations and progress bars

### Post-Hackathon (Stretch)
- Text to Dialogue API (single multi-speaker audio file)
- Waveform visualization
- Transcript-audio sync
- Sandbox mini-app generation
- Share/embed functionality
- Private repo support (GitHub OAuth)
