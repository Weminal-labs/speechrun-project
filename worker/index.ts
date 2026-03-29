interface Env {
  // Future bindings for Durable Objects and R2:
  // ORCHESTRATOR: DurableObjectNamespace
  // NOVA: DurableObjectNamespace
  // AERO: DurableObjectNamespace
  // AUDIO_BUCKET: R2Bucket
}

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok', version: '0.1.0' });
    }

    if (url.pathname.startsWith('/api/')) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
