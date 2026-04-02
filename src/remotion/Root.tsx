import { Composition } from 'remotion'
import { SpeechRunReel } from './compositions/SpeechRunReel'
import { SpeechRunDemo } from './compositions/SpeechRunDemo'

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SpeechRunReel"
        component={SpeechRunReel}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="SpeechRunDemo"
        component={SpeechRunDemo}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  )
}
