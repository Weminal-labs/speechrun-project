import type { FileContent } from './github-files'

export interface CodebaseContext {
  summary: string
  techStack: string[]
  architecture: string
  keyComponents: Array<{ name: string; description: string }>
  codeQuality: string
  podcastTopics: string[]
}

export type ContextResult =
  | { ok: true; data: CodebaseContext }
  | { ok: false; error: string }

const SYSTEM_PROMPT = `You are an expert code analyst. You will receive the contents of key files from a GitHub repository. Your job is to analyse the codebase and produce a structured JSON context object that will be used to generate a podcast conversation between a PM and a developer about this code.

You MUST respond with ONLY a valid JSON object. No prose, no markdown, no code fences. Just the raw JSON object.

The JSON object must have exactly this shape:
{
  "summary": "A 2-3 sentence summary of what this project is and does",
  "techStack": ["list", "of", "technologies", "used"],
  "architecture": "A paragraph describing how the codebase is structured and key architectural patterns",
  "keyComponents": [
    { "name": "ComponentName", "description": "What it does and why it matters" }
  ],
  "codeQuality": "A brief assessment of code quality, patterns, and notable practices",
  "podcastTopics": ["Interesting topics for a PM and Dev to discuss about this codebase"]
}

Focus on what would make interesting podcast discussion: architectural decisions, trade-offs, surprises in the code, potential improvements, and what the developers clearly cared about.`

function buildUserPrompt(owner: string, repo: string, files: FileContent[]): string {
  let prompt = `Analyse the following files from the GitHub repository ${owner}/${repo}:\n\n`

  for (const file of files) {
    prompt += `<file_content path="${file.path}">\n${file.content}\n</file_content>\n\n`
  }

  prompt += `Produce the JSON analysis now. Remember: respond with ONLY a valid JSON object, no other text.`

  return prompt
}

function parseContextJson(text: string): CodebaseContext | null {
  // Try to extract JSON from the response, handling potential markdown fences
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

    // Validate required fields
    if (
      typeof parsed.summary !== 'string' ||
      !Array.isArray(parsed.techStack) ||
      typeof parsed.architecture !== 'string' ||
      !Array.isArray(parsed.keyComponents) ||
      typeof parsed.codeQuality !== 'string' ||
      !Array.isArray(parsed.podcastTopics)
    ) {
      return null
    }

    return parsed as CodebaseContext
  } catch {
    return null
  }
}

export async function generateContext(
  ai: Ai,
  owner: string,
  repo: string,
  files: FileContent[],
): Promise<ContextResult> {
  const userPrompt = buildUserPrompt(owner, repo, files)

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // Using 8b model from types; swap to 70b at runtime if available on your plan
      const response = await ai.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2048,
      })

      if (!response || typeof response !== 'object' || !('response' in response)) {
        continue
      }

      const text = (response as { response: string }).response
      if (!text) continue

      const parsed = parseContextJson(text)
      if (parsed) {
        return { ok: true, data: parsed }
      }

      // First attempt failed to parse — retry with stricter prompt
      if (attempt === 0) continue
    } catch {
      if (attempt === 1) {
        return { ok: false, error: 'Failed to analyse the repository. Please try again.' }
      }
    }
  }

  return { ok: false, error: 'Failed to analyse the repository. Please try again.' }
}
