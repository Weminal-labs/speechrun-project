import { useState } from 'react'
import TerminalChrome from './components/TerminalChrome'
import TabNav from './components/TabNav'
import AsciiLogo from './components/AsciiLogo'
import ContextSidebar from './components/ContextSidebar'
import ConversationPanel from './components/ConversationPanel'
import SandboxPanel from './components/SandboxPanel'

export interface CodebaseContext {
  summary: string
  techStack: string[]
  architecture: string
  keyComponents: Array<{ name: string; description: string }>
  codeQuality: string
  podcastTopics: string[]
}

export interface DialogueTurn {
  turnOrder: number
  speaker: 'Nova' | 'Aero'
  text: string
  emotion: string
  topicIndex: number
  audioUrl: string | null
}

export interface AppState {
  loading: boolean
  dialogueLoading: boolean
  error: string | null
  sessionId: string | null
  context: CodebaseContext | null
  turns: DialogueTurn[]
}

function App() {
  const [state, setState] = useState<AppState>({
    loading: false,
    dialogueLoading: false,
    error: null,
    sessionId: null,
    context: null,
    turns: [],
  })

  async function handleSubmitUrl(url: string) {
    setState((s) => ({ ...s, loading: true, error: null, sessionId: null, context: null, turns: [] }))

    try {
      // Phase 2: Ingest
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data = await res.json() as { sessionId?: string; context?: CodebaseContext; error?: string }

      if (!res.ok) {
        setState((s) => ({ ...s, loading: false, error: data.error ?? 'Something went wrong. Please try again.' }))
        return
      }

      const sessionId = data.sessionId ?? null
      const context = data.context ?? null

      setState((s) => ({ ...s, loading: false, context, sessionId }))

      // Phase 3: Auto-trigger dialogue generation
      if (sessionId) {
        setState((s) => ({ ...s, dialogueLoading: true }))

        try {
          const dialogueRes = await fetch('/api/generate-dialogue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          })

          const dialogueData = await dialogueRes.json() as { turns?: DialogueTurn[]; error?: string }

          if (!dialogueRes.ok) {
            setState((s) => ({ ...s, dialogueLoading: false, error: dialogueData.error ?? 'Failed to generate dialogue.' }))
            return
          }

          setState((s) => ({
            ...s,
            dialogueLoading: false,
            turns: dialogueData.turns ?? [],
          }))
        } catch {
          setState((s) => ({ ...s, dialogueLoading: false, error: 'Failed to generate dialogue. Please try again.' }))
        }
      }
    } catch {
      setState((s) => ({ ...s, loading: false, error: 'Could not connect to the server. Please try again.' }))
    }
  }

  return (
    <div className="font-mono">
      <TerminalChrome>
        <TabNav />
        <AsciiLogo />
        {/* 3-Panel Layout */}
        <div className="flex-1 flex min-h-0 border-t border-terminal-border">
          {/* Left - Context Sidebar */}
          <div className="w-[20%] border-r border-terminal-border">
            <ContextSidebar context={state.context} loading={state.loading} />
          </div>
          {/* Center - Conversation */}
          <div className="w-[50%] border-r border-terminal-border">
            <ConversationPanel
              onSubmitUrl={handleSubmitUrl}
              loading={state.loading}
              dialogueLoading={state.dialogueLoading}
              error={state.error}
              context={state.context}
              turns={state.turns}
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
