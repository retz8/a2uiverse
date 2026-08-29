# Task 2.4 — Orchestrator composition core

## Context

Phase 2 turns the Phase-1 transparent-relay orchestrator into the composition hub: Router (local embeddings) → Planner (one Gemini call, schema-enforced plan) → shell-surface paint → fan-out dispatch → slot-lifecycle repaints → journal embedding. Design was settled in a grill; the authority is `_dev/docs/spec/task-2.4-orchestrator-composition.md` (10 locked decisions) on top of `_dev/docs/spec/phase-2-layout-composition.md`. SPEC.md/phase-spec amendments already landed (`ce2c322`). All work lands directly on `main` (user's call), 8 stages, each leaving `pnpm verify` green.

At execution start: copy this plan to `_dev/docs/plan/task-2.4-orchestrator-composition.md` and commit (harness convention).

## Verified facts designed around

- Client extracts A2UI only from DataParts whose `data` is a **single message object with inline `version: 'v0.9'`** (not v0.9.1, not arrays), from `event.parts` / `status.message.parts`; artifact-updates ignored (`apps/client/src/a2a/messages.ts`). Components are flat `{id, component, ...props}`, one `id: 'root'` per surface.
- Card fetch: `new DefaultAgentCardResolver().resolve(baseUrl)` (`@a2a-js/sdk/client`); `AppRecord.agentUrl` is a base URL.
- `AgentsPool.dispatch` returns `DispatchHandle {events, done, cancel}`; `done` never rejects; outcomes `completed|failed|cancelled|timeout`. `touchesOf(event)` (journal/surfaces.ts) counts surface touches → collapsed detection.
- Test seam: `startFakeVendor({script,...})` real in-process A2A vendor (`apps/orchestrator/test/fakeVendor.ts`).

## Cross-cutting design decisions

- **D-A Shell paint transport**: shell surface rides a non-final `working` status-update whose `status.message.parts` carries the A2UI DataParts (single-object, `version:'v0.9'`), stamp `{a2uiverse: {source:'shell', role:'shell'}}`. First paint = `createSurface {surfaceId:'shell:main', catalogId: SHELL_CATALOG_ID}` + `updateComponents`; repaints = `updateComponents` only. Extends the executor's existing synthetic-event pattern.
- **D-B Vendor finals demoted**: under fan-out, relayed vendor `status-update`s are rewritten `final:false`, terminal states → `'working'` (parts kept); the executor owns the single turn-final. Envelope-ownership concern (like id rewrites), not a fourth content rewrite — record in design doc.
- **D-C Union-free plan schema** (Gemini structured output dislikes unions/$ref): `Plan {direction:'row'|'column', groups: PlanGroup[]}`, `PlanGroup {slots: PlanSlot[]}`, `PlanSlot {appId, archetype, request}`. Multi-slot group = container on opposite axis ⇒ exactly the depth-2 alternating tree, zero unions. Deterministic checklist after parse (≥1 slot, no empty group, appIds from shortlist, each at most once, non-empty request) → `MalformedPlanError` = broken turn.
- **D-D Per-context CompositionState**: executor holds `Map<clientContextId, CompositionState>` so a later `VALIDATION_FAILED` flips the right slot and repaints. One shell surface per utterance turn.
- **D-E Injection seams**: `Embedder`/`Planner` are interfaces; `buildOrchestrator({config, overrides?})` accepts `{embedder?, planner?, resolveCard?}`. Tests use `FakeEmbedder` (hashed bag-of-words, deterministic) + `FakePlanner`; real-model tests env-gated so verify/CI never downloads the ~23MB model.
- **D-F Shell catalog id without React**: add `"./id"` subpath export → `dist/catalog-id.js` to `packages/shell-catalog/package.json`; orchestrator imports `CATALOG_ID` from `@a2uiverse/shell-catalog/id`.
- **D-G AgentsPool inflight**: `#inflight` becomes `Map<clientTaskId, Set<DispatchHandle>>` (fan-out shares one taskId); `cancel` cancels the set. Pool stays pure transport.

## Stages

### 1. sdk rollback (decisions 4/5)
- `packages/sdk/contracts/composition.v0.1.json`: remove `slotArchetypes` + `shapes.slotRequest`; keep URI, stampKey, separator, compositionStamp (with slot/role), namespacing rule.
- `packages/sdk/js/src/composition.ts`: remove `SLOT_ARCHETYPES`, `SlotArchetype`, `SlotRequest`, `SLOT_REQUEST_FIELDS`, `readSlotRequest`; keep `COMPOSITION_EXTENSION_URI`. Trim contract test accordingly.
- Delete `packages/sdk/python/`; remove from `pnpm-workspace.yaml`; rewrite `packages/sdk/README.md` (single JS projection, contract stays normative). `pnpm install` to refresh lockfile. (Grep-verified: removed symbols referenced nowhere else.)

### 2. Embedder — `apps/orchestrator/src/embedder/`
- `types.ts` `Embedder {embed(texts): Promise<number[][]>}` (unit vectors); `similarity.ts` `cosine`.
- `transformersEmbedder.ts`: constants `EMBEDDER_MODEL_ID='Xenova/all-MiniLM-L6-v2'` + revision + dtype `q8` (M7 seam); lazy dynamic `import('@huggingface/transformers')`, cacheDir = `join(config.stateDir,'models')`, `pipeline('feature-extraction', ...)`, `{pooling:'mean', normalize:true}`.
- `test/fakeEmbedder.ts`. Dep: `@huggingface/transformers` ^3 (+ `allowBuilds` for onnxruntime postinstall if prompted).
- Tests: cosine math + fake determinism; `embedder.live.test.ts` gated `A2UIVERSE_EMBEDDER_LIVE=1`.

### 3. Registry growth — `apps/orchestrator/src/registry/`
- `types.ts`: `SHELL_SOURCE_ID='shell'`; `registry.ts`: ctor throws if an entry claims `shell`; `#cards: Map<appId, AgentCard|null>`, `#vectors: Map<appId, number[]>`; `refreshCards({resolveCard, embedder})` (parallel fetch, failure ⇒ null card, no vector, unroutable this session); `card(appId)`, `routable()`.
- `corpus.ts`: `corpusDoc(card)` — name + description + skill texts, one doc per agent (decision 8).
- `entries.ts`: add `gmail` (11002) + `calendar` (11003); catalog ids follow the apps-repo path convention (flag: verify at 2.6/2.7).
- `fakeVendor.ts` gains `description?`/`skills?` options. Tests: reservation throw, refreshCards vectors/null-card, corpusDoc, entries.

### 4. Router — `apps/orchestrator/src/router/router.ts`
- `Router(registry, embedder, {shortlistCap})`; `shortlist(text): Promise<ShortlistEntry[]>` — embed query, cosine vs `routable()`, sort desc, cap. No threshold. Empty ⇒ `[]` (executor makes it a broken turn). Tests with FakeEmbedder.

### 5. Planner — `apps/orchestrator/src/planner/`
- `archetypes.ts` (`SLOT_ARCHETYPES` moved from sdk, hub-internal); `planSchema.ts` (D-C types + hand-written `jsonSchema<Plan>`, all-required, `additionalProperties:false`); `checkPlan.ts` (`MalformedPlanError`); `getModel.ts` (`createGoogleGenerativeAI({apiKey: GOOGLE_API_KEY})`, default model id constant `gemini-2.5-flash`, effort `low` maps to minimal thinkingBudget); `prompt.ts` (cards summarized; per-agent `request` is prose carrying ALL guidance; skip unhelpful agents; never invent identifiers); `planner.ts` `ModelPlanner` — `generateText` + `Output.object({schema})` (confirm exact ai@7 API at implementation) → parse → checkPlan.
- `test/fakePlanner.ts`. Deps: `ai` ^7, `@ai-sdk/google` (compatible pin).
- Tests: checkPlan rules; ModelPlanner vs `MockLanguageModelV2` (happy, malformed, checklist violation); optional env-gated live test.

### 6. Composition primitives — `apps/orchestrator/src/composition/` (pure modules)
- `constants.ts`: `shellSurfaceId()` = `'shell:main'`; `slotNameFor(appId)` = `slot-<appId>`.
- `state.ts`: `SlotState` (`pending|failed|collapsed` — `filled` is client's), `CompositionState`, `outcomeToSlotState` (failed/timeout→failed; cancelled→collapsed; completed+zero touches→collapsed; else stays pending).
- `shellPainter.ts`: `shellCreateParts(state)` / `shellRepaintParts(state)` / `shellEnvelope(ctx, parts)` — flat components, root per `plan.direction`, opposite-axis containers per multi-slot group, per leaf `Slot {name, state, label}` + `Attribution {displayName, appId}`, deterministic ids.
- `fragmentRelay.ts`: `composeFragment(event, {appId, slot})` after `relayEvent` — stamp gains `slot`+`role:'fragment'`; namespace surfaceIds on the four ops (single-object + `messages[]` forms); demote finals (D-B); no mutation of the original.
- `partition.ts`: `filterClientDataModel(metadata, appId)` (own surfaces only, keys un-namespaced, empty ⇒ undefined) + `unnamespaceInboundPart`.
- `classify.ts`: `utterance | action | clientError(VALIDATION_FAILED) | unknown`.
- Tests per module (pure, no server).

### 7. Executor core + journal + config + wiring (the big stage)
- `config.ts`: `googleApiKey?` (`GOOGLE_API_KEY`), `plannerModelId` (`A2UIVERSE_PLANNER_MODEL`), `plannerEffort` (default `low`), `shortlistCap` (default 5). Missing key ⇒ boot warning; palette turn without key = broken turn.
- `agentsPool.ts`: D-G inflight sets.
- Journal: `embedding: number[]|null` computed at `close` via injected embedder (failure ⇒ null, never throws); `JournalEntry.plan?`; `TurnKind` gains `'error'`; descriptor handles VALIDATION_FAILED; turn-level outcome widened.
- `executor.ts` (deps `{registry, pool, journal, router, planner}`):
  - Utterance: synthetic task → journal.open → shortlist → plan (broken-turn guard) → **shell paint published before any dispatch** (structural first-paint invariant) → per-leaf vendor message `{parts:[text: leaf.request], metadata: partition-filtered or absent}` → pump composed fragment events + per-dispatch touches → on each `done` flip slot, repaint if changed → all settle → one turn-final (`completed`; one agent failing never fails the turn) → journal plan/dispatches/namespaced touches/close.
  - Action: classify → `parseSurfaceId` → owner-only dispatch (no Router/Planner), un-namespaced action part, partition filter, same composeFragment, executor final.
  - ClientError: flip slot failed on stored composition, repaint, `completed` final, journal.
  - `cancelTask`: cancel all handles for the taskId.
- `app.ts`/`index.ts`: `buildOrchestrator({config, overrides?})` returns `{..., init}`; `init()` = `registry.refreshCards(...)`; `index.ts` awaits init before listen.
- `packages/shell-catalog/package.json`: `"./id"` subpath export (D-F).
- Integration tests (rewritten `boot()` with fake vendors + injected fakes): fan-out ordering (shell paint before any vendor event, stamps, namespacing, exactly one final, vendors got prose not utterance, no a2uiverse metadata outbound), degenerate single-agent parity, failed path, collapsed path (zero-surface + cancel), action round-trip, partition filter, VALIDATION_FAILED repaint, broken turn, journal (plan present, embedding non-null, dispatch list complete).

### 8. Design doc
Rewrite `_dev/docs/design/orchestrator.md`: new components (Embedder/Router/Planner, init card-fetch), three turn sequences, three-rewrites table + final-demotion envelope note, Registry second shape, Planner section, journal embedding, config rows, test seams. sdk README already updated in Stage 1. (TODO tick = wrap-up, not this plan.)

## Dependency changes
`apps/orchestrator`: + `ai` ^7, `@ai-sdk/google`, `@huggingface/transformers` ^3 · `packages/sdk/python` deleted · shell-catalog `"./id"` export · lockfile regenerated.

## Risks
1. ai@7 `Output.object` exact call shape — confirm against installed package; contained in `planner.ts`.
2. Gemini schema subset — mitigated by union-free schema; fallback JSON-mode + own parse.
3. transformers.js/onnxruntime under Node — dynamic import + fake-first tests; `allowBuilds` entry.
4. Multiple vendor `task` events on one taskId vs task store/ResultManager — D-B targets it; fallback: relay only first `task`, demote rest.
5. gmail/calendar catalog ids convention-guessed until 2.6/2.7.
6. Boot-time card fetch: agents down at boot are unroutable until restart (honest Phase-2, per decision 11) — note in design doc.

## Verification
- Per stage: `pnpm verify` (build/typecheck/test/lint/format) green.
- Stage 7 integration suite is the behavioral gate (acceptance items 2, 3, 5, 7 pre-verified at unit level; 1/4/5 visual + live checks belong to 2.9).
- Optional live checks (not in verify): `A2UIVERSE_EMBEDDER_LIVE=1` embedder test; Planner live test with `GOOGLE_API_KEY`.
- Commits on `main`, conventional `<type>(phase-2): …`, one per stage (or finer).
