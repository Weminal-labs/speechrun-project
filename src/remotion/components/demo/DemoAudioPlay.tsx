import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import { AppShell } from './AppShell'

const WAVEFORM_BARS = 40

export const DemoAudioPlay: React.FC = () => {
  const frame = useCurrentFrame()
  const enterOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' })
  const exitOpacity = interpolate(frame, [270, 300], [1, 0], { extrapolateRight: 'clamp' })
  const opacity = Math.min(enterOpacity, exitOpacity)

  // Playhead moves across the waveform
  const playProgress = interpolate(frame, [30, 260], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Subtitle fade
  const subtitleOpacity = interpolate(frame, [40, 70], [0, 1], { extrapolateRight: 'clamp' })

  // Nova/Aero label swap at midpoint
  const showAero = frame > 160

  // Two voice labels appear
  const novaLabelOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' })
  const aeroLabelOpacity = interpolate(frame, [160, 180], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ opacity }}>
      <AppShell
        statusText="playing audio..."
        leftPanel={
          <div style={{ fontFamily: 'monospace', fontSize: 11 }}>
            <div style={{ color: '#f6821f', marginBottom: 8 }}>.: sessions</div>
            <div style={{ color: '#e8eaf6', fontSize: 10, marginBottom: 12 }}>{'>'} honojs/hono</div>
            <div style={{ marginBottom: 3 }}><span style={{ color: '#e8eaf6', fontSize: 10 }}>project/</span> <span style={{ color: '#6b6b8a', fontSize: 9 }}>hono</span></div>
            <div style={{ marginBottom: 3 }}><span style={{ color: '#e8eaf6', fontSize: 10 }}>turns/</span> <span style={{ color: '#28c840', fontSize: 9 }}>4 generated</span></div>
            <div style={{ marginBottom: 3 }}><span style={{ color: '#e8eaf6', fontSize: 10 }}>audio/</span> <span style={{ color: '#28c840', fontSize: 9 }}>ready</span></div>
            <div style={{ marginTop: 16, color: '#4a4a60', fontSize: 9 }}>voices</div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, opacity: novaLabelOpacity }}>
              <div style={{ width: 20, height: 20, borderRadius: 10, background: 'rgba(249,115,22,0.2)', border: '1px solid rgba(249,115,22,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#f97316', fontWeight: 700 }}>N</div>
              <span style={{ color: '#e8eaf6', fontSize: 10 }}>Nova</span>
              <span style={{ color: '#4a4a60', fontSize: 9 }}>Sarah</span>
            </div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, opacity: aeroLabelOpacity }}>
              <div style={{ width: 20, height: 20, borderRadius: 10, background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#a855f7', fontWeight: 700 }}>A</div>
              <span style={{ color: '#e8eaf6', fontSize: 10 }}>Aero</span>
              <span style={{ color: '#4a4a60', fontSize: 9 }}>Adam</span>
            </div>
          </div>
        }
        centerPanel={
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 20, fontFamily: 'monospace' }}>
            {/* Now playing label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 16,
                background: showAero ? 'rgba(168,85,247,0.2)' : 'rgba(249,115,22,0.2)',
                border: `1px solid ${showAero ? 'rgba(168,85,247,0.4)' : 'rgba(249,115,22,0.4)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                color: showAero ? '#a855f7' : '#f97316',
                transition: 'all 0.3s',
              }}>
                {showAero ? 'A' : 'N'}
              </div>
              <div>
                <div style={{ color: showAero ? '#a855f7' : '#f97316', fontSize: 12, fontWeight: 600 }}>
                  {showAero ? 'Aero' : 'Nova'}
                </div>
                <div style={{ color: '#4a4a60', fontSize: 9 }}>now speaking</div>
              </div>
              {/* Pulsing dot */}
              <div style={{
                width: 8, height: 8, borderRadius: 4,
                background: showAero ? '#a855f7' : '#f97316',
                opacity: frame % 20 < 10 ? 1 : 0.4,
                marginLeft: 4,
              }} />
            </div>

            {/* Waveform */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 60 }}>
              {Array.from({ length: WAVEFORM_BARS }).map((_, i) => {
                const position = i / WAVEFORM_BARS
                const isPlayed = position < playProgress
                const isActive = Math.abs(position - playProgress) < 0.05

                // Animated height — bars near playhead are taller
                const baseHeight = 8 + Math.sin(i * 0.7) * 12 + Math.sin(i * 1.3) * 8
                const activeBoost = isActive ? Math.abs(Math.sin(frame * 0.3 + i * 0.5)) * 20 : 0
                const barHeight = baseHeight + activeBoost

                const barColor = isPlayed
                  ? (showAero ? '#a855f7' : '#f97316')
                  : '#2a2a40'

                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: barHeight,
                      borderRadius: 2,
                      background: barColor,
                      opacity: isPlayed ? 1 : 0.4,
                      transition: 'height 0.05s',
                    }}
                  />
                )
              })}
            </div>

            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#6b6b8a', fontSize: 10 }}>
                {String(Math.floor(playProgress * 24 / 60)).padStart(2, '0')}:
                {String(Math.floor(playProgress * 24) % 60).padStart(2, '0')}
              </span>
              <div style={{ flex: 1, height: 3, background: '#2a2a40', borderRadius: 2, position: 'relative' }}>
                <div style={{ width: `${playProgress * 100}%`, height: '100%', background: showAero ? '#a855f7' : '#f97316', borderRadius: 2 }} />
                <div style={{
                  position: 'absolute', top: -4, left: `${playProgress * 100}%`,
                  width: 10, height: 10, borderRadius: 5,
                  background: showAero ? '#a855f7' : '#f97316',
                  transform: 'translateX(-50%)',
                  boxShadow: `0 0 6px ${showAero ? '#a855f7' : '#f97316'}`,
                }} />
              </div>
              <span style={{ color: '#6b6b8a', fontSize: 10 }}>0:24</span>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
              <div style={{ color: '#4a4a60', fontSize: 16 }}>⏮</div>
              <div style={{
                width: 44, height: 44, borderRadius: 22,
                background: showAero ? 'rgba(168,85,247,0.2)' : 'rgba(249,115,22,0.2)',
                border: `1px solid ${showAero ? 'rgba(168,85,247,0.4)' : 'rgba(249,115,22,0.4)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>
                <span style={{ color: showAero ? '#a855f7' : '#f97316' }}>▶</span>
              </div>
              <div style={{ color: '#4a4a60', fontSize: 16 }}>⏭</div>
            </div>
          </div>
        }
        rightPanel={
          <div style={{ padding: 16, fontFamily: 'monospace' }}>
            <div style={{ background: '#f6821f', borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'system-ui' }}>honojs/hono</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontFamily: 'system-ui', marginTop: 2 }}>Lightweight web framework for the Edge</div>
            </div>
            <div style={{ color: '#4a4a60', fontSize: 9, marginBottom: 8 }}>transcript</div>
            {[
              { speaker: 'N', text: 'RegExpRouter compiles all routes into a single regex at startup...', color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.15)' },
              { speaker: 'A', text: 'O(1) matching regardless of route count — that\'s the key insight.', color: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.15)' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, opacity: interpolate(frame, [20 + i * 40, 40 + i * 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
                <div style={{ width: 18, height: 18, borderRadius: 9, background: item.bg, border: `1px solid ${item.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: item.color, fontWeight: 700, flexShrink: 0 }}>{item.speaker}</div>
                <div style={{ background: item.bg, border: `1px solid ${item.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 9, color: '#e8eaf6', lineHeight: 1.4 }}>{item.text}</div>
              </div>
            ))}
          </div>
        }
      />

      {/* Subtitle */}
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', opacity: subtitleOpacity }}>
        <span style={{ background: 'rgba(0,0,0,0.7)', padding: '8px 24px', borderRadius: 8, color: '#e8eaf6', fontSize: 18, fontFamily: 'system-ui' }}>
          Two distinct AI voices. Real analysis. Not a summary — a conversation.
        </span>
      </div>
    </AbsoluteFill>
  )
}
