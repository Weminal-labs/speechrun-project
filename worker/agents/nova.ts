import { Agent, callable } from 'agents'
import type { Env, AgentTurnInput, DialogueTurn } from '../types'

interface NovaState {
  persona: string
}

export class Nova extends Agent<Env, NovaState> {
  initialState: NovaState = {
    persona: 'Nova — Product Manager',
  }

  @callable()
  async generateTurn(_input: AgentTurnInput): Promise<DialogueTurn> {
    // Phase 3: Workers AI dialogue generation with PM persona
    return {
      speaker: 'nova',
      text: 'Not implemented yet',
      timestamp: Date.now(),
    }
  }
}
