import type { ReactNode } from 'react'

interface TerminalChromeProps {
  children: ReactNode
}

export default function TerminalChrome({ children }: TerminalChromeProps) {
  return (
    <div className="h-screen flex flex-col bg-terminal-bg p-3">
      <div className="flex-1 flex flex-col min-h-0 border border-terminal-border rounded-lg overflow-hidden">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border bg-terminal-bg/80">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-dot-red" />
            <div className="w-3 h-3 rounded-full bg-dot-yellow" />
            <div className="w-3 h-3 rounded-full bg-dot-green" />
          </div>
          <span className="text-terminal-dim text-sm">speechrun — zsh</span>
          <div className="w-[52px]" />
        </div>
        {children}
      </div>
    </div>
  )
}
