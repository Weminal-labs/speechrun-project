# Phase 5: Frontend WebSocket Integration

## Context Links
- [Cloudflare Agents React Hook](https://developers.cloudflare.com/agents/api-reference/agents-api/)
- [Current ConversationPanel.tsx](../../src/components/ConversationPanel.tsx)
- [Current ContextSidebar.tsx](../../src/components/ContextSidebar.tsx)
- [Phase 4: Audio](phase-04-elevenlabs-audio.md)

## Overview
- **Priority:** P1
- **Status:** Pending
- **Effort:** 2h
- **Blocked by:** Phase 4
- **Description:** Connect frontend to Orchestrator via `useAgent()` hook. Real-time transcript display, audio player, context sidebar, loading states.

## Key Insights
- `useAgent()` from `@cloudflare/agents/react` handles WebSocket connection + state sync
- State updates from `this.setState()` in Orchestrator automatically push to all connected clients
- `call()` from `useAgent()` invokes `@callable()` methods via RPC
- No custom WebSocket code needed on either side
- Audio player: HTML5 `<audio>` with playlist behavior (sequential turn playback)

## Requirements

### Functional
- GitHub URL input triggers `orchestrator.startGeneration(repoUrl)`
- Real-time transcript: turns appear as generated (Nova orange, Aero purple)
- Context sidebar: shows repo analysis after ingestion
- Audio player: play/pause all turns sequentially
- Status indicator: fetching → analyzing → dialoguing → generating audio → complete
- Error display if generation fails

### Non-Functional
- WebSocket reconnects automatically on disconnect
- UI remains responsive during generation (no blocking)
- Audio preloads next turn while current plays

## Related Code Files

| Action | File |
|--------|------|
| Modify | `src/components/ConversationPanel.tsx` |
| Modify | `src/components/ContextSidebar.tsx` |
| Modify | `src/App.tsx` |
| Create | `src/hooks/use-podcast.ts` |
| Modify | `package.json` (add @cloudflare/agents client) |

## Architecture: Frontend Data Flow

```
App
├─ usePodcast() hook (wraps useAgent)
│   ├─ state: OrchestratorState (auto-synced via WebSocket)
│   ├─ startGeneration(repoUrl) → RPC call
│   └─ isConnected: boolean
│
├─ ContextSidebar
│   └─ reads state.context (file tree, summary)
│
├─ ConversationPanel
│   ├─ URL input → startGeneration()
│   ├─ Transcript → state.turns (real-time)
│   ├─ Status bar → state.status
│   └─ AudioPlayer → state.turns[].audioUrl
│
└─ SandboxPanel (unchanged for MVP)
```

## Implementation Steps

### 1. Install client package

```bash
npm install @cloudflare/agents
```

(Same package provides both server Agent class and client useAgent hook)

### 2. Create `src/hooks/use-podcast.ts`

```typescript
import { useAgent } from '@cloudflare/agents/react'
import { useState, useCallback } from 'react'

interface DialogueTurn {
  speaker: 'nova' | 'aero'
  text: string
  audioUrl?: string
  timestamp: number
}

interface ContextData {
  summary: string
  repoName: string
  fileTree: string[]
  keyFiles: Record<string, string>
  generatedAt: string
}

interface OrchestratorState {
  repoUrl: string
  status: 'idle' | 'fetching' | 'analyzing' | 'dialoguing' | 'generating-audio' | 'complete' | 'error'
  context: ContextData | null
  turns: DialogueTurn[]
  error: string | null
}

const DEFAULT_STATE: OrchestratorState = {
  repoUrl: '',
  status: 'idle',
  context: null,
  turns: [],
  error: null,
}

export function usePodcast() {
  const [sessionId, setSessionId] = useState<string | null>(null)

  const agent = useAgent<OrchestratorState>({
    agent: 'orchestrator',
    name: sessionId ?? undefined,
  })

  const state = agent.state ?? DEFAULT_STATE

  const startGeneration = useCallback(async (repoUrl: string) => {
    const id = crypto.randomUUID()
    setSessionId(id)
    // useAgent reconnects with new name automatically
    await agent.call('startGeneration', repoUrl)
  }, [agent])

  return {
    state,
    startGeneration,
    isConnected: agent.isConnected,
  }
}
```

### 3. Update `src/App.tsx`

Lift podcast state to App level, pass to children:

```typescript
import { usePodcast } from './hooks/use-podcast'

function App() {
  const { state, startGeneration, isConnected } = usePodcast()

  return (
    // ... existing layout, pass props to panels
    <ContextSidebar context={state.context} />
    <ConversationPanel
      turns={state.turns}
      status={state.status}
      error={state.error}
      isConnected={isConnected}
      onSubmit={startGeneration}
    />
  )
}
```

### 4. Update `src/components/ConversationPanel.tsx`

Replace placeholder with real state:

```typescript
interface ConversationPanelProps {
  turns: DialogueTurn[]
  status: string
  error: string | null
  isConnected: boolean
  onSubmit: (url: string) => void
}

export default function ConversationPanel({
  turns, status, error, isConnected, onSubmit
}: ConversationPanelProps) {
  const [url, setUrl] = useState('')
  const [currentAudio, setCurrentAudio] = useState<number>(-1)

  const handleSubmit = () => {
    if (url.includes('github.com/')) onSubmit(url)
  }

  return (
    <div className="h-full flex flex-col">
      {/* URL Input */}
      <div className="p-4 border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <span className="text-terminal-accent text-sm shrink-0">~ $</span>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="paste a github url to analyze..."
            disabled={status !== 'idle' && status !== 'complete' && status !== 'error'}
            className="flex-1 bg-transparent text-terminal-text text-sm outline-none placeholder:text-terminal-dim/50"
          />
        </div>
        {/* Status indicator */}
        <StatusBar status={status} isConnected={isConnected} />
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && <ErrorMessage message={error} />}
        {turns.length === 0 && status === 'idle' && (
          <div className="text-terminal-dim text-xs">
            .: waiting for a repository to analyze...
          </div>
        )}
        {turns.map((turn, i) => (
          <TurnBubble key={i} turn={turn} index={i} />
        ))}
      </div>

      {/* Audio Player */}
      <AudioPlayer turns={turns} />
    </div>
  )
}
```

### 5. Create sub-components

Extract into `src/components/sub-components/`:
- `turn-bubble.tsx` — single turn display (speaker name + text)
- `status-bar.tsx` — generation progress indicator
- `audio-player.tsx` — HTML5 audio with sequential playback
- `error-message.tsx` — error display

### 6. Audio player implementation

```typescript
function AudioPlayer({ turns }: { turns: DialogueTurn[] }) {
  const audioTurns = turns.filter((t) => t.audioUrl)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handleEnded = () => {
    if (currentIndex < audioTurns.length - 1) {
      setCurrentIndex((i) => i + 1)
      // Next track auto-plays
    } else {
      setIsPlaying(false)
    }
  }

  const togglePlay = () => {
    if (!audioRef.current || audioTurns.length === 0) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="border-t border-terminal-border p-3">
      <audio
        ref={audioRef}
        src={audioTurns[currentIndex]?.audioUrl}
        onEnded={handleEnded}
      />
      <div className="flex items-center gap-3">
        <button onClick={togglePlay} disabled={audioTurns.length === 0}>
          {isPlaying ? '||' : '|>'}
        </button>
        <ProgressBar audioRef={audioRef} />
        <span>{currentIndex + 1}/{audioTurns.length}</span>
      </div>
    </div>
  )
}
```

### 7. Update ContextSidebar

Replace placeholder data with real context:

```typescript
interface ContextSidebarProps {
  context: ContextData | null
}

export default function ContextSidebar({ context }: ContextSidebarProps) {
  if (!context) {
    return /* existing placeholder */
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="text-terminal-accent text-sm mb-3">
        .: {context.repoName}
      </div>
      <div className="text-terminal-text text-xs mb-4">{context.summary}</div>
      <div className="text-terminal-accent text-xs mb-2">.: file tree</div>
      {context.fileTree.slice(0, 30).map((f) => (
        <div key={f} className="text-terminal-dim text-xs pl-3 py-0.5">
          {f}
        </div>
      ))}
    </div>
  )
}
```

## Todo List

- [ ] Install @cloudflare/agents (client)
- [ ] Create src/hooks/use-podcast.ts wrapping useAgent()
- [ ] Update App.tsx to lift podcast state
- [ ] Update ConversationPanel.tsx with real transcript + URL input
- [ ] Create turn-bubble.tsx sub-component
- [ ] Create status-bar.tsx sub-component
- [ ] Create audio-player.tsx with sequential playback
- [ ] Update ContextSidebar.tsx with real context data
- [ ] Add loading states during generation
- [ ] Add error display for failures
- [ ] Test real-time transcript updates
- [ ] Test audio playback end-to-end

## Success Criteria
- Paste GitHub URL → generation starts
- Transcript turns appear in real-time as generated
- Status indicator reflects current phase
- Context sidebar shows repo analysis
- Audio player plays all turns sequentially
- Error states display clearly
- WebSocket reconnects on disconnect

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| useAgent() API differs from docs | Medium | High | Check @cloudflare/agents package exports; test locally |
| WebSocket disconnects during generation | Low | Medium | useAgent auto-reconnects; state resync on reconnect |
| Audio player cross-browser issues | Low | Low | Use standard HTML5 audio; MP3 is universally supported |
| State shape mismatch frontend/backend | Medium | Medium | Share types (or duplicate with identical structure) |

## Security Considerations
- No secrets on frontend
- WebSocket connection is same-origin (no CORS needed)
- URL input validated before sending to backend
- Audio URLs are relative paths (served through worker, not direct R2)
