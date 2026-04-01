import type { CodebaseContext } from '../App'

interface Props {
  context: CodebaseContext | null
  loading: boolean
}

export default function ContextSidebar({ context, loading }: Props) {
  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <div className="text-terminal-accent text-sm mb-3">
          .: context
        </div>
        <div className="text-terminal-accent text-xs animate-pulse">
          .: analyzing codebase...
        </div>
      </div>
    )
  }

  if (!context) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <div className="text-terminal-accent text-sm mb-3">
          .: context
        </div>
        <div className="text-terminal-dim text-xs">
          .: enter a repo to get started
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="text-terminal-accent text-sm mb-3">
        .: context
      </div>
      <div className="space-y-3">
        {/* Tech Stack */}
        <div>
          <div className="text-terminal-text text-xs font-medium mb-1">
            stack/
          </div>
          {context.techStack.map((tech) => (
            <div key={tech} className="text-terminal-dim text-xs pl-3 py-0.5">
              .: {tech}
            </div>
          ))}
        </div>

        {/* Key Components */}
        <div>
          <div className="text-terminal-text text-xs font-medium mb-1">
            components/
          </div>
          {context.keyComponents.map((comp) => (
            <div key={comp.name} className="text-terminal-dim text-xs pl-3 py-0.5" title={comp.description}>
              .: {comp.name}
            </div>
          ))}
        </div>

        {/* Architecture */}
        <div>
          <div className="text-terminal-text text-xs font-medium mb-1">
            architecture/
          </div>
          <div className="text-terminal-dim text-xs pl-3 py-0.5 leading-relaxed">
            .: {context.architecture}
          </div>
        </div>

        {/* Code Quality */}
        <div>
          <div className="text-terminal-text text-xs font-medium mb-1">
            quality/
          </div>
          <div className="text-terminal-dim text-xs pl-3 py-0.5 leading-relaxed">
            .: {context.codeQuality}
          </div>
        </div>
      </div>
    </div>
  )
}
