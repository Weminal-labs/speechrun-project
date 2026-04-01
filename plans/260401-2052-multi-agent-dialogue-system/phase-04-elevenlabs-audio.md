# Phase 4: ElevenLabs Audio Generation + R2 Storage

## Context Links
- [ElevenLabs TTS API](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [System Architecture: Audio Generation](../../docs/system-architecture.md)
- [Phase 3: Dialogue](phase-03-multi-agent-dialogue.md)

## Overview
- **Priority:** P1
- **Status:** Pending
- **Effort:** 2h
- **Blocked by:** Phase 3
- **Description:** Convert each dialogue turn to audio via ElevenLabs TTS, store in R2, deliver audio URLs to frontend.

## Key Insights
- ElevenLabs TTS: POST per turn, returns audio binary (mp3_44100_128)
- Two distinct voice IDs needed (one per agent persona)
- R2 stores audio files; public bucket URL for playback (no signed URLs needed for MVP)
- Batch TTS after dialogue completes (simpler than per-turn during dialogue)
- Fallback: if TTS fails, dialogue remains text-only (graceful degradation)

## Requirements

### Functional
- Call ElevenLabs TTS for each dialogue turn
- Two distinct voices: Nova (warm, authoritative) and Aero (energetic, technical)
- Store MP3 files in R2 bucket with structured paths
- Add `audioUrl` to each `DialogueTurn` after TTS
- Broadcast audio URLs to frontend as each turn's audio is ready
- Graceful degradation: text-only if TTS fails

### Non-Functional
- TTS latency per turn: < 5s
- Total audio generation for 10 turns: < 60s
- Audio quality: mp3_44100_128 (ElevenLabs default)

## Related Code Files

| Action | File |
|--------|------|
| Create | `worker/utils/elevenlabs-client.ts` |
| Modify | `worker/agents/orchestrator.ts` (add audio generation step) |

## Architecture: Audio Pipeline

```
Orchestrator (after dialogue loop)
    ↓
status = 'generating-audio'
    ↓
For each turn:
    ├─ ElevenLabs TTS API (text → mp3 binary)
    │   voice_id = NOVA_VOICE_ID or AERO_VOICE_ID
    ├─ Upload to R2: podcasts/{sessionId}/turn-{n}.mp3
    ├─ turn.audioUrl = R2 public URL
    └─ Broadcast updated turn to frontend
    ↓
status = 'complete'
```

## Implementation Steps

### 1. Create `worker/utils/elevenlabs-client.ts`

```typescript
const ELEVENLABS_API = 'https://api.elevenlabs.io/v1'

// Voice IDs — pick from ElevenLabs voice library
// Nova: warm female voice; Aero: energetic male voice
const VOICE_IDS: Record<'nova' | 'aero', string> = {
  nova: 'EXAVITQu4vr4xnSDxMaL', // Sarah (default, swap for preferred)
  aero: 'TX3LPaxmHKxFdv7VOQHJ', // Liam (default, swap for preferred)
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
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${error}`)
  }

  return response.arrayBuffer()
}
```

### 2. Add audio upload helper

```typescript
export async function uploadAudioToR2(
  bucket: R2Bucket,
  sessionId: string,
  turnIndex: number,
  audioData: ArrayBuffer
): Promise<string> {
  const key = `podcasts/${sessionId}/turn-${String(turnIndex).padStart(2, '0')}.mp3`

  await bucket.put(key, audioData, {
    httpMetadata: { contentType: 'audio/mpeg' },
  })

  return key
}
```

### 3. Add audio generation to Orchestrator

After `runDialogue()` completes, add `generateAudio()` step:

```typescript
private async generateAudio(): Promise<void> {
  this.state.status = 'generating-audio'
  this.setState(this.state)

  const sessionId = this.name // unique per generation

  for (let i = 0; i < this.state.turns.length; i++) {
    const turn = this.state.turns[i]

    try {
      const audioData = await generateSpeech({
        text: turn.text,
        speaker: turn.speaker,
        apiKey: this.env.ELEVENLABS_API_KEY,
      })

      const key = await uploadAudioToR2(
        this.env.AUDIO_BUCKET,
        sessionId,
        i,
        audioData
      )

      // R2 public URL pattern (configure custom domain or use default)
      turn.audioUrl = `/api/audio/${key}`
      this.state.turns[i] = turn
      this.setState(this.state) // broadcast each audio URL as ready

    } catch (error) {
      // Graceful degradation: turn stays text-only
      console.error(`TTS failed for turn ${i}:`, error)
    }
  }

  this.state.status = 'complete'
  this.setState(this.state)
}
```

### 4. Add audio serving endpoint

In `worker/index.ts`, add route to serve R2 audio:

```typescript
if (url.pathname.startsWith('/api/audio/')) {
  const key = url.pathname.replace('/api/audio/', '')
  const object = await env.AUDIO_BUCKET.get(key)
  if (!object) return new Response('Not found', { status: 404 })

  return new Response(object.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
```

### 5. Wire startGeneration flow

Update `Orchestrator.startGeneration()` to call phases sequentially:

```typescript
@callable()
async startGeneration(repoUrl: string): Promise<GenerationResult> {
  try {
    await this.ingestRepo(repoUrl)    // Phase 2
    await this.runDialogue()           // Phase 3
    await this.generateAudio()         // Phase 4
    return { success: true, turnCount: this.state.turns.length }
  } catch (error) {
    this.state.status = 'error'
    this.state.error = error instanceof Error ? error.message : 'Unknown error'
    this.setState(this.state)
    return { success: false, turnCount: 0, error: this.state.error }
  }
}
```

## Todo List

- [ ] Create worker/utils/elevenlabs-client.ts with TTS and R2 upload
- [ ] Select voice IDs for Nova and Aero from ElevenLabs library
- [ ] Implement Orchestrator.generateAudio() with per-turn TTS
- [ ] Add /api/audio/* route for R2 audio serving
- [ ] Handle TTS failures gracefully (text-only fallback)
- [ ] Wire full pipeline: ingest → dialogue → audio
- [ ] Test with real ElevenLabs API key
- [ ] Verify audio files stored in R2 and playable
- [ ] Confirm audio URLs broadcast to frontend

## Success Criteria
- Each turn has an MP3 audio file in R2
- Audio files are playable via `/api/audio/...` URLs
- Nova and Aero have distinct voices
- TTS failure on one turn doesn't block others
- Full pipeline (ingest + dialogue + audio) completes end-to-end

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ElevenLabs API key invalid/expired | Medium | High | Verify key on startup; clear error message |
| ElevenLabs rate limit on 10 sequential calls | Low | Medium | Small delay between calls; retry with backoff |
| R2 upload fails | Low | Medium | Retry once; fall back to text-only |
| Audio quality inconsistent between turns | Low | Low | Fixed voice_settings; test with sample text |
| ElevenLabs costs exceed hackathon credits | Medium | Medium | Monitor usage; cap generations if needed |

## Security Considerations
- ELEVENLABS_API_KEY stored as wrangler secret only
- R2 audio served through worker (not direct public bucket URL) for access control
- No user-generated content in TTS (only LLM-generated dialogue)
- Audio files auto-expire (future: R2 lifecycle policy)
