import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'

const PHILOSOPHY_LINES = [
  'Code has a story to tell.',
  'Not in docs. Not in READMEs.',
  'In the architecture. The trade-offs. The decisions.',
]

export const DemoCTA: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const enterOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' })

  // Logo entrance
  const logoScale = spring({ frame: frame - 20, fps, config: { damping: 14 } })
  const logoOpacity = interpolate(frame, [20, 50], [0, 1], { extrapolateRight: 'clamp' })

  // Philosophy lines stagger
  const line1Opacity = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: 'clamp' })
  const line2Opacity = interpolate(frame, [110, 140], [0, 1], { extrapolateRight: 'clamp' })
  const line3Opacity = interpolate(frame, [160, 190], [0, 1], { extrapolateRight: 'clamp' })
  const lineOpacities = [line1Opacity, line2Opacity, line3Opacity]

  const line1Y = interpolate(frame, [60, 90], [16, 0], { extrapolateRight: 'clamp' })
  const line2Y = interpolate(frame, [110, 140], [16, 0], { extrapolateRight: 'clamp' })
  const line3Y = interpolate(frame, [160, 190], [16, 0], { extrapolateRight: 'clamp' })
  const lineYs = [line1Y, line2Y, line3Y]

  // Tagline
  const taglineOpacity = interpolate(frame, [210, 250], [0, 1], { extrapolateRight: 'clamp' })

  // CTA button
  const ctaScale = spring({ frame: frame - 270, fps, config: { damping: 12 } })
  const ctaOpacity = interpolate(frame, [270, 300], [0, 1], { extrapolateRight: 'clamp' })

  // URL line
  const urlOpacity = interpolate(frame, [320, 360], [0, 1], { extrapolateRight: 'clamp' })

  // Powered by line
  const poweredOpacity = interpolate(frame, [370, 410], [0, 1], { extrapolateRight: 'clamp' })

  // Pulse on CTA
  const ctaPulse = interpolate(Math.sin(frame * 0.08), [-1, 1], [0.8, 1.05])

  return (
    <AbsoluteFill style={{ opacity: enterOpacity, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0 }}>

      {/* Logo */}
      <div style={{ opacity: logoOpacity, transform: `scale(${logoScale})`, marginBottom: 24 }}>
        <svg width="64" height="64" viewBox="0 0 120 120" fill="none">
          <rect width="120" height="120" rx="28" fill="#f6821f" />
          <path d="M35 85L60 35L85 85" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M43 70H77" stroke="white" strokeWidth="6" strokeLinecap="round" />
        </svg>
      </div>

      {/* Philosophy lines */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        {PHILOSOPHY_LINES.map((line, i) => (
          <div
            key={i}
            style={{
              fontSize: i === 0 ? 38 : i === 1 ? 34 : 38,
              fontWeight: i === 2 ? 700 : 300,
              color: i === 2 ? '#f6821f' : '#e8eaf6',
              fontFamily: i === 2 ? 'JetBrains Mono, monospace' : 'system-ui',
              letterSpacing: i === 0 ? 0 : i === 2 ? -1 : 0,
              opacity: lineOpacities[i],
              transform: `translateY(${lineYs[i]}px)`,
              marginBottom: 8,
              lineHeight: 1.2,
            }}
          >
            {line}
          </div>
        ))}
      </div>

      {/* Tagline */}
      <div style={{
        fontSize: 20,
        color: '#6b6b8a',
        fontFamily: 'system-ui',
        opacity: taglineOpacity,
        marginBottom: 48,
        letterSpacing: 1,
        textTransform: 'uppercase',
      }}>
        SpeechRun turns that story into audio.
      </div>

      {/* CTA Button */}
      <div style={{
        opacity: ctaOpacity,
        transform: `scale(${Math.min(ctaScale, 1) * ctaPulse})`,
        marginBottom: 32,
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #f6821f 0%, #e8620f 100%)',
          borderRadius: 16,
          padding: '20px 56px',
          cursor: 'pointer',
          boxShadow: '0 8px 40px rgba(246,130,31,0.4)',
        }}>
          <div style={{
            color: '#fff',
            fontSize: 28,
            fontWeight: 700,
            fontFamily: 'system-ui',
            letterSpacing: -0.5,
          }}>
            Try SpeechRun →
          </div>
        </div>
      </div>

      {/* URL */}
      <div style={{ opacity: urlOpacity, marginBottom: 24 }}>
        <span style={{
          color: '#f6821f',
          fontSize: 16,
          fontFamily: 'JetBrains Mono, monospace',
          background: 'rgba(246,130,31,0.08)',
          border: '1px solid rgba(246,130,31,0.2)',
          borderRadius: 8,
          padding: '8px 20px',
        }}>
          speechrun.phanhoangvinhhien.workers.dev
        </span>
      </div>

      {/* Powered by */}
      <div style={{
        opacity: poweredOpacity,
        display: 'flex',
        gap: 24,
        color: '#4a4a60',
        fontSize: 13,
        fontFamily: 'system-ui',
        alignItems: 'center',
      }}>
        <span>Cloudflare Workers</span>
        <span style={{ color: '#2a2a40' }}>·</span>
        <span>Workers AI</span>
        <span style={{ color: '#2a2a40' }}>·</span>
        <span>ElevenLabs</span>
        <span style={{ color: '#2a2a40' }}>·</span>
        <span>Durable Objects</span>
      </div>
    </AbsoluteFill>
  )
}
