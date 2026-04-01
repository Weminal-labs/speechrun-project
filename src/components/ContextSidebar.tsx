import type { ContextData } from '../hooks/use-podcast'

interface ContextSidebarProps {
  context: ContextData | null
}

const PLACEHOLDER_SECTIONS = [
  { name: 'project/', items: ['OVERVIEW.md', 'SCOPE.md', 'ROADMAP.md'] },
  { name: 'technical/', items: ['STACK.md', 'ARCHITECTURE.md'] },
  { name: 'features/', items: ['waiting for analysis...'] },
  { name: 'design/', items: ['DESIGN_SYSTEM.md'] },
]

export default function ContextSidebar({ context }: ContextSidebarProps) {
  if (!context) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <div className="text-terminal-accent text-sm mb-3">
          .: context
        </div>
        <div className="space-y-3">
          {PLACEHOLDER_SECTIONS.map((section) => (
            <div key={section.name}>
              <div className="text-terminal-text text-xs font-medium mb-1">
                {section.name}
              </div>
              {section.items.map((item) => (
                <div key={item} className="text-terminal-dim text-xs pl-3 py-0.5">
                  .: {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="text-terminal-accent text-sm mb-3">
        .: {context.repoName}
      </div>

      {/* Summary */}
      <div className="mb-4">
        <div className="text-terminal-text text-xs font-medium mb-1">.: analysis</div>
        <div className="text-terminal-dim text-xs leading-relaxed pl-3">
          {context.summary.length > 500
            ? context.summary.slice(0, 500) + '...'
            : context.summary}
        </div>
      </div>

      {/* File tree */}
      <div className="mb-4">
        <div className="text-terminal-text text-xs font-medium mb-1">
          .: files ({context.fileTree.length})
        </div>
        <div className="max-h-48 overflow-y-auto">
          {context.fileTree.slice(0, 40).map((f) => (
            <div key={f} className="text-terminal-dim text-xs pl-3 py-0.5 truncate" title={f}>
              {f}
            </div>
          ))}
          {context.fileTree.length > 40 && (
            <div className="text-terminal-dim/50 text-xs pl-3 py-0.5">
              ... +{context.fileTree.length - 40} more
            </div>
          )}
        </div>
      </div>

      {/* Key files analyzed */}
      <div>
        <div className="text-terminal-text text-xs font-medium mb-1">
          .: analyzed ({Object.keys(context.keyFiles).length} files)
        </div>
        {Object.keys(context.keyFiles).map((f) => (
          <div key={f} className="text-terminal-accent/70 text-xs pl-3 py-0.5 truncate" title={f}>
            {f}
          </div>
        ))}
      </div>

      <div className="mt-4 text-terminal-dim/50 text-[10px]">
        generated {context.generatedAt}
      </div>
    </div>
  )
}
