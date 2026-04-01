import type { EmotionTag, DialogueTurn, DialogueOutlineTopic } from '../do/session'

const VALID_EMOTIONS: Set<string> = new Set([
  'curious', 'enthusiastic', 'thoughtful', 'matter-of-fact',
  'amused', 'concerned', 'impressed',
])

const NOVA_SYSTEM_PROMPT = `You are Nova, a product manager co-hosting a technical podcast called SpeechRun. You are discussing a real software project with your co-host Aero, a software developer.

Your personality:
- Curious and enthusiastic about what products do for users
- You connect technical decisions to business impact and user experience
- You ask good questions — you often prompt Aero to explain things more clearly
- You occasionally challenge assumptions or suggest there might be a simpler approach
- You are warm, articulate, and occasionally funny
- You speak in natural conversational English — no jargon unless Aero introduced it first

Your job in this turn:
- Respond naturally to what Aero just said (if this is not the first turn)
- Advance the current topic from a product or user perspective
- Keep your response to 2-4 sentences — this is spoken audio, not an essay

Your response must be a JSON object with exactly two fields:
- "text": your spoken dialogue (2-4 sentences, plain English, no stage directions)
- "emotion": one of: "curious", "enthusiastic", "thoughtful", "matter-of-fact", "amused", "concerned", "impressed"

Return ONLY the JSON object. No preamble. No markdown.`

const AERO_SYSTEM_PROMPT = `You are Aero, a software developer co-hosting a technical podcast called SpeechRun. You are discussing a real software project with your co-host Nova, a product manager.

Your personality:
- Precise and knowledgeable about technical implementation
- You enjoy explaining how things work under the hood
- You sometimes get enthusiastic about clever design decisions or flag technical debt honestly
- You gently push back on oversimplifications — but you are never condescending
- You are direct, slightly dry, and occasionally self-deprecating about the messy realities of software
- You speak in natural conversational English — you can use technical terms but always briefly explain them

Your job in this turn:
- Respond naturally to what Nova just said (if this is not the first turn)
- Advance the current topic from a technical implementation perspective
- Keep your response to 2-4 sentences — this is spoken audio, not an essay

Your response must be a JSON object with exactly two fields:
- "text": your spoken dialogue (2-4 sentences, plain English, no stage directions)
- "emotion": one of: "curious", "enthusiastic", "thoughtful", "matter-of-fact", "amused", "concerned", "impressed"

Return ONLY the JSON object. No preamble. No markdown.`

function getSystemPrompt(speaker: 'Nova' | 'Aero'): string {
  return speaker === 'Nova' ? NOVA_SYSTEM_PROMPT : AERO_SYSTEM_PROMPT
}

function buildTurnMessage(
  speaker: 'Nova' | 'Aero',
  topic: DialogueOutlineTopic,
  history: DialogueTurn[],
): string {
  const historyText = history.length > 0
    ? history.map((t) => `${t.speaker}: ${t.text}`).join('\n\n')
    : '(This is the opening turn of the podcast)'

  return `<topic>
Current topic: ${topic.title}
What to cover: ${topic.description}
</topic>

<history>
${historyText}
</history>

${speaker}, it is your turn. Respond now.`
}

function parseTurnResponse(text: string): { text: string; emotion: EmotionTag } | null {
  let cleaned = text.trim()

  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n')
    cleaned = cleaned.slice(firstNewline + 1).trimEnd()
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3).trim()
    }
  }

  try {
    const parsed = JSON.parse(cleaned) as { text?: string; emotion?: string }

    if (typeof parsed.text !== 'string' || parsed.text.trim().length === 0) {
      return null
    }

    const emotion: EmotionTag = VALID_EMOTIONS.has(parsed.emotion ?? '')
      ? (parsed.emotion as EmotionTag)
      : 'matter-of-fact'

    return { text: parsed.text.trim(), emotion }
  } catch {
    return null
  }
}

export interface GenerateTurnInput {
  speaker: 'Nova' | 'Aero'
  turnOrder: number
  topic: DialogueOutlineTopic
  history: DialogueTurn[]
}

export type TurnResult =
  | { ok: true; data: DialogueTurn }
  | { ok: false; error: string }

export async function generateTurn(
  ai: Ai,
  input: GenerateTurnInput,
): Promise<TurnResult> {
  const systemPrompt = getSystemPrompt(input.speaker)
  const userMessage = buildTurnMessage(input.speaker, input.topic, input.history)

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 512,
      })

      if (!response || typeof response !== 'object' || !('response' in response)) continue

      const text = (response as { response: string }).response
      if (!text) continue

      const parsed = parseTurnResponse(text)
      if (parsed) {
        return {
          ok: true,
          data: {
            turnOrder: input.turnOrder,
            speaker: input.speaker,
            text: parsed.text,
            emotion: parsed.emotion,
            topicIndex: input.topic.topicIndex,
            audioUrl: null,
          },
        }
      }
    } catch {
      if (attempt === 1) {
        return { ok: false, error: `Failed to generate turn ${input.turnOrder} for ${input.speaker}` }
      }
    }
  }

  return { ok: false, error: `Failed to generate turn ${input.turnOrder} for ${input.speaker}` }
}
