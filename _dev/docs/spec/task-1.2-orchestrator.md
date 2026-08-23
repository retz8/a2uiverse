# Task 1.2 — Orchestrator

`apps/orchestrator` as an A2A agent server relaying one vendor agent with nothing lost. Sub-task 1.2 of Phase 1 (`_dev/docs/spec/phase-1-spine.md`, decisions 6–11, 16); SPEC §10.

## Scope

- One `AgentExecutor` whose execute is the turn, served over Express with the minimal static AgentCard.
- The three M0 components as classes: Registry, AgentsPool, IntentJournal.
- A pure relay layer and a pure descriptor layer.
- Process config, CORS, startup log.
- Tests with a reusable in-process fake vendor; no live agent in the gate.
- Not in scope: Router, Planner, any model call, a vendor launcher (moved to 1.4), retries, deadline enforcement.

## Locked decisions

### 1. Module layout

Entry, config, card, executor at the top; one folder each for `registry`, `agentsPool`, `journal`, each holding its class, its types, and any pure helper (relay for the pool, descriptor for the journal). A reusable fake vendor lives under the test directory. The executor hardcodes the single registry entry as the dispatch target; no Router/Planner placeholder exists.

### 2. Registry

Constructed from the hardcoded entries. Public: get by app id (throws on unknown), list, resolve by catalog id. Private: the id map. No vendor-card fetching, no writes. Entries carry the derived agent URL per the port convention (GitHub `localhost:11001`); an optional `A2UIVERSE_AGENT_URLS` JSON map overrides URLs by app id, off by default.

### 3. AgentsPool and the dispatch handle

Public: `dispatch(appId, turn)` and `cancel(clientTaskId)`. `dispatch` returns a handle `{ events, done, cancel }`: `events` is the async iterable of relayed events (consumed at most once); `done` is a promise that never rejects and resolves to a `DispatchRecord` with outcome `completed | failed | cancelled | timeout`; `cancel` aborts the underlying request. The handle is the future quiescence unit. Private: A2A clients keyed by endpoint, the context map, in-flight abort controllers, lazy connect.

### 4. Three id spaces; context map in memory

Client ↔ orchestrator (`clientContextId`), orchestrator ↔ each vendor (`vendorContextId` per app), and per-space task ids. The pool keeps `clientContextId → Map<appId, vendorContextId>` in memory for M0, behind a small interface so it can move into the Composition object later; an orchestrator restart starts fresh vendor conversations (documented).

### 5. Relay rewrite rules

Pure function from vendor event to orchestrator event. Envelope ids (`taskId`, `contextId`, `Task.id`) are rewritten to the orchestrator's on every event; parts, status, artifacts, history, `final` are verbatim. The source stamp is merged as `metadata.a2uiverse = { source: <appId> }` — one namespaced object. Vendor ids are included inside that object only under `A2UIVERSE_DEBUG_IDS`, off by default. Outgoing: the client's task/context ids are stripped, the stored `vendorContextId` is set, parts and metadata (`a2uiClientDataModel`, `a2uiForkContext`) are forwarded as-is.

### 6. Streaming mechanics and failure mapping

Every vendor call carries the A2UI extensions header via the SDK helper, regardless of the client's request. Outcomes: network error or non-2xx → `failed`; `cancel()` → `cancelled`; vendor final `failed` status → relayed verbatim and recorded `failed`; deadline → `timeout`, timer not armed in M0. The executor publishes its own terminal status only when the vendor stream ended without a final event. A vendor whose card declares no streaming is called non-streaming and its result yielded as one event. No retry.

### 7. IntentJournal

Constructed on a file path: `<STATE_DIR>/intent-journal.jsonl`, the orchestrator's local state directory (git-ignored in dev). Public: open a turn, then `dispatched`, `surfaces`, `close(outcome)` on the turn object; close appends one JSON line. Descriptor: palette turn → text parts verbatim; surface action → a rendered sentence naming action, surface, app, plus the action payload; unknown → JSON of parts. Surface ids are collected by read-only inspection of relayed A2UI parts (create/update/delete). Client metadata is recorded as keys plus the data-model size, not contents. `embedding` is null. A failed write logs and never fails the turn. No reads in M0.

### 8. Config, card, Express, CORS

Env-validated config: `PORT` (10001), `BASE_URL` (card URL; the tunnel URL in tunnel sessions), `STATE_DIR`, `A2UIVERSE_DEBUG_IDS`, optional `A2UIVERSE_AGENT_URLS`. Card: name, description, url, version, protocol 0.3, streaming, the A2UI v0.9.1 extension, one generic palette skill; no catalog ids in extension params unless the ported client reads them. Express: card at `/.well-known/agent-card.json`, JSON-RPC at the root, default request handler with in-memory task store. CORS allows `localhost`, `127.0.0.1`, `*.devtunnels.ms`. One startup log line with port, base URL, state dir, registry entries.

### 9. Phase 1 interim vendor

`a2ui-github`'s agent is run on port 11001 via its own port flag, in whichever mode is wanted; no orchestrator configuration for mode. The tunnel doc's "10003 until copied" line is corrected to 11001.

### 10. Tests

Three layers: pure units (relay rules, descriptor, registry, entry serialisation); AgentsPool against an in-process fake vendor built on the same SDK server pieces (rewrite, byte-identical parts, context reuse across turns, cancel, vendor failure, mid-stream disconnect, non-streaming fallback, extensions header asserted); orchestrator end-to-end in-process driven through the SDK client as the canvas does (card, streamed turn, journal line, CORS). Fake-vendor fixtures are hand-written until beats recorded through the real agent replace them in 1.4.

## Invariants

- Parts are never modified by the relay.
- The client never sees vendor ids (debug flag excepted).
- No model call in the orchestrator.

## Open items

- Vendor launcher (`dev:agents` with `--only` / `--mode`, `dev:all`) — scoped into 1.4; launch-command table lives in the launcher, not the registry record.
- Catalog ids in the card's extension params — decided in 1.3 by whether the ported client reads them.
