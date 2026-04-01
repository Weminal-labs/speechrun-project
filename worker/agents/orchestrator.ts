import { Agent, callable } from 'agents'
import type { Env, OrchestratorState, GenerationResult } from '../types'

export class Orchestrator extends Agent<Env, OrchestratorState> {
  initialState: OrchestratorState = {
    repoUrl: '',
    status: 'idle',
    context: null,
    turns: [],
    error: null,
  }

  @callable()
  async startGeneration(_repoUrl: string): Promise<GenerationResult> {
    // Phase 2: GitHub ingestion + context generation
    // Phase 3: Multi-agent dialogue loop
    // Phase 4: ElevenLabs audio generation
    return { success: false, turnCount: 0, error: 'Not implemented yet' }
  }
}
