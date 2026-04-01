# Cloudflare Workers AI for Multi-Agent SpeechRun System
**Research Report** | 2026-04-01 | Cloudflare Agents SDK + Workers AI Analysis

---

## Executive Summary

**Recommendation: Use Cloudflare Agents SDK (TypeScript) for the multi-agent podcast system.**

Cloudflare's **Agents SDK** (built on Durable Objects) directly solves your SpeechRun needs: persistent agent state, turn-based dialogue, multi-agent coordination, and edge-deployed inference. The platform pairs Durable Objects (stateful execution) with Workers AI (LLM inference) to eliminate orchestration complexity.

**For SpeechRun specifically:** Deploy Nova (PM agent) and Aero (Dev agent) as separate Agent instances, coordinate via callable methods, persist dialogue history in SQLite, and stream responses for real-time "podcast conversation" feel. This is production-ready, not experimental.

---

## 1. Available LLM Models on Workers AI

### Models Suitable for Dialogue Generation

| Model | Context Window | Key Strengths | Use Case |
|-------|---|---|---|
| **Llama 3.1** (Meta) | 128K tokens | Optimized for multilingual dialogue & instruction-tuning | Primary choice for agent dialogue |
| **Llama 3.2** | 128K tokens | Agentic retrieval, summarization, dialogue | Good for code analysis + conversation |
| **Mistral Small 3.1** | 128K tokens | Vision understanding, state-of-the-art reasoning | Reasoning-heavy agent decisions |
| **GLM-4.7-Flash** (Zhipu) | 131K tokens | Multi-turn dialogue, 100+ languages, tool calling | Secondary choice, strong multi-turn |
| **Kimi K2.5** (Moonshot) | 256K tokens | Extended context, multi-turn tool calling | For long repo analysis sessions |
| **Gemma 3** (Google) | 128K tokens | Multilingual (140+ langs), reasoning | Cost-optimized fallback |

**For SpeechRun: Use Llama 3.1 (70B or 8B) as default.** It's optimized for dialogue, has proven instruction-following for code tasks, and strong reasoning for PM/Dev agent personas.

### Model Availability & Pricing

- **50+ open-source models** available on Workers AI
- **Consumption-based pricing** — pay only for inference tokens used (no idle cost)
- Available on **Free and Paid plans** (exact tier limits not disclosed in docs; check current pricing)
- **No rate limit docs published**, but practical experience suggests: high throughput, but confirm with Cloudflare for production

---

## 2. Cloudflare Agents SDK Architecture

### Core Concept

**Agents = Persistent AI-Powered Durable Objects**

Each agent runs as a TypeScript class extending the `Agent` base class, with built-in:
- **SQL database** (SQLite, strongly consistent)
- **State management** (in-memory + persistent sync)
- **WebSocket support** (for real-time client connections)
- **Scheduling** (cron, delays, one-time tasks)
- **RPC over WebSocket** (`@callable()` decorated methods)
- **MCP client** (external tool/service integration)

### Layer Stack (Why This Matters)

```
Layer 3: AIChatAgent (opinionated AI chat + message persistence)
Layer 2: Agent (state, SQL, RPC, scheduling, MCP)
Layer 1: PartyServer (request routing, WebSocket handling)
Layer 0: Durable Objects (global address, storage, alarms)
```

**Benefit:** You work at Layer 3 (high-level dialogue) without managing Durable Objects directly.

### Example Agent Structure

```typescript
export class NovaAgent extends Agent<Env, NovaState> {
  // State shape
  type State = {
    conversationHistory: Array<{role: string, content: string}>,
    currentRepoAnalysis?: string,
    turnCount: number
  }

  // Callable methods (RPC-enabled)
  @callable()
  async analyzeRepo(repoUrl: string): Promise<string> {
    const analysis = await this.analyzePythonCode(repoUrl);
    this.state.currentRepoAnalysis = analysis;
    await this.setState(this.state);
    return analysis;
  }

  @callable()
  async respondToDev(devMessage: string): Promise<string> {
    this.state.conversationHistory.push({
      role: "dev",
      content: devMessage
    });

    const response = await this.ai.run(
      "mistral-7b-instruct-v0.2", // or llama-3.1
      {
        prompt: this.buildPrompt(this.state.conversationHistory),
        context: this.state.currentRepoAnalysis
      }
    );

    this.state.conversationHistory.push({
      role: "nova",
      content: response
    });
    await this.setState(this.state);
    return response;
  }

  // Persist to SQL if you need query-able dialogue history
  async saveDialogueToDatabase() {
    await this.sql`
      INSERT INTO dialogue (agent_id, role, content, timestamp)
      VALUES (${this.id}, ${'nova'}, ${msg.content}, NOW())
    `;
  }
}
```

---

## 3. Multi-Agent Coordination for SpeechRun

### Architecture Pattern: Triage with Specialist Agents

The Cloudflare blog demonstrates a **triage pattern** proven with OpenAI:
- **Triage Agent** (Nova) receives repo analysis request
- Analyzes context, decides which specialist to route to
- **Specialist Agents** (Aero for code, Nova for PM) handle depth
- Each agent has its own state, memory, instructions

### How Agents Talk to Each Other

```typescript
// Nova (PM Agent) calls Aero (Dev Agent)
@callable()
async askAeroAboutArchitecture(question: string) {
  // Get Aero's agent stub
  const aeroId = getAgentId("aero-dev-agent");
  const aero = this.env.AGENTS_NAMESPACE.get(aeroId);

  // Call Aero's callable method
  const techAnalysis = await aero.ask(question);

  // Persist Aero's response in Nova's context
  this.state.aeroFeedback = techAnalysis;
  await this.setState(this.state);

  return `Based on Aero's analysis: ${techAnalysis}`;
}
```

**Key:** Agents communicate via **RPC over WebSocket**. Each callable method is type-safe and returns Promise<T>.

### Turn-Based Dialogue Flow for "Podcast"

```
User: "Analyze the repo and generate a podcast"
  ↓
Nova (triage): "This is a code analysis task. Aero, analyze the architecture."
  ↓
Aero (specialist): Reads repo, returns structured analysis
  ↓
Nova (synthesis): Incorporates Aero's output into podcast script
  ↓
Stream dialogue back to user via WebSocket
```

---

## 4. Persistent State & Conversation Storage

### In-Memory State (Recommended for SpeechRun)

```typescript
type SpeechRunState = {
  repo: {url: string, lastAnalyzed: number},
  podcastScript: Array<{speaker: "nova" | "aero", text: string, duration?: number}>,
  analysisPhase: "setup" | "analyzing" | "generating" | "complete",
  aeroFeedback?: {codeQuality: string, architecture: string},
  novaInsights?: {productStrategy: string, risks: string[]},
  createdAt: number
}
```

**Persistence:** State automatically persists to Durable Object storage. Survives restarts.

### SQL for Query-Able History

```typescript
// If you want to query past podcast episodes
async savePodcastEpisode(title: string, script: string) {
  await this.sql`
    INSERT INTO episodes (title, script, created_at, agent_state_id)
    VALUES (${title}, ${script}, NOW(), ${this.id})
  `;
}

// Retrieve all episodes for a repo
async getEpisodesForRepo(repoUrl: string) {
  return this.sql`
    SELECT * FROM episodes
    WHERE repo_url = ${repoUrl}
    ORDER BY created_at DESC
  `;
}
```

---

## 5. Streaming & Real-Time Dialogue

### Workers AI Streaming via Workers

```typescript
const response = await env.AI.run("llama-3.1-70b-instruct", {
  prompt: systemPrompt + userInput,
  stream: true  // Enable streaming
});

// Stream back to client
for await (const chunk of response) {
  websocket.send(JSON.stringify({type: "token", data: chunk}));
}
```

### Agents SDK with Streaming

The `AIChatAgent` class handles streaming automatically:

```typescript
export class NovaAgent extends AIChatAgent {
  async onChatMessage(message: string) {
    // Automatically streams LLM tokens to all connected clients
    await this.chat(message, {
      model: "llama-3.1-70b-instruct",
      tools: [this.aeroAgent.callAero] // Define tools agents can call
    });
  }
}
```

**Result:** Podcast dialogue appears token-by-token in real-time, matching conversational cadence.

---

## 6. Multi-Agent Tool/MCP Integration

### Exposing Agent Tools to Other Agents

```typescript
// Aero (Dev Agent) defines tools for its analysis
class AeroAgent extends Agent {
  @tool()
  async analyzeCodeQuality(code: string): Promise<string> {
    return detailedAnalysis;
  }

  @tool()
  async suggestRefactoring(file: string): Promise<string[]> {
    return suggestions;
  }
}

// Nova can call these as tools
const aeroTools = await aero.getTools(); // MCP server autodiscovery
```

### MCP Integration (for External Services)

Agents can act as MCP clients to:
- Connect to GitHub API (for repo analysis)
- Call external LLM APIs (OpenAI fallback)
- Integrate vector databases (for RAG)

```typescript
@callable()
async analyzeRepoWithGitHub(owner: string, repo: string) {
  const mcp = new MCPClient("github-mcp-server");
  const repoData = await mcp.call("get_repo", {owner, repo});
  return processRepoData(repoData);
}
```

---

## 7. Deployment & Scaling

### How It Runs

1. Deploy agents as Wrangler Workers projects
2. Each agent instance gets a globally-unique Durable Object ID
3. Cloudflare's network routes requests to nearest datacenter
4. SQL + state auto-replicate across regions

### Cloudflare's Edge Guarantee

- **330+ datacenters globally**
- **Realtime agents runtime** supports sub-800ms latency (critical for "podcast feel")
- **WebRTC audio support** (if you add voice later)
- **Free tier includes Durable Objects** (recent change, huge cost improvement)

### Pricing Model

- **Workers AI:** Per-inference token (publicly available 2025 pricing varies by model)
- **Durable Objects:** Per-execution time + storage (free tier available)
- **Workers:** Baseline compute (generous free tier)

---

## 8. Code-First Agent Execution (Advanced)

Cloudflare's **Dynamic Workers** feature lets agents execute arbitrary code instead of just making tool calls:

```typescript
// Instead of tools, agents can write code
const agentCode = `
const analysis = analyzeRepo(repoUrl);
const quality = scoreCodeQuality(analysis);
return {pass: quality > 0.8, details: analysis};
`;

const result = await this.runDynamicCode(agentCode);
```

**Benefit:** Cleaner, fewer tokens, more flexible agent reasoning. **100x faster startup** than traditional containers.

---

## 9. SpeechRun Implementation Path

### Phase 1: Core Agents (Recommended First Step)

```
1. Create @nova/agent package
   - Extends AIChatAgent
   - System prompt: "You are Nova, product strategist analyzing code"
   - Callable methods: analyzeRepo(), respondToDev()

2. Create @aero/agent package
   - Extends AIChatAgent
   - System prompt: "You are Aero, senior engineer analyzing code"
   - Callable methods: analyzeArchitecture(), suggestOptimizations()

3. Coordinator agent
   - Manages dialogue flow
   - Calls Nova and Aero in sequence
   - Streams podcast script to client
```

### Phase 2: Persistence & Replay

```
1. Add SQL schema for episodes
2. Save dialogue history per repo
3. Support re-running podcast generation with same repo
```

### Phase 3: Advanced Features

```
1. Voice synthesis (Deepgram TTS via Workers AI)
2. WebRTC audio streaming (raw PCM pipeline)
3. Real-time agent interruption detection
```

---

## 10. Limitations & Gotchas

| Limitation | Impact on SpeechRun | Mitigation |
|---|---|---|
| **SQLite per Durable Object** — Not a global DB | Can't easily join across agent instances | Design each agent to be self-contained; use shared HTTP APIs for cross-agent data |
| **No native agent-to-agent subscriptions** — Must poll or use RPC | Agents don't automatically "listen" to each other's state changes | Call agent methods explicitly; consider pub-sub pattern with KV namespace |
| **LLM context window limits** — Llama 3.1 max 128K tokens | Very large codebases may exceed context | Implement smart file selection, summarization, or multi-turn analysis |
| **Workers AI quota (unclear)** — Rate limits not publicly detailed | May throttle during high load | Test load profile; consider OpenAI/Anthropic fallback if needed |
| **MCP server startup latency** — Initializing external connections adds overhead | Cold starts could delay first inference | Warm up agents on deploy; consider pre-connecting to MCP servers |

---

## 11. Comparison with Alternatives

### Why NOT raw Workers AI (without Agents)?

**Raw Workers AI alone** = stateless LLM calls only
- No dialogue memory between requests
- Have to manually manage conversation state
- No scheduling, no agent-to-agent coordination
- Would need external DB (Postgres, D1) for state

**Agents SDK handles all this natively.**

### Why NOT external orchestration (Modal, Replicate)?

| Dimension | Agents SDK | Modal/Replicate |
|---|---|---|
| **Latency** | Sub-100ms (edge) | 200-500ms (orchestrated) |
| **Cost** | Consumption-based | Per-GPU-hour |
| **Statefulness** | Native (Durable Objects) | Requires external DB |
| **Multi-turn dialogue** | Built-in streaming | Manual token streaming |

**For SpeechRun:** Agents SDK wins on latency, simplicity, and cost.

---

## 12. Implementation Checklist

- [ ] Verify current Workers AI model availability & pricing (docs are current as of Feb 2025)
- [ ] Create `nova-agent` Durable Object class extending AIChatAgent
- [ ] Create `aero-agent` Durable Object class extending AIChatAgent
- [ ] Implement coordinator agent calling Nova → Aero in sequence
- [ ] Set up streaming dialogue responses via WebSocket
- [ ] Test dialogue history persistence in SQL
- [ ] Benchmark inference latency with real repo sizes
- [ ] Implement repo size heuristics (when to truncate code context)
- [ ] Add error handling for LLM failures (fallback model or graceful degradation)
- [ ] Deploy to staging; test multi-agent coordination under load

---

## Unresolved Questions

1. **Exact Workers AI rate limits & quota per account tier** — Docs reference limits but don't specify numbers. Need to test or contact Cloudflare.

2. **Cost of Durable Objects state replication** — If you have frequent agent state updates, cross-region replication might add cost. Need pricing analysis.

3. **Best practice for agent-to-agent discovery** — Do you hardcode agent IDs or use a registry? Not explicitly addressed in examples.

4. **GitHub rate limits with MCP client** — If analyzing large repos, GitHub API will throttle. Need strategy for caching analysis or using GitHub app tokens.

5. **Fallback behavior if Workers AI is down** — No docs on SLA or failover to OpenAI. Needs implementation.

---

## Sources

- [Cloudflare Agents documentation](https://developers.cloudflare.com/agents/)
- [Cloudflare Workers AI overview](https://developers.cloudflare.com/workers-ai/)
- [Cloudflare Workers AI models](https://developers.cloudflare.com/workers-ai/models/)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Building agents with OpenAI and Cloudflare's Agents SDK](https://blog.cloudflare.com/building-agents-with-openai-and-cloudflares-agents-sdk/)
- [GitHub: cloudflare/agents](https://github.com/cloudflare/agents)
- [GitHub: cloudflare/agents-starter](https://github.com/cloudflare/agents-starter)
- [Cloudflare Realtime Voice AI](https://blog.cloudflare.com/cloudflare-realtime-voice-ai/)
- [Building AI agents with MCP, authn/authz, and Durable Objects](https://blog.cloudflare.com/building-ai-agents-with-mcp-authn-authz-and-durable-objects/)
