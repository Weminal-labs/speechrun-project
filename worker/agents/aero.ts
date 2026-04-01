import { Agent, callable } from 'agents'
import type { Env, AgentTurnInput, DialogueTurn } from '../types'

interface AeroState {
  persona: string
}

export class Aero extends Agent<Env, AeroState> {
  initialState: AeroState = {
    persona: 'Aero — Senior Developer',
  }

  @callable()
  async generateTurn(_input: AgentTurnInput): Promise<DialogueTurn> {
    // Phase 3: Workers AI dialogue generation with Dev persona
    return {
      speaker: 'aero',
      text: 'Not implemented yet',
      timestamp: Date.now(),
    }
  }
}
