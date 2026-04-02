const PRIORITY_FILES = [
  'README.md', 'readme.md',
  'package.json', 'Cargo.toml', 'go.mod', 'pyproject.toml', 'requirements.txt',
  'tsconfig.json', 'vite.config.ts', 'next.config.js', 'next.config.ts',
  'wrangler.toml', 'wrangler.jsonc',
]

const PRIORITY_PATTERNS = [
  /^src\/(index|main|app)\.[tj]sx?$/,
  /^src\/lib\//,
  /^src\/routes?\//,
  /^src\/api\//,
  /^app\/layout\.[tj]sx?$/,
  /^app\/page\.[tj]sx?$/,
  /^lib\//,
  /^pages\//,
]

const IGNORE_PATTERNS = [
  /node_modules/, /\.lock$/, /dist\//, /build\//, /\.next\//,
  /\.min\./, /\.map$/, /\.svg$/, /\.png$/, /\.jpg$/, /\.jpeg$/, /\.gif$/, /\.ico$/,
  /\.woff/, /\.ttf$/, /\.eot$/,
  /\.test\.[tj]sx?$/, /\.spec\.[tj]sx?$/, /__tests__\//,
  /\.d\.ts$/, /\.snap$/,
  /\.env/, /\.DS_Store/,
]

const MAX_FILES = 15

export function selectKeyFiles(fileTree: string[]): string[] {
  const filtered = fileTree.filter(
    (f) => !IGNORE_PATTERNS.some((p) => p.test(f)),
  )

  const selected: string[] = []

  // Priority exact matches first
  for (const pf of PRIORITY_FILES) {
    if (filtered.includes(pf) && !selected.includes(pf)) {
      selected.push(pf)
    }
  }

  // Priority pattern matches
  for (const f of filtered) {
    if (selected.length >= MAX_FILES) break
    if (selected.includes(f)) continue
    if (PRIORITY_PATTERNS.some((p) => p.test(f))) selected.push(f)
  }

  // Fill remaining with source files, preferring shallower paths
  const sourceExtensions = /\.[tj]sx?$|\.py$|\.rs$|\.go$|\.rb$|\.java$|\.kt$/
  const sourceFiles = filtered
    .filter((f) => sourceExtensions.test(f))
    .filter((f) => !selected.includes(f))
    .sort((a, b) => a.split('/').length - b.split('/').length)

  for (const f of sourceFiles) {
    if (selected.length >= MAX_FILES) break
    selected.push(f)
  }

  return selected
}
