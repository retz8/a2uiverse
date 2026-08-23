# Orchestrator — system design

`apps/orchestrator`. An A2A agent server (SPEC §10); the only thing the client talks to. State as of Phase 1 (M0): Registry · AgentsPool · IntentJournal behind one executor, no model call.

## Process

```
index.ts ── loadConfig() ── buildOrchestrator(config) ── express.listen(PORT)
                                   │
                 ┌─────────────────┼──────────────────┐
              Registry         AgentsPool        IntentJournal
                 └────────── OrchestratorExecutor ────┘
                                   │
                    DefaultRequestHandler(card, InMemoryTaskStore, executor)
                                   │
              GET /.well-known/agent-card.json · POST / (JSON-RPC)
```

Config (env): `PORT` 10001 · `BASE_URL` (card url) · `STATE_DIR` · `A2UIVERSE_AGENT_URLS` · `A2UIVERSE_DEBUG_IDS`.

## The turn (M0)

```
client ──A2A──► executor.execute(ctx, bus)
   1  bus.publish(synthetic Task{id: ctx.taskId, state: working})      always first
   2  turn = journal.open(...)
   3  handle = pool.dispatch(app, {clientContextId, clientTaskId, message})
   4  for each relayed event: collect surface ids · bus.publish(event)
   5  record = await handle.done
   6  if !record.sawFinal: bus.publish(final status from record.outcome)
   7  turn.dispatched(record) · turn.surfaces(...) · turn.close(outcome)
   finally: bus.finished()
cancelTask(taskId) → pool.cancel(taskId); step 4–6 then emit `canceled`.
```

The dispatch target is `registry.list()[0]`; the Router/Planner replace that line in Phase 2.

## Id spaces

```
client ──(clientContextId, clientTaskId)──► orchestrator ──(vendorContextId, vendorTaskId)──► app
```

One client conversation maps to one vendor conversation per app. Relayed events carry only the orchestrator's ids; outgoing messages carry only the vendor's.

## Components

### Registry — `registry/`

Installed apps; the orchestrator's local state. Hardcoded module until M7, a directory on disk after.

| | |
|---|---|
| Record | `AppRecord { id, displayName, agentUrl, authScheme: 'none', catalogId, catalogPackage }` — the bundle (SPEC §9.1) |
| Public | `get(appId)` (throws on unknown) · `list()` · `resolveByCatalogId(catalogId)` |
| Private | `Map<appId, AppRecord>` |
| Entries | `entries.ts`: `defaultEntries()` (github → `localhost:11001`), `applyUrlOverrides(entries, map)` |
| Reads it | executor (M0) · Router, Planner, Validator, AuthVault, interaction routing (later) |

### AgentsPool — `agentsPool/`

A2A connections to apps and the per-turn dispatch. Dispatch unit `(endpoint, credential)`; credential is a placeholder until M8.

| | |
|---|---|
| Public | `dispatch(appId, turn) → DispatchHandle` · `cancel(clientTaskId)` |
| Handle | `{ events: AsyncIterable, done: Promise<DispatchRecord>, cancel() }` — `done` never rejects; the future quiescence unit |
| Record | `DispatchRecord { appId, clientContextId, clientTaskId, vendorContextId?, vendorTaskId?, startedAt, endedAt?, outcome, error?, sawFinal, deadlineMs }` |
| Outcome | `completed` · `failed` (network, non-2xx, no final event, vendor final in `failed/canceled/rejected`) · `cancelled` (abort) · `timeout` (reserved; timer not armed) |
| Private | `clients: Map<agentUrl, Promise<Client>>` (lazy `ClientFactory.createFromUrl`) · `contexts: VendorContextMap` · `inflight: Map<clientTaskId, handle>` · one `AbortController` per dispatch |
| Outgoing | `prepareOutgoing`: strip orchestrator ids, set stored `vendorContextId`; parts and metadata untouched; `X-A2A-Extensions` carries the A2UI v0.9.1 and v0.9 URIs |
| Non-streaming app | the SDK client falls back to one `sendMessage`; a terminal `Task` yields the outcome with `sawFinal=false`, the executor appends the final status |

`VendorContextMap` (`contextMap.ts`): `get(clientContextId, appId)` / `set(...)`. In-memory; moves into the Composition object when that exists.

### Relay — `agentsPool/relay.ts` (pure)

`relayEvent(vendorEvent, {taskId, contextId, appId, debugIds}) → event`

| Event | Rewritten | Kept |
|---|---|---|
| `task` | `id`, `contextId`, ids inside `status.message` and `history[]` | `status.state`, `artifacts`, parts (by reference) |
| `status-update` | `taskId`, `contextId`, ids inside `status.message` | `final`, parts |
| `artifact-update` | `taskId`, `contextId` | `artifact` (by reference) |
| `message` | `contextId`, `taskId` if present | parts |

Every event gains `metadata.a2uiverse = { source: appId }` (merged into existing metadata); `vendorContextId`/`vendorTaskId` are added under it only with `A2UIVERSE_DEBUG_IDS`.

### IntentJournal — `journal/`

Per-turn record of declared intent (SPEC §10, §11). Append-only JSON lines at `<STATE_DIR>/intent-journal.jsonl`. No reads in M0.

| | |
|---|---|
| Public | `open({turnId, clientContextId, message, appId}) → JournalTurn` |
| `JournalTurn` | `dispatched(record)` · `surfaces(touches)` · `close(outcome)` — appends one line; never throws |
| Entry | `{ turnId, clientContextId, at, kind, descriptor, payload?, dispatch[], surfaces{created,updated,deleted}, clientMetadata{keys, dataModelBytes}, outcome, embedding: null }` |
| `descriptor.ts` | `describe(message, appId)`: text parts verbatim → `utterance`; `data.action` → `action` (`"<name> on surface <id> in <app>"` + `context`); else `unknown` (JSON of parts) |
| `surfaces.ts` | `touchesOf(event)`: read-only scan of A2UI DataParts (`createSurface` → created, `updateComponents`/`updateDataModel` → updated, `deleteSurface` → deleted); accepts one message per part and the `messages[]` form |

`embedding` is filled when the Router's embedding model arrives.

### OrchestratorExecutor — `executor.ts`

Implements the SDK's `AgentExecutor`. Holds `inflight: Map<taskId, DispatchHandle>`. Owns the synthetic initial `Task` and the orchestrator-authored final status (only when the app never sent one). Collaborators: Registry, AgentsPool, IntentJournal.

### AgentCard — `agentCard.ts`

Static: name, description, `url = BASE_URL`, protocol 0.3, JSON-RPC, streaming, the A2UI v0.9.1 extension (no params), one `palette` skill.

## Tests — `test/`

`fakeVendor.ts`: an in-process A2A app on the same SDK server pieces, scripted per turn, recording the raw `X-A2A-Extensions` header and received messages. Pure units (relay, descriptor, surfaces, registry, config, card) · pool against the fake · end-to-end through `ClientFactory` as the canvas connects.
