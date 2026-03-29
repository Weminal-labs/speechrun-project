import TerminalChrome from './components/TerminalChrome'
import TabNav from './components/TabNav'
import AsciiLogo from './components/AsciiLogo'
import ContextSidebar from './components/ContextSidebar'
import ConversationPanel from './components/ConversationPanel'
import SandboxPanel from './components/SandboxPanel'

function App() {
  return (
    <div className="font-mono">
      <TerminalChrome>
        <TabNav />
        <AsciiLogo />
        {/* 3-Panel Layout */}
        <div className="flex-1 flex min-h-0 border-t border-terminal-border">
          {/* Left - Context Sidebar */}
          <div className="w-[20%] border-r border-terminal-border">
            <ContextSidebar />
          </div>
          {/* Center - Conversation */}
          <div className="w-[50%] border-r border-terminal-border">
            <ConversationPanel />
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
