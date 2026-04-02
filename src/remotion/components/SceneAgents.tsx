import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'

export const SceneAgents: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const exitOpacity = interpolate(frame, [75, 90], [1, 0], { extrapolateRight: 'clamp' })

  const novaAppear = spring({ frame: frame - 5, fps, config: { damping: 12 } })
  const aeroAppear = spring({ frame: frame - 30, fps, config: { damping: 12 } })
  const waveAppear = spring({ frame: frame - 55, fps, config: { damping: 12 } })

  // Audio waveform animation
  const waveHeights = Array.from({ length: 30 }, (_, i) => {
    const base = Math.sin((frame + i * 4) * 0.15) * 0.5 + 0.5
    return 8 + base * 32
  })

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 50,
        opacity: exitOpacity,
      }}
    >
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: '#e8eaf6',
          marginBottom: 50,
          fontFamily: 'system-ui',
          textAlign: 'center',
        }}
      >
        AI Podcast Hosts
      </div>

      {/* Nova */}
      <div
        style={{
          display: 'flex',
          gap: 20,
          alignItems: 'flex-start',
          marginBottom: 30,
          opacity: Math.min(novaAppear, 1),
          transform: `translateX(${interpolate(Math.min(novaAppear, 1), [0, 1], [-40, 0])}px)`,
          width: '100%',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            background: 'rgba(249,115,22,0.2)',
            border: '2px solid rgba(249,115,22,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 700,
            color: '#f97316',
            flexShrink: 0,
          }}
        >
          N
        </div>
        <div
          style={{
            background: 'rgba(249,115,22,0.08)',
            border: '1px solid rgba(249,115,22,0.15)',
            borderRadius: 20,
            borderTopLeftRadius: 4,
            padding: '16px 22px',
            flex: 1,
          }}
        >
          <div style={{ color: '#f97316', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Nova</div>
          <div style={{ color: '#e8eaf6', fontSize: 20, lineHeight: 1.5, fontFamily: 'system-ui' }}>
            This project has a really clean architecture. Let me walk you through the key decisions...
          </div>
        </div>
      </div>

      {/* Aero */}
      <div
        style={{
          display: 'flex',
          gap: 20,
          alignItems: 'flex-start',
          marginBottom: 40,
          opacity: Math.min(aeroAppear, 1),
          transform: `translateX(${interpolate(Math.min(aeroAppear, 1), [0, 1], [40, 0])}px)`,
          width: '100%',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            background: 'rgba(168,85,247,0.2)',
            border: '2px solid rgba(168,85,247,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 700,
            color: '#a855f7',
            flexShrink: 0,
          }}
        >
          A
        </div>
        <div
          style={{
            background: 'rgba(168,85,247,0.08)',
            border: '1px solid rgba(168,85,247,0.15)',
            borderRadius: 20,
            borderTopLeftRadius: 4,
            padding: '16px 22px',
            flex: 1,
          }}
        >
          <div style={{ color: '#a855f7', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Aero</div>
          <div style={{ color: '#e8eaf6', fontSize: 20, lineHeight: 1.5, fontFamily: 'system-ui' }}>
            The use of TypeScript here is solid. Love the monorepo setup with clean module boundaries!
          </div>
        </div>
      </div>

      {/* Audio waveform */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          opacity: Math.min(waveAppear, 1),
          height: 50,
        }}
      >
        {waveHeights.map((h, i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: h,
              borderRadius: 2,
              background: `linear-gradient(to top, #f6821f, #a855f7)`,
              opacity: 0.6 + Math.sin((frame + i) * 0.2) * 0.4,
            }}
          />
        ))}
      </div>

      <div style={{ color: '#6b6b8a', fontSize: 16, marginTop: 16, fontFamily: 'system-ui' }}>
        Powered by ElevenLabs voices
      </div>
    </AbsoluteFill>
  )
}
