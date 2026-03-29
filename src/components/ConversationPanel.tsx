const placeholderTranscript = [
  { speaker: 'Nova', color: 'text-orange-400', text: 'Looking at this codebase, the first thing that stands out is the architecture...' },
  { speaker: 'Aero', color: 'text-purple-400', text: 'Right, they\'re using a pretty clean separation of concerns here...' },
  { speaker: 'Nova', color: 'text-orange-400', text: 'From a product perspective, I think the most interesting decision is...' },
]

export default function ConversationPanel() {
  return (
    <div className="h-full flex flex-col">
      {/* GitHub URL Input */}
      <div className="p-4 border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <span className="text-terminal-accent text-sm shrink-0">~ $</span>
          <input
            type="text"
            placeholder="paste a github url to analyze..."
            aria-label="GitHub repository URL"
            className="flex-1 bg-transparent text-terminal-text text-sm outline-none placeholder:text-terminal-dim/50"
          />
        </div>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-terminal-dim text-xs">
          .: waiting for a repository to analyze...
        </div>
        {placeholderTranscript.map((turn, i) => (
          <div key={i} className="space-y-1">
            <div className={`text-xs font-medium ${turn.color}`}>
              [{turn.speaker}]
            </div>
            <div className="text-terminal-text text-sm leading-relaxed pl-2 border-l border-terminal-border/50">
              {turn.text}
            </div>
          </div>
        ))}
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
