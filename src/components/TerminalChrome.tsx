import type { ReactNode } from 'react'
import bgGif from '../assets/ascii-art_gif_small.gif'

interface TerminalChromeProps {
  children: ReactNode
}

export default function TerminalChrome({ children }: TerminalChromeProps) {
  return (
    <div className="h-screen flex flex-col p-3 relative overflow-hidden">
      {/* GIF Background */}
      <img src={bgGif} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0" />
      <div className="absolute inset-0 bg-black/30 pointer-events-none z-0" />

      <div className="flex-1 flex flex-col min-h-0 border border-terminal-border rounded-lg overflow-hidden relative z-10 backdrop-blur-sm bg-terminal-surface/50">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-border bg-gradient-to-r from-terminal-bg/90 to-terminal-surface/90">
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
