import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'

export const SceneDemo: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const exitOpacity = interpolate(frame, [75, 90], [1, 0], { extrapolateRight: 'clamp' })

  // Simulated terminal typing
  const urlText = 'https://github.com/owner/repo'
  const typedChars = Math.min(Math.floor(frame * 0.8), urlText.length)
  const displayUrl = urlText.slice(0, typedChars)

  const analysisAppear = spring({ frame: frame - 30, fps, config: { damping: 15 } })
  const featuresAppear = spring({ frame: frame - 45, fps, config: { damping: 15 } })

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        opacity: exitOpacity,
      }}
    >
      {/* Terminal mockup */}
      <div
        style={{
          width: '100%',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid #2a2a40',
          background: '#0f0f1a',
        }}
      >
        {/* Title bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid #2a2a40' }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: '#ff5f57' }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: '#febc2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: '#28c840' }} />
        </div>

        {/* Terminal content */}
        <div style={{ padding: 24 }}>
          {/* URL input */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <span style={{ color: '#f6821f', fontSize: 20, fontFamily: 'JetBrains Mono, monospace' }}>~ $</span>
            <span style={{ color: '#e8eaf6', fontSize: 20, fontFamily: 'JetBrains Mono, monospace' }}>
              {displayUrl}
              {typedChars < urlText.length && (
                <span style={{ opacity: frame % 15 < 8 ? 1 : 0, color: '#f6821f' }}>|</span>
              )}
            </span>
          </div>

          {/* Analysis result */}
          {frame > 30 && (
            <div style={{ opacity: Math.min(analysisAppear, 1) }}>
              <div style={{ color: '#6b6b8a', fontSize: 16, marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>
                {'>'} Analyzing codebase...
              </div>
              <div style={{ color: '#28c840', fontSize: 18, fontFamily: 'JetBrains Mono, monospace' }}>
                Analysis complete! 6 features found.
              </div>
            </div>
          )}

          {/* Feature chips */}
          {frame > 45 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 16,
                opacity: Math.min(featuresAppear, 1),
              }}
            >
              {['Auth System', 'API Gateway', 'Data Pipeline', 'UI Components', 'Testing', 'CI/CD'].map((feat, i) => (
                <div
                  key={i}
                  style={{
                    background: '#f6821f15',
                    border: '1px solid #f6821f30',
                    borderRadius: 8,
                    padding: '6px 14px',
                    color: '#f6821f',
                    fontSize: 14,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {feat}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  )
}
