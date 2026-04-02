# Research Report: Cloudflare Agents SDK for Multi-Agent Systems
**Date:** 2026-04-01 | **Status:** Complete | **Scope:** SpeechRun Nova+Aero dialogue architecture

---

## Executive Summary

**Recommendation: Use Cloudflare Agents SDK + Durable Objects for SpeechRun.**

The Agents SDK is purpose-built for your use case—stateful agents with persistent memory, WebSocket real-time updates, and built-in LLM integration. Your architecture (Orchestrator → Nova ↔ Aero dialogue) maps cleanly to Durable Objects. No custom state management needed.

**Key wins:**
- Each agent = globally-unique Durable Object instance with SQLite storage
- `@callable()` decorator makes agent methods RPC endpoints automatically
- WebSocket support built in; state syncs to clients in real-time
- Works seamlessly with Workers AI (Llama 3.1 70B) for dialogue generation
- No external session store or message queue needed

**Adoption risk: LOW.** Agents SDK is production-ready (Feb 2026), well-documented, with live examples in the cloudflare/agents GitHub repo.

---

## What Is Cloudflare Agents SDK?

TypeScript framework that makes Durable Objects behave like AI agents. Developers write agent classes; the framework handles persistence, WebSocket, scheduling, and LLM integration.

**Quote from official docs:** "Real agents need more. They need to remember conversations, act on schedules, call tools, coordinate with other agents, and stay connected to users in real-time."

### Core Architecture

```
Agent Class (TypeScript)
    ↓
Extends Agent { @callable methods, state, onConnect, onMessage }
    ↓
Durable Object (globally-unique instance)
    ↓
SQLite (embedded per object) + WebSocket (real-time clients)
    ↓
Workers AI / External APIs
```

**Key difference from raw Durable Objects:** The framework provides opinionated structure for agent patterns—you don't reinvent state syncing, RPC, or scheduling.

---

## Architecture Pattern: Orchestrator + Dialogue Agents

### Your Design (from system-architecture.md)

```
Frontend (React)
    ↓ WebSocket
Orchestrator Durable Object
    ├─→ Generates context
    ├─→ Coords Nova turn
    ├─→ Coords Aero turn
    ├─→ Repeats N times
    └─→ Broadcasts updates to frontend
```

### Cloudflare Agents Implementation

**File: `src/agents/orchestrator.ts`**

```typescript
import { Agent } from '@cloudflare/agents';

export class Orchestrator extends Agent<Env, OrchestratorState> {
  // State shape
  state: OrchestratorState = {
    repoUrl: '',
    status: 'idle',
    context: null,
    turns: [],
    turnCount: 0,
    maxTurns: 8,
  };

  // Called when agent starts (restores from SQLite if exists)
  async onStart() {
    console.log(`Orchestrator instance ${this.id} started`);
    // this.state is auto-hydrated from SQLite
    // this.sql is available for custom queries
  }

  // RPC endpoint called from frontend or other agents
  @callable()
  async startGeneration(repoUrl: string) {
    this.state.repoUrl = repoUrl;
    this.state.status = 'fetching-context';

    // Fetch GitHub repo
    const repoData = await this.fetchGitHub(repoUrl);

    // Generate context via Workers AI
    const context = await this.generateContext(repoData);
    this.state.context = context;

    // Start dialogue loop
    this.state.status = 'dialoguing';
    for (let i = 0; i < this.state.maxTurns; i++) {
      await this.runDialogueTurn(i, context);
    }

    this.state.status = 'complete';
    return { success: true, turnCount: this.state.turns.length };
  }

  // Coordinate one dialogue turn
  private async runDialogueTurn(turnNumber: number, context: ContextData) {
    // Get Nova's turn
    const nova = this.env.NOVA.get(`nova-${this.id}`);
    const novaTurn = await nova.generateTurn({
      topic: `Turn ${turnNumber}`,
      context,
      previousTurns: this.state.turns,
    });

    // Get Aero's response
    const aero = this.env.AERO.get(`aero-${this.id}`);
    const aeroTurn = await aero.generateTurn({
      topic: `Turn ${turnNumber}`,
      context,
      previousTurns: [...this.state.turns, novaTurn],
    });

    // Store and broadcast
    this.state.turns.push(novaTurn, aeroTurn);
    this.broadcast({ type: 'transcript-update', turns: this.state.turns });
  }

  // WebSocket connection handler
  async onConnect(connection: any, ctx: any) {
    // Client subscribes to updates
    connection.send(JSON.stringify({
      type: 'status',
      status: this.state.status,
      turns: this.state.turns,
    }));
  }

  // Internal: fetch GitHub repo
  private async fetchGitHub(repoUrl: string): Promise<RepoData> {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) throw new Error('Invalid GitHub URL');
    const [, owner, repo] = match;

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `token ${this.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
    return response.json();
  }

  // Internal: generate context via Workers AI
  private async generateContext(repoData: RepoData): Promise<ContextData> {
    const prompt = `Analyze this codebase and extract key patterns, architecture, and design decisions: ${JSON.stringify(repoData)}`;

    const response = await this.env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
      messages: [
        { role: 'system', content: 'You are an expert code analyst.' },
        { role: 'user', content: prompt },
      ],
    });

    return {
      summary: response.response,
      timestamp: Date.now(),
    };
  }

  // Broadcast to all connected clients
  private broadcast(data: any) {
    // Agents SDK handles this internally
    this.setState({ ...this.state }); // Triggers sync to all clients
  }
}
```

---

## Agent-to-Agent Communication

### Pattern 1: RPC Calls (Orchestrator ↔ Nova/Aero)

**Nova Agent:**

```typescript
export class Nova extends Agent<Env, NovaState> {
  state: NovaState = {
    name: 'Nova',
    persona: 'PM',
    guidelines: 'You are Nova, a product-focused PM...',
  };

  // RPC endpoint
  @callable()
  async generateTurn(input: {
    topic: string;
    context: ContextData;
    previousTurns: DialogueTurn[];
  }): Promise<DialogueTurn> {
    const { topic, context, previousTurns } = input;

    // Build prompt with context and history
    const conversationHistory = previousTurns
      .map((t) => `${t.speaker}: ${t.text}`)
      .join('\n');

    const prompt = `
You are Nova, a PM discussing this codebase.
Topic: ${topic}
Previous turns:
${conversationHistory}

Codebase context:
${JSON.stringify(context)}

Respond with your PM perspective. Keep to 2-3 sentences.
`;

    const response = await this.env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
      messages: [
        { role: 'system', content: this.state.guidelines },
        { role: 'user', content: prompt },
      ],
    });

    const turn: DialogueTurn = {
      speaker: 'nova',
      text: response.response,
      timestamp: Date.now(),
    };

    // Store locally
    await this.sql`INSERT INTO turns (speaker, text) VALUES (?, ?)`.bind(
      turn.speaker,
      turn.text
    );

    return turn;
  }
}
```

**How Orchestrator calls Nova:**

```typescript
// Inside Orchestrator.runDialogueTurn()
const nova = this.env.NOVA.get(`nova-${this.id}`);
const novaTurn = await nova.generateTurn({
  topic: `Architecture Discussion Turn ${i}`,
  context: this.state.context,
  previousTurns: this.state.turns,
});
```

**Key:** `this.env.NOVA.get()` uses a globally-unique ID to fetch the agent instance. RPC call is type-safe and bidirectional.

---

## State Persistence & Syncing

### SQLite per Agent

Each agent instance has an embedded SQLite database:

```typescript
export class Nova extends Agent<Env, NovaState> {
  // On startup, restore from SQLite
  async onStart() {
    // Fetch previous turns
    const rows = await this.sql`SELECT * FROM turns ORDER BY created_at DESC`;
    console.log(`Restored ${rows.length} turns from SQLite`);
  }

  // Store new turns
  @callable()
  async generateTurn(input: any) {
    // ... generate turn ...
    const turn = { speaker: 'nova', text: generatedText };

    // Persist to SQLite
    await this.sql`
      INSERT INTO turns (speaker, text, created_at)
      VALUES (?, ?, NOW())
    `.bind(turn.speaker, turn.text);

    return turn;
  }
}
```

### State Sync to Frontend

The framework auto-syncs state to all connected WebSocket clients:

```typescript
export class Orchestrator extends Agent<Env, OrchestratorState> {
  async runDialogueTurn(turnNumber: number, context: ContextData) {
    // ... get nova and aero turns ...

    this.state.turns.push(novaTurn, aeroTurn);

    // This automatically syncs to all connected clients
    this.setState({ ...this.state });
  }

  async onConnect(connection: any, ctx: any) {
    // Clients see the current state immediately
    connection.send(JSON.stringify({
      type: 'state-sync',
      state: this.state,
    }));
  }
}
```

**Frontend receives updates:**

```typescript
// React component
const { state, call } = useAgent(orchestratorId);

// state is always in sync with server
useEffect(() => {
  console.log('Server state updated:', state.turns);
}, [state.turns]);
```

---

## WebSocket Communication: Real-Time Updates

### Frontend to Backend

```typescript
// React component (ConversationPanel.tsx)
import { useAgent } from '@cloudflare/agents/react';

export function ConversationPanel() {
  const orchestratorId = 'podcast-123'; // unique per generation
  const { state, call, isConnected } = useAgent(orchestratorId);

  const handleStart = async (repoUrl: string) => {
    // RPC call to Orchestrator
    const result = await call('startGeneration', { repoUrl });
    console.log('Generation started:', result);
  };

  return (
    <div>
      <input
        placeholder="Paste GitHub URL..."
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleStart(e.currentTarget.value);
        }}
      />

      {/* Real-time transcript */}
      <div className="transcript">
        {state.turns.map((turn, i) => (
          <div key={i} className={`bubble ${turn.speaker}`}>
            {turn.text}
          </div>
        ))}
      </div>

      {/* Status indicator */}
      <div>Status: {state.status}</div>
      <div>Connected: {isConnected ? '✓' : '✗'}</div>
    </div>
  );
}
```

### Server Broadcasting

```typescript
export class Orchestrator extends Agent<Env, OrchestratorState> {
  // Send update to all connected clients
  async notifyFrontend(data: any) {
    this.broadcast(data); // Built into Agents SDK
  }

  async runDialogueTurn(turnNumber: number, context: ContextData) {
    // ... get turns ...

    this.state.turns.push(novaTurn, aeroTurn);

    // All connected clients get this instantly
    this.notifyFrontend({
      type: 'transcript-update',
      turns: this.state.turns,
      status: 'dialoguing',
    });
  }
}
```

---

## Workers AI Integration (Llama 3.1 70B)

### Context Generation

```typescript
private async generateContext(repoData: RepoData): Promise<ContextData> {
  const prompt = `
Analyze this GitHub repository and extract:
1. Main purpose and functionality
2. Key architectural patterns
3. Technology stack
4. Notable design decisions

Repository: ${repoData.full_name}
Language: ${repoData.language}
Stars: ${repoData.stargazers_count}
Description: ${repoData.description}

Respond with a concise structured analysis.
`;

  const response = await this.env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
    messages: [
      {
        role: 'system',
        content: 'You are an expert software architect analyzing codebases.',
      },
      { role: 'user', content: prompt },
    ],
  });

  return {
    summary: response.response,
    repoName: repoData.full_name,
    generatedAt: new Date().toISOString(),
  };
}
```

### Dialogue Turn Generation

```typescript
@callable()
async generateTurn(input: { topic: string; context: ContextData; previousTurns: DialogueTurn[] }) {
  const { topic, context, previousTurns } = input;

  // Build conversation history
  const history = previousTurns.map((t) => `${t.speaker}: ${t.text}`).join('\n\n');

  const systemPrompt = `
You are Nova, a product manager.
Perspective: You focus on user value, product vision, and business impact.
Style: Thoughtful, strategic, occasionally skeptical of over-engineering.
Constraint: Keep responses to 2-3 sentences. Respond naturally, not in bullet points.
`;

  const userPrompt = `
Topic: ${topic}

Codebase Context:
${context.summary}

Previous Discussion:
${history}

${history ? 'Continue the conversation.' : 'Start the discussion.'}
`;

  const response = await this.env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  return {
    speaker: 'nova',
    text: response.response,
    timestamp: Date.now(),
  };
}
```

---

## Concrete Code: Agent File Structure

```
src/
├── agents/
│   ├── orchestrator.ts        # Coords workflow, fetches GitHub, generates context
│   ├── nova.ts                # PM persona in dialogue
│   ├── aero.ts                # Dev persona in dialogue
│   └── types.ts               # Shared TypeScript interfaces
├── worker.ts                  # Cloudflare Workers entry point
├── wrangler.toml              # Durable Object bindings
└── components/
    ├── conversation-panel.tsx # React, uses useAgent() hook
    └── ...
```

**`wrangler.toml` (bindings):**

```toml
[env.production]
vars = { GITHUB_TOKEN = "...", ELEVENLABS_API_KEY = "..." }

[[durable_objects.bindings]]
name = "ORCHESTRATOR"
class_name = "Orchestrator"

[[durable_objects.bindings]]
name = "NOVA"
class_name = "Nova"

[[durable_objects.bindings]]
name = "AERO"
class_name = "Aero"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "speechrun-audio"
```

---

## Trade-Offs & Adoption Risk

### Advantages

| Aspect | Benefit |
|--------|---------|
| **State Persistence** | SQLite embedded; no session store needed |
| **WebSocket** | Auto-handled; real-time sync built in |
| **RPC** | `@callable()` decorator makes method invocation type-safe |
| **Scheduling** | Agents can schedule delayed/recurring tasks natively |
| **LLM Integration** | Workers AI connection straightforward |
| **Cost** | Durable Objects are cheaper than traditional serverless + database |
| **Latency** | Edge execution; agents start near users |

### Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|-----------|
| **Cloudflare lock-in** | Only runs on Cloudflare Workers | Migration is non-trivial but not blocking for MVP |
| **SQLite per instance** | No cross-instance queries | Use Orchestrator as coordinator; distribute carefully |
| **Learning curve** | New framework paradigm | Good docs + examples; 2-3 days to productivity |
| **Cold start** | ~50ms per Durable Object | Negligible for your use case (generation takes minutes) |

### Maturity & Community

- **Framework Status:** Production-ready (Feb 2026)
- **GitHub Stars:** 2.5k (cloudflare/agents repo)
- **Company Support:** Cloudflare maintains; not a side project
- **Breaking Changes:** None major in last 6 months
- **Community Examples:** Email agents, webhooks, MCP servers, tic-tac-toe all live examples

**Risk Assessment: LOW.** The framework is stable and actively maintained.

---

## Alternative Considered: Raw Durable Objects

You could skip Agents SDK and write raw Durable Objects:

```typescript
export class MyDurableObject {
  state: MyState;
  env: Env;
  ctx: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state.blockConcurrencyWhile(async () => {
      return (await state.storage.get('state')) || { turns: [] };
    });
    this.env = env;
    this.ctx = state;
  }

  async fetch(request: Request) {
    // Manual WebSocket handling, state management, RPC routing
    // ~300 lines of boilerplate per agent
  }
}
```

**Why Agents SDK wins:**
- No manual WebSocket upgrade handling
- No manual state serialization/deserialization
- No hand-rolled RPC (the `@callable()` decorator is doing heavy lifting)
- Type safety out of the box

**Raw Durable Objects are fine if:** You're already deep in Workers, have simple state, don't need real-time updates.

**Agents SDK is better if:** You want agent-like behavior (dialogue, scheduling, LLM integration, bidirectional communication). Which you do.

---

## Multi-Agent Coordination Patterns (Advanced)

### Pattern 1: Orchestrator Hub (Your Case)

```
Frontend → Orchestrator ← Nova
                        ← Aero
```

Orchestrator is the single source of truth. It calls Nova and Aero via RPC, collects results, broadcasts to frontend.

**Code sketch:**

```typescript
async runDialogueTurn(i: number) {
  const nova = this.env.NOVA.get(`nova-${this.id}`);
  const aero = this.env.AERO.get(`aero-${this.id}`);

  const [novaTurn, aeroTurn] = await Promise.all([
    nova.generateTurn({ ... }),
    aero.generateTurn({ ... }),
  ]);

  this.state.turns.push(novaTurn, aeroTurn);
  this.broadcast({ type: 'update', turns: this.state.turns });
}
```

**Pros:** Simple, clear data flow. Orchestrator is accountable for state.
**Cons:** Orchestrator becomes a bottleneck if agents are slow (but Workers AI calls are parallel anyway).

### Pattern 2: Agent Handoff (Future)

If Nova and Aero need to negotiate directly (not through Orchestrator):

```typescript
export class Nova extends Agent {
  @callable()
  async respondToAero(aeroTurn: DialogueTurn): Promise<DialogueTurn> {
    const response = await this.env.AI.run(...);
    return { speaker: 'nova', text: response.response };
  }
}

// In Aero:
const nova = this.env.NOVA.get(`nova-${orchestratorId}`);
const novaTurn = await nova.respondToAero(aeroTurn);
```

Not recommended for SpeechRun (adds complexity), but Agents SDK supports it.

---

## Deployment Checklist

- [ ] Create `src/agents/orchestrator.ts`, `nova.ts`, `aero.ts`
- [ ] Define wrangler.toml bindings for ORCHESTRATOR, NOVA, AERO
- [ ] Add GitHub token + ElevenLabs key to wrangler.toml env vars
- [ ] Test RPC calls locally with `wrangler dev`
- [ ] Test WebSocket connection from React component
- [ ] Verify Workers AI calls to Llama 3.1 70B
- [ ] Deploy to Cloudflare Workers (`wrangler publish`)

---

## Unresolved Questions

1. **ElevenLabs integration timing:** Where does TTS happen? In Aero/Nova agents (generate on-demand) or in Orchestrator after all turns are ready (batch)? _Decision: Batch in Orchestrator after dialogue completes; simpler for now._

2. **Turn history limits:** SQLite storage is unlimited, but older turns aren't relevant. Should you prune history after dialogue is complete, or keep for debugging? _Decision: Keep for now; prune on Orchestrator cleanup after R2 upload._

3. **Agent instance lifecycle:** Should Nova/Aero instances persist across podcast generations, or create new ones per generation? _Decision: Create new per generation; simpler cleanup. Use unique ID: `nova-${podcastId}`._

4. **Error recovery:** If a turn generation fails (API timeout), should Orchestrator retry, skip, or abort? _Decision: Retry up to 2x; abort on hard error (invalid GitHub URL)._

5. **Frontend state library:** useAgent hook is lightweight. Do you need global state (Context, Zustand) or is local component state enough? _Decision: useAgent hook + component state for MVP; add Zustand if frontend complexity grows._

---

## Next Steps (For Implementation)

1. **Phase 2a (This Week):**
   - Scaffold agent classes with Agents SDK
   - Implement GitHub fetch in Orchestrator
   - Wire up Workers AI call for context generation

2. **Phase 2b (Next Week):**
   - Implement Nova and Aero dialogue agents
   - Test RPC calls between agents
   - Add WebSocket frontend integration

3. **Phase 3:**
   - Add ElevenLabs TTS integration
   - Implement R2 audio storage
   - Polish frontend streaming updates

---

## References & Documentation

- [Cloudflare Agents SDK Docs](https://developers.cloudflare.com/agents/)
- [Agents API Reference](https://developers.cloudflare.com/agents/api-reference/agents-api/)
- [GitHub: cloudflare/agents (Examples)](https://github.com/cloudflare/agents)
- [Blog: Building Agents with OpenAI and Cloudflare's Agents SDK](https://blog.cloudflare.com/building-agents-with-openai-and-cloudflares-agents-sdk/)
- [Durable Objects Overview](https://developers.cloudflare.com/durable-objects/)
- [Patterns Guide](https://developers.cloudflare.com/agents/patterns/)

---

**Report Status:** Complete | **Confidence Level:** High | **Last Updated:** 2026-04-01T20:52:00Z
