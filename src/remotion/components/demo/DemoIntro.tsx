import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'

export const DemoIntro: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const logoScale = spring({ frame: frame - 10, fps, config: { damping: 12 } })
  const titleOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: 'clamp' })
  const titleY = interpolate(frame, [30, 50], [20, 0], { extrapolateRight: 'clamp' })
  const taglineOpacity = interpolate(frame, [70, 90], [0, 1], { extrapolateRight: 'clamp' })
  const subtitleOpacity = interpolate(frame, [120, 150], [0, 1], { extrapolateRight: 'clamp' })
  const exitOpacity = interpolate(frame, [270, 300], [1, 0], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: exitOpacity }}>
      <div style={{ transform: `scale(${logoScale})`, marginBottom: 30 }}>
        <svg width="80" height="80" viewBox="0 0 120 120" fill="none">
          <rect width="120" height="120" rx="28" fill="#f6821f" />
          <path d="M35 85L60 35L85 85" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M43 70H77" stroke="white" strokeWidth="6" strokeLinecap="round" />
        </svg>
      </div>

      <div style={{ fontSize: 64, fontWeight: 900, color: '#f6821f', fontFamily: 'JetBrains Mono, monospace', letterSpacing: -2, opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
        SPEECHRUN
      </div>

      <div style={{ fontSize: 28, color: '#e8eaf6', opacity: taglineOpacity, marginTop: 16, fontFamily: 'system-ui', fontWeight: 300 }}>
        let your code do the talking
      </div>

      <div style={{ fontSize: 16, color: '#6b6b8a', opacity: subtitleOpacity, marginTop: 30, fontFamily: 'system-ui', display: 'flex', gap: 20 }}>
        <span>Cloudflare Workers</span>
        <span style={{ color: '#2a2a40' }}>|</span>
        <span>Workers AI</span>
        <span style={{ color: '#2a2a40' }}>|</span>
        <span>ElevenLabs</span>
      </div>
    </AbsoluteFill>
  )
}
