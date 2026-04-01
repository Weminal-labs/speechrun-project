const GITHUB_API = 'https://api.github.com'
const MAX_FILE_SIZE = 50 * 1024 // 50 KB
const MAX_CONCURRENT = 10

export interface FileContent {
  path: string
  content: string
  truncated: boolean
}

export type FilesResult =
  | { ok: true; data: FileContent[] }
  | { ok: false; error: string }

function headers(token?: string): HeadersInit {
  const h: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'SpeechRun/1.0',
  }
  if (token) {
    h['Authorization'] = `Bearer ${token}`
  }
  return h
}

async function fetchSingleFile(
  owner: string,
  repo: string,
  path: string,
  token?: string,
): Promise<FileContent | null> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    { headers: headers(token) },
  )

  if (!res.ok) return null

  const data = await res.json() as { content?: string; encoding?: string; size?: number }

  if (!data.content || data.encoding !== 'base64') return null

  // Decode base64 content
  const raw = atob(data.content.replace(/\n/g, ''))

  let content = raw
  let truncated = false

  if (raw.length > MAX_FILE_SIZE) {
    content = raw.slice(0, MAX_FILE_SIZE) + '\n[TRUNCATED]'
    truncated = true
  }

  return { path, content, truncated }
}

// Run promises with concurrency limit
async function pooled<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = []
  let index = 0

  async function worker() {
    while (index < tasks.length) {
      const i = index++
      results[i] = await tasks[i]()
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker())
  await Promise.all(workers)
  return results
}

export async function fetchFileContents(
  owner: string,
  repo: string,
  paths: string[],
  token?: string,
): Promise<FilesResult> {
  const tasks = paths.map(
    (path) => () => fetchSingleFile(owner, repo, path, token),
  )

  try {
    const results = await pooled(tasks, MAX_CONCURRENT)
    const files = results.filter((r): r is FileContent => r !== null)

    if (files.length === 0) {
      return { ok: false, error: 'Failed to fetch any files from the repository. Please try again.' }
    }

    return { ok: true, data: files }
  } catch {
    return { ok: false, error: 'Failed to fetch repository files. Please try again.' }
  }
}
