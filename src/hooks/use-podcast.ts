import { useAgent } from 'agents/react'
import { useState, useCallback } from 'react'

export interface DialogueTurn {
  speaker: 'nova' | 'aero'
  text: string
  audioUrl?: string
  timestamp: number
}

export interface ContextData {
  summary: string
  repoName: string
  fileTree: string[]
  keyFiles: Record<string, string>
  generatedAt: string
}

export interface OrchestratorState {
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
  const [podcastState, setPodcastState] = useState<OrchestratorState>(DEFAULT_STATE)
  const [connected, setConnected] = useState(false)

  const agent = useAgent({
    agent: 'Orchestrator',
    onStateUpdate: (state: OrchestratorState) => {
      setPodcastState(state)
    },
    onOpen: () => setConnected(true),
    onClose: () => setConnected(false),
  })

  const startGeneration = useCallback(async (repoUrl: string) => {
    setPodcastState({ ...DEFAULT_STATE, repoUrl, status: 'fetching' })
    try {
      await agent.call('startGeneration', [repoUrl])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed'
      setPodcastState((prev) => ({ ...prev, status: 'error', error: message }))
    }
  }, [agent])

  return {
    state: podcastState,
    startGeneration,
    isConnected: connected,
  }
}
