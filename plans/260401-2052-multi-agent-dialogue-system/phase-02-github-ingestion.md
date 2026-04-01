# Phase 2: GitHub Codebase Ingestion

## Context Links
- [System Architecture: Codebase Ingestion](../../docs/system-architecture.md)
- [GitHub REST API Docs](https://docs.github.com/en/rest)
- [Phase 1: SDK Setup](phase-01-agents-sdk-setup.md)

## Overview
- **Priority:** P1
- **Status:** Pending
- **Effort:** 2h
- **Blocked by:** Phase 1
- **Description:** Implement Orchestrator agent with GitHub repo fetching, smart file selection, and Workers AI context generation.

## Key Insights
- GitHub REST API: 60 req/hr unauthenticated, 5000/hr with token
- Tree endpoint returns full file list in one call (`?recursive=1`)
- Contents endpoint returns base64-encoded file content
- Smart file selection keeps context within LLM token limits (~128K)
- Workers AI Llama 3.1 70B handles code analysis well

## Requirements

### Functional
- Parse and validate GitHub URLs (owner/repo extraction)
- Fetch repo metadata via GitHub REST API
- Fetch file tree recursively
- Select key files intelligently (README, package.json, entry points, config)
- Fetch selected file contents (max 10-15 files, ~50KB total)
- Generate codebase context summary via Workers AI
- Store context in Orchestrator state
- Expose `@callable() startGeneration(repoUrl)` method
- Broadcast status updates to connected WebSocket clients

### Non-Functional
- Total GitHub API calls per generation: < 20
- Context generation latency: < 15s
- Handle repos up to ~50K LOC gracefully

## Related Code Files

| Action | File |
|--------|------|
| Create | `worker/agents/orchestrator.ts` (full implementation) |
| Create | `worker/utils/github-client.ts` |
| Create | `worker/utils/file-selector.ts` |
| Modify | `worker/index.ts` (add /api/generate route) |

## Architecture: Data Flow

```
User submits GitHub URL
    ↓
Orchestrator.startGeneration(repoUrl)
    ↓
1. parseGithubUrl(repoUrl) → { owner, repo }
    ↓
2. fetchRepoMetadata(owner, repo) → { description, language, default_branch }
    ↓
3. fetchFileTree(owner, repo, branch) → string[] (all file paths)
    ↓
4. selectKeyFiles(fileTree) → string[] (10-15 important files)
    ↓
5. fetchFileContents(owner, repo, selectedFiles) → Record<string, string>
    ↓
6. generateContext(metadata, fileTree, fileContents) → ContextData
    ↓
7. this.setState({ context, status: 'analyzing' })
    → WebSocket broadcasts to frontend
```

## Implementation Steps

### 1. Create `worker/utils/github-client.ts`

```typescript
interface RepoMetadata {
  fullName: string
  description: string
  language: string
  defaultBranch: string
  stargazersCount: number
}

const GITHUB_API = 'https://api.github.com'

export function parseGithubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/)
  if (!match) throw new Error('Invalid GitHub URL')
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') }
}

export async function fetchRepoMetadata(
  owner: string,
  repo: string,
  token?: string
): Promise<RepoMetadata> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'SpeechRun/0.1',
  }
  if (token) headers.Authorization = `token ${token}`

  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers })
  if (!response.ok) throw new Error(`GitHub API error: ${response.status}`)

  const data = await response.json()
  return {
    fullName: data.full_name,
    description: data.description || '',
    language: data.language || 'Unknown',
    defaultBranch: data.default_branch,
    stargazersCount: data.stargazers_count,
  }
}

export async function fetchFileTree(
  owner: string,
  repo: string,
  branch: string,
  token?: string
): Promise<string[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'SpeechRun/0.1',
  }
  if (token) headers.Authorization = `token ${token}`

  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers }
  )
  if (!response.ok) throw new Error(`GitHub tree fetch failed: ${response.status}`)

  const data = await response.json()
  return data.tree
    .filter((item: { type: string }) => item.type === 'blob')
    .map((item: { path: string }) => item.path)
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  token?: string
): Promise<string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3.raw',
    'User-Agent': 'SpeechRun/0.1',
  }
  if (token) headers.Authorization = `token ${token}`

  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    { headers }
  )
  if (!response.ok) return ''

  return response.text()
}
```

### 2. Create `worker/utils/file-selector.ts`

Smart file selection logic — prioritize files that reveal architecture:

```typescript
const PRIORITY_FILES = [
  'README.md', 'readme.md',
  'package.json', 'Cargo.toml', 'go.mod', 'pyproject.toml',
  'tsconfig.json', 'vite.config.ts', 'next.config.js',
]

const PRIORITY_PATTERNS = [
  /^src\/(index|main|app)\.[tj]sx?$/,
  /^src\/lib\//,
  /^src\/routes?\//,
  /^src\/api\//,
  /^app\/layout\.[tj]sx?$/,
  /^app\/page\.[tj]sx?$/,
]

const IGNORE_PATTERNS = [
  /node_modules/, /\.lock$/, /dist\//, /build\//,
  /\.min\./, /\.map$/, /\.svg$/, /\.png$/, /\.jpg$/,
  /\.test\.[tj]sx?$/, /\.spec\.[tj]sx?$/,
  /\.d\.ts$/,
]

const MAX_FILES = 15
const MAX_FILE_SIZE = 5000 // chars per file

export function selectKeyFiles(fileTree: string[]): string[] {
  const filtered = fileTree.filter(
    (f) => !IGNORE_PATTERNS.some((p) => p.test(f))
  )

  const selected: string[] = []

  // Priority exact matches first
  for (const pf of PRIORITY_FILES) {
    if (filtered.includes(pf)) selected.push(pf)
  }

  // Priority pattern matches
  for (const f of filtered) {
    if (selected.length >= MAX_FILES) break
    if (selected.includes(f)) continue
    if (PRIORITY_PATTERNS.some((p) => p.test(f))) selected.push(f)
  }

  // Fill remaining with source files (prefer shorter paths = top-level)
  const sourceFiles = filtered
    .filter((f) => /\.[tj]sx?$|\.py$|\.rs$|\.go$/.test(f))
    .filter((f) => !selected.includes(f))
    .sort((a, b) => a.split('/').length - b.split('/').length)

  for (const f of sourceFiles) {
    if (selected.length >= MAX_FILES) break
    selected.push(f)
  }

  return selected
}
```

### 3. Implement `worker/agents/orchestrator.ts`

Full Orchestrator agent with GitHub fetch and context generation. Uses `@callable()` for `startGeneration`. Broadcasts state updates to connected WebSocket clients via `this.setState()`.

Key method: `startGeneration(repoUrl: string)`:
1. Parse URL, validate
2. Set status to 'fetching', broadcast
3. Fetch repo metadata + file tree
4. Select key files, fetch contents
5. Set status to 'analyzing', broadcast
6. Call Workers AI to generate context summary
7. Store context in state
8. Return success (dialogue generation happens in Phase 3)

### 4. Wire up route in `worker/index.ts`

Add POST `/api/generate` endpoint that creates/gets an Orchestrator DO instance and proxies the request.

```typescript
if (url.pathname === '/api/generate' && request.method === 'POST') {
  const body = await request.json()
  const id = env.ORCHESTRATOR.idFromName(body.repoUrl)
  const orchestrator = env.ORCHESTRATOR.get(id)
  return orchestrator.fetch(request)
}
```

## Todo List

- [ ] Create worker/utils/github-client.ts with URL parsing, metadata fetch, tree fetch, content fetch
- [ ] Create worker/utils/file-selector.ts with smart file selection
- [ ] Implement Orchestrator.startGeneration() with full GitHub ingestion flow
- [ ] Implement Orchestrator.generateContext() using Workers AI
- [ ] Add POST /api/generate route in worker/index.ts
- [ ] Broadcast status updates via WebSocket during ingestion
- [ ] Handle GitHub API errors (404, rate limit, timeout)
- [ ] Test with a real public GitHub repo
- [ ] Verify context generation produces coherent summaries

## Success Criteria
- `POST /api/generate { repoUrl: "https://github.com/owner/repo" }` returns context data
- File tree fetched in single API call
- 10-15 key files selected and fetched
- Workers AI generates coherent codebase summary
- Status broadcasts reach connected WebSocket clients
- GitHub 404/rate-limit errors handled gracefully

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| GitHub rate limit (60/hr unauthenticated) | High | High | Support GITHUB_TOKEN; batch requests; cache in state |
| Large repos exceed LLM context window | Medium | Medium | File selector limits to 15 files, ~50KB; truncate if needed |
| Workers AI timeout on large context | Low | Medium | Set reasonable prompt size; retry once |
| Private repos return 404 | Medium | Low | Clear error message: "Only public repos supported" |

## Security Considerations
- Validate GitHub URL format before any API call
- Reject non-github.com URLs
- GITHUB_TOKEN stored as wrangler secret
- Never log or expose API tokens in responses
- Rate limit generation requests (future: per-IP throttle)
