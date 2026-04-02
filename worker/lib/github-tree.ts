export interface TreeEntry {
  path: string
  type: 'blob' | 'tree'
  size: number
}

export type TreeResult =
  | { ok: true; data: TreeEntry[] }
  | { ok: false; error: string }

const GITHUB_API = 'https://api.github.com'

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

async function getDefaultBranch(owner: string, repo: string, token?: string): Promise<{ ok: true; branch: string } | { ok: false; error: string }> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: headers(token),
  })

  if (res.status === 404) {
    return { ok: false, error: 'Repository not found. Make sure it is public and the URL is correct.' }
  }
  if (res.status === 403 || res.status === 429) {
    return { ok: false, error: 'GitHub is temporarily unavailable. Please try again in a moment.' }
  }
  if (!res.ok) {
    return { ok: false, error: 'Failed to fetch repository information. Please try again.' }
  }

  const data = await res.json() as { default_branch: string }
  return { ok: true, branch: data.default_branch }
}

export async function fetchRepoTree(owner: string, repo: string, token?: string): Promise<TreeResult> {
  const branchResult = await getDefaultBranch(owner, repo, token)
  if (!branchResult.ok) {
    return branchResult
  }

  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branchResult.branch}?recursive=1`,
    { headers: headers(token) },
  )

  if (res.status === 404) {
    return { ok: false, error: 'Repository not found. Make sure it is public and the URL is correct.' }
  }
  if (res.status === 403 || res.status === 429) {
    return { ok: false, error: 'GitHub is temporarily unavailable. Please try again in a moment.' }
  }
  if (!res.ok) {
    return { ok: false, error: 'Failed to fetch repository tree. Please try again.' }
  }

  const data = await res.json() as { tree: Array<{ path: string; type: string; size?: number }> }

  if (!data.tree || data.tree.length === 0) {
    return { ok: false, error: 'This repository appears to be empty. Nothing to analyse.' }
  }

  const entries: TreeEntry[] = data.tree
    .filter((entry) => entry.type === 'blob' || entry.type === 'tree')
    .map((entry) => ({
      path: entry.path,
      type: entry.type as 'blob' | 'tree',
      size: entry.size ?? 0,
    }))

  return { ok: true, data: entries }
}
