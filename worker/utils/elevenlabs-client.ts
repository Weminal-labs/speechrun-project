const ELEVENLABS_API = 'https://api.elevenlabs.io/v1'

// Default voice IDs from ElevenLabs library
// Nova: warm, authoritative female voice; Aero: energetic male voice
const VOICE_IDS: Record<'nova' | 'aero', string> = {
  nova: 'EXAVITQu4vr4xnSDxMaL', // Sarah
  aero: 'TX3LPaxmHKxFdv7VOQHJ', // Liam
}

interface TTSOptions {
  text: string
  speaker: 'nova' | 'aero'
  apiKey: string
}

export async function generateSpeech(options: TTSOptions): Promise<ArrayBuffer> {
  const { text, speaker, apiKey } = options
  const voiceId = VOICE_IDS[speaker]

  const response = await fetch(
    `${ELEVENLABS_API}/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
        },
      }),
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${error}`)
  }

  return response.arrayBuffer()
}

export async function uploadAudioToR2(
  bucket: R2Bucket,
  sessionId: string,
  turnIndex: number,
  audioData: ArrayBuffer,
): Promise<string> {
  const key = `podcasts/${sessionId}/turn-${String(turnIndex).padStart(2, '0')}.mp3`

  await bucket.put(key, audioData, {
    httpMetadata: { contentType: 'audio/mpeg' },
  })

  return key
}
