import { useState, useRef } from 'react'
import type { DialogueTurn } from '../hooks/use-podcast'

interface ConversationPanelProps {
  turns: DialogueTurn[]
  status: string
  error: string | null
  isConnected: boolean
  onSubmit: (url: string) => void
  onFileClick?: (filePath: string) => void
}

// Parse backtick-wrapped file references into clickable spans
function renderTurnText(text: string, onFileClick?: (f: string) => void) {
  const parts = text.split(/(`[^`]+`)/g)
  return parts.map((part, i) => {
    const match = part.match(/^`(.+)`$/)
    if (match) {
      const filePath = match[1]
      return (
        <button
          key={i}
          onClick={() => onFileClick?.(filePath)}
          className="text-terminal-accent underline underline-offset-2 decoration-terminal-accent/40 hover:decoration-terminal-accent cursor-pointer bg-terminal-accent/10 px-1 rounded"
        >
          {filePath}
        </button>
      )
    }
    return <span key={i}>{part}</span>
  })
}

const STATUS_LABELS: Record<string, string> = {
  idle: 'ready',
  fetching: 'fetching repository...',
  analyzing: 'analyzing codebase...',
  dialoguing: 'generating dialogue...',
  'generating-audio': 'generating audio...',
  complete: 'podcast ready',
  error: 'error',
}

export default function ConversationPanel({
  turns, status, error, isConnected, onSubmit, onFileClick,
}: ConversationPanelProps) {
  const [url, setUrl] = useState('')
  const [currentAudioIndex, setCurrentAudioIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)

  const isGenerating = status !== 'idle' && status !== 'complete' && status !== 'error'

  const handleSubmit = () => {
    const trimmed = url.trim()
    if (trimmed.includes('github.com/') && !isGenerating) {
      onSubmit(trimmed)
    }
  }

  const audioTurns = turns.filter((t) => t.audioUrl)

  const togglePlay = () => {
    if (!audioRef.current || audioTurns.length === 0) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      if (currentAudioIndex < 0) setCurrentAudioIndex(0)
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleAudioEnded = () => {
    if (currentAudioIndex < audioTurns.length - 1) {
      setCurrentAudioIndex((i) => i + 1)
    } else {
      setIsPlaying(false)
      setCurrentAudioIndex(-1)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* GitHub URL Input */}
      <div className="p-4 border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <span className="text-terminal-accent text-sm shrink-0">~ $</span>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="paste a github url to analyze..."
            disabled={isGenerating}
            aria-label="GitHub repository URL"
            className="flex-1 bg-transparent text-terminal-text text-sm outline-none placeholder:text-terminal-dim/50 disabled:opacity-50"
          />
        </div>
        {/* Status bar */}
        <div className="flex items-center gap-2 mt-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-dot-green' : 'bg-dot-red'}`} />
          <span className={`text-xs ${status === 'error' ? 'text-dot-red' : 'text-terminal-dim'}`}>
            .: {STATUS_LABELS[status] ?? status}
          </span>
          {isGenerating && (
            <span className="text-terminal-dim text-xs animate-pulse">|</span>
          )}
        </div>
      </div>

      {/* Transcript */}
      <div ref={transcriptRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="text-dot-red text-xs border border-dot-red/30 rounded p-2">
            .: error — {error}
          </div>
        )}
        {turns.length === 0 && !isGenerating && !error && (
          <div className="text-terminal-dim text-xs">
            .: waiting for a repository to analyze...
          </div>
        )}
        {turns.map((turn, i) => (
          <div key={i} className="space-y-1">
            <div className={`text-xs font-medium ${turn.speaker === 'nova' ? 'text-orange-400' : 'text-purple-400'}`}>
              [{turn.speaker === 'nova' ? 'Nova' : 'Aero'}]
              {turn.audioUrl && <span className="text-terminal-dim ml-1">♪</span>}
            </div>
            <div className="text-terminal-text text-sm leading-relaxed pl-2 border-l border-terminal-border/50">
              {renderTurnText(turn.text, onFileClick)}
            </div>
          </div>
        ))}
        {isGenerating && turns.length > 0 && (
          <div className="text-terminal-dim text-xs animate-pulse">
            .: generating next turn...
          </div>
        )}
      </div>

      {/* Audio Player */}
      <div className="border-t border-terminal-border p-3">
        {currentAudioIndex >= 0 && audioTurns[currentAudioIndex]?.audioUrl && (
          <audio
            ref={audioRef}
            src={audioTurns[currentAudioIndex].audioUrl}
            onEnded={handleAudioEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            autoPlay
          />
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            disabled={audioTurns.length === 0}
            className="w-8 h-8 border border-terminal-border rounded flex items-center justify-center text-terminal-dim hover:text-terminal-text hover:border-terminal-accent transition-colors disabled:opacity-30"
          >
            <span className="text-xs">{isPlaying ? '||' : '|>'}</span>
          </button>
          <div className="flex-1">
            <div className="h-1 bg-terminal-border/50 rounded-full">
              <div
                className="h-1 bg-terminal-accent rounded-full transition-all"
                style={{
                  width: audioTurns.length > 0
                    ? `${((Math.max(0, currentAudioIndex) + 1) / audioTurns.length) * 100}%`
                    : '0%',
                }}
              />
            </div>
          </div>
          <span className="text-terminal-dim text-xs tabular-nums">
            {audioTurns.length > 0
              ? `${Math.max(0, currentAudioIndex) + 1}/${audioTurns.length}`
              : '00:00 / 00:00'
            }
          </span>
        </div>
      </div>
    </div>
  )
}
