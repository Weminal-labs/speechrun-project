import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import { AppShell } from './AppShell'

export const DemoURLInput: React.FC = () => {
  const frame = useCurrentFrame()

  const url = 'https://github.com/honojs/hono'
  const typedChars = Math.min(Math.floor(frame * 0.7), url.length)
  const displayUrl = url.slice(0, typedChars)
  const cursorVisible = frame % 15 < 8
  const enterFlash = frame > 100 && frame < 106

  const exitOpacity = interpolate(frame, [135, 150], [1, 0], { extrapolateRight: 'clamp' })

  // Voiceover text overlay
  const voOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ opacity: exitOpacity }}>
      <AppShell
        statusText="ready"
        leftPanel={
          <div style={{ fontFamily: 'monospace', fontSize: 11 }}>
            <div style={{ color: '#f6821f', marginBottom: 8 }}>.: sessions</div>
            <div style={{ color: '#e8eaf6', fontSize: 10 }}>{'>'} New Session</div>
          </div>
        }
        centerPanel={
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
            <div style={{ color: '#6b6b8a', fontSize: 12, fontFamily: 'monospace' }}>
              Paste a GitHub URL to analyze a codebase.
            </div>
            <div style={{ borderTop: '1px solid #2a2a40', padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#f6821f', fontSize: 14, fontFamily: 'monospace' }}>~ $</span>
                <span style={{ color: '#e8eaf6', fontSize: 14, fontFamily: 'monospace' }}>
                  {displayUrl}
                  {typedChars < url.length && cursorVisible && <span style={{ color: '#f6821f' }}>|</span>}
                </span>
                {enterFlash && <span style={{ color: '#28c840', fontSize: 12, fontFamily: 'monospace', marginLeft: 8 }}>[send]</span>}
              </div>
            </div>
          </div>
        }
        rightPanel={
          <div style={{ padding: 16, fontFamily: 'monospace', color: '#6b6b8a', fontSize: 11, textAlign: 'center', marginTop: 60 }}>
            <div style={{ color: '#4a4a60', fontSize: 10 }}>mini-app will render here</div>
          </div>
        }
      />

      {/* Voiceover subtitle */}
      <div style={{
        position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center',
        opacity: voOpacity,
      }}>
        <span style={{
          background: 'rgba(0,0,0,0.7)', padding: '8px 24px', borderRadius: 8,
          color: '#e8eaf6', fontSize: 18, fontFamily: 'system-ui',
        }}>
          Paste any GitHub repo. That's it. One click.
        </span>
      </div>
    </AbsoluteFill>
  )
}
