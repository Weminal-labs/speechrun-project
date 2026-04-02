import { useAgent } from 'agents/react'
import { useState, useCallback, useRef, useEffect } from 'react'
import type { StreamEvent, AutonomousConfig } from '../types/shared'

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

export interface OrchestratorState {
  sessionId: string
  messages: ChatMessage[]
  status: 'idle' | 'fetching' | 'analyzing' | 'dialoguing' | 'generating-audio' | 'complete' | 'error' | 'autonomous' | 'paused'
  context: StructuredContext | null
  turns: DialogueTurn[]
  error: string | null
  activeFeatureId: string | null
  fullAudioUrl?: string
  autonomousConfig: AutonomousConfig | null
  currentTopic: string | null
  topicIndex: number
}

// Streaming message being built token-by-token
export interface StreamingMessage {
  messageId: string
  speaker: 'nova' | 'aero'
  tokens: string
  complete: boolean
}

// Audio queue entry
export interface AudioQueueEntry {
  messageId: string
  audioUrl: string
}

const DEFAULT_STATE: OrchestratorState = {
  sessionId: '',
  messages: [],
  status: 'idle',
  context: null,
  turns: [],
  error: null,
  activeFeatureId: null,
  autonomousConfig: null,
  currentTopic: null,
  topicIndex: 0,
}

export function useChat(sessionId: string) {
  const [chatState, setChatState] = useState<OrchestratorState>(DEFAULT_STATE)
  const [connected, setConnected] = useState(false)

  // Streaming state
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null)
  const [thinkingSpeaker, setThinkingSpeaker] = useState<'nova' | 'aero' | null>(null)

  // Audio queue (populated from audio-ready events, consumed by playback system)
  const [_audioQueue, setAudioQueue] = useState<AudioQueueEntry[]>([])
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Current autonomous topic
  const [currentTopic, setCurrentTopic] = useState<{ topic: string; index: number; total: number } | null>(null)

  // Agent reference for sending raw WebSocket messages
  const agentRef = useRef<ReturnType<typeof useAgent> | null>(null)

  const agent = useAgent({
    agent: 'Orchestrator',
    name: sessionId,
    onStateUpdate: (state: OrchestratorState) => {
      setChatState(state)
    },
    onOpen: () => setConnected(true),
    onClose: () => setConnected(false),
    onMessage: (message: MessageEvent) => {
      // Handle raw stream events
      if (typeof message.data !== 'string') return
      try {
        const event = JSON.parse(message.data) as StreamEvent
        if (!('event' in event)) return

        switch (event.event) {
          case 'thinking':
            setThinkingSpeaker(event.speaker)
            setStreamingMessage(null)
            break
          case 'token':
            setThinkingSpeaker(null)
            setStreamingMessage(prev => {
              if (prev && prev.messageId === event.messageId) {
                return { ...prev, tokens: prev.tokens + event.token }
              }
              return {
                messageId: event.messageId,
                speaker: 'nova', // will be corrected on turn-complete
                tokens: event.token,
                complete: false,
              }
            })
            break
          case 'turn-complete':
            setStreamingMessage(prev => {
              if (prev && prev.messageId === event.messageId) {
                return { ...prev, tokens: event.fullText, speaker: event.speaker, complete: true }
              }
              return null
            })
            setThinkingSpeaker(null)
            // Clear streaming after a brief moment (state update with full message follows)
            setTimeout(() => {
              setStreamingMessage(prev =>
                prev?.messageId === event.messageId ? null : prev
              )
            }, 100)
            break
          case 'audio-ready':
            setAudioQueue(prev => [...prev, { messageId: event.messageId, audioUrl: event.audioUrl }])
            break
          case 'autonomous-topic':
            setCurrentTopic({ topic: event.topic, index: event.topicIndex, total: event.totalTopics })
            break
          case 'autonomous-done':
            setCurrentTopic(null)
            break
        }
      } catch { /* not a stream event */ }
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agentRef.current = agent as any

  // --- Audio playback system ---
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [playingTurnIndex, setPlayingTurnIndex] = useState<number | null>(null)
  const lastAutoPlayRef = useRef(0)

  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio()
      audio.onplay = () => setIsPlaying(true)
      audio.onpause = () => setIsPlaying(false)
      audio.ontimeupdate = () => {
        setAudioProgress(audio.currentTime)
      }
      audio.onloadedmetadata = () => {
        setAudioDuration(audio.duration)
      }
      audio.onended = () => {
        setIsPlaying(false)
        // Auto-play next turn
        setPlayingTurnIndex(prev => {
          if (prev === null) return null
          const nextIdx = prev + 1
          const audioTurns = chatState.turns
          // Find next turn with audio
          for (let i = nextIdx; i < audioTurns.length; i++) {
            if (audioTurns[i]?.audioUrl) {
              lastAutoPlayRef.current = i
              setTimeout(() => playTurnAudio(i), 300)
              return i
            }
          }
          return null
        })
      }
      audio.onerror = () => {
        setIsPlaying(false)
        setPlayingTurnIndex(null)
      }
      audioRef.current = audio
    }
  }, [])

  // Auto-play new turns as they arrive
  useEffect(() => {
    const turns = chatState.turns
    if (turns.length === 0 || !audioRef.current) return
    const latestIdx = turns.length - 1
    const latest = turns[latestIdx]
    // Only auto-play if it's new and has audio and nothing is playing
    if (latest?.audioUrl && latestIdx > lastAutoPlayRef.current && !isPlaying) {
      lastAutoPlayRef.current = latestIdx
      playTurnAudio(latestIdx)
    }
  }, [chatState.turns.length])

  const playTurnAudio = useCallback((turnIndex: number) => {
    const turn = chatState.turns[turnIndex]
    if (!turn?.audioUrl || !audioRef.current) return
    setPlayingTurnIndex(turnIndex)
    setCurrentlyPlaying(`turn-${turnIndex}`)
    audioRef.current.src = turn.audioUrl
    audioRef.current.play().catch(() => {
      setPlayingTurnIndex(null)
      setCurrentlyPlaying(null)
    })
  }, [chatState.turns])

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else if (playingTurnIndex !== null) {
      audioRef.current.play().catch(() => {})
    }
  }, [isPlaying, playingTurnIndex])

  const seekAudio = useCallback((time: number) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = time
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    try {
      await agent.call('sendMessage', [text])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message'
      setChatState((prev) => ({
        ...prev,
        status: 'error',
        error: message,
      }))
    }
  }, [agent])

  const startAutonomous = useCallback(async (config?: Partial<AutonomousConfig>) => {
    try {
      await agent.call('startAutonomous', [config])
    } catch (error) {
      console.error('Failed to start autonomous mode:', error)
    }
  }, [agent])

  const pauseAutonomous = useCallback(async () => {
    try {
      await agent.call('pauseAutonomous', [])
    } catch (error) {
      console.error('Failed to pause:', error)
    }
  }, [agent])

  const resumeAutonomous = useCallback(async () => {
    try {
      await agent.call('resumeAutonomous', [])
    } catch (error) {
      console.error('Failed to resume:', error)
    }
  }, [agent])

  const stopAutonomous = useCallback(async () => {
    try {
      await agent.call('stopAutonomous', [])
    } catch (error) {
      console.error('Failed to stop:', error)
    }
  }, [agent])

  return {
    state: chatState,
    sendMessage,
    isConnected: connected,
    // Streaming
    streamingMessage,
    thinkingSpeaker,
    // Autonomous
    startAutonomous,
    pauseAutonomous,
    resumeAutonomous,
    stopAutonomous,
    currentTopic,
    // Audio playback
    currentlyPlaying,
    playingTurnIndex,
    isPlaying,
    audioProgress,
    audioDuration,
    playTurnAudio,
    togglePlayPause,
    seekAudio,
  }
}
