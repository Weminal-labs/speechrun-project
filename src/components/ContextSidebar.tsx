const sections = [
  { name: 'project/', items: ['OVERVIEW.md', 'SCOPE.md', 'ROADMAP.md'] },
  { name: 'technical/', items: ['STACK.md', 'ARCHITECTURE.md'] },
  { name: 'features/', items: ['waiting for analysis...'] },
  { name: 'design/', items: ['DESIGN_SYSTEM.md'] },
]

export default function ContextSidebar() {
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="text-terminal-accent text-sm mb-3">
        .: context
      </div>
      <div className="space-y-3">
        {sections.map((section) => (
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
