import { SpeechRunSession } from './do/session'
import type { CodebaseContext } from './lib/context-generator'
import { parseGitHubUrl } from './lib/github-url'
import { fetchRepoTree } from './lib/github-tree'
import { selectKeyFiles } from './lib/file-selector'
import { fetchFileContents } from './lib/github-files'
import { generateContext } from './lib/context-generator'
import { generateTopicOutline } from './lib/dialogue-orchestrator'
import { createTurnSchedule, HISTORY_WINDOW } from './lib/turn-coordinator'
import { generateTurn } from './lib/turn-generator'

export { SpeechRunSession }

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: CORS_HEADERS })
}

function errorResponse(error: string, status = 400): Response {
  return jsonResponse({ error }, status)
}

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Status value used by Phase 2 when context is ready
const STATUS_CONTEXT_READY = 'complete'

// --- POST /api/ingest ---

async function handleIngest(request: Request, env: Env): Promise<Response> {
  let body: { url?: unknown }
  try {
    body = await request.json() as { url?: unknown }
  } catch {
    return errorResponse('Invalid request body', 400)
  }

  if (typeof body.url !== 'string') {
    return errorResponse("That doesn't look like a valid GitHub URL. Try: https://github.com/owner/repo", 400)
  }

  const parsed = parseGitHubUrl(body.url)
  if (!parsed.ok) {
    return errorResponse(parsed.error, 400)
  }

  const { owner, repo } = parsed.data
  const token = env.GITHUB_TOKEN

  const treeResult = await fetchRepoTree(owner, repo, token)
  if (!treeResult.ok) {
    const status = treeResult.error.includes('not found') ? 404 : 502
    return errorResponse(treeResult.error, status)
  }

  const selectedPaths = selectKeyFiles(treeResult.data)
  if (selectedPaths.length === 0) {
    return errorResponse('This repository appears to be empty. Nothing to analyse.', 400)
  }

  const filesResult = await fetchFileContents(owner, repo, selectedPaths, token)
  if (!filesResult.ok) {
    return errorResponse(filesResult.error, 502)
  }

  const contextResult = await generateContext(env.AI, owner, repo, filesResult.data)
  if (!contextResult.ok) {
    return errorResponse(contextResult.error, 502)
  }

  const sessionId = crypto.randomUUID()
  const doId = env.SPEECHRUN_SESSION.idFromName(sessionId)
  const stub = env.SPEECHRUN_SESSION.get(doId)

  await stub.init(`https://github.com/${owner}/${repo}`)
  await stub.setContext(JSON.stringify(contextResult.data))

  return jsonResponse({ sessionId, context: contextResult.data })
}

// --- POST /api/generate-dialogue ---

async function handleGenerateDialogue(request: Request, env: Env): Promise<Response> {
  let body: { sessionId?: unknown }
  try {
    body = await request.json() as { sessionId?: unknown }
  } catch {
    return errorResponse('Invalid request body', 400)
  }

  if (typeof body.sessionId !== 'string' || !UUID_V4_RE.test(body.sessionId)) {
    return errorResponse('Session ID required', 400)
  }

  const sessionId = body.sessionId
  const doId = env.SPEECHRUN_SESSION.idFromName(sessionId)
  const stub = env.SPEECHRUN_SESSION.get(doId)

  // Check session state
  const status = await stub.getStatus()
  if (status === 'unknown') {
    return errorResponse('Session not found. Run ingestion first.', 404)
  }
  if (status === 'pending') {
    return errorResponse('Ingestion not complete. Please wait for analysis to finish.', 400)
  }
  if (status === 'dialogue_in_progress') {
    return errorResponse('Dialogue generation already in progress for this session.', 409)
  }
  if (status === 'dialogue_ready') {
    // Return existing turns
    const turns = await stub.getTurns()
    const outline = await stub.getOutline()
    return jsonResponse({ sessionId, status: 'dialogue_ready', outline, turns })
  }

  // Get stored context
  const contextObj = await stub.getContext()
  if (!contextObj) {
    return errorResponse('No codebase context found. Run ingestion first.', 404)
  }
  const context = contextObj as CodebaseContext

  // Mark as in progress
  await stub.setStatus('dialogue_in_progress')

  // Step 1: Generate topic outline
  const outlineResult = await generateTopicOutline(env.AI, context)
  if (!outlineResult.ok) {
    await stub.setStatus(STATUS_CONTEXT_READY) // Reset to allow retry
    return errorResponse(outlineResult.error, 502)
  }

  await stub.storeOutline(outlineResult.data)

  // Step 2: Create turn schedule
  const schedule = createTurnSchedule(outlineResult.data)

  // Step 3: Generate turns sequentially
  const turns = []
  for (const scheduled of schedule) {
    const history = await stub.getLastTurns(HISTORY_WINDOW)
    const topic = outlineResult.data[scheduled.topicIndex]

    const turnResult = await generateTurn(env.AI, {
      speaker: scheduled.speaker,
      turnOrder: scheduled.turnOrder,
      topic,
      history,
    })

    if (turnResult.ok) {
      await stub.storeTurn(turnResult.data)
      turns.push(turnResult.data)
    }
    // If turn fails, skip it and continue (per spec)
  }

  // Mark complete
  await stub.setStatus('dialogue_ready')

  return jsonResponse({
    sessionId,
    status: 'dialogue_ready',
    outline: outlineResult.data,
    turns,
  })
}

// --- GET /api/session/:id ---

async function handleSession(sessionId: string, env: Env): Promise<Response> {
  const doId = env.SPEECHRUN_SESSION.idFromName(sessionId)
  const stub = env.SPEECHRUN_SESSION.get(doId)
  const context = await stub.getContext()
  const status = await stub.getStatus()
  const turns = await stub.getTurns()
  const outline = await stub.getOutline()

  return jsonResponse({ sessionId, status, context, outline, turns })
}

// --- Main router ---

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    if (url.pathname === '/api/ingest' && request.method === 'POST') {
      return handleIngest(request, env)
    }

    if (url.pathname === '/api/generate-dialogue' && request.method === 'POST') {
      return handleGenerateDialogue(request, env)
    }

    if (url.pathname.startsWith('/api/session/') && request.method === 'GET') {
      const sessionId = url.pathname.split('/api/session/')[1]
      if (!sessionId || !UUID_V4_RE.test(sessionId)) {
        return errorResponse('Valid session ID required', 400)
      }
      return handleSession(sessionId, env)
    }

    return new Response('Not found', { status: 404 })
  },
} satisfies ExportedHandler<Env>
