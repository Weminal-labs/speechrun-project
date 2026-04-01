import { routeAgentRequest } from 'agents'
import type { Env } from './types'

export { Orchestrator } from './agents/orchestrator'
export { Nova } from './agents/nova'
export { Aero } from './agents/aero'

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok', version: '0.2.0' })
    }

    // REST endpoint: trigger podcast generation
    if (url.pathname === '/api/generate' && request.method === 'POST') {
      try {
        const body: { repoUrl?: string } = await request.json()
        if (!body.repoUrl) {
          return Response.json({ error: 'repoUrl is required' }, { status: 400 })
        }
        const id = env.ORCHESTRATOR.idFromName(body.repoUrl)
        const orchestrator = env.ORCHESTRATOR.get(id)
        return orchestrator.fetch(request)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request'
        return Response.json({ error: message }, { status: 400 })
      }
    }

    // Serve audio files from R2
    if (url.pathname.startsWith('/api/audio/')) {
      const key = url.pathname.replace('/api/audio/', '')
      const object = await env.AUDIO_BUCKET.get(key)
      if (!object) return new Response('Not found', { status: 404 })

      return new Response(object.body, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=86400',
        },
      })
    }

    // Route agent WebSocket/RPC requests
    const agentResponse = await routeAgentRequest(request, env)
    if (agentResponse) return agentResponse

    if (url.pathname.startsWith('/api/')) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    return new Response('Not found', { status: 404 })
  },
} satisfies ExportedHandler<Env>
