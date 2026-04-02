import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import { AppShell } from './AppShell'

const STATUS_STEPS = [
  { text: '> Fetching repository...', frame: 10 },
  { text: '> Found 45 files. Analyzing...', frame: 40 },
  { text: 'Analysis complete! 8 features found.', frame: 90 },
]

const SIDEBAR_ITEMS = [
  { label: 'project/', value: 'hono', frame: 50 },
  { label: 'stack/', value: 'TypeScript, Bun, Web Standards', frame: 60 },
  { label: 'features/', value: '(8) Router, Middleware, Context...', frame: 75 },
  { label: 'architecture/', value: 'Middleware Pipeline', frame: 85 },
  { label: 'decisions/', value: '(3) Web Standards First...', frame: 95 },
  { label: 'quality/', value: 'Excellent test coverage...', frame: 105 },
]

export const DemoProcessing: React.FC = () => {
  const frame = useCurrentFrame()

  const statusText = frame < 90 ? 'analyzing codebase...' : 'ready'
  const exitOpacity = interpolate(frame, [135, 150], [1, 0], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ opacity: exitOpacity }}>
      <AppShell
        statusText={statusText}
        leftPanel={
          <div style={{ fontFamily: 'monospace', fontSize: 11 }}>
            <div style={{ color: '#f6821f', marginBottom: 8 }}>.: sessions</div>
            <div style={{ color: '#e8eaf6', fontSize: 10, marginBottom: 12 }}>{'>'} honojs/hono</div>
            {SIDEBAR_ITEMS.map((item, i) => {
              const opacity = interpolate(frame, [item.frame, item.frame + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
              return (
                <div key={i} style={{ marginBottom: 4, opacity }}>
                  <span style={{ color: '#e8eaf6', fontSize: 10 }}>{item.label}</span>
                  <span style={{ color: '#6b6b8a', fontSize: 9, marginLeft: 4 }}>{item.value}</span>
                </div>
              )
            })}
          </div>
        }
        centerPanel={
          <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <div style={{ background: 'rgba(246,130,31,0.1)', border: '1px solid rgba(246,130,31,0.2)', borderRadius: 12, padding: '8px 14px', maxWidth: '80%' }}>
                <span style={{ color: '#e8eaf6', fontSize: 12 }}>https://github.com/honojs/hono</span>
              </div>
            </div>
            {STATUS_STEPS.map((step, i) => {
              const opacity = interpolate(frame, [step.frame, step.frame + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
              const isComplete = step.text.includes('complete')
              return (
                <div key={i} style={{ opacity, color: isComplete ? '#28c840' : '#6b6b8a', fontSize: 11, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {!isComplete && frame < step.frame + 30 && <span style={{ animation: 'none', color: '#f6821f' }}>{'>'}</span>}
                  {step.text}
                </div>
              )
            })}
          </div>
        }
        rightPanel={
          <div style={{ padding: 12 }}>
            {frame > 95 && (
              <div style={{ opacity: interpolate(frame, [95, 110], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
                <div style={{ background: '#f6821f', borderRadius: 12, padding: 16 }}>
                  <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'system-ui', marginBottom: 4 }}>honojs/hono</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'system-ui' }}>Lightweight web framework for the Edge</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 12px', textAlign: 'center', flex: 1 }}>
                      <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>8</div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8, textTransform: 'uppercase' }}>Features</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 12px', textAlign: 'center', flex: 1 }}>
                      <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>5</div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8, textTransform: 'uppercase' }}>Stack</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 12px', textAlign: 'center', flex: 1 }}>
                      <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>85%</div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8, textTransform: 'uppercase' }}>Quality</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        }
      />

      {/* Voiceover subtitle */}
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center' }}>
        <span style={{ background: 'rgba(0,0,0,0.7)', padding: '8px 24px', borderRadius: 8, color: '#e8eaf6', fontSize: 18, fontFamily: 'system-ui' }}>
          Three Durable Objects wake up on Cloudflare's edge. Workers AI starts analyzing.
        </span>
      </div>
    </AbsoluteFill>
  )
}
