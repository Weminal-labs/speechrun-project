import type { SpeechRunSession } from './do/session'

declare global {
  interface Env {
    SPEECHRUN_SESSION: DurableObjectNamespace<SpeechRunSession>
    AI: Ai
    AUDIO: R2Bucket
    GITHUB_TOKEN?: string
    ELEVENLABS_API_KEY: string
  }
}
