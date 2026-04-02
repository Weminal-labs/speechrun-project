const ELEVENLABS_API = 'https://api.elevenlabs.io/v1'

// Default voice IDs from ElevenLabs library
// Nova: warm, authoritative female voice; Aero: energetic male voice
const VOICE_IDS: Record<'nova' | 'aero', string> = {
  nova: 'EXAVITQu4vr4xnSDxMaL', // Sarah
  aero: 'TX3LPaxmHKxFdv7VOQHJ', // Liam
}

// --- Text-to-Dialogue API (single call for full episode) ---

interface DialogueAudioOptions {
  turns: Array<{ text: string; speaker: 'nova' | 'aero' }>
  apiKey: string
  modelId?: string
  outputFormat?: string
}

export async function generateDialogueAudio(options: DialogueAudioOptions): Promise<ArrayBuffer> {
  const {
    turns,
    apiKey,
    modelId = 'eleven_multilingual_v2',
    outputFormat = 'mp3_44100_128',
  } = options

  const inputs = turns.map((turn) => ({
    text: turn.text,
    voice_id: VOICE_IDS[turn.speaker],
  }))

  const url = `${ELEVENLABS_API}/text-to-dialogue${outputFormat ? `?output_format=${outputFormat}` : ''}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      inputs,
      model_id: modelId,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ElevenLabs Dialogue TTS failed (${response.status}): ${error}`)
  }

  return response.arrayBuffer()
}

// --- Legacy per-turn TTS (kept as fallback) ---

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
  key: string,
  audioData: ArrayBuffer,
): Promise<string> {
  const objectKey = `podcasts/${sessionId}/${key}`

  await bucket.put(objectKey, audioData, {
    httpMetadata: { contentType: 'audio/mpeg' },
  })

  return objectKey
}
