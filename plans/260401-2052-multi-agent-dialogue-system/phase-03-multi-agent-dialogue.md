# Phase 3: Multi-Agent Dialogue Generation

## Context Links
- [Research: Multi-Agent Coordination](../260329-2256-cloudflare-workers-foundation/reports/researcher-260401-2052-cloudflare-agents-multiagent.md)
- [System Architecture: Multi-Agent Dialogue](../../docs/system-architecture.md)
- [Phase 2: GitHub Ingestion](phase-02-github-ingestion.md)

## Overview
- **Priority:** P1
- **Status:** Pending
- **Effort:** 3h
- **Blocked by:** Phase 2
- **Description:** Create Nova (PM) and Aero (Dev) agents with distinct personas. Orchestrator coordinates turn-by-turn dialogue, broadcasting each turn in real-time.

## Key Insights
- Orchestrator Hub pattern: single coordination point, Nova/Aero are called via RPC
- Sequential turns required (Aero must respond to Nova's point, not independently)
- 4-6 turns total (8-12 individual messages) keeps podcast length ~3-5 minutes
- System prompts define persona; topic guidance steers each turn's focus
- Each turn should be 2-3 sentences for natural podcast pacing

## Requirements

### Functional
- Nova agent: PM persona, focuses on product strategy, user impact, trade-offs
- Aero agent: Dev persona, focuses on architecture, code quality, technical decisions
- Orchestrator generates topic outline (4-6 topics from codebase context)
- Turn loop: for each topic, Nova speaks then Aero responds
- Each turn receives: topic, codebase context, all previous turns
- Real-time broadcast of each turn to frontend via WebSocket
- Configurable turn count (default 5 rounds = 10 turns)

### Non-Functional
- Each Workers AI call: < 15s latency
- Total dialogue generation: < 2 minutes for 10 turns
- Graceful degradation if a turn fails (retry once, skip on second failure)

## Related Code Files

| Action | File |
|--------|------|
| Create | `worker/agents/nova.ts` |
| Create | `worker/agents/aero.ts` |
| Create | `worker/utils/prompts.ts` |
| Modify | `worker/agents/orchestrator.ts` (add dialogue loop) |

## Architecture: Dialogue Flow

```
Orchestrator.startGeneration()
    ↓ (after context generation from Phase 2)
generateTopicOutline(context) → ["Architecture", "Error Handling", ...]
    ↓
For each topic (5 rounds):
    ├─ Nova.generateTurn(topic, context, previousTurns)
    │   → { speaker: 'nova', text: '...', timestamp }
    │   → broadcast to frontend
    ├─ Aero.generateTurn(topic, context, previousTurns)
    │   → { speaker: 'aero', text: '...', timestamp }
    │   → broadcast to frontend
    └─ Store turns in Orchestrator state
    ↓
status = 'generating-audio' (hand off to Phase 4)
```

## Implementation Steps

### 1. Create `worker/utils/prompts.ts`

System prompts and topic generation prompt:

```typescript
export const NOVA_SYSTEM_PROMPT = `You are Nova, a senior product manager reviewing a codebase on a tech podcast.

Personality:
- Strategic thinker focused on user value and business impact
- Asks probing questions about design decisions
- Occasionally skeptical of over-engineering
- Warm but direct communication style

Rules:
- Keep responses to 2-3 sentences
- Speak naturally, like a podcast conversation (not bullet points)
- Reference specific parts of the codebase when possible
- Build on what Aero says rather than repeating`

export const AERO_SYSTEM_PROMPT = `You are Aero, a senior software engineer reviewing a codebase on a tech podcast.

Personality:
- Deep technical expertise, passionate about clean architecture
- Enthusiastic about clever solutions, honest about tech debt
- Explains complex concepts simply
- Slightly nerdy humor

Rules:
- Keep responses to 2-3 sentences
- Speak naturally, like a podcast conversation (not bullet points)
- Reference specific code patterns, files, or architectural decisions
- Respond to Nova's points, don't just monologue`

export const TOPIC_GENERATION_PROMPT = `Given this codebase analysis, generate exactly 5 discussion topics for a podcast conversation between a PM and a developer.

Each topic should be a brief phrase (5-10 words) that could drive an interesting 30-second exchange.

Format: Return only the topics, one per line, no numbering.

Topics should cover: architecture decisions, code quality, user-facing features, tech debt or risks, and something surprising or unique about the codebase.`

export function buildTurnPrompt(
  topic: string,
  context: string,
  previousTurns: Array<{ speaker: string; text: string }>,
  isFirstTurn: boolean
): string {
  const history = previousTurns
    .map((t) => `${t.speaker === 'nova' ? 'Nova' : 'Aero'}: ${t.text}`)
    .join('\n\n')

  return `Topic: ${topic}

Codebase Context:
${context}

${history ? `Previous Discussion:\n${history}\n\n` : ''}${isFirstTurn ? 'Start the discussion on this topic.' : 'Continue the conversation, responding to the previous point.'}`
}
```

### 2. Create `worker/agents/nova.ts`

```typescript
import { Agent } from '@cloudflare/agents'
import type { Env, AgentState, DialogueTurn, ContextData } from '../types'
import { NOVA_SYSTEM_PROMPT, buildTurnPrompt } from '../utils/prompts'

interface TurnInput {
  topic: string
  context: ContextData
  previousTurns: DialogueTurn[]
}

export class Nova extends Agent<Env, AgentState> {
  @callable()
  async generateTurn(input: TurnInput): Promise<DialogueTurn> {
    const { topic, context, previousTurns } = input
    const isFirstInTopic = previousTurns.length === 0
      || previousTurns[previousTurns.length - 1]?.speaker === 'aero'

    const prompt = buildTurnPrompt(
      topic,
      context.summary,
      previousTurns.slice(-6), // last 6 turns for context window
      isFirstInTopic
    )

    const response = await this.env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
      messages: [
        { role: 'system', content: NOVA_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    })

    return {
      speaker: 'nova',
      text: response.response,
      timestamp: Date.now(),
    }
  }
}
```

### 3. Create `worker/agents/aero.ts`

Same structure as Nova with `AERO_SYSTEM_PROMPT` and `speaker: 'aero'`.

### 4. Add dialogue loop to Orchestrator

```typescript
// In orchestrator.ts, after context generation:
private async runDialogue(): Promise<void> {
  this.state.status = 'dialoguing'
  this.setState(this.state)

  const topics = await this.generateTopics()
  const TURNS_PER_TOPIC = 1 // 1 Nova + 1 Aero per topic

  for (const topic of topics) {
    for (let i = 0; i < TURNS_PER_TOPIC; i++) {
      // Nova's turn
      const novaId = this.env.NOVA.idFromName(`nova-${this.name}`)
      const nova = this.env.NOVA.get(novaId)
      const novaTurn = await nova.generateTurn({
        topic,
        context: this.state.context!,
        previousTurns: this.state.turns,
      })
      this.state.turns.push(novaTurn)
      this.setState(this.state) // broadcasts to frontend

      // Aero's turn (responds to Nova)
      const aeroId = this.env.AERO.idFromName(`aero-${this.name}`)
      const aero = this.env.AERO.get(aeroId)
      const aeroTurn = await aero.generateTurn({
        topic,
        context: this.state.context!,
        previousTurns: this.state.turns,
      })
      this.state.turns.push(aeroTurn)
      this.setState(this.state) // broadcasts to frontend
    }
  }
}

private async generateTopics(): Promise<string[]> {
  const response = await this.env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
    messages: [
      { role: 'system', content: TOPIC_GENERATION_PROMPT },
      { role: 'user', content: this.state.context!.summary },
    ],
  })

  return response.response
    .split('\n')
    .map((t: string) => t.trim())
    .filter((t: string) => t.length > 0)
    .slice(0, 5)
}
```

### 5. Error handling in dialogue loop

Wrap each turn in try/catch. On failure: retry once. On second failure: log error, continue to next topic. Never abort the entire dialogue for a single turn failure.

## Todo List

- [ ] Create worker/utils/prompts.ts with system prompts and topic generation
- [ ] Create worker/agents/nova.ts with @callable() generateTurn
- [ ] Create worker/agents/aero.ts with @callable() generateTurn
- [ ] Add dialogue loop to Orchestrator (runDialogue method)
- [ ] Implement topic generation via Workers AI
- [ ] Add retry logic (1 retry per turn)
- [ ] Broadcast each turn to frontend via setState
- [ ] Test dialogue generation with a real repo context
- [ ] Verify Nova and Aero produce distinct, coherent voices
- [ ] Confirm 10 turns generate in < 2 minutes

## Success Criteria
- 5 topics generated from codebase context
- 10 turns (5 Nova + 5 Aero) generated with distinct personas
- Each turn is 2-3 sentences, natural conversation style
- Turns appear in real-time on frontend via WebSocket
- Single turn failure doesn't abort entire dialogue
- Total generation time < 2 minutes

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Workers AI produces repetitive dialogue | Medium | Medium | Strong system prompts; topic variety; conversation history in prompt |
| Turns exceed 2-3 sentence target | Medium | Low | Add "max 3 sentences" to prompt; post-process truncation |
| Workers AI rate limit during 10 sequential calls | Low | High | Space calls; retry with backoff; degrade to fewer turns |
| Nova/Aero voices sound too similar | Medium | Medium | Distinct persona prompts; review and iterate on prompts |

## Security Considerations
- No user input passes directly to LLM (only codebase context)
- System prompts are server-side only, not exposed to frontend
- Workers AI calls are authenticated via binding (no API key exposed)
