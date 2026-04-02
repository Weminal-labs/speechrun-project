declare global {
  interface Env {
    AI: Ai
    ORCHESTRATOR: DurableObjectNamespace
    NOVA: DurableObjectNamespace
    AERO: DurableObjectNamespace
    AUDIO_BUCKET?: R2Bucket
    GITHUB_TOKEN?: string
    ELEVENLABS_API_KEY?: string
  }
}

export {}
