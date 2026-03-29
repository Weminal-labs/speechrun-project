# Code Standards & Conventions

## File Naming

**Rule:** kebab-case for all files and directories.

```
Good:
- src/components/terminal-chrome.tsx
- src/components/conversation-panel.tsx
- src/utils/api-client.ts
- src/hooks/use-websocket.ts

Bad:
- src/components/TerminalChrome.tsx (PascalCase)
- src/components/terminalChrome.tsx (camelCase)
```

## TypeScript Conventions

### Strict Mode (Required)

All code must compile in TypeScript strict mode. No exceptions.

```typescript
// tsconfig.json enforces:
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true
}
```

### Naming

| Type | Convention | Example |
|------|-----------|---------|
| **Components** | PascalCase | `ConversationPanel`, `TerminalChrome` |
| **Functions** | camelCase | `fetchRepoTree`, `generateContext` |
| **Variables** | camelCase | `audioUrl`, `isLoading` |
| **Constants** | SCREAMING_SNAKE_CASE | `MAX_REPO_SIZE`, `DEFAULT_TIMEOUT` |
| **Types/Interfaces** | PascalCase | `ApiResponse`, `ContextData` |
| **Booleans** | Prefix with `is` or `has` | `isLoading`, `hasError` |

### Imports

Order imports by: external libraries → internal components → relative paths → types.

```typescript
// ✓ Good
import React, { useState } from 'react'
import ConversationPanel from './components/conversation-panel'
import { fetchRepo } from '../api/github-client'
import type { RepoData } from '../types'

// ✗ Bad
import type { RepoData } from '../types'
import { fetchRepo } from '../api/github-client'
import React, { useState } from 'react'
import ConversationPanel from './components/conversation-panel'
```

### Type Annotations

Always provide explicit types for exported functions and components.

```typescript
// ✓ Good
function fetchRepo(url: string): Promise<RepoData> {
  // ...
}

interface ConversationPanelProps {
  transcript: Transcript[]
  isLoading: boolean
  onSubmit: (url: string) => void
}

function ConversationPanel({ transcript, isLoading, onSubmit }: ConversationPanelProps) {
  // ...
}

// ✗ Bad
function fetchRepo(url) {
  // Missing return type
}

function ConversationPanel(props) {
  // Missing prop types
}
```

### Avoid Type Escape Hatches

Never use `as any`, `@ts-ignore`, or `@ts-expect-error` without explicit justification.

```typescript
// ✗ Never
const data = JSON.parse(response) as any

// ✓ If required (rare)
// @ts-expect-error: Third-party lib lacks types for this method
const result = externalLib.legacyMethod()
```

## React Component Patterns

### Functional Components with Hooks

All components must be functional components. Class components are not permitted.

```typescript
// ✓ Good
interface MyComponentProps {
  title: string
  onClose: () => void
}

function MyComponent({ title, onClose }: MyComponentProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <h1>{title}</h1>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
    </div>
  )
}

export default MyComponent

// ✗ Bad
export const MyComponent = ({ title, onClose }) => {
  // Default export should be the component, not const
}

// ✗ Bad
class MyComponent extends React.Component {
  // Class components discouraged
}
```

### Component Export

Use default exports for components; named exports for utilities.

```typescript
// ✓ Components (default export)
export default ConversationPanel

// ✓ Utilities (named exports)
export function parseGithubUrl(url: string): RepoInfo {
  // ...
}

export const API_TIMEOUT = 5000
```

### Props Interface Naming

Component props interfaces should be named `{ComponentName}Props`.

```typescript
interface ConversationPanelProps {
  transcript: Turn[]
  isLoading: boolean
}

function ConversationPanel(props: ConversationPanelProps) {
  // ...
}
```

## Tailwind CSS Usage

### Custom Color Tokens

Use the custom theme tokens defined in `tailwind.config.ts` for all terminal aesthetic elements.

```typescript
// ✓ Good - Using custom tokens
<div className="bg-terminal-bg text-terminal-text border border-terminal-border">
  Content
</div>

// ✗ Bad - Using arbitrary Tailwind colors
<div className="bg-blue-900 text-gray-100 border border-blue-700">
  Content
</div>
```

### Token Reference

| Token | Color | Usage |
|-------|-------|-------|
| `terminal-bg` | #1a237e | Background (deep blueprint) |
| `terminal-text` | #e8eaf6 | Default text color |
| `terminal-accent` | #7986cb | Interactive elements, highlights |
| `terminal-border` | #3949ab | Borders, dividers |
| `terminal-dim` | #5c6bc0 | Disabled text, secondary info |
| `terminal-bright` | #c5cae9 | Bright accents, hover states |

### Utility Class Best Practices

Keep utility class lists readable; extract complex patterns to CSS modules if they exceed 3 lines.

```typescript
// ✓ Good - Simple, readable
<div className="flex items-center justify-between p-4 border-b border-terminal-border">
  Content
</div>

// ✓ Good - Complex pattern extracted
<div className={`
  flex flex-col gap-2 p-4
  bg-terminal-bg text-terminal-text
  border border-terminal-border rounded
  hover:bg-terminal-accent transition-colors
`}>
  Content
</div>

// ✗ Bad - Excessive, hard to parse
<div className="flex items-center justify-between p-4 border-b border-terminal-border gap-3 hover:bg-terminal-dim transition-all duration-200 ease-in-out">
  Content
</div>
```

### No Arbitrary Values in Components

Avoid arbitrary Tailwind values; define missing tokens in `tailwind.config.ts` instead.

```typescript
// ✓ Define in config
// tailwind.config.ts
colors: {
  'terminal-success': '#4caf50'
}

// Use in component
<div className="text-terminal-success">Success</div>

// ✗ Bad - Arbitrary values
<div className="text-[#4caf50]">Success</div>
```

## Comment Policy

Comments should explain **why**, not what. Code should be self-documenting for the "what."

### Comments ARE Required For

- **Business logic:** Why this specific threshold, formula, or branching
- **Security rationale:** Why a check exists, what attack it prevents
- **Workarounds:** What bug/limitation this works around (with ticket/link)
- **Non-obvious performance:** Why this approach over the obvious one
- **Invariants:** Assumptions that must hold for correctness

```typescript
// ✓ Good - Explains why
// GitHub API has a 60-req/hour rate limit for unauthenticated requests.
// We batch file requests to avoid hitting the limit on large repos.
function batchFetchFiles(urls: string[]) {
  // ...
}

// ✗ Bad - Just describes the code
function batchFetchFiles(urls: string[]) {
  // Loop through URLs and fetch files
  for (const url of urls) {
    // Fetch each file
    fetch(url)
  }
}
```

### Comments are FORBIDDEN For

- Comments that repeat what code does
- Commented-out code (delete it)
- Obvious comments ("increment counter", "set variable")
- Standard library/framework usage

```typescript
// ✗ Bad
const name = 'John' // Set name to John
const count = count + 1 // Increment count
// const oldCode = foo() // Old implementation - keeping for reference

// ✓ Just write clear code
const userName = 'John'
const count = count + 1
// Delete commented code; use version control if you need history
```

## File Organization

### Component Files

Keep components focused; split if exceeding 200 lines.

```
src/components/
├── conversation-panel.tsx       # Main component
├── conversation-panel.test.tsx  # Tests (if added)
├── sub-components/
│   ├── message-bubble.tsx
│   ├── transcript-list.tsx
│   └── audio-player.tsx
└── styles.css                   # Component-scoped styles (if needed)
```

### Utilities

Group related utilities in modules with clear naming.

```
src/utils/
├── github-client.ts           # GitHub API calls
├── audio-processor.ts         # Audio generation utils
├── parse-url.ts              # URL parsing
└── theme-utils.ts            # Tailwind/theme helpers
```

### Hooks

Custom hooks go in `src/hooks/` with `use-` prefix.

```
src/hooks/
├── use-websocket.ts          # WebSocket connection
├── use-audio-player.ts       # Audio playback state
└── use-github-repo.ts        # GitHub repo data fetching
```

## Error Handling

Always handle errors explicitly; never use empty catch blocks.

```typescript
// ✓ Good
try {
  const repo = await fetchRepo(url)
  setRepoData(repo)
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  setError(`Failed to fetch repo: ${message}`)
  logError(error)
}

// ✗ Bad
try {
  const repo = await fetchRepo(url)
  setRepoData(repo)
} catch (error) {
  // Silently ignore
}

// ✗ Bad
try {
  const repo = await fetchRepo(url)
  setRepoData(repo)
} catch (error) {
  console.log('error') // Not helpful
}
```

## Async/Await

Always handle promise rejections; avoid floating promises.

```typescript
// ✓ Good
async function loadData() {
  try {
    const data = await fetchData()
    setData(data)
  } catch (error) {
    setError(error)
  }
}

// ✗ Bad - Floating promise
fetchData().then(data => setData(data)) // Unhandled rejection

// ✗ Bad - Not awaited
fetchData() // Fire and forget

// ✓ Good if intentional
void fetchData() // Explicit "fire and forget" with void
```

## Code Review Checklist

Before submitting code, verify:

- [ ] No TypeScript errors (`tsc -b`)
- [ ] No unused variables or imports
- [ ] All functions have explicit return types
- [ ] No `any`, `@ts-ignore`, or `@ts-expect-error` without justification
- [ ] Components use props interfaces with `{ComponentName}Props` naming
- [ ] All errors are handled (no empty catch blocks)
- [ ] Comments explain "why," not "what"
- [ ] Tailwind uses custom tokens, not arbitrary colors
- [ ] File names are kebab-case
- [ ] Imports are ordered: external → internal → relative → types
- [ ] No commented-out code
- [ ] Component files under 200 lines (split if needed)

## Size Limits

| Type | Limit | Reason |
|------|-------|--------|
| Component file | 200 LOC | Readability, testability |
| Function | 50 LOC | Cognitive load |
| Import list | 10 imports | Indicates component does too much |
| Props interface | 12 props | Consider splitting component |

If approaching limits, refactor into smaller, focused pieces.

## Configuration

**TypeScript:** See `tsconfig.json` for strict mode settings.

**Tailwind:** See `tailwind.config.ts` for custom color tokens and theme extensions.

**Vite:** See `vite.config.ts` (if exists) for build optimization.

No ESLint or Prettier is configured yet; maintainers enforce style via code review.
