# Project Roadmap

## Overview

SpeechRun is a 6-phase project targeting the Cloudflare x ElevenLabs hackathon. Phase 1 (scaffold and foundation) is complete. Phases 2-6 are planned for the hackathon submission.

**Current Status:** Phase 1 Complete | Phases 2-6 In Planning

| Phase | Name | Status | Target | Duration |
|-------|------|--------|--------|----------|
| 1 | Scaffold & Foundation | **COMPLETE** | ✓ Done | Done |
| 2 | Codebase Ingestion | Planned | Hackathon | 1-2 weeks |
| 3 | Multi-Agent Dialogue | Planned | Hackathon | 1-2 weeks |
| 4 | Audio Generation | Planned | Hackathon | 3-4 days |
| 5 | Frontend Integration | Planned | Hackathon | 3-4 days |
| 6 | Polish & Deploy | Planned | Hackathon | 2-3 days |

## Phase 1: Scaffold & Foundation (COMPLETE)

**Status:** Complete
**Deliverables:** UI shell, development environment, project structure

### Completed
- [x] Vite + React 19 + TypeScript 6 + Tailwind CSS 4 scaffolding
- [x] Dev environment setup (npm scripts, hot reload)
- [x] Custom color theme (terminal-bg, terminal-text, etc.)
- [x] 3-panel flexbox layout (20% / 50% / 30%)
- [x] TerminalChrome component (window border, title bar)
- [x] AsciiLogo component (ASCII block art header)
- [x] TabNav component (placeholder tab navigation)
- [x] ContextSidebar component (left panel skeleton)
- [x] ConversationPanel component (center panel skeleton with input and audio player stub)
- [x] SandboxPanel component (right panel skeleton)
- [x] JetBrains Mono font integration
- [x] Global styles (Tailwind config, scrollbar styling)
- [x] TypeScript strict mode enabled
- [x] Component structure for all 3 panels
- [x] Static HTML/CSS (no routing, no state management)

### Acceptance Criteria (All Met)
- UI renders correctly in modern browsers (Chrome, Firefox, Safari)
- All components are functional React components
- TypeScript compiles without errors in strict mode
- Custom color tokens applied throughout
- 3-panel layout is responsive (flexbox)
- Terminal aesthetic is visually consistent

---

## Phase 2: Codebase Ingestion (Planned)

**Target:** 1-2 weeks
**Dependencies:** Phase 1
**Acceptance Criteria:**
- User can paste valid GitHub URL and trigger analysis
- System fetches repo tree and key files via GitHub REST API
- Context generation via Workers AI produces structured output
- Context is stored in Durable Object SQLite
- WebSocket updates frontend with progress

### Tasks

#### 2.1 GitHub API Integration
- [ ] Set up GitHub REST API client in Workers
- [ ] Implement repo metadata fetching (name, description, language, stars)
- [ ] Implement file tree fetching (recursive, full path)
- [ ] Implement key file content fetching (README, package.json, main source)
- [ ] Add rate limit handling (60 reqs/hour)
- [ ] Add error handling for 404, 403, rate limits

#### 2.2 Workers AI Integration
- [ ] Set up Workers AI client (@cf/meta/llama-3.1-70b-instruct)
- [ ] Design context generation prompt (Arche-style analysis)
- [ ] Implement prompt engineering (extract patterns, identify architecture)
- [ ] Add error handling for inference failures
- [ ] Optimize for latency (<30 seconds)

#### 2.3 Durable Object Setup
- [ ] Define Orchestrator agent class (TypeScript)
- [ ] Implement SQLite schema (orchestration_state, transcript, agent_state tables)
- [ ] Add request routing (HTTP handler in Worker)
- [ ] Implement WebSocket upgrade and event broadcasting

#### 2.4 Frontend Integration (Phase 2)
- [ ] Add URL input validation in ConversationPanel
- [ ] Implement API call to Orchestrator (fetch request)
- [ ] Add loading state UI ("Analyzing codebase...")
- [ ] Receive and display context updates via WebSocket
- [ ] Populate ContextSidebar with repo metadata, file tree, patterns

#### 2.5 Testing
- [ ] Test with real open-source repo (10-20 files)
- [ ] Verify context generation accuracy
- [ ] Benchmark latency (target <2 min for analysis phase)
- [ ] Test error scenarios (invalid URLs, private repos, rate limits)

---

## Phase 3: Multi-Agent Dialogue (Planned)

**Target:** 1-2 weeks
**Dependencies:** Phase 2
**Acceptance Criteria:**
- Orchestrator generates topic outline
- Nova agent generates PM perspective
- Aero agent generates Dev perspective
- Dialogue is stored in SQLite
- Frontend displays transcript in real-time

### Tasks

#### 3.1 Orchestrator Dialogue Coordination
- [ ] Implement topic outline generation (8-12 turn outline)
- [ ] Design turn coordination logic (alternating Nova/Aero)
- [ ] Implement turn queuing and sequencing
- [ ] Add emotion/delivery tag insertion for ElevenLabs

#### 3.2 Nova Agent Implementation
- [ ] Define Nova persona (PM: product, user impact, business value)
- [ ] Write system prompt for Nova
- [ ] Implement dialogue generation (Workers AI call)
- [ ] Add turn refinement and validation
- [ ] Store Nova turns in SQLite

#### 3.3 Aero Agent Implementation
- [ ] Define Aero persona (Dev: code quality, architecture, patterns)
- [ ] Write system prompt for Aero
- [ ] Implement dialogue generation (Workers AI call)
- [ ] Add turn refinement and validation
- [ ] Store Aero turns in SQLite

#### 3.4 Frontend Integration (Phase 3)
- [ ] Implement transcript display (message bubbles)
- [ ] Style bubbles with speaker distinction (Nova vs Aero)
- [ ] Real-time transcript updates via WebSocket
- [ ] Show current speaker and turn number
- [ ] Add speaker names and avatars (ASCII art)

#### 3.5 Testing
- [ ] Generate dialogue for test repo (>30 turns total)
- [ ] Verify narrative coherence (no contradictions)
- [ ] Check persona consistency (Nova vs Aero voices)
- [ ] Benchmark latency (target <5 min for dialogue phase)
- [ ] Test edge cases (incomplete context, ambiguous code)

---

## Phase 4: Audio Generation (Planned)

**Target:** 3-4 days
**Dependencies:** Phase 3
**Acceptance Criteria:**
- ElevenLabs API generates audio for each turn
- Audio files stored in R2
- Signed URLs valid for 7 days
- Audio quality is natural and distinct between speakers

### Tasks

#### 4.1 ElevenLabs Integration
- [ ] Set up ElevenLabs API client
- [ ] Select voice IDs for Nova and Aero (distinct, natural)
- [ ] Implement text-to-speech per turn
- [ ] Add emotion/delivery tag support (markup in text)
- [ ] Handle audio generation errors

#### 4.2 R2 Storage
- [ ] Set up Cloudflare R2 bucket
- [ ] Implement audio file upload (MP3 format)
- [ ] Generate signed URLs (7-day expiry)
- [ ] Add metadata (speaker, turn number, duration)
- [ ] Implement cleanup/expiration policy

#### 4.3 Frontend Integration (Phase 4)
- [ ] Receive audio URLs via WebSocket
- [ ] Update AudioPlayer with playable turns
- [ ] Implement sequential playback (turn 1 → 2 → ...)
- [ ] Add play/pause/progress controls
- [ ] Show current speaker and duration

#### 4.4 Testing
- [ ] Generate full podcast (8-12 turns, ~10-15 min audio)
- [ ] Test audio quality (clarity, pacing)
- [ ] Verify R2 upload and signed URLs
- [ ] Test player controls (play, pause, skip)
- [ ] Benchmark latency (target <10 min for full podcast)

---

## Phase 5: Frontend Integration (Planned)

**Target:** 3-4 days
**Dependencies:** Phases 2, 3, 4
**Acceptance Criteria:**
- Real-time WebSocket updates to all panels
- Transcript updates as dialogue generates
- Audio URLs appear as generation completes
- User can play full podcast without errors
- Loading states and progress indicators shown

### Tasks

#### 5.1 WebSocket Implementation
- [ ] Set up WebSocket connection in ConversationPanel
- [ ] Handle connection lifecycle (open, message, close, error)
- [ ] Implement message parsing and dispatch

#### 5.2 State Management
- [ ] Design global app state (Context API or Zustand)
- [ ] Implement transcript state updates
- [ ] Implement audio URL state
- [ ] Implement loading/progress state
- [ ] Implement error state

#### 5.3 UI Polish
- [ ] Add loading spinner (CSS animation)
- [ ] Show progress indicator (phase: analyzing → dialoguing → generating audio)
- [ ] Show turn counter during generation
- [ ] Add error boundaries and error messages
- [ ] Highlight current playing turn in transcript

#### 5.4 Audio Player Enhancement
- [ ] Implement play/pause toggle
- [ ] Implement progress bar with seeking
- [ ] Show current time and total duration
- [ ] Implement auto-play next turn
- [ ] Add mute/volume controls

#### 5.5 Testing
- [ ] End-to-end flow: URL → podcast → playable
- [ ] Test WebSocket connection/disconnection
- [ ] Test loading states and error scenarios
- [ ] Verify transcript updates in real-time
- [ ] Test audio playback across browsers

---

## Phase 6: Polish & Deploy (Planned)

**Target:** 2-3 days
**Dependencies:** Phases 1-5
**Acceptance Criteria:**
- Zero TypeScript errors
- No console errors in prod build
- Graceful error handling for all failure scenarios
- Deployment to Cloudflare Workers succeeds
- Live demo on real repo works end-to-end

### Tasks

#### 6.1 Error Handling
- [ ] Add try-catch to all API calls
- [ ] Implement user-friendly error messages
- [ ] Add fallback UI for network errors
- [ ] Handle edge cases (timeout, rate limits, invalid input)
- [ ] Log errors for debugging

#### 6.2 Performance Optimization
- [ ] Minimize bundle size (check Vite build output)
- [ ] Optimize image/font loading
- [ ] Enable gzip compression
- [ ] Benchmark latency (aim for <2 min URL to playable podcast)

#### 6.3 Accessibility
- [ ] Add alt text to images
- [ ] Ensure keyboard navigation works
- [ ] Test with screen reader (if time permits)
- [ ] Verify color contrast (WCAG AA)

#### 6.4 Documentation
- [ ] Update README with deployment instructions
- [ ] Document environment variables needed
- [ ] Add troubleshooting guide
- [ ] Document API contracts (Worker endpoints)

#### 6.5 Deployment
- [ ] Create Wrangler configuration (wrangler.toml)
- [ ] Set up GitHub Actions for CI/CD (if time permits)
- [ ] Configure environment variables on Cloudflare
- [ ] Deploy Workers and Durable Objects
- [ ] Test live deployment

#### 6.6 Demo Preparation
- [ ] Select 1-2 example repos (10-50 files)
- [ ] Test end-to-end on each
- [ ] Measure time to playable podcast
- [ ] Record demo walkthrough (optional)
- [ ] Prepare demo script for judges

---

## Stretch Goals (Post-Hackathon)

These features are desirable but not required for v1 MVP.

| Goal | Effort | Value |
|------|--------|-------|
| Text to Dialogue API (single multi-speaker audio file) | High | High |
| Waveform visualization | Medium | Medium |
| Transcript-audio sync (highlight current turn) | Medium | Medium |
| Sandbox mini-app generation (code example) | High | Low |
| Voice cloning for custom agent voices | High | Low |
| Share/embed podcasts | Medium | Medium |
| Private repo support (GitHub OAuth) | High | Medium |
| User accounts and saved history | Very High | Low |

---

## Risk & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| **ElevenLabs API rate limiting** | Audio generation delays | Medium | Batch requests, implement queue |
| **Workers AI inference latency** | Dialogue generation slow | High | Optimize prompts, cache context |
| **GitHub API rate limits** | Repo fetching blocked | Medium | Implement caching, batch requests |
| **Durable Object SQLite size limits** | Storage exceeded | Low | Cleanup old sessions, use R2 for large data |
| **WebSocket connection drops** | Real-time updates fail | Medium | Implement reconnection logic, fallback to polling |
| **Large codebases (>50k LOC)** | Analysis timeout | High | Limit input size, sample files intelligently |

---

## Success Criteria

### Hackathon MVP Success
- [ ] Judges can paste a GitHub URL (10-50 file repo)
- [ ] System generates 8-12 minute podcast within 2 minutes
- [ ] Audio quality is clear and distinct (Nova vs Aero)
- [ ] Transcript displays in real-time
- [ ] Audio player works without errors
- [ ] Code is clean, TypeScript strict, deployed to Cloudflare

### Post-Hackathon (v1.1+)
- [ ] Support larger codebases (up to 10k LOC)
- [ ] Implement Text to Dialogue API (single audio file)
- [ ] Add waveform visualization
- [ ] Deploy to public URL with demo
- [ ] Gather user feedback and iterate

---

## Timeline Estimate

Assuming 40 hours/week full-time effort:

- **Phase 1:** Complete (done)
- **Phase 2:** 5-7 days (GitHub API, Workers AI, Durable Objects)
- **Phase 3:** 5-7 days (Nova + Aero agents, dialogue logic)
- **Phase 4:** 2-3 days (ElevenLabs + R2 integration)
- **Phase 5:** 2-3 days (WebSocket, frontend integration)
- **Phase 6:** 2-3 days (Polish, error handling, deploy)

**Total:** ~3-4 weeks of full-time work for hackathon submission.

---

## Decision Log

Decisions made during planning:

1. **Durable Objects over Lambda + DynamoDB** — Cloudflare-native, stateful, built-in SQLite, WebSocket support
2. **No database migration cost** — Durable Objects provide immediate persistence without schema management
3. **ElevenLabs over Google Cloud TTS** — Higher quality, hackathon partnership, better pricing
4. **Workers AI over external LLM API** — Lower latency, no additional API keys, included in platform
5. **React Context over Redux/Zustand** — Simple state needs for v1, can upgrade later
6. **No authentication v1** — Hackathon demo tool; users paste URLs, no friction
7. **Terminal aesthetic over modern UI** — Native to developer community, faster to design, differentiator

---

## See Also

- [Code Standards](./code-standards.md) — Development conventions
- [System Architecture](./system-architecture.md) — Technical design details
- [Project Overview & PDR](./project-overview-pdr.md) — Product requirements
