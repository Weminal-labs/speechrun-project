import type { TreeEntry } from './github-tree'

const MAX_FILES = 20

// Always include these files if present (exact match at any depth)
const PRIORITY_FILENAMES = new Set([
  'README.md',
  'README.txt',
  'readme.md',
  'package.json',
  'wrangler.toml',
  'wrangler.jsonc',
  'Cargo.toml',
  'go.mod',
  'pyproject.toml',
  'requirements.txt',
  'Gemfile',
  'Makefile',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'tsconfig.json',
])

// Directories to skip entirely
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '__pycache__',
  '.next',
  '.nuxt',
  'vendor',
  '.vscode',
  '.idea',
  '.github',
  'out',
  '.cache',
  '.turbo',
])

// Binary file extensions to skip
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp3', '.mp4', '.wav', '.ogg', '.webm', '.avi',
  '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
  '.exe', '.dll', '.so', '.dylib',
  '.lock', '.map',
])

// Prioritised source directories
const PRIORITY_DIRS = ['src/', 'lib/', 'app/', 'core/', 'server/', 'api/', 'worker/']

function isInIgnoredDir(path: string): boolean {
  const parts = path.split('/')
  return parts.some((part) => IGNORED_DIRS.has(part))
}

function hasBinaryExtension(path: string): boolean {
  const dotIndex = path.lastIndexOf('.')
  if (dotIndex === -1) return false
  const ext = path.slice(dotIndex).toLowerCase()
  return BINARY_EXTENSIONS.has(ext)
}

function isPriorityFile(path: string): boolean {
  const filename = path.split('/').pop() ?? ''
  return PRIORITY_FILENAMES.has(filename)
}

function isRootMarkdown(path: string): boolean {
  return !path.includes('/') && path.endsWith('.md')
}

function isInPriorityDir(path: string): boolean {
  return PRIORITY_DIRS.some((dir) => path.startsWith(dir))
}

function depth(path: string): number {
  return path.split('/').length - 1
}

export function selectKeyFiles(tree: TreeEntry[]): string[] {
  // Only consider blobs (files), not trees (directories)
  const blobs = tree.filter((e) => e.type === 'blob')

  // Filter out ignored dirs and binary files
  const candidates = blobs.filter(
    (e) => !isInIgnoredDir(e.path) && !hasBinaryExtension(e.path),
  )

  // Score and sort
  const scored = candidates.map((entry) => {
    let score = 0
    if (isPriorityFile(entry.path)) score += 100
    if (isRootMarkdown(entry.path)) score += 80
    if (isInPriorityDir(entry.path)) score += 50
    // Shallow files score higher
    score -= depth(entry.path) * 5
    return { path: entry.path, score }
  })

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, MAX_FILES).map((s) => s.path)
}
