import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'
import { AppShell } from './AppShell'

const MESSAGES = [
  {
    speaker: 'nova' as const,
    text: "Welcome to SpeechRun! Today we're diving into Hono, an ultrafast web framework built for the Edge. What caught my eye is they went all-in on Web Standards — no Node.js APIs.",
    frame: 20,
  },
  {
    speaker: 'aero' as const,
    text: "Yeah, the router implementation is really clever. They use a RegExpRouter that compiles all routes into a single regex at startup — O(1) matching regardless of route count.",
    frame: 120,
  },
  {
    speaker: 'nova' as const,
    text: "That's a bold architectural choice. How does their middleware system compare to Express? I noticed they have over 20 built-in middleware packages.",
    frame: 220,
  },
  {
    speaker: 'aero' as const,
    text: "It's actually more elegant — everything is just a handler function. The Context object does the heavy lifting. Clean, composable, zero magic.",
    frame: 320,
  },
]

export const DemoConversation: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const exitOpacity = interpolate(frame, [420, 450], [1, 0], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ opacity: exitOpacity }}>
      <AppShell
        statusText="generating dialogue..."
        leftPanel={
          <div style={{ fontFamily: 'monospace', fontSize: 10 }}>
            <div style={{ color: '#f6821f', marginBottom: 8, fontSize: 11 }}>.: sessions</div>
            <div style={{ color: '#e8eaf6', marginBottom: 12 }}>{'>'} honojs/hono</div>
            <div style={{ marginBottom: 3 }}><span style={{ color: '#e8eaf6' }}>project/</span> <span style={{ color: '#6b6b8a' }}>hono</span></div>
            <div style={{ marginBottom: 3 }}><span style={{ color: '#e8eaf6' }}>stack/</span> <span style={{ color: '#6b6b8a' }}>TypeScript, Bun</span></div>
            <div style={{ marginBottom: 3 }}><span style={{ color: '#e8eaf6' }}>features/</span> <span style={{ color: '#6b6b8a' }}>(8) Router, Middleware...</span></div>
            <div style={{ marginBottom: 3 }}><span style={{ color: '#e8eaf6' }}>architecture/</span> <span style={{ color: '#6b6b8a' }}>Middleware Pipeline</span></div>
            <div style={{ marginBottom: 3 }}><span style={{ color: '#e8eaf6' }}>quality/</span> <span style={{ color: '#6b6b8a' }}>Excellent coverage</span></div>
          </div>
        }
        centerPanel={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: 'monospace', overflow: 'hidden' }}>
            {/* Analysis status */}
            <div style={{ color: '#28c840', fontSize: 11, marginBottom: 4 }}>Analysis complete! 8 features found.</div>

            {MESSAGES.map((msg, i) => {
              const appear = spring({ frame: frame - msg.frame, fps, config: { damping: 15 } })
              const opacity = interpolate(frame, [msg.frame, msg.frame + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

              // Typewriter effect
              const charsToShow = Math.min(Math.floor((frame - msg.frame) * 2.5), msg.text.length)
              const displayText = frame >= msg.frame ? msg.text.slice(0, Math.max(0, charsToShow)) : ''
              const isTyping = charsToShow < msg.text.length && frame >= msg.frame

              const isNova = msg.speaker === 'nova'
              return (
                <div key={i} style={{ display: 'flex', gap: 8, opacity, transform: `translateY(${interpolate(Math.min(appear, 1), [0, 1], [12, 0])}px)` }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 14, flexShrink: 0,
                    background: isNova ? 'rgba(249,115,22,0.2)' : 'rgba(168,85,247,0.2)',
                    border: `1px solid ${isNova ? 'rgba(249,115,22,0.3)' : 'rgba(168,85,247,0.3)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: isNova ? '#f97316' : '#a855f7',
                  }}>
                    {isNova ? 'N' : 'A'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: isNova ? '#f97316' : '#a855f7' }}>
                        {isNova ? 'Nova' : 'Aero'}
                      </span>
                      <span style={{ fontSize: 9, color: '#4a4a60' }}>podcast</span>
                    </div>
                    <div style={{
                      background: isNova ? 'rgba(249,115,22,0.08)' : 'rgba(168,85,247,0.08)',
                      border: `1px solid ${isNova ? 'rgba(249,115,22,0.12)' : 'rgba(168,85,247,0.12)'}`,
                      borderRadius: 12, borderTopLeftRadius: 4, padding: '10px 14px',
                    }}>
                      <span style={{ color: '#e8eaf6', fontSize: 12, lineHeight: 1.5 }}>
                        {displayText}
                        {isTyping && <span style={{ color: '#f6821f', opacity: frame % 12 < 6 ? 1 : 0 }}>|</span>}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        }
        rightPanel={
          <div style={{ padding: 12 }}>
            <div style={{ background: '#f6821f', borderRadius: 12, padding: 14 }}>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'system-ui' }}>honojs/hono</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontFamily: 'system-ui', marginTop: 2 }}>Lightweight web framework for the Edge</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                {[['8', 'Features'], ['5', 'Stack'], ['85%', 'Quality']].map(([val, label]) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 8px', textAlign: 'center', flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{val}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 7, textTransform: 'uppercase' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        }
      />
    </AbsoluteFill>
  )
}
