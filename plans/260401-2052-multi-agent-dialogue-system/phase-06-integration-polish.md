# Phase 6: Integration Testing & Polish

## Context Links
- [All previous phases](plan.md)
- [Deployment docs](../../context/ops/)
- [Code Standards](../../docs/code-standards.md)

## Overview
- **Priority:** P1
- **Status:** Pending
- **Effort:** 1h
- **Blocked by:** Phase 5
- **Description:** End-to-end verification, error handling polish, loading animations, production deploy.

## Key Insights
- All components exist at this point; this phase validates integration
- Focus on failure modes: invalid URLs, API timeouts, large repos
- Loading animations give user confidence during 2-3 min generation
- Deploy verification on speechrun.anhquan200304.workers.dev

## Requirements

### Functional
- Full pipeline works: paste URL → context → dialogue → audio → playback
- Invalid GitHub URLs show clear error
- Network failures don't leave UI in broken state
- Loading animation during each generation phase
- Deploy to Cloudflare Workers production

### Non-Functional
- End-to-end time: < 3 minutes for typical repo
- No console errors in production build
- Works in Chrome, Firefox, Safari

## Related Code Files

| Action | File |
|--------|------|
| Modify | `src/components/ConversationPanel.tsx` (loading states) |
| Modify | `worker/agents/orchestrator.ts` (error handling) |
| Modify | `worker/index.ts` (error responses) |

## Implementation Steps

### 1. End-to-end smoke test

Test with 3 repos of varying size:
- Small: `github.com/sindresorhus/is` (~50 files)
- Medium: `github.com/colinhacks/zod` (~200 files)
- Large: `github.com/vercel/next.js` (~5000 files — tests file selector limits)

Expected behavior for each:
- Context generation completes
- 10 dialogue turns generated
- Audio files created and playable
- Frontend displays all data correctly

### 2. Error handling matrix

| Error | Where | User-Facing Message | Recovery |
|-------|-------|---------------------|----------|
| Invalid GitHub URL | Orchestrator | "Invalid GitHub URL. Paste a link like github.com/owner/repo" | Reset to idle |
| GitHub 404 | Orchestrator | "Repository not found. Check the URL or try a public repo." | Reset to idle |
| GitHub rate limit | Orchestrator | "GitHub API rate limit reached. Try again in a few minutes." | Reset to idle |
| Workers AI timeout | Orchestrator | "AI analysis timed out. Retrying..." | Retry once, then error |
| ElevenLabs failure | Orchestrator | (silent) | Continue text-only |
| R2 upload failure | Orchestrator | (silent) | Continue text-only |
| WebSocket disconnect | Frontend | "Reconnecting..." | Auto-reconnect via useAgent |

### 3. Loading animations

Add terminal-style loading indicators:

```typescript
function StatusBar({ status }: { status: string }) {
  const messages: Record<string, string> = {
    idle: '',
    fetching: '.: fetching repository data...',
    analyzing: '.: analyzing codebase with AI...',
    dialoguing: '.: generating podcast dialogue...',
    'generating-audio': '.: converting to audio...',
    complete: '.: podcast ready',
    error: '.: error occurred',
  }

  if (status === 'idle') return null

  return (
    <div className="mt-2 text-terminal-accent text-xs animate-pulse">
      {messages[status]}
    </div>
  )
}
```

### 4. Input validation

```typescript
function isValidGithubUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?github\.com\/[^\/]+\/[^\/]+/.test(url.trim())
}
```

### 5. Production deploy

```bash
# Build and deploy
npm run deploy

# Verify
curl https://speechrun.anhquan200304.workers.dev/api/health
```

### 6. Post-deploy verification

- Test with a real GitHub URL on production
- Verify R2 audio serving works
- Verify WebSocket connects over HTTPS
- Check Workers AI binding works in production

## Todo List

- [ ] Smoke test with small, medium, large repos
- [ ] Verify all error cases show appropriate messages
- [ ] Add loading animations per phase
- [ ] Add input validation for GitHub URLs
- [ ] Fix any console errors or warnings
- [ ] Run `npm run build` — verify zero TS errors
- [ ] Deploy to production
- [ ] Verify production deployment works end-to-end
- [ ] Test audio playback on production
- [ ] Demo with a compelling open-source repo

## Success Criteria
- Full pipeline works end-to-end on production
- Invalid URLs show clear error messages
- API failures don't crash the UI
- Loading animations visible during generation
- Audio plays correctly on production
- `npm run build` produces zero errors

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Production Workers AI behaves differently than dev | Low | Medium | Test on production immediately after deploy |
| R2 bucket not accessible from production worker | Low | High | Verify bucket binding in wrangler.jsonc matches |
| WebSocket fails over Cloudflare CDN | Low | Medium | Durable Objects WebSocket is first-class; should work |
| Build fails due to unused variables | Medium | Low | Fix TS errors before deploy |

## Security Considerations
- Production secrets set via `wrangler secret put`
- No .dev.vars in production
- CORS headers not needed (same-origin)
- Rate limiting: consider adding per-IP limit post-hackathon
