import { useState, useRef, useEffect } from 'react'
import type { ChatMessage, DialogueTurn, StreamingMessage } from '../hooks/use-chat'
import type { AutonomousConfig } from '../types/shared'

interface ConversationPanelProps {
  messages: ChatMessage[]
  turns: DialogueTurn[]
  status: string
  isConnected: boolean
  hasContext?: boolean
  onSendMessage: (text: string) => void
  onFileClick?: (filePath: string) => void
  streamingMessage: StreamingMessage | null
  thinkingSpeaker: 'nova' | 'aero' | null
  onStartAutonomous: (config?: Partial<AutonomousConfig>) => void
  onPauseAutonomous: () => void
  onResumeAutonomous: () => void
  onStopAutonomous: () => void
  currentTopic: { topic: string; index: number; total: number } | null
  currentlyPlayingId?: string | null
  // Audio player
  playingTurnIndex: number | null
  isAudioPlaying: boolean
  audioProgress: number
  audioDuration: number
  onPlayTurn: (turnIndex: number) => void
  onTogglePlayPause: () => void
  onSeekAudio: (time: number) => void
}

const SUGGESTIONS = [
  'What does this project do?',
  'Tell me about the architecture',
  'What tech decisions stand out?',
  'Any code quality concerns?',
  'What are the main features?',
]

function renderText(text: string, onFileClick?: (f: string) => void) {
  const parts = text.split(/(`[^`]+`)/g)
  return parts.map((part, i) => {
    const match = part.match(/^`(.+)`$/)
    if (match) {
      return (
        <button
          key={i}
          onClick={(e) => { e.stopPropagation(); onFileClick?.(match[1]) }}
          className="text-terminal-accent underline underline-offset-2 decoration-terminal-accent/40 hover:decoration-terminal-accent cursor-pointer bg-terminal-accent/10 px-1 rounded"
        >
          {match[1]}
        </button>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function ThinkingDots({ speaker }: { speaker: 'nova' | 'aero' }) {
  const color = speaker === 'nova' ? 'bg-orange-400' : 'bg-purple-400'
  return (
    <div className="flex items-center gap-1 py-2 pl-2">
      <span className={`w-1.5 h-1.5 rounded-full ${color} animate-bounce`} style={{ animationDelay: '0ms' }} />
      <span className={`w-1.5 h-1.5 rounded-full ${color} animate-bounce`} style={{ animationDelay: '150ms' }} />
      <span className={`w-1.5 h-1.5 rounded-full ${color} animate-bounce`} style={{ animationDelay: '300ms' }} />
    </div>
  )
}

function Avatar({ speaker }: { speaker: 'nova' | 'aero' }) {
  const isNova = speaker === 'nova'
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
      isNova
        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
        : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
    }`}>
      {isNova ? 'N' : 'A'}
    </div>
  )
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const STATUS_LABELS: Record<string, string> = {
  idle: 'ready',
  fetching: 'fetching repository...',
  analyzing: 'analyzing codebase...',
  dialoguing: 'generating dialogue...',
  'generating-audio': 'generating audio...',
  complete: 'podcast ready',
  error: 'error',
  autonomous: 'autonomous mode',
  paused: 'paused',
}

export default function ConversationPanel({
  messages, turns, status, isConnected, hasContext, onSendMessage, onFileClick,
  streamingMessage, thinkingSpeaker,
  onStartAutonomous, onPauseAutonomous, onResumeAutonomous, onStopAutonomous, currentTopic,
  playingTurnIndex, isAudioPlaying, audioProgress, audioDuration,
  onPlayTurn, onTogglePlayPause, onSeekAudio,
}: ConversationPanelProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const isGenerating = status === 'dialoguing' || status === 'fetching' || status === 'analyzing' || status === 'generating-audio'
  const isAutonomous = status === 'autonomous'
  const isPaused = status === 'paused'
  const canType = !isGenerating || isPaused

  // Find which message ID corresponds to which turn index
  const dialogueMessages = messages.filter(m => m.metadata?.type === 'dialogue-turn')
  const hasAnyAudio = turns.some(t => t.audioUrl)

  // Map message IDs to turn indices
  const msgToTurnIndex = new Map<string, number>()
  let turnIdx = 0
  for (const msg of dialogueMessages) {
    if (turnIdx < turns.length) {
      msgToTurnIndex.set(msg.id, turnIdx)
      turnIdx++
    }
  }

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight
      }
    }
  }, [messages.length, streamingMessage?.tokens])

  // Scroll to playing message
  useEffect(() => {
    if (playingTurnIndex !== null && scrollRef.current) {
      const el = scrollRef.current.querySelector(`[data-turn-index="${playingTurnIndex}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [playingTurnIndex])

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (trimmed && canType) {
      onSendMessage(trimmed)
      setInput('')
    }
  }

  const handleMessageClick = (msgId: string) => {
    const idx = msgToTurnIndex.get(msgId)
    if (idx !== undefined && turns[idx]?.audioUrl) {
      onPlayTurn(idx)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Status bar */}
      <div className="px-4 py-2 border-b border-terminal-border flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-dot-green' : 'bg-dot-red'}`} />
        <span className={`text-xs ${status === 'error' ? 'text-dot-red' : 'text-terminal-dim'}`}>
          .: {STATUS_LABELS[status] ?? status}
        </span>
        {(isGenerating || isAutonomous) && (
          <span className="text-terminal-dim text-xs animate-pulse">|</span>
        )}
        {hasContext && !isGenerating && status === 'idle' && (
          <button
            onClick={() => onStartAutonomous()}
            className="ml-auto text-[10px] text-terminal-accent border border-terminal-accent/30 rounded px-2 py-0.5 hover:bg-terminal-accent/10 transition-colors"
          >
            auto-podcast
          </button>
        )}
        {isAutonomous && (
          <button
            onClick={onPauseAutonomous}
            className="ml-auto text-[10px] text-dot-yellow border border-dot-yellow/30 rounded px-2 py-0.5 hover:bg-dot-yellow/10 transition-colors"
          >
            pause
          </button>
        )}
        {isPaused && (
          <div className="ml-auto flex gap-1.5">
            <button onClick={onResumeAutonomous} className="text-[10px] text-dot-green border border-dot-green/30 rounded px-2 py-0.5 hover:bg-dot-green/10 transition-colors">resume</button>
            <button onClick={onStopAutonomous} className="text-[10px] text-dot-red border border-dot-red/30 rounded px-2 py-0.5 hover:bg-dot-red/10 transition-colors">stop</button>
          </div>
        )}
      </div>

      {/* Topic progress */}
      {currentTopic && (isAutonomous || isPaused) && (
        <div className="px-4 py-1.5 border-b border-terminal-border bg-terminal-accent/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-terminal-accent font-medium">Topic {currentTopic.index + 1}/{currentTopic.total}</span>
            <span className="text-[10px] text-terminal-dim truncate ml-2">{currentTopic.topic}</span>
          </div>
          <div className="h-0.5 bg-terminal-border/30 rounded-full">
            <div className="h-0.5 bg-terminal-accent rounded-full transition-all duration-500" style={{ width: `${((currentTopic.index + 1) / currentTopic.total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !isGenerating && (
          <div className="text-terminal-dim text-xs space-y-2 mt-8">
            <div className="text-terminal-accent text-sm mb-3">.: welcome</div>
            <div>Paste a GitHub URL to analyze a codebase.</div>
            <div>Then ask questions or start an auto-podcast.</div>
            <div className="mt-4 text-terminal-dim/50">Try: https://github.com/owner/repo</div>
          </div>
        )}

        {messages.map((msg) => {
          const isDialogueTurn = msg.metadata?.type === 'dialogue-turn'
          const isStatus = msg.metadata?.type === 'status'
          const isUser = msg.role === 'user'
          const isNova = msg.role === 'nova'
          const isAero = msg.role === 'aero'
          const turnIndex = msgToTurnIndex.get(msg.id)
          const isPlayingThis = turnIndex !== undefined && turnIndex === playingTurnIndex
          const hasAudio = turnIndex !== undefined && turns[turnIndex]?.audioUrl
          const isClickable = hasAudio

          return (
            <div
              key={msg.id}
              data-turn-index={turnIndex}
              className={`${isUser ? 'flex justify-end' : ''} animate-in`}
            >
              {isStatus ? (
                <div className="text-terminal-dim/60 text-xs py-0.5 flex items-center gap-2">
                  <span className="text-terminal-accent/40">{'>'}</span>
                  {msg.content}
                </div>
              ) : isUser ? (
                <div className="max-w-[80%]">
                  <div className="bg-terminal-accent/10 border border-terminal-accent/20 rounded-2xl rounded-br-sm px-4 py-2.5">
                    <div className="text-terminal-text text-sm">{msg.content}</div>
                  </div>
                </div>
              ) : (isNova || isAero) ? (
                <div
                  className={`flex gap-2.5 max-w-[90%] ${isClickable ? 'cursor-pointer' : ''} ${isPlayingThis ? 'relative' : ''}`}
                  onClick={() => isClickable && handleMessageClick(msg.id)}
                >
                  <Avatar speaker={isNova ? 'nova' : 'aero'} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[11px] font-semibold ${isNova ? 'text-orange-400' : 'text-purple-400'}`}>
                        {isNova ? 'Nova' : 'Aero'}
                      </span>
                      {isDialogueTurn && <span className="text-terminal-dim/40 text-[9px]">podcast</span>}
                      {isPlayingThis && isAudioPlaying && (
                        <div className="flex items-center gap-0.5 ml-1">
                          {[0, 1, 2, 3].map(i => (
                            <span key={i} className="w-0.5 bg-terminal-accent rounded-full animate-pulse" style={{ height: `${4 + Math.random() * 8}px`, animationDelay: `${i * 100}ms` }} />
                          ))}
                        </div>
                      )}
                      {hasAudio && !isPlayingThis && (
                        <span className="text-terminal-dim/30 text-[9px] ml-1 hover:text-terminal-accent transition-colors">
                          {'\u25B6'}
                        </span>
                      )}
                    </div>
                    <div className={`rounded-2xl rounded-tl-sm px-4 py-2.5 transition-all duration-300 ${
                      isNova
                        ? isPlayingThis
                          ? 'bg-orange-900/30 border border-orange-500/30 shadow-lg shadow-orange-500/5'
                          : 'bg-orange-950/20 border border-orange-500/10'
                        : isPlayingThis
                          ? 'bg-purple-900/30 border border-purple-500/30 shadow-lg shadow-purple-500/5'
                          : 'bg-purple-950/20 border border-purple-500/10'
                    }`}>
                      <div className="text-terminal-text text-sm leading-relaxed">
                        {renderText(msg.content, onFileClick)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-terminal-text text-sm leading-relaxed pl-2">
                    {renderText(msg.content, onFileClick)}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Streaming message */}
        {streamingMessage && !streamingMessage.complete && (
          <div className="flex gap-2.5 max-w-[90%] animate-in">
            <Avatar speaker={streamingMessage.speaker} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[11px] font-semibold ${streamingMessage.speaker === 'nova' ? 'text-orange-400' : 'text-purple-400'}`}>
                  {streamingMessage.speaker === 'nova' ? 'Nova' : 'Aero'}
                </span>
              </div>
              <div className={`rounded-2xl rounded-tl-sm px-4 py-2.5 ${
                streamingMessage.speaker === 'nova' ? 'bg-orange-950/20 border border-orange-500/10' : 'bg-purple-950/20 border border-purple-500/10'
              }`}>
                <div className="text-terminal-text text-sm leading-relaxed">
                  {streamingMessage.tokens}
                  <span className="inline-block w-0.5 h-4 bg-terminal-accent/60 ml-0.5 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Thinking indicator */}
        {thinkingSpeaker && !streamingMessage && (
          <div className="flex gap-2.5 max-w-[90%]">
            <Avatar speaker={thinkingSpeaker} />
            <div>
              <div className={`text-[11px] font-semibold mb-1 ${thinkingSpeaker === 'nova' ? 'text-orange-400' : 'text-purple-400'}`}>
                {thinkingSpeaker === 'nova' ? 'Nova' : 'Aero'}
              </div>
              <ThinkingDots speaker={thinkingSpeaker} />
            </div>
          </div>
        )}

        {isGenerating && !thinkingSpeaker && !streamingMessage && (
          <div className="text-terminal-dim text-xs animate-pulse flex items-center gap-1">
            <span>{'>'}</span> thinking...
          </div>
        )}

        {/* Suggestions */}
        {!isGenerating && !isAutonomous && !isPaused && messages.length > 0 && hasContext && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onSendMessage(s)}
                className="text-[10px] text-terminal-dim border border-terminal-border/30 rounded-full px-2.5 py-1 hover:border-terminal-accent/50 hover:text-terminal-accent transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Audio Player Bar */}
      {hasAnyAudio && (
        <div className="border-t border-terminal-border px-3 py-2 bg-terminal-surface/30">
          <div className="flex items-center gap-3">
            <button
              onClick={onTogglePlayPause}
              disabled={playingTurnIndex === null}
              className="w-7 h-7 border border-terminal-border rounded-full flex items-center justify-center text-terminal-dim hover:text-terminal-accent hover:border-terminal-accent disabled:opacity-30 transition-colors shrink-0"
            >
              <span className="text-[10px]">{isAudioPlaying ? '||' : '\u25B6'}</span>
            </button>
            <span className="text-terminal-dim text-[10px] tabular-nums w-8 shrink-0">
              {formatTime(audioProgress)}
            </span>
            <div
              className="flex-1 h-4 flex items-center cursor-pointer group"
              onClick={(e) => {
                if (!audioDuration) return
                const rect = e.currentTarget.getBoundingClientRect()
                const pct = (e.clientX - rect.left) / rect.width
                onSeekAudio(pct * audioDuration)
              }}
            >
              <div className="w-full h-1 bg-terminal-border/30 rounded-full relative">
                <div
                  className="h-1 bg-terminal-accent rounded-full transition-all"
                  style={{ width: audioDuration > 0 ? `${(audioProgress / audioDuration) * 100}%` : '0%' }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-terminal-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: audioDuration > 0 ? `calc(${(audioProgress / audioDuration) * 100}% - 5px)` : '0' }}
                />
              </div>
            </div>
            <span className="text-terminal-dim text-[10px] tabular-nums w-8 shrink-0">
              {formatTime(audioDuration)}
            </span>
            {playingTurnIndex !== null && (
              <span className={`text-[9px] font-medium shrink-0 ${
                turns[playingTurnIndex]?.speaker === 'nova' ? 'text-orange-400' : 'text-purple-400'
              }`}>
                {turns[playingTurnIndex]?.speaker === 'nova' ? 'Nova' : 'Aero'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Chat Input */}
      <div className="border-t border-terminal-border p-3">
        {isPaused && (
          <div className="text-[10px] text-dot-yellow mb-1.5 px-1">
            paused — type to interject, or resume the podcast
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-terminal-accent text-sm shrink-0">~ $</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={isPaused ? 'type to jump in...' : isAutonomous ? 'pause to interject...' : isGenerating ? 'processing...' : 'ask anything or paste a github url...'}
            disabled={isGenerating && !isPaused}
            aria-label="Chat input"
            className="flex-1 bg-transparent text-terminal-text text-sm outline-none placeholder:text-terminal-dim/50 disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || (isGenerating && !isPaused)}
            className="text-terminal-dim text-xs hover:text-terminal-accent disabled:opacity-30 transition-colors"
          >
            [send]
          </button>
        </div>
      </div>
    </div>
  )
}
