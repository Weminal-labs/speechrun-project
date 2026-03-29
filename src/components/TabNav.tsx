const tabs = ['Context', 'Conversation', 'Sandbox']

export default function TabNav() {
  return (
    <div className="flex border-b border-terminal-border" role="tablist">
      {tabs.map((tab) => (
        <div
          key={tab}
          role="tab"
          aria-selected={false}
          aria-disabled
          className="flex-1 px-6 py-2 text-sm text-terminal-text text-center border-r border-terminal-border last:border-r-0 hover:bg-terminal-border/30 transition-colors cursor-default"
        >
          {tab}
        </div>
      ))}
    </div>
  )
}
