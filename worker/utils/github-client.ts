const GITHUB_API = 'https://api.github.com'

export interface RepoMetadata {
  fullName: string
  description: string
  language: string
  defaultBranch: string
  stargazersCount: number
}

function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'SpeechRun/0.1',
  }
  if (token) h.Authorization = `token ${token}`
  return h
}

export function parseGithubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^/]+)\/([^/\?#]+)/)
  if (!match) throw new Error('Invalid GitHub URL — expected github.com/owner/repo')
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') }
}

export async function fetchRepoMetadata(
  owner: string,
  repo: string,
  token?: string,
): Promise<RepoMetadata> {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: headers(token),
  })

  if (response.status === 404) {
    throw new Error(`Repository ${owner}/${repo} not found — only public repos are supported`)
  }
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }

  const data: Record<string, unknown> = await response.json()
  return {
    fullName: data.full_name as string,
    description: (data.description as string) || '',
    language: (data.language as string) || 'Unknown',
    defaultBranch: data.default_branch as string,
    stargazersCount: data.stargazers_count as number,
  }
}

export async function fetchFileTree(
  owner: string,
  repo: string,
  branch: string,
  token?: string,
): Promise<string[]> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: headers(token) },
  )

  if (!response.ok) {
    throw new Error(`GitHub tree fetch failed: ${response.status}`)
  }

  const data: { tree: Array<{ type: string; path: string }> } = await response.json()
  return data.tree
    .filter((item) => item.type === 'blob')
    .map((item) => item.path)
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  token?: string,
): Promise<string> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        ...headers(token),
        Accept: 'application/vnd.github.v3.raw',
      },
    },
  )

  if (!response.ok) return ''

  const text = await response.text()
  // Truncate very large files to keep context manageable
  return text.length > 5000 ? text.slice(0, 5000) + '\n// ... truncated' : text
}

export async function fetchMultipleFiles(
  owner: string,
  repo: string,
  paths: string[],
  token?: string,
): Promise<Record<string, string>> {
  const results: Record<string, string> = {}

  // Fetch in batches of 5 to avoid overwhelming the API
  for (let i = 0; i < paths.length; i += 5) {
    const batch = paths.slice(i, i + 5)
    const fetched = await Promise.all(
      batch.map(async (path) => ({
        path,
        content: await fetchFileContent(owner, repo, path, token),
      })),
    )
    for (const { path, content } of fetched) {
      if (content) results[path] = content
    }
  }

  return results
}
