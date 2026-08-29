# Orchestrator — system design

`apps/orchestrator`. An A2A agent server (SPEC §10); the only thing the client talks to. State as of Phase 2 (M1): Registry · Embedder · Router · Planner · AgentsPool · IntentJournal behind one executor. One model call per utterance turn (the Planner); the composition state is canonical here, the shell surface its rendered projection.

## Process

```
index.ts ── loadConfig() ── buildOrchestrator({config, overrides?}) ── await init() ── express.listen(PORT)
                                   │                                        │
             ┌───────────┬─────────┼─────────┬──────────────┐     registry.refreshCards
          Registry    Embedder   Router   Planner      AgentsPool   (cards fetched at boot;
             │           │         │         │              │        unreachable ⇒ null card,
             └───────────┴── OrchestratorExecutor ──────────┘        unroutable this session)
                          │              │
                    IntentJournal   DefaultRequestHandler(card, InMemoryTaskStore, executor)
                                         │
                    GET /.well-known/agent-card.json · POST / (JSON-RPC)
```

Config (env): `PORT` 10001 · `BASE_URL` (card url) · `STATE_DIR` · `A2UIVERSE_AGENT_URLS` · `A2UIVERSE_DEBUG_IDS` · `GOOGLE_API_KEY` (Planner; missing ⇒ boot warning, palette turns are broken turns) · `A2UIVERSE_PLANNER_MODEL` (default `gemini-2.5-flash`) · `A2UIVERSE_PLANNER_EFFORT` (`low` default — `low` spends no thinking budget; latency is time-to-first-paint) · `A2UIVERSE_SHORTLIST_CAP` (default 5).

`buildOrchestrator` takes injection `overrides` — `{embedder?, planner?, resolveCard?}` — so tests run with no model download, no model call, no card network.

## The turn (M1)

`classifyTurn(userMessage)` routes each incoming client message: `utterance` (text) · `action` (`data.action` with namespaced surfaceId) · `clientError` (`data.error`, e.g. `VALIDATION_FAILED`) · `unknown` (broken turn).

```
utterance:
   1  bus.publish(synthetic Task{state: working})            always first, stamp {source:'shell', role:'shell'}
   2  turn = journal.open(...)
   3  shortlist = router.shortlist(text)                     ranked, capped, no threshold; empty ⇒ broken turn
   4  plan = planner.plan({utterance, shortlist})            the one model call; malformed ⇒ broken turn
   5  bus.publish(shell paint: createSurface shell:main + updateComponents)   BEFORE any dispatch (§4.5)
   6  per plan leaf: pool.dispatch(appId, Planner-authored request + partition-filtered metadata)
        per event: relayEvent → composeFragment → bus.publish
   7  per handle.done: outcomeToSlotState → flip slot → shell repaint (updateComponents only)
   8  all settled: one turn-final (completed; canceled only when every dispatch cancelled)
   9  journal: plan · dispatch records · namespaced surface touches · close; descriptor embedded at write time
   finally: bus.finished()

action:   parseSurfaceId(action.surfaceId) → owner; un-namespace the action part; partition-filter
          metadata; single owner dispatch (no Router/Planner); same composeFragment; executor final.
          A failed dispatch flips the slot failed; an action that paints nothing never collapses it.

clientError: flip that surface's slot to failed on the stored composition → shell repaint → completed final.

cancelTask(taskId) → pool.cancel(taskId) — aborts every handle of the fan-out; all-cancelled ⇒ canceled final.
```

Broken turn (empty shortlist, malformed plan, missing key, unknown message): failed final stamped as the shell, journal `failed`. One agent failing never fails a fan-out turn.

## Composition

- **State** (`composition/state.ts`): `CompositionState {plan, slots: Map<slotName, {plan: SlotPlan, state}>}`, held per `clientContextId` in the executor — surviving the turn so a later `VALIDATION_FAILED` flips the right slot. Slot states are `pending | failed | collapsed`; `filled` is the client's. `outcomeToSlotState`: failed/timeout → failed · cancelled → collapsed · completed with zero surface touches → collapsed · completed with touches → left to the client.
- **Names** (`composition/constants.ts`): shell surface `shell:main` (reserved `shell` source id, namespaced like every fragment; Registry rejects an app claiming `shell`); slot names orchestrator-derived, `slot-<appId>` (M8 widens for multi-account).
- **Shell painter** (`composition/shellPainter.ts`): pure plan+state → A2UI parts in the shell catalog (`CATALOG_ID` via the `@a2uiverse/shell-catalog/id` subpath, no React). Flat v0.9 components: root Row/Column per `plan.direction`, a multi-slot group as a container on the opposite axis, each leaf a Column of `Attribution` over `Slot` (deterministic ids from slot names — repaints keep identity). Envelope: non-final `working` status-update whose `status.message.parts` carry single-object `version:'v0.9'` DataParts, stamped `{source:'shell', role:'shell'}`.
- **Fragment relay** (`composition/fragmentRelay.ts`): applied after `relayEvent` — stamp gains `slot` + `role:'fragment'`; surfaceIds namespaced `<appId>:<surfaceId>` on the four A2UI ops (single-object and `messages[]` forms); **vendor finals demoted** (`final:false`, terminal states → `working`) because several vendors end on one orchestrator task — the executor owns the single turn-final. The demotion is envelope ownership, like the id rewrites — not a content rewrite; the relay-transparency invariant stays: exactly three content-affecting rewrites (stamp · namespace · partition filter).
- **Partition filter** (`composition/partition.ts`): `vendorMetadata(metadata, appId)` — outbound messages carry only A2UI-standard keys; `a2uiClientDataModel.surfaces` filtered to the owner's namespace, keys un-namespaced; nothing a2uiverse-specific rides the vendor wire.

## Id spaces

```
client ──(clientContextId, clientTaskId)──► orchestrator ──(vendorContextId, vendorTaskId)──► app
```

One client conversation maps to one vendor conversation per app. Relayed events carry only the orchestrator's ids; outgoing messages carry only the vendor's. Surfaces add the namespace dimension: vendor-local ids on the vendor wire, `<appId>:`-prefixed toward the client, reversed on inbound actions.

## Components

### Registry — `registry/`

Installed apps plus, since Phase 2, the agent-authored mirror: nullable AgentCards fetched at boot and their corpus vectors (SPEC decisions 10/11). Hardcoded module until M7.

| | |
|---|---|
| Record | `AppRecord { id, displayName, agentUrl, authScheme: 'none', catalogId, catalogPackage }` — the bundle (SPEC §9.1) |
| Public | `get(appId)` (throws on unknown) · `list()` · `resolveByCatalogId(catalogId)` · `refreshCards({resolveCard, embedder})` (never throws; fetch failure ⇒ null card, no vector) · `card(appId)` · `routable() → {record, card, vector}[]` |
| Private | `Map<appId, AppRecord>` · `cards: Map<appId, AgentCard | null>` · `vectors: Map<appId, number[]>` |
| Corpus | `corpus.ts` `corpusDoc(card)`: one document per agent — name + description + all skill texts blended; skills are card content the Planner reads, not index structure |
| Reservation | ctor throws on an entry with id `shell` |
| Entries | `entries.ts`: github → 11001, gmail → 11002, calendar → 11003 (gmail/calendar catalog ids convention-guessed until 2.6/2.7); `applyUrlOverrides(entries, map)` |

### Embedder — `embedder/`

The one embedding model (SPEC decision 10), injected into Registry, Router, and journal.

| | |
|---|---|
| Seam | `Embedder { embed(texts) → unit vectors }` · `cosine(a, b)` |
| Production | `TransformersEmbedder`: quantized `Xenova/all-MiniLM-L6-v2` (`q8`, revision pinned as constants — the M7 stored-vector seam) over `@huggingface/transformers`, lazy dynamic import, loaded once; model cached under `<STATE_DIR>/models` so later boots are offline |
| Tests | `FakeEmbedder` (hashed bag-of-words); one live test gated by `A2UIVERSE_EMBEDDER_LIVE=1` |

### Router — `router/router.ts`

Retrieval only: embed the query, cosine-rank `registry.routable()`, cap the shortlist. No similarity threshold — the Planner makes the semantic selection from the shortlist. Empty corpus ⇒ empty shortlist ⇒ broken turn at the executor.

### Planner — `planner/`

The phase's one model call (SPEC decision 9), behind two seams: `Planner {plan({utterance, shortlist})}` and `getModel(settings)` (AI SDK Google provider; swapping providers is this one function).

| | |
|---|---|
| Plan | `{direction: row\|column, groups: [{slots: [{appId, archetype, request}]}]}` — the depth-2 alternating tree, unrolled union-free (`planSchema.ts`, hand-written JSON schema for Gemini structured output) |
| Archetypes | `archetypes.ts` — `card/panel/row/full`, hub-internal plan vocabulary only; never on any wire |
| Call | `ModelPlanner`: `generateText` + `Output.object({schema})`; `low` effort ⇒ zero thinking budget via provider options |
| Checklist | `checkPlan.ts` after parse: ≥1 slot, no empty group, appIds from the shortlist, each at most once, non-empty request → `MalformedPlanError` ⇒ broken turn |
| Prompt | `prompt.ts`: system role + per-agent card summaries; each slot's `request` is the message its agent receives — prose carrying **all** guidance, size/shape included; the Planner never invents identifiers |
| Tests | `FakePlanner` / `ThrowingPlanner`; `ModelPlanner` against the AI SDK mock model |

### AgentsPool — `agentsPool/`

A2A connections to apps and the per-turn dispatch. Pure transport: prompt assembly and partition filtering happen in the executor before `dispatch`. Dispatch unit `(endpoint, credential)`; credential is a placeholder until M8.

| | |
|---|---|
| Public | `dispatch(appId, turn) → DispatchHandle` · `cancel(clientTaskId)` (cancels every handle under the id) |
| Handle | `{ events: AsyncIterable, done: Promise<DispatchRecord>, cancel() }` — `done` never rejects; the quiescence unit |
| Record | `DispatchRecord { appId, clientContextId, clientTaskId, vendorContextId?, vendorTaskId?, startedAt, endedAt?, outcome, error?, sawFinal, deadlineMs }` |
| Outcome | `completed` · `failed` (network, non-2xx, no final event, vendor final in `failed/canceled/rejected`) · `cancelled` (abort) · `timeout` (reserved; timer not armed) |
| Private | `clients: Map<agentUrl, Promise<Client>>` (lazy `ClientFactory.createFromUrl`) · `contexts: VendorContextMap` · `inflight: Map<clientTaskId, Set<handle>>` (a fan-out turn holds several handles under one key) · one `AbortController` per dispatch |
| Outgoing | `prepareOutgoing`: strip orchestrator ids, set stored `vendorContextId`; parts and metadata untouched; `X-A2A-Extensions` carries the A2UI v0.9.1 and v0.9 URIs |
| Non-streaming app | the SDK client falls back to one `sendMessage`; a terminal `Task` yields the outcome with `sawFinal=false`, the executor's turn-final closes the stream |

`VendorContextMap` (`contextMap.ts`): `get(clientContextId, appId)` / `set(...)`. In-memory; moves into the Composition object when that exists.

### Relay — `agentsPool/relay.ts` (pure)

`relayEvent(vendorEvent, {taskId, contextId, appId, debugIds}) → event` — the id half; `composeFragment` (above) is the composition half applied on top.

| Event | Rewritten | Kept |
|---|---|---|
| `task` | `id`, `contextId`, ids inside `status.message` and `history[]` | `status.state`, `artifacts`, parts (by reference) |
| `status-update` | `taskId`, `contextId`, ids inside `status.message` | `final`, parts |
| `artifact-update` | `taskId`, `contextId` | `artifact` (by reference) |
| `message` | `contextId`, `taskId` if present | parts |

Every event gains `metadata.a2uiverse = { source: appId }` (merged); `vendorContextId`/`vendorTaskId` under it only with `A2UIVERSE_DEBUG_IDS`. `composeFragment` then adds `slot` and `role: 'fragment'`.

### IntentJournal — `journal/`

Per-turn record of declared intent (SPEC §10, §11). Append-only JSON lines at `<STATE_DIR>/intent-journal.jsonl`.

| | |
|---|---|
| Public | `open({turnId, clientContextId, message, appId?}) → JournalTurn` — `appId` only on single-dispatch (action) turns |
| `JournalTurn` | `plan(plan)` · `dispatched(record)` · `surfaces(touches)` · `close(outcome)` — appends one line; never throws |
| Entry | `{ turnId, clientContextId, at, kind, descriptor, payload?, plan?, dispatch[], surfaces{...}, clientMetadata{keys, dataModelBytes}, outcome, embedding }` — surfaces carry namespaced ids; `outcome` is turn-level |
| Embedding | the descriptor, embedded at `close` with the injected (same) embedder; a failure journals `null` and never fails the turn |
| `descriptor.ts` | `describe(message, appId?)`: text → `utterance` · `data.action` → `action` · `data.error` → `error` (`"VALIDATION_FAILED on surface <nsId>"`) · else `unknown` |
| `surfaces.ts` | `touchesOf(event)`: read-only scan of A2UI DataParts; accepts one message per part and the `messages[]` form |

### OrchestratorExecutor — `executor.ts`

Implements the SDK's `AgentExecutor`. Holds `compositions: Map<clientContextId, CompositionState>`. Owns the synthetic initial `Task` and **every** turn-final (vendor finals are demoted). Collaborators: Registry, Router, Planner, AgentsPool, IntentJournal, the composition modules.

### AgentCard — `agentCard.ts`

Static: name, description, `url = BASE_URL`, protocol 0.3, JSON-RPC, streaming, the A2UI v0.9.1 extension (no params), one `palette` skill.

## Tests — `test/`

`fakeVendor.ts`: an in-process A2A app on the same SDK server pieces, scripted per turn, recording the raw `X-A2A-Extensions` header and received messages; card name/description/skills configurable for Router tests. Seams: `FakeEmbedder`, `FakePlanner`/`ThrowingPlanner`. Pure units (relay, fragment relay, shell painter, partition, classify, plan checklist, descriptor, surfaces, registry, router, config, card) · pool against the fake · integration through `ClientFactory` as the canvas connects (fan-out ordering, degenerate single-agent, failed/collapsed slots, action round-trip, partition filter, `VALIDATION_FAILED`, broken turn, journal shape). Model-download and live-model tests are env-gated (`A2UIVERSE_EMBEDDER_LIVE`, `GOOGLE_API_KEY`) and never run in `pnpm verify`.
