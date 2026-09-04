# Orchestrator — system design

`apps/orchestrator`. An A2A agent server (SPEC §10); the only thing the client talks to. State as of Phase 4 (M2): Registry · Embedder · Router · Planner · Synthesizer · AgentsPool · IntentJournal behind one executor, with Partitions and the IntegrityChecker on the composition. Two model calls per synthesized utterance turn (Planner, then Synthesizer once every source has resolved); the composition state is canonical here, the shell surfaces its rendered projection.

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

Config (env): `PORT` 10001 · `BASE_URL` (card url) · `STATE_DIR` · `A2UIVERSE_AGENT_URLS` · `A2UIVERSE_AGENTS_DIR` (roster from manifests one level below it, replacing the hardcoded entries; the launcher's variable — the mock tier's opt-in) · `A2UIVERSE_DEBUG_IDS` · `GOOGLE_API_KEY` (Planner and Synthesizer; missing ⇒ boot warning, palette turns are broken turns, syntheses collapse as `failed`) · `A2UIVERSE_PLANNER_MODEL` (default `gemini-2.5-flash`) · `A2UIVERSE_PLANNER_EFFORT` (`low` default — `low` spends no thinking budget; latency is time-to-first-paint) · `A2UIVERSE_SHORTLIST_CAP` (default 5) · `A2UIVERSE_SYNTHESIZER_MODEL` (follows the Planner's) · `A2UIVERSE_SYNTHESIZER_EFFORT` (`low`; dead air is measured before effort is spent).

`buildOrchestrator` takes injection `overrides` — `{embedder?, planner?, synthesizer?, resolveCard?}` — so tests run with no model download, no model call, no card network.

The synthesis mechanism end to end — both processes, the wire shapes, generations, the client's
evaluation — is told in [`synthesis.md`](synthesis.md).

## The turn (M2)

`classifyTurn(userMessage)` routes each incoming client message: `utterance` (text) · `action` (`data.action` with namespaced surfaceId) · `clientError` (`data.error`, e.g. `VALIDATION_FAILED`) · `unknown` (broken turn).

```
utterance:
   1  bus.publish(synthetic Task{state: working})            always first, stamp {source:'shell', role:'shell'}
   2  turn = journal.open(...)
   3  shortlist = router.shortlist(text)                     ranked, capped, no threshold; empty ⇒ broken turn
   4  plan = planner.plan({utterance, shortlist})            the one model call; malformed ⇒ broken turn
   5  bus.publish(shell paint: createSurface shell:main + updateComponents)   BEFORE any dispatch (§4.5)
   6  per source slot (never the `shell` slot): pool.dispatch(appId, Planner-authored request + partition-filtered metadata)
        per event: relayEvent → composeFragment → partitions.apply → withGenerations → bus.publish
   7  per handle.done: outcomeToSlotState → flip slot → shell repaint (updateComponents only);
        completed-and-painted ⇒ source arrived; lastSettledAt
   8  synthesis (when the plan has a `shell` slot):
        < 2 arrived ⇒ slot collapsed, journal `skipped` (§5.1)
        ◆ synthesizer.synthesize({utterance, request, sources, operators}) → checkSynthesis
        declined | malformed | model failure ⇒ slot collapsed, journal names which
        else wiring = output + computedAgainst(partitions.generations()); partitions.snapshot();
             paint shell:synthesis into slot-shell with the wiring on metadata (nothing else moves)
   9  one turn-final (completed; canceled only when every dispatch cancelled)
  10  journal: plan · dispatch records · surface touches · synthesis {outcome, reason?, wiring?, deadAirMs} · close
   finally: bus.finished()

action:   parseSurfaceId(action.surfaceId) → owner; partitions.applyClientDataModel(returning data model);
          un-namespace the action part; partition-filter metadata; single owner dispatch (no
          Router/Planner); same pump (materialize, stamp generations); then, if the live wiring exists
          and checkWiring against partitions.generations() fails ⇒ re-synthesis inline (step 8) before
          the final. A failed dispatch flips the slot failed; an action that paints nothing never
          collapses it.

clientError: flip that surface's slot to failed on the stored composition → shell repaint → completed final.

cancelTask(taskId) → pool.cancel(taskId) — aborts every handle of the fan-out; all-cancelled ⇒ canceled final.
```

Broken turn (empty shortlist, malformed plan, missing key, unknown message): failed final stamped as the shell, journal `failed`. One agent failing never fails a fan-out turn.

## Composition

- **State** (`composition/state.ts`): `CompositionState {plan, slots, partitions, arrived, wiring?, lastSettledAt?}`, held per `clientContextId` in the executor — surviving the turn so a later action or `VALIDATION_FAILED` finds it. Slot states are `pending | failed | collapsed`; `filled` is the client's. `outcomeToSlotState`: failed/timeout → failed · cancelled → collapsed · completed with zero surface touches → collapsed · completed with touches → left to the client (and the source counts as arrived). `synthesisSlot(state)` is the `shell` slot when the plan reserved one.
- **Partitions** (`composition/partitions.ts`): every surface's materialized data model keyed by namespaced id, applied from relayed A2UI ops (`createSurface`, `updateDataModel` at an RFC 6901 path, `deleteSurface`) and from the returning client data model. Generations (task-4.4 decision 3): before `snapshot()` any change bumps; after it, only an array present in the snapshot and present now with different contents — a missing array is absent, an identical one is nothing, a scalar outside arrays is free. `generationsOf(changed)` feeds the stamp; `generations()` becomes the wiring's `computedAgainst`; `resolve(ref)` serves the checklist.
- **IntegrityChecker** (`composition/integrity.ts`): `refValid(ref, computedAgainst, generations)` — per-binding interface, generation-backed answer (collapses to per-surface under index-only refs); `checkWiring(wiring, generations) → {valid, invalid: surfaces}` gates re-synthesis.
- **Synthesis painter** (`composition/synthesisPainter.ts`): `shell:synthesis`, the shell's second surface. The derived tree (task-4.4 decision 1): `SortControl` bound to `/sort`, a header of field labels, a `Column` templated over `/entities` whose row is one `DerivedValue` per field bound by the field name — so every formula cell renders through the shell's component by construction. `synthesisEnvelope` stamps `{source: shell, slot: slot-shell, role: fragment}` and carries the wiring under the sdk's `WIRING_KEY`.
- **Names** (`composition/constants.ts`): shell surfaces `shell:main` and `shell:synthesis` (reserved `shell` source id, namespaced like every fragment; Registry rejects an app claiming `shell`); slot names orchestrator-derived, `slot-<appId>` — the synthesis slot is `slot-shell`, attributed `Synthesis` (M8 widens for multi-account).
- **Shell painter** (`composition/shellPainter.ts`): pure plan+state → A2UI parts in the shell catalog (`CATALOG_ID` via the `@a2uiverse/shell-catalog/id` subpath, no React). Flat v0.9 components: root Row/Column per `plan.direction`, a multi-slot group as a container on the opposite axis, each leaf a Column of `Attribution` over `Slot` (deterministic ids from slot names — repaints keep identity). Envelope: non-final `working` status-update whose `status.message.parts` carry single-object `version:'v0.9'` DataParts, stamped `{source:'shell', role:'shell'}`.
- **Fragment relay** (`composition/fragmentRelay.ts`): applied after `relayEvent` — stamp gains `slot` + `role:'fragment'`, and, via `withGenerations` once the partitions were applied, the touched surfaces' `generations`; surfaceIds namespaced `<appId>:<surfaceId>` on the four A2UI ops (single-object and `messages[]` forms); **vendor finals demoted** (`final:false`, terminal states → `working`) because several vendors end on one orchestrator task — the executor owns the single turn-final. The demotion is envelope ownership, like the id rewrites — not a content rewrite; the relay-transparency invariant stays: exactly three content-affecting rewrites (stamp · namespace · partition filter).
- **Partition filter** (`composition/partition.ts`): `vendorMetadata(metadata, appId)` — outbound messages carry only A2UI-standard keys; `a2uiClientDataModel.surfaces` filtered to the owner's namespace, keys un-namespaced; nothing a2uiverse-specific rides the vendor wire.

## Id spaces

```
client ──(clientContextId, clientTaskId)──► orchestrator ──(vendorContextId, vendorTaskId)──► app
```

One client conversation maps to one vendor conversation per app. Relayed events carry only the orchestrator's ids; outgoing messages carry only the vendor's. Surfaces add the namespace dimension: vendor-local ids on the vendor wire, `<appId>:`-prefixed toward the client, reversed on inbound actions.

## Components

### Registry — `registry/`

Installed apps plus, since Phase 2, the agent-authored mirror: nullable AgentCards fetched at boot and their corpus vectors (SPEC decisions 10/11). Hardcoded module until M7.

|             |                                                                                                                                                                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Record      | `AppRecord { id, displayName, agentUrl, authScheme: 'none', catalogId, catalogPackage }` — the bundle (SPEC §9.1)                                                                                                                      |
| Public      | `get(appId)` (throws on unknown) · `list()` · `resolveByCatalogId(catalogId)` · `refreshCards({resolveCard, embedder})` (never throws; fetch failure ⇒ null card, no vector) · `card(appId)` · `routable() → {record, card, vector}[]` |
| Private     | `Map<appId, AppRecord>` · `cards: Map<appId, AgentCard                                                                                                                                                                                 | null>`·`vectors: Map<appId, number[]>` |
| Corpus      | `corpus.ts` `corpusDoc(card)`: one document per agent — name + description + all skill texts blended; skills are card content the Planner reads, not index structure                                                                   |
| Reservation | ctor throws on an entry with id `shell`                                                                                                                                                                                                |
| Entries     | `entries.ts`: github → 11001, gmail → 11002, calendar → 11003 (gmail/calendar catalog ids convention-guessed until 2.6/2.7); `applyUrlOverrides(entries, map)`                                                                         |
| Manifests   | `manifests.ts` `readRoster(agentsDir)`: the roster from `<child>/manifest.json` one level below the dir when `A2UIVERSE_AGENTS_DIR` is set — missing manifest ⇒ not an app, malformed/missing field ⇒ throws naming the file, no records or duplicate id ⇒ throws. The launcher's discovery convention, pinned on both sides; moves to the sdk with the manifest schema (Phase 9) |

### Embedder — `embedder/`

The one embedding model (SPEC decision 10), injected into Registry, Router, and journal.

|            |                                                                                                                                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seam       | `Embedder { embed(texts) → unit vectors }` · `cosine(a, b)`                                                                                                                                                                                                         |
| Production | `TransformersEmbedder`: quantized `Xenova/all-MiniLM-L6-v2` (`q8`, revision pinned as constants — the M7 stored-vector seam) over `@huggingface/transformers`, lazy dynamic import, loaded once; model cached under `<STATE_DIR>/models` so later boots are offline |
| Tests      | `FakeEmbedder` (hashed bag-of-words); one live test gated by `A2UIVERSE_EMBEDDER_LIVE=1`                                                                                                                                                                            |

### Router — `router/router.ts`

Retrieval only: embed the query, cosine-rank `registry.routable()`, cap the shortlist. No similarity threshold — the Planner makes the semantic selection from the shortlist. Empty corpus ⇒ empty shortlist ⇒ broken turn at the executor.

### Planner — `planner/`

The phase's one model call (SPEC decision 9), behind two seams: `Planner {plan({utterance, shortlist})}` and `getModel(settings)` (AI SDK Google provider; swapping providers is this one function).

|                |                                                                                                                                                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Plan           | `{direction: row\|column, groups: [{slots: [{appId, archetype, request}]}]}` — the depth-2 alternating tree, unrolled union-free (`planSchema.ts`, hand-written JSON schema for Gemini structured output)                                                                      |
| Archetypes     | `archetypes.ts` — `card/panel/row/full`, hub-internal plan vocabulary only; never on any wire                                                                                                                                                                                  |
| Call           | `ModelPlanner`: `generateText` + `Output.object({schema})`; `low` effort ⇒ zero thinking budget via provider options                                                                                                                                                           |
| Synthesis slot | A slot whose `appId` is the reserved `shell` (task-4.4 decision 6): the merged view the shell paints over the other slots, with an archetype and a `request` that is the Planner's guidance to the Synthesizer. Whether and where is the Planner's judgment (phase decision 8) |
| Checklist      | `checkPlan.ts` after parse: ≥1 slot, no empty group, appIds from the shortlist (or `shell`), each at most once, non-empty request; at most one `shell` slot and only with ≥2 sources → `MalformedPlanError` ⇒ broken turn                                                      |
| Prompt         | `prompt.ts`: system role + per-agent card summaries; each slot's `request` is the message its agent receives — prose carrying **all** guidance, size/shape included; the Planner never invents identifiers; one paragraph says when and how to ask for the merged view         |
| Tests          | `FakePlanner` / `ThrowingPlanner`; `ModelPlanner` against the AI SDK mock model                                                                                                                                                                                                |

### Synthesizer — `synthesizer/`

The turn's second model call (SPEC §5 ◆ #2, §10), a sibling of the Planner behind the same `getModel` seam: `Synthesizer {synthesize(input) → SynthesizerOutput}`.

|           |                                                                                                                                                                                                                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input     | `{utterance, request (the shell slot's), sources: [{surface, appId, displayName, data}], operators: [{name, description}]}` — every arrived partition's live data model, by namespaced surface id; data only, never vendor trees                                                                        |
| Output    | the sdk's `SYNTHESIZER_OUTPUT_SCHEMA` (`@a2uiverse/sdk`), meta keys stripped: fields · entities of positional cells · sort — or `declined` + reason. The orchestrator adds `computedAgainst`; the model never sees generations                                                                          |
| Call      | `ModelSynthesizer`: `generateText` + `Output.object`; effort via provider options as the Planner                                                                                                                                                                                                        |
| Checklist | `checkSynthesis.ts` after parse: operators the shell catalog declares, a declared sort field, uniform entity width, refs into held partitions whose pointers resolve now (a ref that never resolved is malformed, not absent) → `MalformedSynthesisError` ⇒ behaves as a decline, journaled `malformed` |
| Operators | `operators.ts` `operatorVocabulary()`: `OPERATORS` from `@a2uiverse/shell-catalog/operators` (React-free subpath) with descriptions read from `@a2uiverse/shell-catalog/catalog.json` — no second copy                                                                                                  |
| Prompt    | `prompt.ts`: what a ref is, one cell per field in order, entities as the same-thing assertion, decline when nothing joins                                                                                                                                                                               |
| Tests     | `FakeSynthesizer` (default: best-price wiring derived from the sources) / `ThrowingSynthesizer`; `ModelSynthesizer` against the AI SDK mock model; live smoke test gated by `A2UIVERSE_SYNTHESIZER_LIVE=1`                                                                                              |

### AgentsPool — `agentsPool/`

A2A connections to apps and the per-turn dispatch. Pure transport: prompt assembly and partition filtering happen in the executor before `dispatch`. Dispatch unit `(endpoint, credential)`; credential is a placeholder until M8.

|                   |                                                                                                                                                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public            | `dispatch(appId, turn) → DispatchHandle` · `cancel(clientTaskId)` (cancels every handle under the id)                                                                                                                                                |
| Handle            | `{ events: AsyncIterable, done: Promise<DispatchRecord>, cancel() }` — `done` never rejects; the quiescence unit                                                                                                                                     |
| Record            | `DispatchRecord { appId, clientContextId, clientTaskId, vendorContextId?, vendorTaskId?, startedAt, endedAt?, outcome, error?, sawFinal, deadlineMs }`                                                                                               |
| Outcome           | `completed` · `failed` (network, non-2xx, no final event, vendor final in `failed/canceled/rejected`) · `cancelled` (abort) · `timeout` (reserved; timer not armed)                                                                                  |
| Private           | `clients: Map<agentUrl, Promise<Client>>` (lazy `ClientFactory.createFromUrl`) · `contexts: VendorContextMap` · `inflight: Map<clientTaskId, Set<handle>>` (a fan-out turn holds several handles under one key) · one `AbortController` per dispatch |
| Outgoing          | `prepareOutgoing`: strip orchestrator ids, set stored `vendorContextId`; parts and metadata untouched; `X-A2A-Extensions` carries the A2UI v0.9.1 and v0.9 URIs                                                                                      |
| Non-streaming app | the SDK client falls back to one `sendMessage`; a terminal `Task` yields the outcome with `sawFinal=false`, the executor's turn-final closes the stream                                                                                              |

`VendorContextMap` (`contextMap.ts`): `get(clientContextId, appId)` / `set(...)`. In-memory; moves into the Composition object when that exists.

### Relay — `agentsPool/relay.ts` (pure)

`relayEvent(vendorEvent, {taskId, contextId, appId, debugIds}) → event` — the id half; `composeFragment` (above) is the composition half applied on top.

| Event             | Rewritten                                                      | Kept                                              |
| ----------------- | -------------------------------------------------------------- | ------------------------------------------------- |
| `task`            | `id`, `contextId`, ids inside `status.message` and `history[]` | `status.state`, `artifacts`, parts (by reference) |
| `status-update`   | `taskId`, `contextId`, ids inside `status.message`             | `final`, parts                                    |
| `artifact-update` | `taskId`, `contextId`                                          | `artifact` (by reference)                         |
| `message`         | `contextId`, `taskId` if present                               | parts                                             |

Every event gains `metadata.a2uiverse = { source: appId }` (merged); `vendorContextId`/`vendorTaskId` under it only with `A2UIVERSE_DEBUG_IDS`. `composeFragment` then adds `slot` and `role: 'fragment'`.

### IntentJournal — `journal/`

Per-turn record of declared intent (SPEC §10, §11). Append-only JSON lines at `<STATE_DIR>/intent-journal.jsonl`.

|                 |                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public          | `open({turnId, clientContextId, message, appId?}) → JournalTurn` — `appId` only on single-dispatch (action) turns                                                                                                                                                                                                                                                                                                    |
| `JournalTurn`   | `plan(plan)` · `synthesis(record)` · `dispatched(record)` · `surfaces(touches)` · `close(outcome)` — appends one line; never throws                                                                                                                                                                                                                                                                                  |
| Entry           | `{ turnId, clientContextId, at, kind, descriptor, payload?, plan?, synthesis?, dispatch[], surfaces{...}, clientMetadata{keys, dataModelBytes}, outcome, embedding }` — surfaces carry namespaced ids; `outcome` is turn-level; `synthesis {outcome: synthesized\|declined\|malformed\|skipped\|failed, reason?, wiring?, deadAirMs}` — `deadAirMs` from the last source settling to the outcome (phase decision 16) |
| Embedding       | the descriptor, embedded at `close` with the injected (same) embedder; a failure journals `null` and never fails the turn                                                                                                                                                                                                                                                                                            |
| `descriptor.ts` | `describe(message, appId?)`: text → `utterance` · `data.action` → `action` · `data.error` → `error` (`"VALIDATION_FAILED on surface <nsId>"`) · else `unknown`                                                                                                                                                                                                                                                       |
| `surfaces.ts`   | `touchesOf(event)`: read-only scan of A2UI DataParts; accepts one message per part and the `messages[]` form                                                                                                                                                                                                                                                                                                         |

### OrchestratorExecutor — `executor.ts`

Implements the SDK's `AgentExecutor`. Holds `compositions: Map<clientContextId, CompositionState>`. Owns the synthetic initial `Task` and **every** turn-final (vendor finals are demoted) — now after synthesis, in both utterance and action turns. Collaborators: Registry, Router, Planner, Synthesizer (+ the operator vocabulary), AgentsPool, IntentJournal, the composition modules.

### AgentCard — `agentCard.ts`

Static: name, description, `url = BASE_URL`, protocol 0.3, JSON-RPC, streaming, the A2UI v0.9.1 extension (no params), one `palette` skill.

## Tests — `test/`

`fakeVendor.ts`: an in-process A2A app on the same SDK server pieces, scripted per turn, recording the raw `X-A2A-Extensions` header and received messages; card name/description/skills configurable for Router tests. Seams: `FakeEmbedder`, `FakePlanner`/`ThrowingPlanner`, `FakeSynthesizer`/`ThrowingSynthesizer`. Pure units (relay, fragment relay, shell painter, synthesis painter, partitions, integrity, partition filter, classify, plan checklist, synthesis checklist, descriptor, surfaces, registry, router, config, card) · pool against the fake · integration through `ClientFactory` as the canvas connects (fan-out ordering, degenerate single-agent, failed/collapsed slots, action round-trip, partition filter, `VALIDATION_FAILED`, broken turn, journal shape; synthesis: the merged view painted with its wiring and generations, decline, malformed, fewer-than-two, in-place reorder → inline re-synthesis vs. scalar edit). Model-download and live-model tests are env-gated (`A2UIVERSE_EMBEDDER_LIVE`, `A2UIVERSE_SYNTHESIZER_LIVE` + `GOOGLE_API_KEY`) and never run in `pnpm verify`.
