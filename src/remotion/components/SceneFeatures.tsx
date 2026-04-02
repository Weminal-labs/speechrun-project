import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'

const FEATURES = [
  { icon: '{}', label: 'Paste any GitHub repo', color: '#f6821f' },
  { icon: 'AI', label: 'AI analyzes your code', color: '#a855f7' },
  { icon: '\u266B', label: 'Nova & Aero discuss it', color: '#22c55e' },
  { icon: '\u25B6', label: 'Listen as a podcast', color: '#3b82f6' },
]

export const SceneFeatures: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' })
  const exitOpacity = interpolate(frame, [75, 90], [1, 0], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 60,
        opacity: exitOpacity,
      }}
    >
      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          color: '#f6821f',
          opacity: titleOpacity,
          marginBottom: 60,
          fontFamily: 'system-ui',
          textAlign: 'center',
        }}
      >
        How it works
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 30, width: '100%' }}>
        {FEATURES.map((feat, i) => {
          const delay = 10 + i * 12
          const scale = spring({ frame: frame - delay, fps, config: { damping: 12 } })
          const opacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                opacity,
                transform: `scale(${Math.min(scale, 1)})`,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 20,
                padding: '24px 32px',
                border: `1px solid ${feat.color}30`,
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 16,
                  background: `${feat.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  fontWeight: 700,
                  color: feat.color,
                  fontFamily: 'JetBrains Mono, monospace',
                  flexShrink: 0,
                }}
              >
                {feat.icon}
              </div>
              <div
                style={{
                  fontSize: 26,
                  color: '#e8eaf6',
                  fontFamily: 'system-ui',
                  fontWeight: 500,
                }}
              >
                {feat.label}
              </div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
