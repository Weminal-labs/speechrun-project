import type { CodebaseContext } from './context-generator'
import type { DialogueOutlineTopic } from '../do/session'

export type OrchestratorResult =
  | { ok: true; data: DialogueOutlineTopic[] }
  | { ok: false; error: string }

const SYSTEM_PROMPT = `You are the producer of a technical podcast called SpeechRun. You are given an AI-generated analysis of a software codebase. Your job is to produce a structured topic outline for a 10-15 minute podcast episode in which two hosts discuss the codebase.

The two hosts are:
- Nova: a product manager. She focuses on user value, business impact, architecture trade-offs from a product lens, and what the project does for its users.
- Aero: a software developer. He focuses on implementation details, language and framework choices, code quality, technical debt, and how things are built.

Your output must be a JSON array of 8-12 topic objects. Each topic must have:
- "title": a short, punchy topic name (e.g. "The WebSocket Architecture", "Why Durable Objects?")
- "description": 1-2 sentences explaining what the hosts should cover on this topic and what angle makes it interesting

The topics must flow naturally as a podcast — start with an overview, build toward the interesting technical choices, include at least one moment of genuine debate or contrast between PM and Dev perspectives, and end with a summary or "so what" reflection.

Return ONLY the JSON array. No preamble. No commentary. No markdown fences.`

function buildUserMessage(context: CodebaseContext): string {
  const components = context.keyComponents
    .map((c) => `${c.name}: ${c.description}`)
    .join('\n')

  return `<context>
Project summary: ${context.summary}
Tech stack: ${context.techStack.join(', ')}
Architecture: ${context.architecture}
Key components:
${components}
Code quality: ${context.codeQuality}
Suggested topics: ${context.podcastTopics.join(', ')}
</context>

Generate the podcast topic outline now.`
}

function parseOutline(text: string): DialogueOutlineTopic[] | null {
  let cleaned = text.trim()

  // Strip markdown code fences if present
  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n')
    cleaned = cleaned.slice(firstNewline + 1).trimEnd()
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3).trim()
    }
  }

  try {
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return null

    const topics: DialogueOutlineTopic[] = parsed
      .filter((t: { title?: string; description?: string }) =>
        typeof t.title === 'string' && t.title.trim().length > 0 &&
        typeof t.description === 'string' && t.description.trim().length > 0,
      )
      .map((t: { title: string; description: string }, i: number) => ({
        topicIndex: i,
        title: t.title.trim(),
        description: t.description.trim(),
      }))

    // Must have at least 5 valid topics
    if (topics.length < 5) return null

    return topics
  } catch {
    return null
  }
}

export async function generateTopicOutline(
  ai: Ai,
  context: CodebaseContext,
): Promise<OrchestratorResult> {
  const userMessage = buildUserMessage(context)

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 2048,
      })

      if (!response || typeof response !== 'object' || !('response' in response)) continue

      const text = (response as { response: string }).response
      if (!text) continue

      const topics = parseOutline(text)
      if (topics) {
        return { ok: true, data: topics }
      }
    } catch {
      if (attempt === 1) {
        return { ok: false, error: 'Failed to generate podcast outline. Please try again.' }
      }
    }
  }

  return { ok: false, error: 'Failed to generate podcast outline. Please try again.' }
}
