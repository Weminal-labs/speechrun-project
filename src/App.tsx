import { useEffect, useRef } from 'react'
import TerminalChrome from './components/TerminalChrome'
import TabNav from './components/TabNav'
import AsciiLogo from './components/AsciiLogo'
import ContextPanel from './components/ContextPanel'
import ConversationPanel from './components/ConversationPanel'
import SandboxPanel from './components/SandboxPanel'
import { useChat } from './hooks/use-chat'
import { useSessions } from './hooks/use-sessions'

function App() {
  const { sessions, activeId, createSession, switchSession, deleteSession, renameSession } = useSessions()
  const {
    state, sendMessage, isConnected,
    streamingMessage, thinkingSpeaker,
    startAutonomous, pauseAutonomous, resumeAutonomous, stopAutonomous, currentTopic,
    currentlyPlaying, playingTurnIndex, isPlaying, audioProgress, audioDuration,
    playTurnAudio, togglePlayPause, seekAudio,
  } = useChat(activeId)

  const prevContextRef = useRef<{ sessionId: string; name: string | null }>({ sessionId: '', name: null })

  useEffect(() => {
    const name = state.context?.project?.name
    if (!name) return
    if (prevContextRef.current.sessionId === activeId && prevContextRef.current.name === name) return
    prevContextRef.current = { sessionId: activeId, name }
    renameSession(activeId, name)
  }, [state.context?.project?.name, activeId, renameSession])

  return (
    <div className="font-mono">
      <TerminalChrome>
        <TabNav />
        <AsciiLogo />
        <div className="flex-1 flex min-h-0 border-t border-terminal-border">
          <div className="w-[20%] border-r border-terminal-border">
            <ContextPanel
              context={state.context}
              sessions={sessions}
              activeId={activeId}
              onSwitch={switchSession}
              onNew={createSession}
              onDelete={deleteSession}
            />
          </div>
          <div className="w-[50%] border-r border-terminal-border">
            <ConversationPanel
              key={activeId}
              messages={state.messages}
              turns={state.turns}
              status={state.status}
              isConnected={isConnected}
              hasContext={!!state.context}
              onSendMessage={sendMessage}
              streamingMessage={streamingMessage}
              thinkingSpeaker={thinkingSpeaker}
              onStartAutonomous={startAutonomous}
              onPauseAutonomous={pauseAutonomous}
              onResumeAutonomous={resumeAutonomous}
              onStopAutonomous={stopAutonomous}
              currentTopic={currentTopic}
              currentlyPlayingId={currentlyPlaying}
              playingTurnIndex={playingTurnIndex}
              isAudioPlaying={isPlaying}
              audioProgress={audioProgress}
              audioDuration={audioDuration}
              onPlayTurn={playTurnAudio}
              onTogglePlayPause={togglePlayPause}
              onSeekAudio={seekAudio}
            />
          </div>
          <div className="w-[30%]">
            <SandboxPanel
              context={state.context}
              messages={state.messages}
              status={state.status}
            />
          </div>
        </div>
      </TerminalChrome>
    </div>
  )
}

export default App
