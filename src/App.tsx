import { useState } from 'react'
import TerminalChrome from './components/TerminalChrome'
import TabNav from './components/TabNav'
import AsciiLogo from './components/AsciiLogo'
import ContextSidebar from './components/ContextSidebar'
import ConversationPanel from './components/ConversationPanel'
import SandboxPanel from './components/SandboxPanel'
import { usePodcast } from './hooks/use-podcast'

function App() {
  const { state, startGeneration, isConnected } = usePodcast()
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  return (
    <div className="font-mono">
      <TerminalChrome>
        <TabNav />
        <AsciiLogo />
        {/* 3-Panel Layout */}
        <div className="flex-1 flex min-h-0 border-t border-terminal-border">
          {/* Left - Context Sidebar */}
          <div className="w-[20%] border-r border-terminal-border">
            <ContextSidebar
              context={state.context}
              selectedFile={selectedFile}
              onClearFile={() => setSelectedFile(null)}
            />
          </div>
          {/* Center - Conversation */}
          <div className="w-[50%] border-r border-terminal-border">
            <ConversationPanel
              turns={state.turns}
              status={state.status}
              error={state.error}
              isConnected={isConnected}
              onSubmit={startGeneration}
              onFileClick={(filePath) => setSelectedFile(filePath)}
            />
          </div>
          {/* Right - Sandbox */}
          <div className="w-[30%]">
            <SandboxPanel />
          </div>
        </div>
      </TerminalChrome>
    </div>
  )
}

export default App
