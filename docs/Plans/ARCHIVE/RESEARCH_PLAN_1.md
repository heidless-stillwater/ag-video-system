# Research Plan 1: Tiered Adaptive Research Engine (TARE)

## 🎯 Vision
Transform the manual "Research" phase into an autonomous, fact-checked intelligence gathering system that feeds high-fidelity data into the script and video generation pipe.

---

## 🏗️ Architecture

### 1. The Strategy Layer (Engines)
Each research provider is implemented as a "Research Strategy" following a common interface:
- **Web Acquisition**: `Firecrawl`, `Jina`, `Tavily` (Deep Web Access).
- **Core Reasoning**: `Gemini 2.0 Pro` (Facts), `Claude 3.5 Sonnet` (Narrative Logic).
- **Specialized Discovery**: `Perplexity` (Real-time), `Arxiv` (Academic), `Reddit/X` (Sentiment).
- **Knowledge Base**: `NotebookLM` (Source-grounded analysis).

### 2. Tiered Configuration Hierarchy
Settings resolve in the following order (bottom wins):
1. **Admin Global (A)**: Hard-coded defaults and secure API keys (stored in `.env` / Firestore `/config`).
2. **Personas (C)**: CRUD-able templates (e.g., "The Skeptic" uses Perplexity for cross-referencing; "The Dreamer" uses high-temperature Gemini).
3. **User Overrides (B)**: Single-run parameters (Depth, Language, Target Audience).

### 3. State & Progress Utility
- **Firestore Collection**: `research_jobs`
- **Fields**: `status` (queued, crawling, synthesizing, complete), `progress` (0-100), `logs` (array of action strings), `factsFound`.
- **UI**: Real-time progress bar in the `ResearchExplorer` component.  *(Currently using direct SSE Web Streams)*

## 🔐 Access & Security Architecture
- **Identity Model**: **User-Centric (B)**. Research is performed using the user's specific credentials/sessions where available to leverage private knowledge bases.
- **Initial Implementation**: Native API integration for providers with official developer endpoints (Gemini, Perplexity, Tavily).
- **Refactor Path**: Architected for **Browser Bridge (A)** adoption. The `IResearchStrategy` interface is agnostic to whether data comes from a JSON API or a headful browser session.

---

## 🛠️ Components to Build / Update

### Phase 1: Engine Foundation
- [x] Implement `ResearchEngineRegistry`: A factory to spin up engine instances.
- [x] Define `IResearchStrategy` interface.
- [x] Implement the first 3 providers: `Gemini` (done), `Perplexity` (done), and `Tavily` (done).
 Also created `MockStrategy`. (Gemini verified functional Mar 13)
- [x] Wire the Engine Registry into `src/app/api/research/route.ts` (Replaced Wikipedia integration with GeminiStrategy).

### Phase 2: Configuration & CRUD
- [ ] **Admin Setup**: Define the schema for `GlobalConfig`.
- [ ] **Persona Manager**: Create a CRUD UI for managing `ResearchPersonas`.
- [x] **Parameter UI**: Added `ResearchOverlay` allows selecting Persona lenses (Historical, Technical, Cultural, etc) before starting research. 

### Phase 3: Background Worker logic
- [x] Implement `ResearchCoordinator`: Class implemented, but executing synchronously.
- [~] Add Firestore listeners for real-time progress: Currently bypassing Firestore queues and pushing Server-Sent Events (SSE) directly to the UI overlay.

---

## 📈 Success Metrics
- **Fact Fidelity**: >90% of facts should have a verifiable source URL.
- **Workflow Speed**: Reduce research phase from manual effort to <180 seconds automated background work.
- **User Satisfaction**: Ability to "set and forget" the research phase.

---

## 📝 Decision Log
| Decision | Alternative | Why? |
| :--- | :--- | :--- |
| **API SSE Streaming** | Firestore Jobs | We pivoted to Server-Sent Events (SSE) in the `ResearchOverlay` for immediate real-time UX feedback rather than a Firestore queue polling system. |
| Strategy Pattern | Hard-coded API calls | Future-proofing allows adding "Engine X" in minutes. Registry & Interfaces are built. |
| Persona Tier | Generic params only | Users need "shorthand" for complex configuration combinations. We implemented this via `ResearchOverlay` lenses. |
| User Identity (B) | System Identity (A)| Enables research into private datasets/history; essential for custom research value. |
| API-First Start | Browser Bridge Start | Safer, faster development; allows perfecting the schema before tackling browser volatility. |
