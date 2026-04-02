export interface ParsedRepo {
  owner: string
  repo: string
}

export type ParseResult =
  | { ok: true; data: ParsedRepo }
  | { ok: false; error: string }

const VALID_SEGMENT = /^[A-Za-z0-9_.-]+$/

export function parseGitHubUrl(raw: string): ParseResult {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 512) {
    return { ok: false, error: "Try: owner/repo or https://github.com/owner/repo" }
  }

  const trimmed = raw.trim()

  // Support shorthand: "owner/repo" without full URL
  const shorthandMatch = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/)
  if (shorthandMatch) {
    const owner = shorthandMatch[1]
    let repo = shorthandMatch[2]
    if (repo.endsWith('.git')) repo = repo.slice(0, -4)
    if (owner.length > 0 && repo.length > 0 && owner !== '..' && repo !== '..') {
      return { ok: true, data: { owner, repo } }
    }
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { ok: false, error: "Try: owner/repo or https://github.com/owner/repo" }
  }

  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') {
    return { ok: false, error: "Try: owner/repo or https://github.com/owner/repo" }
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, error: "Try: owner/repo or https://github.com/owner/repo" }
  }

  // Extract path segments, filter empty strings from leading/trailing slashes
  const segments = url.pathname.split('/').filter(Boolean)

  if (segments.length < 2) {
    return { ok: false, error: "Try: owner/repo or https://github.com/owner/repo" }
  }

  const owner = segments[0]
  let repo = segments[1]

  // Strip .git suffix
  if (repo.endsWith('.git')) {
    repo = repo.slice(0, -4)
  }

  // Validate characters
  if (!VALID_SEGMENT.test(owner) || !VALID_SEGMENT.test(repo)) {
    return { ok: false, error: "Try: owner/repo or https://github.com/owner/repo" }
  }

  // Reject path traversal
  if (owner === '..' || repo === '..' || owner === '.' || repo === '.') {
    return { ok: false, error: "Try: owner/repo or https://github.com/owner/repo" }
  }

  // Reject empty after strip
  if (owner.length === 0 || repo.length === 0) {
    return { ok: false, error: "Try: owner/repo or https://github.com/owner/repo" }
  }

  return { ok: true, data: { owner, repo } }
}
