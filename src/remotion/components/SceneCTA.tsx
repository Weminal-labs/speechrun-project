import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'

export const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleScale = spring({ frame, fps, config: { damping: 10, mass: 0.6 } })
  const urlOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' })
  const taglineOpacity = interpolate(frame, [35, 50], [0, 1], { extrapolateRight: 'clamp' })

  // Pulsing glow
  const glowOpacity = interpolate(Math.sin(frame * 0.1), [-1, 1], [0.3, 0.7])

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 60,
      }}
    >
      {/* Radial glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(246,130,31,${glowOpacity * 0.15}) 0%, transparent 60%)`,
        }}
      />

      <div
        style={{
          transform: `scale(${titleScale})`,
          fontSize: 56,
          fontWeight: 900,
          color: '#f6821f',
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: -2,
          textAlign: 'center',
          marginBottom: 30,
        }}
      >
        let your code
        <br />
        do the talking
      </div>

      <div
        style={{
          fontSize: 22,
          color: '#e8eaf6',
          opacity: taglineOpacity,
          textAlign: 'center',
          fontFamily: 'system-ui',
          lineHeight: 1.6,
          marginBottom: 40,
          padding: '0 20px',
        }}
      >
        Paste a repo. Get a podcast.
        <br />
        AI agents discuss your code.
      </div>

      {/* CTA button */}
      <div
        style={{
          opacity: urlOpacity,
          background: 'linear-gradient(135deg, #f6821f, #e55d0a)',
          borderRadius: 16,
          padding: '18px 48px',
          boxShadow: `0 8px 32px rgba(246,130,31,${glowOpacity * 0.4})`,
        }}
      >
        <span
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#fff',
            fontFamily: 'system-ui',
          }}
        >
          Try SpeechRun
        </span>
      </div>

      <div
        style={{
          marginTop: 30,
          fontSize: 16,
          color: '#6b6b8a',
          opacity: urlOpacity,
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        speechrun.dev
      </div>

      {/* Built with badges */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginTop: 40,
          opacity: taglineOpacity,
        }}
      >
        {['Cloudflare Workers', 'ElevenLabs', 'Workers AI'].map((tech) => (
          <div
            key={tech}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '6px 12px',
              color: '#6b6b8a',
              fontSize: 12,
              fontFamily: 'system-ui',
            }}
          >
            {tech}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}
