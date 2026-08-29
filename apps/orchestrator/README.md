# @a2uiverse/orchestrator

The orchestrator (SPEC §10–11): an A2A agent server the client talks to exclusively. Router, Planner, Synthesizer, AgentsPool, UIComposer-side validation, IntegrityChecker, AuthVault, Registry, IntentJournal.

Phase 2 (M1) ships the composition core: Registry · Embedder · Router · Planner · composition modules · AgentsPool · IntentJournal behind one A2A executor. One model call per utterance turn (the Planner).

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
| OrchestratorExecutor | `src/executor.ts`  | `@a2a-js/sdk` server (`AgentExecutor`)                                                         | The turn itself: classify → route/plan → first paint before any dispatch → fan-out → slot-lifecycle repaints → the single turn-final; holds per-conversation composition state            |

## Dependencies

`@a2uiverse/sdk`, `@a2uiverse/shell-catalog`, `@a2a-js/sdk` (0.3 line), `ai` + `@ai-sdk/google`, `@huggingface/transformers`, Express. Vendor agents are reached over A2A only.

## Commands

```
pnpm --filter @a2uiverse/orchestrator dev          # tsx, reads .env-style vars from the shell
pnpm --filter @a2uiverse/orchestrator build | typecheck | test | lint
pnpm --filter @a2uiverse/orchestrator start        # node dist/index.js
```

## Configuration

| Variable                   | Default                   | Meaning                                                                                |
| -------------------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| `PORT`                     | `10001`                   | Listen port                                                                            |
| `BASE_URL`                 | `http://localhost:<PORT>` | URL advertised in the agent card — set to the tunnel URL in tunnel sessions            |
| `STATE_DIR`                | `./.state` (cwd-relative) | Local state: `intent-journal.jsonl`                                                    |
| `A2UIVERSE_AGENT_URLS`     | —                         | JSON object `{"<appId>": "<url>"}` overriding registry agent URLs                      |
| `A2UIVERSE_DEBUG_IDS`      | off                       | `1`/`true`: include vendor ids under `metadata.a2uiverse` on relayed events            |
| `GOOGLE_API_KEY`           | —                         | Google AI Studio key for the Planner; unset ⇒ palette turns fail (actions still route) |
| `A2UIVERSE_PLANNER_MODEL`  | `gemini-2.5-flash`        | Planner model id                                                                       |
| `A2UIVERSE_PLANNER_EFFORT` | `low`                     | `low` (no thinking budget) or `default`                                                |
| `A2UIVERSE_SHORTLIST_CAP`  | `5`                       | Router shortlist size cap                                                              |

## Registry

Hardcoded until M7 (`src/registry/entries.ts`): `github` → `:11001`, `gmail` → `:11002`, `calendar` → `:11003` (gmail/calendar agents land with 2.6/2.7). Run the GitHub app's agent (`../a2uiverse-apps/github/agent`, port 11001 by default) in the mode you want:

```
cd ../a2uiverse-apps/github/agent && uv run python -m deterministic_agent                   # no model
cd ../a2uiverse-apps/github/agent && TOOL_BACKEND=stub uv run python -m llm_agent          # model + canned data (GOOGLE_API_KEY)
cd ../a2uiverse-apps/github/agent && uv run python -m llm_agent                            # model + GitHub MCP (GOOGLE_API_KEY, GITHUB_MCP_PAT)
```

## Port

`10001`. The advertised base URL is set per environment — see `_dev/docs/tunnel-environment.md`.
