import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, Img, staticFile } from 'remotion'
import { DemoIntro } from '../components/demo/DemoIntro'
import { DemoURLInput } from '../components/demo/DemoURLInput'
import { DemoProcessing } from '../components/demo/DemoProcessing'
import { DemoConversation } from '../components/demo/DemoConversation'
import { DemoAudioPlay } from '../components/demo/DemoAudioPlay'
import { DemoCTA } from '../components/demo/DemoCTA'

// 60 seconds at 30fps = 1800 frames
// Scene breakdown:
//   0-300    (10s)  Intro — logo, tagline, "let your code do the talking"
//   300-450  (5s)   URL Input — typing github URL
//   450-600  (5s)   Processing — status updates, sidebar populating
//   600-1050 (15s)  Conversation — Nova & Aero chatting with messages appearing
//   1050-1350(10s)  Audio Playback — audio player, waveform, voices playing
//   1350-1800(15s)  CTA — philosophy + try it

export const SpeechRunDemo: React.FC = () => {
  const frame = useCurrentFrame()
  const bgPulse = interpolate(Math.sin(frame * 0.02), [-1, 1], [0.08, 0.14])

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a14' }}>
      {/* GIF Background */}
      <AbsoluteFill style={{ opacity: bgPulse }}>
        <Img
          src={staticFile('ascii-art_gif.gif')}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>

      {/* Dark overlay for readability */}
      <AbsoluteFill style={{ background: 'rgba(10,10,20,0.7)' }} />

      {/* Orange ambient */}
      <AbsoluteFill
        style={{ background: 'radial-gradient(ellipse at 70% 40%, rgba(246,130,31,0.06) 0%, transparent 60%)' }}
      />

      <Sequence from={0} durationInFrames={300}>
        <DemoIntro />
      </Sequence>

      <Sequence from={300} durationInFrames={150}>
        <DemoURLInput />
      </Sequence>

      <Sequence from={450} durationInFrames={150}>
        <DemoProcessing />
      </Sequence>

      <Sequence from={600} durationInFrames={450}>
        <DemoConversation />
      </Sequence>

      <Sequence from={1050} durationInFrames={300}>
        <DemoAudioPlay />
      </Sequence>

      <Sequence from={1350} durationInFrames={450}>
        <DemoCTA />
      </Sequence>

      {/* Scene transition flashes */}
      {[300, 450, 600, 1050, 1350].map((cut) => {
        const dist = Math.abs(frame - cut)
        const flash = dist < 3 ? interpolate(dist, [0, 3], [0.3, 0]) : 0
        return (
          <AbsoluteFill
            key={cut}
            style={{ backgroundColor: '#f6821f', opacity: flash, pointerEvents: 'none' }}
          />
        )
      })}
    </AbsoluteFill>
  )
}
