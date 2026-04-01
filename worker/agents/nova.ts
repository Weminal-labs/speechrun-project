import { Agent, callable } from 'agents'
import type { Env, AgentTurnInput, DialogueTurn } from '../types'
import { NOVA_SYSTEM_PROMPT, buildTurnPrompt } from '../utils/prompts'

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
      context.summary,
      previousTurns.slice(-6),
      isFirstInTopic,
    )

    const response = await this.env.AI.run(
      '@cf/meta/llama-3.1-70b-instruct' as keyof AiModels,
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

    return {
      speaker: 'nova',
      text,
      timestamp: Date.now(),
    }
  }
}
