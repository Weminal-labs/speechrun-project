import type { ChatMessage, StructuredContext } from '../hooks/use-chat'

interface OperationsPanelProps {
  messages: ChatMessage[]
  context: StructuredContext | null
  status: string
}

const STATUS_DISPLAY: Record<string, { label: string; icon: string }> = {
  idle: { label: 'idle', icon: '.' },
  fetching: { label: 'fetching', icon: '>' },
  analyzing: { label: 'analyzing', icon: '>' },
  dialoguing: { label: 'speaking', icon: '>' },
  'generating-audio': { label: 'rendering', icon: '>' },
  complete: { label: 'done', icon: '.' },
  error: { label: 'error', icon: '!' },
}

export default function OperationsPanel({ messages, context, status }: OperationsPanelProps) {
  const statusMessages = messages.filter((m) => m.metadata?.type === 'status')
  const displayStatus = STATUS_DISPLAY[status] || STATUS_DISPLAY.idle

  return (
    <div className="h-full overflow-y-auto p-4 flex flex-col">
      {/* Progress Log */}
      <div className="mb-4 flex-1 min-h-0">
        <div className="text-terminal-accent text-sm mb-2">.: operations</div>
        <div className="space-y-0.5 overflow-y-auto max-h-48">
          {statusMessages.length === 0 ? (
            <div className="text-terminal-dim/40 text-xs">.: waiting...</div>
          ) : (
            statusMessages.map((msg, i) => {
              const time = new Date(msg.timestamp)
              const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`
              return (
                <div key={i} className="text-terminal-dim text-xs flex gap-2">
                  <span className="text-terminal-dim/40 shrink-0">[{timeStr}]</span>
                  <span>{msg.content}</span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Features Status */}
      {context && context.features.length > 0 && (
        <div className="mb-4">
          <div className="text-terminal-text text-xs font-medium mb-1">.: features</div>
          {context.features.map((f) => {
            // Check if this feature was discussed in dialogue turns
            const discussed = messages.some(
              (m) => (m.role === 'nova' || m.role === 'aero')
                && m.metadata?.type === 'dialogue-turn'
                && m.content.toLowerCase().includes(f.name.toLowerCase()),
            )
            return (
              <div key={f.id} className="text-xs flex items-center gap-2 py-0.5">
                <span className={discussed ? 'text-dot-green' : 'text-terminal-dim/30'}>
                  {discussed ? '[ok]' : '[  ]'}
                </span>
                <span className={`truncate ${discussed ? 'text-terminal-text' : 'text-terminal-dim'}`}>
                  {f.name}
                </span>
                <span className="text-terminal-dim/30 text-[10px]">{f.complexity}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Active Workers */}
      <div>
        <div className="text-terminal-text text-xs font-medium mb-1">.: workers</div>
        <div className="space-y-0.5">
          <WorkerRow name="Orchestrator" status={displayStatus.label} active={status !== 'idle'} />
          <WorkerRow
            name="Nova (PM)"
            status={status === 'dialoguing' ? 'speaking' : 'idle'}
            active={status === 'dialoguing'}
          />
          <WorkerRow
            name="Aero (Dev)"
            status={status === 'dialoguing' ? 'speaking' : 'idle'}
            active={status === 'dialoguing'}
          />
        </div>
      </div>
    </div>
  )
}

function WorkerRow({ name, status, active }: { name: string; status: string; active: boolean }) {
  return (
    <div className="text-xs flex items-center gap-3">
      <span className={`w-24 truncate ${active ? 'text-terminal-accent' : 'text-terminal-dim'}`}>
        {name}
      </span>
      <span className={`${active ? 'text-terminal-accent animate-pulse' : 'text-terminal-dim/40'}`}>
        {status}
      </span>
    </div>
  )
}
