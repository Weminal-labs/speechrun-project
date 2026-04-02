import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const logoScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } })
  const taglineOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' })
  const taglineY = interpolate(frame, [20, 40], [30, 0], { extrapolateRight: 'clamp' })
  const subtitleOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: 'clamp' })
  const exitOpacity = interpolate(frame, [75, 90], [1, 0], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        opacity: exitOpacity,
      }}
    >
      {/* Logo */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          marginBottom: 40,
        }}
      >
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          <rect width="120" height="120" rx="28" fill="#f6821f" />
          <path
            d="M35 85L60 35L85 85"
            stroke="white"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M43 70H77"
            stroke="white"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          color: '#f6821f',
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: -3,
          textAlign: 'center',
        }}
      >
        SPEECHRUN
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 28,
          color: '#e8eaf6',
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          marginTop: 20,
          fontFamily: 'system-ui',
          textAlign: 'center',
          padding: '0 60px',
          lineHeight: 1.4,
        }}
      >
        let your code do the talking
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 18,
          color: '#6b6b8a',
          opacity: subtitleOpacity,
          marginTop: 16,
          fontFamily: 'system-ui',
        }}
      >
        AI-powered code podcasts
      </div>
    </AbsoluteFill>
  )
}
