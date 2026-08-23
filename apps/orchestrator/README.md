# @a2uiverse/orchestrator

The orchestrator (SPEC §10–11): an A2A agent server the client talks to exclusively. Router, Planner, Synthesizer, AgentsPool, UIComposer-side validation, IntegrityChecker, AuthVault, Registry, IntentJournal.

Phase 1 (M0) ships Registry · AgentsPool · IntentJournal behind one A2A executor: a transparent relay to the single registered app, no model call.

## Dependencies

`@a2uiverse/sdk`, `@a2uiverse/shell-catalog`, `@a2a-js/sdk` (0.3 line), Express. Vendor agents are reached over A2A only.

## Commands

```
pnpm --filter @a2uiverse/orchestrator dev          # tsx, reads .env-style vars from the shell
pnpm --filter @a2uiverse/orchestrator build | typecheck | test | lint
pnpm --filter @a2uiverse/orchestrator start        # node dist/index.js
```

## Configuration

| Variable               | Default                   | Meaning                                                                     |
| ---------------------- | ------------------------- | --------------------------------------------------------------------------- |
| `PORT`                 | `10001`                   | Listen port                                                                 |
| `BASE_URL`             | `http://localhost:<PORT>` | URL advertised in the agent card — set to the tunnel URL in tunnel sessions |
| `STATE_DIR`            | `./.state` (cwd-relative) | Local state: `intent-journal.jsonl`                                         |
| `A2UIVERSE_AGENT_URLS` | —                         | JSON object `{"<appId>": "<url>"}` overriding registry agent URLs           |
| `A2UIVERSE_DEBUG_IDS`  | off                       | `1`/`true`: include vendor ids under `metadata.a2uiverse` on relayed events |

## Registry

Hardcoded until M7 (`src/registry/entries.ts`): `github` → `http://localhost:11001`. Run `a2ui-github`'s agent on that port in the mode you want:

```
cd ../a2ui-github/agent && uv run python -m deterministic_agent --port 11001                   # no model
cd ../a2ui-github/agent && TOOL_BACKEND=stub uv run python -m llm_agent --port 11001          # model + canned data (GOOGLE_API_KEY)
cd ../a2ui-github/agent && uv run python -m llm_agent --port 11001                            # model + GitHub MCP (GOOGLE_API_KEY, GITHUB_MCP_PAT)
```

## Port

`10001`. The advertised base URL is set per environment — see `_dev/docs/tunnel-environment.md`.
