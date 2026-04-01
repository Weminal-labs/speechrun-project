export interface Env {
  AI: Ai
  ORCHESTRATOR: DurableObjectNamespace
  NOVA: DurableObjectNamespace
  AERO: DurableObjectNamespace
  AUDIO_BUCKET?: R2Bucket
  GITHUB_TOKEN?: string
  ELEVENLABS_API_KEY: string
}

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

export interface AgentTurnInput {
  topic: string
  context: ContextData
  previousTurns: DialogueTurn[]
}

export interface GenerationResult {
  success: boolean
  turnCount: number
  error?: string
}
