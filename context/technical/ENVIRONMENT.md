# Environment Variables

> Never commit real values. This file documents what variables are needed and why.

## Required

| Variable | Description | Example |
|----------|-------------|---------|
| `ELEVENLABS_API_KEY` | ElevenLabs API key for text-to-speech and dialogue generation | `sk_...` |

## Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `CLOUDFLARE_AI_GATEWAY` | AI Gateway endpoint for model routing and observability | None (direct Workers AI calls) |
| `GITHUB_TOKEN` | GitHub personal access token for higher rate limits on repo fetching | None (public repos work without auth) |

## Setup Instructions

### ElevenLabs API Key
1. Sign in at elevenlabs.io
2. Go to Profile > API Keys
3. Copy your API key

### Cloudflare
- Cloudflare account and Wrangler CLI handle authentication via `wrangler login`
- R2 bucket and Durable Object bindings are configured in `wrangler.toml`

### GitHub Token (optional)
- Only needed if you hit rate limits fetching public repos
- Create a fine-grained personal access token at github.com/settings/tokens with "Contents: read" permission

### Local Development
- For local `wrangler dev`, create a `.dev.vars` file (gitignored) in the project root:
  ```
  ELEVENLABS_API_KEY=sk_...
  GITHUB_TOKEN=ghp_... (optional)
  ```
- For production `wrangler deploy`, use `wrangler secret put ELEVENLABS_API_KEY` to set secrets on Cloudflare's edge
- The `.dev.vars` file is automatically loaded by Wrangler in development and is never committed
