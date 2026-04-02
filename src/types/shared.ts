// Types shared between worker and frontend — no Cloudflare-specific globals here

export interface ChatMessage {
  id: string
  role: 'user' | 'nova' | 'aero' | 'system'
  content: string
  timestamp: number
  metadata?: {
    type?: 'chat' | 'analysis' | 'dialogue-turn' | 'status'
    repoUrl?: string
    featureId?: string
  }
}

export interface StructuredContext {
  project: {
    name: string
    summary: string
    purpose: string
    primaryLanguage: string
    stars?: number
  }
  stack: Array<{
    name: string
    role: string
    category: string
  }>
  features: Array<{
    id: string
    name: string
    description: string
    complexity: 'low' | 'medium' | 'high'
    relatedFiles: string[]
  }>
  architecture: {
    pattern: string
    description: string
    layers: string[]
    dataFlow: string
  }
  decisions: Array<{
    title: string
    rationale: string
    tradeoff: string
  }>
  quality: {
    strengths: string[]
    concerns: string[]
    overall: string
  }
}

export interface DialogueTurn {
  speaker: 'nova' | 'aero'
  text: string
  audioUrl?: string
  timestamp: number
}

export type OrchestratorStatus =
  | 'idle'
  | 'fetching'
  | 'analyzing'
  | 'dialoguing'
  | 'generating-audio'
  | 'complete'
  | 'error'
  | 'autonomous'
  | 'paused'

export interface AutonomousConfig {
  turnsPerTopic: number
  delayBetweenTurns: number
  totalTopics: number
  waitForAudio: boolean
}

export type StreamEvent =
  | { event: 'token'; messageId: string; token: string }
  | { event: 'turn-complete'; messageId: string; speaker: 'nova' | 'aero'; fullText: string }
  | { event: 'audio-ready'; messageId: string; audioUrl: string }
  | { event: 'thinking'; speaker: 'nova' | 'aero' }
  | { event: 'autonomous-topic'; topic: string; topicIndex: number; totalTopics: number }
  | { event: 'autonomous-done' }

export interface OrchestratorState {
  sessionId: string
  messages: ChatMessage[]
  status: OrchestratorStatus
  context: StructuredContext | null
  turns: DialogueTurn[]
  error: string | null
  activeFeatureId: string | null
  fullAudioUrl?: string
  autonomousConfig: AutonomousConfig | null
  currentTopic: string | null
  topicIndex: number
}
