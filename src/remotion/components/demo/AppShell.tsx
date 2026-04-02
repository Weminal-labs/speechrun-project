import React from 'react'

// Recreates the SpeechRun 3-panel terminal chrome from the screenshots
export const AppShell: React.FC<{
  leftPanel?: React.ReactNode
  centerPanel?: React.ReactNode
  rightPanel?: React.ReactNode
  statusText?: string
}> = ({ leftPanel, centerPanel, rightPanel, statusText = 'ready' }) => {
  return (
    <div
      style={{
        width: 1720,
        height: 920,
        margin: '80px 100px',
        border: '1px solid #2a2a40',
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(22,22,42,0.85)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid #2a2a40',
          background: 'linear-gradient(to right, rgba(15,15,26,0.9), rgba(22,22,42,0.9))',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: '#ff5f57' }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: '#febc2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: '#28c840' }} />
        </div>
        <span style={{ color: '#6b6b8a', fontSize: 13, fontFamily: 'monospace' }}>speechrun — zsh</span>
        <div style={{ width: 52 }} />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2a2a40', background: 'rgba(15,15,26,0.5)' }}>
        <span style={{ flex: 1, textAlign: 'center', padding: '6px 0', fontSize: 11, color: '#6b6b8a', fontFamily: 'monospace' }}>Context</span>
        <span style={{ flex: 1, textAlign: 'center', padding: '6px 0', fontSize: 11, color: '#f6821f', borderBottom: '1px solid #f6821f', fontFamily: 'monospace' }}>Conversation</span>
        <span style={{ flex: 1, textAlign: 'center', padding: '6px 0', fontSize: 11, color: '#6b6b8a', fontFamily: 'monospace' }}>Sandbox</span>
      </div>

      {/* ASCII logo area */}
      <div style={{ padding: '8px 20px', borderBottom: '1px solid #2a2a40' }}>
        <div style={{ color: '#f6821f', fontSize: 28, fontWeight: 900, fontFamily: 'monospace', letterSpacing: 4 }}>
          SPEECHRUN
        </div>
        <div style={{ color: '#6b6b8a', fontSize: 10, fontFamily: 'monospace' }}>
          v0.1.0 · let your code do the talking · Cloudflare x ElevenLabs
        </div>
      </div>

      {/* 3-panel layout */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, borderTop: '1px solid #2a2a40' }}>
        {/* Left panel — Context */}
        <div style={{ width: '20%', borderRight: '1px solid #2a2a40', overflow: 'hidden', padding: 12 }}>
          {leftPanel}
        </div>
        {/* Center — Conversation */}
        <div style={{ width: '50%', borderRight: '1px solid #2a2a40', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Status bar */}
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #2a2a40', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: '#28c840' }} />
            <span style={{ color: '#6b6b8a', fontSize: 11, fontFamily: 'monospace' }}>.: {statusText}</span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', padding: 16 }}>
            {centerPanel}
          </div>
        </div>
        {/* Right — Sandbox */}
        <div style={{ width: '30%', overflow: 'hidden' }}>
          {rightPanel}
        </div>
      </div>
    </div>
  )
}
