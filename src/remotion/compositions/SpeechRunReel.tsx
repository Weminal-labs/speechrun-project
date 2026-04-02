import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  interpolate,
  Img,
  staticFile,
} from 'remotion'
import { SceneIntro } from '../components/SceneIntro'
import { SceneFeatures } from '../components/SceneFeatures'
import { SceneDemo } from '../components/SceneDemo'
import { SceneAgents } from '../components/SceneAgents'
import { SceneCTA } from '../components/SceneCTA'

// 15-second reel at 30fps = 450 frames
// Scene breakdown:
//   0-90    (3s)  Intro — logo + tagline
//   90-180  (3s)  Features — what it does
//   180-270 (3s)  Demo — paste URL, see analysis
//   270-360 (3s)  Agents — Nova & Aero podcast
//   360-450 (3s)  CTA — try it now

export const SpeechRunReel: React.FC = () => {
  const frame = useCurrentFrame()

  // Global background pulse
  const bgPulse = interpolate(Math.sin(frame * 0.03), [-1, 1], [0.85, 1])

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a14' }}>
      {/* GIF Background — always visible, dimmed */}
      <AbsoluteFill style={{ opacity: 0.15 * bgPulse }}>
        <Img
          src={staticFile('ascii-art_gif.gif')}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </AbsoluteFill>

      {/* Orange gradient overlay */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 30%, rgba(246,130,31,0.12) 0%, transparent 70%)`,
        }}
      />

      {/* Scenes */}
      <Sequence from={0} durationInFrames={90}>
        <SceneIntro />
      </Sequence>

      <Sequence from={90} durationInFrames={90}>
        <SceneFeatures />
      </Sequence>

      <Sequence from={180} durationInFrames={90}>
        <SceneDemo />
      </Sequence>

      <Sequence from={270} durationInFrames={90}>
        <SceneAgents />
      </Sequence>

      <Sequence from={360} durationInFrames={90}>
        <SceneCTA />
      </Sequence>

      {/* Scene transition flash */}
      {[90, 180, 270, 360].map((cutFrame) => {
        const dist = Math.abs(frame - cutFrame)
        const flash = dist < 4 ? interpolate(dist, [0, 4], [0.4, 0]) : 0
        return (
          <AbsoluteFill
            key={cutFrame}
            style={{
              backgroundColor: '#f6821f',
              opacity: flash,
              pointerEvents: 'none',
            }}
          />
        )
      })}
    </AbsoluteFill>
  )
}
