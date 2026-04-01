import { useState, useRef, useEffect } from 'react'
import type { CodebaseContext, DialogueTurn } from '../App'

interface Props {
  onSubmitUrl: (url: string) => void
  loading: boolean
  dialogueLoading: boolean
  error: string | null
  context: CodebaseContext | null
  turns: DialogueTurn[]
}

const SPEAKER_COLORS: Record<string, string> = {
  Nova: 'text-orange-400',
  Aero: 'text-purple-400',
}

const EMOTION_LABELS: Record<string, string> = {
  curious: 'curious',
  enthusiastic: 'enthusiastic',
  thoughtful: 'thoughtful',
  'matter-of-fact': 'matter-of-fact',
  amused: 'amused',
  concerned: 'concerned',
  impressed: 'impressed',
}

export default function ConversationPanel({ onSubmitUrl, loading, dialogueLoading, error, context, turns }: Props) {
  const [url, setUrl] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll when new turns arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [turns.length])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (url.trim() && !loading && !dialogueLoading) {
      onSubmitUrl(url.trim())
    }
  }

  const isWorking = loading || dialogueLoading

  return (
    <div className="h-full flex flex-col">
      {/* GitHub URL Input */}
      <form onSubmit={handleSubmit} className="p-4 border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <span className="text-terminal-accent text-sm shrink-0">~ $</span>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="type owner/repo or a github url..."
            aria-label="GitHub repository URL"
            disabled={isWorking}
            className="flex-1 bg-transparent text-terminal-text text-sm outline-none placeholder:text-terminal-dim/50 disabled:opacity-50"
          />
          {loading && (
            <span className="text-terminal-accent text-xs animate-pulse">analyzing...</span>
          )}
          {dialogueLoading && (
            <span className="text-green-400 text-xs animate-pulse">generating podcast...</span>
          )}
        </div>
        {error && (
          <div className="mt-2 text-red-400 text-xs pl-6">
            .: {error}
          </div>
        )}
      </form>

      {/* Transcript area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {!context && !isWorking && turns.length === 0 && (
          <div className="text-terminal-dim text-xs">
            .: waiting for a repository to analyze...
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            <div className="text-terminal-accent text-xs animate-pulse">
              .: fetching repository tree...
            </div>
            <div className="text-terminal-accent text-xs animate-pulse" style={{ animationDelay: '0.5s' }}>
              .: selecting key files...
            </div>
            <div className="text-terminal-accent text-xs animate-pulse" style={{ animationDelay: '1s' }}>
              .: generating context with AI...
            </div>
          </div>
        )}

        {context && !loading && turns.length === 0 && !dialogueLoading && (
          <div className="space-y-2">
            <div className="text-terminal-accent text-xs">
              .: analysis complete
            </div>
            <div className="text-terminal-dim text-xs">
              .: {context.summary}
            </div>
          </div>
        )}

        {dialogueLoading && turns.length === 0 && (
          <div className="space-y-2">
            <div className="text-green-400 text-xs animate-pulse">
              .: generating podcast outline...
            </div>
            <div className="text-green-400 text-xs animate-pulse" style={{ animationDelay: '0.5s' }}>
              .: Nova and Aero are preparing to talk...
            </div>
          </div>
        )}

        {/* Dialogue Turns */}
        {turns.map((turn) => (
          <div key={turn.turnOrder} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${SPEAKER_COLORS[turn.speaker] ?? 'text-terminal-text'}`}>
                [{turn.speaker}]
              </span>
              <span className="text-terminal-dim/40 text-[10px]">
                {EMOTION_LABELS[turn.emotion] ?? turn.emotion}
              </span>
            </div>
            <div className="text-terminal-text text-sm leading-relaxed pl-2 border-l border-terminal-border/50">
              {turn.text}
            </div>
          </div>
        ))}

        {dialogueLoading && turns.length > 0 && (
          <div className="text-green-400 text-xs animate-pulse">
            .: generating next turn...
          </div>
        )}

        {!dialogueLoading && turns.length > 0 && (
          <div className="text-terminal-accent text-xs mt-4">
            .: podcast dialogue complete ({turns.length} turns)
          </div>
        )}
      </div>

      {/* Audio Player Skeleton */}
      <div className="border-t border-terminal-border p-3">
        <div className="flex items-center gap-3">
          <button className="w-8 h-8 border border-terminal-border rounded flex items-center justify-center text-terminal-dim hover:text-terminal-text hover:border-terminal-accent transition-colors">
            <span className="text-xs">|&gt;</span>
          </button>
          <div className="flex-1">
            <div className="h-1 bg-terminal-border/50 rounded-full">
              <div className="h-1 w-0 bg-terminal-accent rounded-full" />
            </div>
          </div>
          <span className="text-terminal-dim text-xs tabular-nums">00:00 / 00:00</span>
        </div>
      </div>
    </div>
  )
}
