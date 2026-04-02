import { Agent, callable } from 'agents'
import type { Connection } from 'agents'
import type {
  Env, OrchestratorState, ChatMessage, StructuredContext,
  DialogueTurn, StreamEvent, AutonomousConfig,
} from '../types'
import { parseGithubUrl, fetchRepoMetadata, fetchFileTree, fetchMultipleFiles } from '../utils/github-client'
import { selectKeyFiles } from '../utils/file-selector'
import {
  STRUCTURED_CONTEXT_PROMPT, NOVA_SYSTEM_PROMPT, AERO_SYSTEM_PROMPT,
  AUTONOMOUS_NOVA_PROMPT, AUTONOMOUS_AERO_PROMPT, TOPIC_GENERATION_PROMPT,
} from '../utils/prompts'
import { generateSpeech } from '../utils/elevenlabs-client'

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function extractGithubUrl(text: string): string | null {
  const match = text.match(/https?:\/\/github\.com\/[^\s]+/)
  return match ? match[0] : null
}

function systemMessage(content: string, type?: ChatMessage['metadata']): ChatMessage {
  return { id: makeId(), role: 'system', content, timestamp: Date.now(), metadata: type }
}

function extractJson(text: string): string | null {
  let cleaned = text.trim()
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
  if (fenceMatch) cleaned = fenceMatch[1].trim()
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1)
  }
  return cleaned || null
}

function parseStructuredContext(text: string): StructuredContext | null {
  const jsonStr = extractJson(text)
  if (!jsonStr) return null
  try {
    const parsed = JSON.parse(jsonStr)
    return {
      project: {
        name: parsed.project?.name || 'Unknown',
        summary: parsed.project?.summary || '',
        purpose: parsed.project?.purpose || '',
        primaryLanguage: parsed.project?.primaryLanguage || 'Unknown',
        stars: parsed.project?.stars,
      },
      stack: Array.isArray(parsed.stack) ? parsed.stack.map((s: Record<string, string>) => ({
        name: s.name || '',
        role: s.role || '',
        category: ['frontend', 'backend', 'database', 'infrastructure', 'tooling', 'testing'].includes(s.category) ? s.category : 'tooling',
      })) : [],
      features: Array.isArray(parsed.features) ? parsed.features.map((f: Record<string, unknown>) => ({
        id: (f.id as string) || 'unknown',
        name: (f.name as string) || '',
        description: (f.description as string) || '',
        complexity: ['low', 'medium', 'high'].includes(f.complexity as string) ? f.complexity : 'medium',
        relatedFiles: Array.isArray(f.relatedFiles) ? f.relatedFiles : [],
      })) : [],
      architecture: {
        pattern: parsed.architecture?.pattern || '',
        description: parsed.architecture?.description || '',
        layers: Array.isArray(parsed.architecture?.layers) ? parsed.architecture.layers : [],
        dataFlow: parsed.architecture?.dataFlow || '',
      },
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions.map((d: Record<string, string>) => ({
        title: d.title || '',
        rationale: d.rationale || '',
        tradeoff: d.tradeoff || '',
      })) : [],
      quality: {
        strengths: Array.isArray(parsed.quality?.strengths) ? parsed.quality.strengths : [],
        concerns: Array.isArray(parsed.quality?.concerns) ? parsed.quality.concerns : [],
        overall: parsed.quality?.overall || '',
      },
    } as StructuredContext
  } catch {
    return null
  }
}

export class Orchestrator extends Agent<Env, OrchestratorState> {
  initialState: OrchestratorState = {
    sessionId: '',
    messages: [],
    status: 'idle',
    context: null,
    turns: [],
    error: null,
    activeFeatureId: null,
    autonomousConfig: null,
    currentTopic: null,
    topicIndex: 0,
  }

  // Autonomous mode cancellation flag
  private _autonomousCancelled = false
  // Audio playback sync callbacks
  private _audioFinishedCallbacks = new Map<string, () => void>()

  private addMessage(msg: ChatMessage) {
    this.setState({ ...this.state, messages: [...this.state.messages, msg] })
  }

  // Broadcast a stream event to all connected clients via raw WebSocket
  private broadcastEvent(event: StreamEvent) {
    const data = JSON.stringify(event)
    for (const connection of this.getConnections()) {
      try {
        connection.send(data)
      } catch { /* connection may be closing */ }
    }
  }

  // Handle raw WebSocket messages from clients (e.g., audio-finished signals)
  onMessage(_connection: Connection, data: string | ArrayBuffer) {
    if (typeof data !== 'string') return
    try {
      const msg = JSON.parse(data)
      if (msg.event === 'audio-finished' && msg.messageId) {
        const cb = this._audioFinishedCallbacks.get(msg.messageId)
        if (cb) {
          this._audioFinishedCallbacks.delete(msg.messageId)
          cb()
        }
      }
    } catch { /* not a JSON event, ignore */ }
  }

  // Cancel autonomous loop if all clients disconnect
  onClose(connection: Connection, code: number, reason: string, wasClean: boolean) {
    super.onClose(connection, code, reason, wasClean)
    const remaining = [...this.getConnections()]
    if (remaining.length === 0 && this.state.status === 'autonomous') {
      this._autonomousCancelled = true
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Standard AI call (non-streaming)
  private async aiCall(systemPrompt: string, userPrompt: string, maxTokens = 1024): Promise<string> {
    const response = await this.env.AI.run(
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast' as keyof AiModels,
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
      } as Record<string, unknown>,
    )
    return typeof response === 'object' && 'response' in response
      ? (response as { response: string }).response
      : String(response)
  }

  // AI call with UX events (thinking indicator, then simulated word-by-word streaming)
  private async aiCallStreaming(
    systemPrompt: string,
    userPrompt: string,
    messageId: string,
    speaker: 'nova' | 'aero',
    maxTokens = 512,
  ): Promise<string> {
    this.broadcastEvent({ event: 'thinking', speaker })

    // Use reliable non-streaming call, then emit tokens word-by-word for UX
    const fullText = await this.aiCall(systemPrompt, userPrompt, maxTokens)

    // Simulate streaming by emitting words in small batches
    const words = fullText.split(/(\s+)/)
    let emitted = ''
    for (let i = 0; i < words.length; i++) {
      emitted += words[i]
      this.broadcastEvent({ event: 'token', messageId, token: words[i] })
      // Small delay every few words for visual streaming effect
      if (i % 3 === 0 && i > 0) {
        await this.delay(30)
      }
    }

    this.broadcastEvent({ event: 'turn-complete', messageId, speaker, fullText })
    return fullText
  }

  // Generate TTS for a single turn — stores audio in state + broadcasts event
  private async speakTurn(speaker: 'nova' | 'aero', text: string, _messageId: string): Promise<DialogueTurn> {
    const turn: DialogueTurn = { speaker, text, timestamp: Date.now() }

    console.log(`[TTS] speakTurn called for ${speaker}, ELEVENLABS_API_KEY present: ${!!this.env.ELEVENLABS_API_KEY}`)
    if (this.env.ELEVENLABS_API_KEY) {
      try {
        console.log(`[TTS] Calling ElevenLabs for ${speaker}: "${text.slice(0, 50)}..."`)
        const audioData = await generateSpeech({
          text,
          speaker,
          apiKey: this.env.ELEVENLABS_API_KEY,
        })
        console.log(`[TTS] Got audio data: ${audioData.byteLength} bytes`)
        const bytes = new Uint8Array(audioData)
        let binary = ''
        for (let j = 0; j < bytes.length; j++) {
          binary += String.fromCharCode(bytes[j])
        }
        turn.audioUrl = `data:audio/mpeg;base64,${btoa(binary)}`
        console.log(`[TTS] Audio URL length: ${turn.audioUrl.length}`)
      } catch (err) {
        console.error(`[TTS] FAILED for ${speaker}: ${err instanceof Error ? err.message : err}`)
      }
    } else {
      console.warn('[TTS] No ELEVENLABS_API_KEY in env — skipping audio generation')
    }

    // Store turn WITH audioUrl in state so frontend gets it via onStateUpdate
    this.setState({
      ...this.state,
      turns: [...this.state.turns, turn],
    })

    return turn
  }

  // Wait for client to signal audio playback finished
  private waitForAudioFinished(messageId: string): Promise<void> {
    return new Promise(resolve => {
      this._audioFinishedCallbacks.set(messageId, resolve)
      // Timeout after 30s
      setTimeout(() => {
        if (this._audioFinishedCallbacks.has(messageId)) {
          this._audioFinishedCallbacks.delete(messageId)
          resolve()
        }
      }, 30000)
    })
  }

  @callable()
  async sendMessage(text: string): Promise<void> {
    if (this.state.status === 'error') {
      this.setState({ ...this.state, status: 'idle', error: null })
    }

    const userMsg: ChatMessage = {
      id: makeId(), role: 'user', content: text, timestamp: Date.now(),
    }
    this.addMessage(userMsg)

    // User interjection during paused autonomous mode
    if (this.state.status === 'paused') {
      await this.conversationalResponse(text)
      // Auto-resume autonomous mode
      this.setState({ ...this.state, status: 'autonomous' })
      return
    }

    // Check for GitHub URL
    const githubUrl = extractGithubUrl(text)
    if (githubUrl) {
      await this.analyzeRepo(githubUrl)
      await this.podcastIntro()
      return
    }

    // No context yet — guide the user
    if (!this.state.context) {
      this.addMessage(systemMessage(
        'Hey! Paste a GitHub repo URL and I\'ll analyze it. Then we can chat about the code — Nova and Aero will join the conversation.',
      ))
      return
    }

    // Context exists — conversational response with streaming
    await this.conversationalResponse(text)
  }

  // Nova and Aero respond conversationally with streaming tokens
  private async conversationalResponse(userText: string): Promise<void> {
    if (!this.state.context) return

    this.setState({ ...this.state, status: 'dialoguing' })

    const ctx = this.state.context
    const contextStr = `Project: ${ctx.project.name} — ${ctx.project.summary}
Stack: ${ctx.stack.map((s) => s.name).join(', ')}
Features: ${ctx.features.map((f) => f.name).join(', ')}
Architecture: ${ctx.architecture.pattern}`

    const recentChat = this.state.messages
      .filter((m) => m.role === 'user' || m.role === 'nova' || m.role === 'aero')
      .slice(-6)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n')

    const prompt = `<context>\n${contextStr}\n</context>\n\n<history>\n${recentChat}\n</history>\n\nUser: ${userText}\n\nRespond in 1-2 SHORT sentences. Be punchy and conversational.`

    try {
      // Nova responds first (streaming)
      const novaMsgId = makeId()
      const novaText = await this.aiCallStreaming(NOVA_SYSTEM_PROMPT, prompt, novaMsgId, 'nova')
      this.addMessage({
        id: novaMsgId, role: 'nova', content: novaText, timestamp: Date.now(),
        metadata: { type: 'dialogue-turn' },
      })
      await this.speakTurn('nova', novaText, novaMsgId)

      // Delay between turns for readability
      await this.delay(1500)

      // Aero responds (streaming)
      const aeroMsgId = makeId()
      const aeroPrompt = `<context>\n${contextStr}\n</context>\n\n<history>\n${recentChat}\nNova: ${novaText}\n</history>\n\nUser asked: ${userText}\nNova just said: ${novaText}\n\nRespond to Nova in 1-2 SHORT sentences. Be punchy.`
      const aeroText = await this.aiCallStreaming(AERO_SYSTEM_PROMPT, aeroPrompt, aeroMsgId, 'aero')
      this.addMessage({
        id: aeroMsgId, role: 'aero', content: aeroText, timestamp: Date.now(),
        metadata: { type: 'dialogue-turn' },
      })
      await this.speakTurn('aero', aeroText, aeroMsgId)
    } catch (err) {
      console.error(`Conversation failed: ${err instanceof Error ? err.message : err}`)
    }

    // Restore status (idle or autonomous depending on context)
    if (this.state.status !== 'autonomous') {
      this.setState({ ...this.state, status: 'idle' })
    }
  }

  // Podcast-style intro after repo analysis
  private async podcastIntro(): Promise<void> {
    if (!this.state.context) return

    this.setState({ ...this.state, status: 'dialoguing' })

    const ctx = this.state.context
    const contextStr = `Project: ${ctx.project.name}
Summary: ${ctx.project.summary}
Language: ${ctx.project.primaryLanguage}
Stars: ${ctx.project.stars || 'N/A'}
Stack: ${ctx.stack.map(s => `${s.name} (${s.role})`).join(', ')}
Features: ${ctx.features.map(f => f.name).join(', ')}
Architecture: ${ctx.architecture.pattern} — ${ctx.architecture.description}`

    try {
      // Nova opens like a podcast host
      const novaMsgId = makeId()
      const novaIntro = await this.aiCallStreaming(
        NOVA_SYSTEM_PROMPT,
        `You are opening a new episode of the SpeechRun podcast. Introduce the show and today's repo.

<context>
${contextStr}
</context>

Give a warm, engaging podcast intro like: "Welcome to SpeechRun! Today we're diving into [project name], a [what it does]. This one caught my eye because [interesting thing]."

Keep it to 2-3 sentences. Be enthusiastic and welcoming.`,
        novaMsgId, 'nova',
      )
      this.addMessage({
        id: novaMsgId, role: 'nova', content: novaIntro, timestamp: Date.now(),
        metadata: { type: 'dialogue-turn' },
      })
      await this.speakTurn('nova', novaIntro, novaMsgId)

      await this.delay(1500)

      // Aero responds with technical excitement
      const aeroMsgId = makeId()
      const aeroIntro = await this.aiCallStreaming(
        AERO_SYSTEM_PROMPT,
        `Nova just opened the podcast: "${novaIntro}"

<context>
${contextStr}
</context>

You're the co-host. React to Nova's intro with technical excitement. Mention something specific about the tech stack or architecture that caught your eye. Like: "Yeah, what jumped out to me is [technical detail]. The way they [specific pattern]..."

Keep it to 2-3 sentences.`,
        aeroMsgId, 'aero',
      )
      this.addMessage({
        id: aeroMsgId, role: 'aero', content: aeroIntro, timestamp: Date.now(),
        metadata: { type: 'dialogue-turn' },
      })
      await this.speakTurn('aero', aeroIntro, aeroMsgId)
    } catch (err) {
      console.error(`Podcast intro failed: ${err instanceof Error ? err.message : err}`)
    }

    this.setState({ ...this.state, status: 'idle' })
  }

  // --- Autonomous Mode ---

  @callable()
  async startAutonomous(config?: Partial<AutonomousConfig>): Promise<void> {
    if (!this.state.context) return

    const fullConfig: AutonomousConfig = {
      turnsPerTopic: config?.turnsPerTopic ?? 3,
      delayBetweenTurns: config?.delayBetweenTurns ?? 2500,
      totalTopics: config?.totalTopics ?? 5,
      waitForAudio: config?.waitForAudio ?? true,
    }

    this._autonomousCancelled = false
    this.setState({
      ...this.state,
      status: 'autonomous',
      autonomousConfig: fullConfig,
      topicIndex: 0,
      currentTopic: null,
    })

    // Run the loop (fire and forget — runs in DO event loop)
    this.autonomousLoop(fullConfig).catch(err => {
      console.error('Autonomous loop error:', err)
      this.setState({ ...this.state, status: 'error', error: String(err) })
    })
  }

  @callable()
  async pauseAutonomous(): Promise<void> {
    if (this.state.status === 'autonomous') {
      this.setState({ ...this.state, status: 'paused' })
    }
  }

  @callable()
  async resumeAutonomous(): Promise<void> {
    if (this.state.status === 'paused') {
      this.setState({ ...this.state, status: 'autonomous' })
    }
  }

  @callable()
  async stopAutonomous(): Promise<void> {
    this._autonomousCancelled = true
    this.setState({
      ...this.state,
      status: 'idle',
      autonomousConfig: null,
      currentTopic: null,
    })
    this.broadcastEvent({ event: 'autonomous-done' })
  }

  private async generateTopics(): Promise<string[]> {
    const ctx = this.state.context!
    const contextStr = `Project: ${ctx.project.name}\nSummary: ${ctx.project.summary}\nStack: ${ctx.stack.map(s => s.name).join(', ')}\nFeatures: ${ctx.features.map(f => `${f.name}: ${f.description}`).join('; ')}\nArchitecture: ${ctx.architecture.pattern} — ${ctx.architecture.description}\nStrengths: ${ctx.quality.strengths.join(', ')}\nConcerns: ${ctx.quality.concerns.join(', ')}`

    const response = await this.aiCall(TOPIC_GENERATION_PROMPT, contextStr, 512)
    const topics = response.split('\n')
      .map(l => l.trim())
      .map(l => l.replace(/^\d+[\.\)]\s*/, '')) // strip numbering like "1. " or "1) "
      .map(l => l.replace(/^[-*]\s*/, ''))       // strip bullets
      .filter(l => l.length > 5 && l.length < 100) // skip preamble/empty lines
      .slice(0, 5)

    // Fallback if parsing fails
    if (topics.length === 0) {
      const ctx = this.state.context!
      return ctx.features.slice(0, 5).map(f => `How ${f.name} works`)
    }
    return topics
  }

  private async autonomousLoop(config: AutonomousConfig): Promise<void> {
    this.addMessage(systemMessage('Starting autonomous podcast mode...', { type: 'status' }))

    const topics = await this.generateTopics()

    const ctx = this.state.context!
    const contextStr = `Project: ${ctx.project.name} — ${ctx.project.summary}
Stack: ${ctx.stack.map(s => s.name).join(', ')}
Features: ${ctx.features.map(f => `${f.name} (${f.complexity}): ${f.description}`).join('; ')}
Architecture: ${ctx.architecture.pattern} — ${ctx.architecture.description}
Quality: Strengths: ${ctx.quality.strengths.join(', ')}. Concerns: ${ctx.quality.concerns.join(', ')}`

    for (let t = 0; t < topics.length && !this._autonomousCancelled; t++) {
      const topic = topics[t]
      this.setState({ ...this.state, currentTopic: topic, topicIndex: t })
      this.broadcastEvent({
        event: 'autonomous-topic', topic, topicIndex: t, totalTopics: topics.length,
      })

      this.addMessage(systemMessage(`Topic: ${topic}`, { type: 'status' }))

      for (let turn = 0; turn < config.turnsPerTopic * 2 && !this._autonomousCancelled; turn++) {
        // Poll pause state
        while (this.state.status === 'paused' && !this._autonomousCancelled) {
          await this.delay(500)
        }
        if (this._autonomousCancelled) break

        const isNova = turn % 2 === 0
        const speaker = isNova ? 'nova' as const : 'aero' as const
        const msgId = makeId()

        // Build conversation history for this topic
        const recentTurns = this.state.messages
          .filter(m => m.role === 'nova' || m.role === 'aero')
          .slice(-8)
          .map(m => `${m.role === 'nova' ? 'Nova' : 'Aero'}: ${m.content}`)
          .join('\n')

        const turnPrompt = `<context>\n${contextStr}\n</context>\n\nCurrent topic: ${topic}\n\n<history>\n${recentTurns}\n</history>\n\n${turn === 0 ? 'Start the discussion on this topic. Be curious and engaging.' : 'Continue the conversation, building on what was just said. Add new insight or ask a follow-up.'}`

        const systemPrompt = isNova ? AUTONOMOUS_NOVA_PROMPT : AUTONOMOUS_AERO_PROMPT

        const text = await this.aiCallStreaming(systemPrompt, turnPrompt, msgId, speaker)
        this.addMessage({
          id: msgId, role: speaker, content: text, timestamp: Date.now(),
          metadata: { type: 'dialogue-turn' },
        })

        const turnResult = await this.speakTurn(speaker, text, msgId)

        // Wait for audio playback if configured
        if (config.waitForAudio && turnResult.audioUrl) {
          await this.waitForAudioFinished(msgId)
        } else {
          // Fixed delay between turns
          await this.delay(config.delayBetweenTurns)
        }
      }
    }

    if (!this._autonomousCancelled) {
      this.setState({
        ...this.state,
        status: 'idle',
        currentTopic: null,
        autonomousConfig: null,
      })
      this.broadcastEvent({ event: 'autonomous-done' })
      this.addMessage(systemMessage('Podcast complete! All topics discussed.', { type: 'status' }))
    }
  }

  // --- Repo Analysis ---

  private async analyzeRepo(repoUrl: string): Promise<void> {
    try {
      this.setState({ ...this.state, status: 'fetching', error: null, turns: [] })
      this.addMessage(systemMessage('Fetching repository...', { type: 'status' }))

      const { owner, repo } = parseGithubUrl(repoUrl)
      const metadata = await fetchRepoMetadata(owner, repo, this.env.GITHUB_TOKEN)
      const fileTree = await fetchFileTree(owner, repo, metadata.defaultBranch, this.env.GITHUB_TOKEN)
      const selectedFiles = selectKeyFiles(fileTree)
      const keyFiles = await fetchMultipleFiles(owner, repo, selectedFiles, this.env.GITHUB_TOKEN)

      this.setState({ ...this.state, status: 'analyzing' })
      this.addMessage(systemMessage(`Found ${fileTree.length} files. Analyzing...`, { type: 'status' }))

      const context = await this.generateContext(metadata, fileTree, keyFiles)
      this.setState({ ...this.state, context, status: 'idle' })

      this.addMessage(systemMessage(
        `Analysis complete! ${context.features.length} features found.`,
        { type: 'analysis', repoUrl },
      ))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.setState({ ...this.state, status: 'error', error: message })
      this.addMessage(systemMessage(`Error: ${message}`))
    }
  }

  private async generateContext(
    metadata: { fullName: string; description: string; language: string; stargazersCount: number },
    fileTree: string[],
    keyFiles: Record<string, string>,
  ): Promise<StructuredContext> {
    const fileContentsStr = Object.entries(keyFiles)
      .map(([path, content]) => `--- ${path} ---\n${content}`)
      .join('\n\n')

    const truncated = fileContentsStr.length > 30000
      ? fileContentsStr.slice(0, 30000) + '\n\n... (truncated)'
      : fileContentsStr

    const prompt = `Repository: ${metadata.fullName}
Description: ${metadata.description}
Primary Language: ${metadata.language}
Stars: ${metadata.stargazersCount}
Total Files: ${fileTree.length}

File Tree (first 100):
${fileTree.slice(0, 100).join('\n')}

Key File Contents:
${truncated}

Analyze this repository and return the structured JSON.`

    let lastRawResponse = ''

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await this.env.AI.run(
          '@cf/meta/llama-3.3-70b-instruct-fp8-fast' as keyof AiModels,
          {
            messages: [
              { role: 'system', content: STRUCTURED_CONTEXT_PROMPT },
              { role: 'user', content: prompt },
            ],
            max_tokens: 4096,
          } as Record<string, unknown>,
        )

        const text = typeof response === 'object' && 'response' in response
          ? (response as { response: string }).response
          : String(response)

        lastRawResponse = text
        const parsed = parseStructuredContext(text)
        if (parsed) {
          parsed.project.name = metadata.fullName
          parsed.project.primaryLanguage = metadata.language
          parsed.project.stars = metadata.stargazersCount
          return parsed
        }
      } catch {
        if (attempt === 1) break
      }
    }

    console.error('JSON parse failed, fallback context. Raw:', lastRawResponse.slice(0, 300))
    return {
      project: {
        name: metadata.fullName,
        summary: metadata.description || 'Analysis completed.',
        purpose: '',
        primaryLanguage: metadata.language,
        stars: metadata.stargazersCount,
      },
      stack: [{ name: metadata.language, role: 'Primary language', category: 'backend' as const }],
      features: [],
      architecture: { pattern: 'Unknown', description: 'Try asking about the code.', layers: [], dataFlow: '' },
      decisions: [],
      quality: { strengths: [], concerns: [], overall: '' },
    }
  }
}
