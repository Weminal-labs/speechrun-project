import { useState } from 'react'
import type { StructuredContext } from '../hooks/use-chat'
import type { Session } from '../hooks/use-sessions'

interface ContextPanelProps {
  context: StructuredContext | null
  sessions: Session[]
  activeId: string
  onSwitch: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}

type ActiveTab = 'project' | 'stack' | 'features' | 'architecture' | 'decisions' | 'quality' | null

function cleanText(text: string): string {
  if (!text) return ''
  const t = text.trim()
  if (t.startsWith('{') || t.startsWith('[')) return ''
  return t.length > 200 ? t.slice(0, 200) + '...' : t
}

const CX: Record<string, string> = { high: 'text-dot-red', medium: 'text-yellow-400', low: 'text-dot-green' }
const CAT: Record<string, string> = { frontend: 'fe', backend: 'be', database: 'db', infrastructure: 'infra', tooling: 'tool', testing: 'test' }

export default function ContextPanel({ context, sessions, activeId, onSwitch, onNew, onDelete }: ContextPanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(null)

  return (
    <div className="h-full flex flex-col">
      {/* Sessions */}
      <div className="p-3 border-b border-terminal-border/30">
        <div className="flex items-center justify-between mb-1">
          <span className="text-terminal-accent text-xs">.: sessions</span>
          <button onClick={onNew} className="text-terminal-dim text-[10px] hover:text-terminal-accent">[+new]</button>
        </div>
        <div className="space-y-0.5 max-h-16 overflow-y-auto">
          {sessions.map((s) => (
            <div key={s.id} className={`flex items-center group ${s.id === activeId ? 'text-terminal-accent' : 'text-terminal-dim'}`}>
              <button onClick={() => onSwitch(s.id)} className="text-[11px] truncate flex-1 text-left hover:text-terminal-text py-0.5">
                {s.id === activeId ? '> ' : '  '}{s.title}
              </button>
              {sessions.length > 1 && (
                <button onClick={() => onDelete(s.id)} className="text-[10px] opacity-0 group-hover:opacity-50 hover:!opacity-100 hover:text-dot-red shrink-0">x</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Context */}
      <div className="flex-1 overflow-y-auto">
        {!context ? (
          <div className="p-3">
            <div className="text-terminal-accent text-xs mb-3">.: context</div>
            {['project/', 'stack/', 'features/', 'architecture/', 'decisions/', 'quality/'].map((n) => (
              <div key={n} className="py-1.5 px-2 text-terminal-dim/30 text-xs border-b border-terminal-border/10">{n}</div>
            ))}
          </div>
        ) : (
          <div>
            {/* Tab buttons */}
            <TabButton
              label="project/"
              sublabel={context.project.name.split('/').pop() || ''}
              active={activeTab === 'project'}
              onClick={() => setActiveTab(activeTab === 'project' ? null : 'project')}
            />
            {activeTab === 'project' && (
              <Detail>
                <div className="text-terminal-text text-xs font-medium">{context.project.name}</div>
                <div className="text-terminal-dim text-[11px] mt-1 leading-relaxed">{cleanText(context.project.summary)}</div>
                {context.project.purpose && <div className="text-terminal-dim/60 text-[10px] mt-1">{cleanText(context.project.purpose)}</div>}
                <div className="text-terminal-dim/40 text-[10px] mt-1">{context.project.primaryLanguage} {context.project.stars ? `| ${context.project.stars} stars` : ''}</div>
              </Detail>
            )}

            <TabButton
              label="stack/"
              sublabel={context.stack.length > 0 ? context.stack.slice(0, 3).map((s) => s.name).join(', ') : ''}
              active={activeTab === 'stack'}
              onClick={() => setActiveTab(activeTab === 'stack' ? null : 'stack')}
            />
            {activeTab === 'stack' && (
              <Detail>
                {Object.entries(groupCat(context.stack)).map(([cat, items]) => (
                  <div key={cat} className="mb-1.5">
                    <span className="text-terminal-accent/60 text-[10px] uppercase">{CAT[cat] || cat}</span>
                    {items.map((s, i) => (
                      <div key={i} className="text-terminal-text text-xs pl-2 py-0.5">
                        {s.name} <span className="text-terminal-dim/50 text-[10px]">{s.role}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </Detail>
            )}

            <TabButton
              label={`features/ (${context.features.length})`}
              sublabel={context.features.length > 0 ? context.features[0].name : 'none'}
              active={activeTab === 'features'}
              onClick={() => setActiveTab(activeTab === 'features' ? null : 'features')}
            />
            {activeTab === 'features' && (
              <Detail>
                {context.features.length === 0 ? (
                  <div className="text-terminal-dim/40 text-xs">No features discovered</div>
                ) : context.features.map((f) => (
                  <div key={f.id} className="mb-2 pl-1 border-l border-terminal-border/30 hover:border-terminal-accent/50 transition-colors">
                    <div className="flex items-center gap-1 pl-2">
                      <span className="text-terminal-text text-xs">{f.name}</span>
                      <span className={`text-[9px] px-1 rounded ${CX[f.complexity] || ''} bg-terminal-border/20`}>{f.complexity}</span>
                    </div>
                    <div className="text-terminal-dim text-[10px] pl-2 leading-relaxed">{f.description}</div>
                  </div>
                ))}
              </Detail>
            )}

            <TabButton
              label="architecture/"
              sublabel={context.architecture.pattern || ''}
              active={activeTab === 'architecture'}
              onClick={() => setActiveTab(activeTab === 'architecture' ? null : 'architecture')}
            />
            {activeTab === 'architecture' && (
              <Detail>
                <div className="text-terminal-text text-xs">{context.architecture.pattern}</div>
                <div className="text-terminal-dim text-[11px] mt-1">{cleanText(context.architecture.description)}</div>
                {context.architecture.layers.length > 0 && (
                  <div className="mt-2 flex items-center gap-1 flex-wrap">
                    {context.architecture.layers.map((l, i) => (
                      <span key={i} className="text-[10px] text-terminal-accent/70 bg-terminal-accent/5 px-1.5 py-0.5 rounded">
                        {l}{i < context.architecture.layers.length - 1 ? ' >' : ''}
                      </span>
                    ))}
                  </div>
                )}
                {context.architecture.dataFlow && (
                  <div className="text-terminal-dim/50 text-[10px] mt-1">{context.architecture.dataFlow}</div>
                )}
              </Detail>
            )}

            {context.decisions.length > 0 && (
              <>
                <TabButton
                  label={`decisions/ (${context.decisions.length})`}
                  sublabel={context.decisions[0]?.title || ''}
                  active={activeTab === 'decisions'}
                  onClick={() => setActiveTab(activeTab === 'decisions' ? null : 'decisions')}
                />
                {activeTab === 'decisions' && (
                  <Detail>
                    {context.decisions.map((d, i) => (
                      <div key={i} className="mb-2 pl-1 border-l border-terminal-border/30">
                        <div className="text-terminal-text text-xs pl-2">{d.title}</div>
                        <div className="text-terminal-dim text-[10px] pl-2">{d.rationale}</div>
                        {d.tradeoff && <div className="text-yellow-400/60 text-[10px] pl-2">{d.tradeoff}</div>}
                      </div>
                    ))}
                  </Detail>
                )}
              </>
            )}

            <TabButton
              label="quality/"
              sublabel={context.quality.overall ? context.quality.overall.slice(0, 30) : ''}
              active={activeTab === 'quality'}
              onClick={() => setActiveTab(activeTab === 'quality' ? null : 'quality')}
            />
            {activeTab === 'quality' && (
              <Detail>
                {context.quality.strengths.map((s, i) => (
                  <div key={`s${i}`} className="flex items-start gap-1.5 mb-1">
                    <span className="text-dot-green text-[11px] shrink-0">+</span>
                    <span className="text-terminal-dim text-[11px]">{s}</span>
                  </div>
                ))}
                {context.quality.concerns.map((c, i) => (
                  <div key={`c${i}`} className="flex items-start gap-1.5 mb-1">
                    <span className="text-dot-red text-[11px] shrink-0">-</span>
                    <span className="text-terminal-dim text-[11px]">{c}</span>
                  </div>
                ))}
                {context.quality.overall && (
                  <div className="text-terminal-dim/50 text-[10px] mt-2 pt-1 border-t border-terminal-border/20">{context.quality.overall}</div>
                )}
              </Detail>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TabButton({ label, sublabel, active, onClick }: {
  label: string; sublabel: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 border-b border-terminal-border/10 transition-colors flex items-center gap-2 group
        ${active ? 'bg-terminal-accent/5 border-l-2 border-l-terminal-accent' : 'hover:bg-terminal-border/10 border-l-2 border-l-transparent'}`}
    >
      <span className={`text-xs font-medium ${active ? 'text-terminal-accent' : 'text-terminal-text group-hover:text-terminal-accent'}`}>
        {label}
      </span>
      {sublabel && !active && (
        <span className="text-[10px] text-terminal-dim/40 truncate flex-1">{sublabel}</span>
      )}
    </button>
  )
}

function Detail({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 bg-terminal-border/5 border-b border-terminal-border/10">
      {children}
    </div>
  )
}

function groupCat(stack: StructuredContext['stack']): Record<string, typeof stack> {
  const g: Record<string, typeof stack> = {}
  for (const s of stack) { const c = s.category || 'tooling'; (g[c] ??= []).push(s) }
  return g
}
