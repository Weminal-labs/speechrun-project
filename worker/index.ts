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

    // Route agent WebSocket/RPC requests
    const agentResponse = await routeAgentRequest(request, env)
    if (agentResponse) return agentResponse

    if (url.pathname.startsWith('/api/')) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    return new Response('Not found', { status: 404 })
  },
} satisfies ExportedHandler<Env>
