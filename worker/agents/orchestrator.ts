import { Agent, callable } from 'agents'
import type { Env, OrchestratorState, ContextData, DialogueTurn, GenerationResult } from '../types'
import { parseGithubUrl, fetchRepoMetadata, fetchFileTree, fetchMultipleFiles } from '../utils/github-client'
import { selectKeyFiles } from '../utils/file-selector'
import { NOVA_SYSTEM_PROMPT, AERO_SYSTEM_PROMPT, TOPIC_GENERATION_PROMPT, buildTurnPrompt } from '../utils/prompts'
import { generateSpeech, uploadAudioToR2 } from '../utils/elevenlabs-client'

export class Orchestrator extends Agent<Env, OrchestratorState> {
  initialState: OrchestratorState = {
    repoUrl: '',
    status: 'idle',
    context: null,
    turns: [],
    error: null,
  }

  @callable()
  async startGeneration(repoUrl: string): Promise<GenerationResult> {
    try {
      this.setState({ ...this.state, repoUrl, status: 'fetching', error: null, turns: [] })

      const { owner, repo } = parseGithubUrl(repoUrl)
      const metadata = await fetchRepoMetadata(owner, repo, this.env.GITHUB_TOKEN)
      const fileTree = await fetchFileTree(owner, repo, metadata.defaultBranch, this.env.GITHUB_TOKEN)
      const selectedFiles = selectKeyFiles(fileTree)
      const keyFiles = await fetchMultipleFiles(owner, repo, selectedFiles, this.env.GITHUB_TOKEN)

      this.setState({ ...this.state, status: 'analyzing' })

      const context = await this.generateContext(metadata, fileTree, keyFiles)
      this.setState({ ...this.state, context })

      await this.runDialogue()
      await this.generateAudio()

      return { success: true, turnCount: this.state.turns.length }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.setState({ ...this.state, status: 'error', error: message })
      return { success: false, turnCount: 0, error: message }
    }
  }

  private async generateContext(
    metadata: { fullName: string; description: string; language: string; stargazersCount: number },
    fileTree: string[],
    keyFiles: Record<string, string>,
  ): Promise<ContextData> {
    const fileContentsStr = Object.entries(keyFiles)
      .map(([path, content]) => `--- ${path} ---\n${content}`)
      .join('\n\n')

    const truncatedContents = fileContentsStr.length > 30000
      ? fileContentsStr.slice(0, 30000) + '\n\n... (truncated)'
      : fileContentsStr

    const prompt = `Analyze this GitHub repository and provide a structured summary for a podcast discussion.

Repository: ${metadata.fullName}
Description: ${metadata.description}
Primary Language: ${metadata.language}
Stars: ${metadata.stargazersCount}
Total Files: ${fileTree.length}

File Tree (first 100):
${fileTree.slice(0, 100).join('\n')}

Key File Contents:
${truncatedContents}

Provide a concise analysis covering:
1. What the project does (1-2 sentences)
2. Architecture and key patterns
3. Technology choices and why they make sense
4. Code quality observations
5. Most interesting or notable aspects
6. Potential areas for improvement

Keep the analysis focused and opinionated — this will fuel a PM vs Developer debate podcast.`

    const response = await this.env.AI.run(
      '@cf/meta/llama-3.1-70b-instruct' as keyof AiModels,
      {
        messages: [
          { role: 'system', content: 'You are an expert code analyst. Provide concise, opinionated analysis.' },
          { role: 'user', content: prompt },
        ],
      } as Record<string, unknown>,
    )

    const summary = typeof response === 'object' && 'response' in response
      ? (response as { response: string }).response
      : String(response)

    return {
      summary,
      repoName: metadata.fullName,
      fileTree: fileTree.slice(0, 100),
      keyFiles,
      generatedAt: new Date().toISOString(),
    }
  }

  private async runDialogue(): Promise<void> {
    this.setState({ ...this.state, status: 'dialoguing' })

    const topics = await this.generateTopics()

    for (const topic of topics) {
      // Nova (PM) speaks first
      const novaTurn = await this.generateTurn('nova', topic)
      if (novaTurn) {
        this.setState({ ...this.state, turns: [...this.state.turns, novaTurn] })
      }

      // Aero (Dev) responds
      const aeroTurn = await this.generateTurn('aero', topic)
      if (aeroTurn) {
        this.setState({ ...this.state, turns: [...this.state.turns, aeroTurn] })
      }
    }
  }

  private async generateTurn(
    speaker: 'nova' | 'aero',
    topic: string,
  ): Promise<DialogueTurn | null> {
    const systemPrompt = speaker === 'nova' ? NOVA_SYSTEM_PROMPT : AERO_SYSTEM_PROMPT
    const isFirstInTopic = this.state.turns.length === 0
      || this.state.turns[this.state.turns.length - 1]?.speaker !== speaker

    const prompt = buildTurnPrompt(
      topic,
      this.state.context!.summary,
      this.state.turns.slice(-6),
      isFirstInTopic,
    )

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await this.env.AI.run(
          '@cf/meta/llama-3.1-70b-instruct' as keyof AiModels,
          {
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
          } as Record<string, unknown>,
        )

        const text = typeof response === 'object' && 'response' in response
          ? (response as { response: string }).response
          : String(response)

        return { speaker, text, timestamp: Date.now() }
      } catch (error) {
        if (attempt === 1) {
          console.error(`Turn generation failed for ${speaker}: ${error instanceof Error ? error.message : error}`)
          return null
        }
      }
    }
    return null
  }

  private async generateTopics(): Promise<string[]> {
    const response = await this.env.AI.run(
      '@cf/meta/llama-3.1-70b-instruct' as keyof AiModels,
      {
        messages: [
          { role: 'system', content: TOPIC_GENERATION_PROMPT },
          { role: 'user', content: this.state.context!.summary },
        ],
      } as Record<string, unknown>,
    )

    const text = typeof response === 'object' && 'response' in response
      ? (response as { response: string }).response
      : String(response)

    return text
      .split('\n')
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0)
      .slice(0, 5)
  }

  private async generateAudio(): Promise<void> {
    if (!this.env.ELEVENLABS_API_KEY || !this.env.AUDIO_BUCKET) {
      this.setState({ ...this.state, status: 'complete' })
      return
    }

    this.setState({ ...this.state, status: 'generating-audio' })

    const sessionId = this.name
    const updatedTurns = [...this.state.turns]

    for (let i = 0; i < updatedTurns.length; i++) {
      const turn = updatedTurns[i]
      try {
        const audioData = await generateSpeech({
          text: turn.text,
          speaker: turn.speaker,
          apiKey: this.env.ELEVENLABS_API_KEY,
        })

        const key = await uploadAudioToR2(
          this.env.AUDIO_BUCKET!,
          sessionId,
          i,
          audioData,
        )

        updatedTurns[i] = { ...turn, audioUrl: `/api/audio/${key}` }
        this.setState({ ...this.state, turns: updatedTurns })
      } catch (error) {
        console.error(`TTS failed for turn ${i}: ${error instanceof Error ? error.message : error}`)
      }
    }

    this.setState({ ...this.state, turns: updatedTurns, status: 'complete' })
  }
}
