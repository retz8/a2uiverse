# @a2uiverse/orchestrator

The hub (SPEC §10–11): an A2A agent server the canvas talks to **exclusively**. It routes a question to the agents that can answer it, plans where their answers will sit, dispatches them in parallel, and relays what comes back as one composed turn.

Phase 2 (M1) ships the composition core: Registry · Embedder · Router · Planner · composition · AgentsPool · IntentJournal behind one A2A executor. One model call per utterance turn — the Planner.

## How a turn works

```
utterance → Router (embed + rank) → Planner (one model call)
          → shell paint: the layout, with every slot pending
          → fan-out: one dispatch per slot, in parallel
          → each fragment relayed as it arrives
          → slot repaints for whatever failed or fell silent
          → one turn-final
```

Two properties fall out of that order and are worth knowing before reading the code:

**First paint precedes every dispatch.** The layout and its pending slots reach the canvas before any agent has been asked anything, so time-to-first-paint is the Planner's latency, not the slowest agent's.

**One agent failing never fails the turn.** Each vendor runs its own A2A task; the hub demotes their finals and emits a single one of its own once every dispatch has settled. A slot whose dispatch failed is repainted `failed`; one whose agent answered without painting is `collapsed`.

The relay is otherwise transparent. It rewrites exactly one thing in the vendor's A2UI — namespacing `surfaceId` to `<appId>:<surfaceId>`, reversed on inbound actions — and never touches component ids, binding paths or catalog ids. Around that A2UI it stamps composition metadata and demotes terminal states, and on the way _out_ it filters each dispatch to the vendor's own partition. SPEC §14 carries the full register.

## Modules

| Module               | Where              | Stack                                                                                          | What it does                                                                                                                                                                              |
| -------------------- | ------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registry             | `src/registry/`    | plain TS; `@a2a-js/sdk` `DefaultAgentCardResolver` at boot                                     | Installed-app records (hardcoded until M7) plus the agent-authored mirror: AgentCards fetched at startup (nullable — unreachable ⇒ unroutable this session) and one corpus vector per app |
| Embedder             | `src/embedder/`    | `@huggingface/transformers` (transformers.js), quantized `Xenova/all-MiniLM-L6-v2`, in-process | The one embedding model — loaded once, no API key, cached under `STATE_DIR/models`; injected into Registry, Router, and the journal                                                       |
| Router               | `src/router/`      | plain TS (cosine over Embedder vectors)                                                        | Retrieval only: embeds the utterance, ranks routable apps, returns a capped shortlist — no threshold; selection is the Planner's                                                          |
| Planner              | `src/planner/`     | Vercel AI SDK (`ai` v7) + `@ai-sdk/google`, Gemini Flash, schema-enforced structured output    | The phase's one model call: picks agents from the shortlist, lays out the depth-2 slot tree, authors each agent's request as prose; a malformed plan is a broken turn                     |
| Composition          | `src/composition/` | pure TS; paints the `@a2uiverse/shell-catalog`                                                 | Shell-surface painter (`shell:main`, Slot + Attribution per fragment), fragment relay (stamp · surfaceId namespacing · final demotion), outbound partition filter, turn classification    |
| AgentsPool           | `src/agentsPool/`  | `@a2a-js/sdk` client (JSON-RPC, streaming)                                                     | Pure transport to vendor agents: per-turn dispatch handles, id-space relay, cancel; knows nothing of plans or slots                                                                       |
| IntentJournal        | `src/journal/`     | append-only JSONL under `STATE_DIR`                                                            | One line per turn — descriptor, plan, dispatch records, surface touches — with the descriptor embedded at write time by the Embedder                                                      |
| OrchestratorExecutor | `src/executor.ts`  | `@a2a-js/sdk` server (`AgentExecutor`)                                                         | The turn itself, in the order above; holds per-conversation composition state                                                                                                             |

## Running it

```bash
pnpm dev:orch                                     # from the repo root
pnpm --filter @a2uiverse/orchestrator start       # node dist/index.js
pnpm --filter @a2uiverse/orchestrator build | typecheck | test | lint
```

It needs the vendor agents already listening — `pnpm dev:agents`, or `pnpm dev:all` which sequences both. **Cards are fetched once, at boot.** An agent that comes up later is unroutable for the whole session, so the orchestrator names the ones it could not reach and says how to fix it. If the canvas routes nothing, read that line first.

## Configuration

| Variable                   | Default                   | Meaning                                                                                |
| -------------------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| `PORT`                     | `10001`                   | Listen port                                                                            |
| `BASE_URL`                 | `http://localhost:<PORT>` | URL advertised in the agent card — set to the tunnel URL in tunnel sessions            |
| `STATE_DIR`                | `./.state` (cwd-relative) | Local state: `intent-journal.jsonl`, the cached embedding model                        |
| `A2UIVERSE_AGENT_URLS`     | —                         | JSON object `{"<appId>": "<url>"}` overriding registry agent URLs                      |
| `A2UIVERSE_DEBUG_IDS`      | off                       | `1`/`true`: include vendor ids under `metadata.a2uiverse` on relayed events            |
| `GOOGLE_API_KEY`           | —                         | Google AI Studio key for the Planner; unset ⇒ palette turns fail (actions still route) |
| `A2UIVERSE_PLANNER_MODEL`  | `gemini-2.5-flash`        | Planner model id                                                                       |
| `A2UIVERSE_PLANNER_EFFORT` | `low`                     | `low` (no thinking budget) or `default` — this is time-to-first-paint                  |
| `A2UIVERSE_SHORTLIST_CAP`  | `5`                       | Router shortlist size cap                                                              |

## Registry

Hardcoded until M7 (`src/registry/entries.ts`): `github` → `:11001`, `gmail` → `:11002`, `calendar` → `:11003`. Each record is orchestrator-authored install state; the AgentCard beside it is the agent's own account of itself, refetched at every boot and authoritative for anything the agent declares.

## Dependencies

`@a2uiverse/sdk`, `@a2uiverse/shell-catalog`, `@a2a-js/sdk` (0.3 line), `ai` + `@ai-sdk/google`, `@huggingface/transformers`, Express. Vendor agents are reached over A2A only.

## Port

`10001`. The advertised base URL is set per environment — see `_dev/docs/tunnel-environment.md`.
