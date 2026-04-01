import { Agent, callable } from 'agents'
import type { Env, AgentTurnInput, DialogueTurn } from '../types'
import { AERO_SYSTEM_PROMPT, buildTurnPrompt } from '../utils/prompts'

interface AeroState {
  persona: string
}

export class Aero extends Agent<Env, AeroState> {
  initialState: AeroState = {
    persona: 'Aero — Senior Developer',
  }

  @callable()
  async generateTurn(input: AgentTurnInput): Promise<DialogueTurn> {
    const { topic, context, previousTurns } = input
    const isFirstInTopic = previousTurns.length === 0
      || previousTurns[previousTurns.length - 1]?.speaker === 'nova'

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
          { role: 'system', content: AERO_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      } as Record<string, unknown>,
    )

    const text = typeof response === 'object' && 'response' in response
      ? (response as { response: string }).response
      : String(response)

    return {
      speaker: 'aero',
      text,
      timestamp: Date.now(),
    }
  }
}
