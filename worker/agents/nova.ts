import { Agent, callable } from 'agents'
import type { Env, AgentTurnInput, AgentQAInput, DialogueTurn } from '../types'
import { NOVA_SYSTEM_PROMPT, NOVA_QA_PROMPT, buildTurnPrompt, buildQAPrompt } from '../utils/prompts'

interface NovaState {
  persona: string
}

export class Nova extends Agent<Env, NovaState> {
  initialState: NovaState = {
    persona: 'Nova — Product Manager',
  }

  @callable()
  async generateTurn(input: AgentTurnInput): Promise<DialogueTurn> {
    const { topic, context, previousTurns } = input
    const isFirstInTopic = previousTurns.length === 0
      || previousTurns[previousTurns.length - 1]?.speaker === 'aero'

    const prompt = buildTurnPrompt(
      topic,
      `${context.project.name}: ${context.project.summary}`,
      previousTurns.slice(-6),
      isFirstInTopic,
    )

    const response = await this.env.AI.run(
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast' as keyof AiModels,
      {
        messages: [
          { role: 'system', content: NOVA_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      } as Record<string, unknown>,
    )

    const text = typeof response === 'object' && 'response' in response
      ? (response as { response: string }).response
      : String(response)

    return { speaker: 'nova', text, timestamp: Date.now() }
  }

  @callable()
  async answerQuestion(input: AgentQAInput): Promise<string> {
    const { question, context, chatHistory } = input
    const prompt = buildQAPrompt(question, context, chatHistory)

    const response = await this.env.AI.run(
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast' as keyof AiModels,
      {
        messages: [
          { role: 'system', content: NOVA_QA_PROMPT },
          { role: 'user', content: prompt },
        ],
      } as Record<string, unknown>,
    )

    return typeof response === 'object' && 'response' in response
      ? (response as { response: string }).response
      : String(response)
  }
}
