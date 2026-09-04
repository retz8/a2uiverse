# Handoff — task 4.5 Client synthesis

Not started. Everything upstream of it landed this session; this is the brief the next session picks up from.

## Where things stand

- **4.1–4.4 done on `main`**, unpushed from `620e94c` (phase spec) through the 4.4 tick. Gates green (`pnpm verify`).
- Specs to read in full: `spec/phase-4-synthesis.md` · `spec/task-4.2-synthesis-wiring-contract.md` (the wire) · `spec/task-4.3-shell-catalog-synthesis.md` (what the client renders with) · `spec/task-4.4-orchestrator-synthesis.md` (what the client receives). Design records: `design/orchestrator.md` (current, M2) · `design/client.md` (M1 — 4.5 updates it).
- The orchestrator now produces, live against Gemini, exactly the wiring 4.5 must evaluate (see sample below).

## What 4.5 must achieve (TODO line)

Wiring intake · BindingEvaluator · derived-model evaluation + data-model write · sort · partial-value integration.

## What arrives on the wire (already true)

- Every vendor event's stamp may carry `generations: {<namespaced surfaceId>: n}` for the surfaces that event touched (`readStamp` from `@a2uiverse/sdk`, `CompositionStamp.generations`).
- The synthesis surface `shell:synthesis` arrives as a **fragment** stamped `{source: 'shell', slot: 'slot-shell', role: 'fragment'}` — `createSurface` in the shell catalog + `updateComponents` — with the wiring on the same event's metadata under `WIRING_KEY` (`readWiring`). Never on a decline (the slot flips `collapsed` via the shell paint instead). A re-synthesis repaints the same surface with a new wiring.
- The shell layout surface `shell:main` now contains a `slot-shell` Slot with an `Attribution` named `Synthesis`, laid out wherever the Planner put it.

## What the client must do

1. **Intake**: on the synthesis paint, read the wiring beside the stamp; hold it with the composition.
2. **Evaluate** (`BindingEvaluator`, SPEC §10 — client-side, deterministic, zero model cost): for each entity, each cell = one catalog operator over refs. Resolve each ref (`{surface, pointer}`) against the client's data model for that surface (RFC 6901, index-based). Drop absents; call the shell catalog's function (`CATALOG.functions.get(op)`, `@a2uiverse/shell-catalog`) over the surviving positional values; `argmin/argmax` return an index → map back to the surviving ref's surface. Write the synthesis surface's data model:
   - `entities: [{<field.name>: cell}]` where `cell = {value, contributed, of, absent: [surfaceIds], stale?}` (4.3 decision 7, `CellObject` exported from shell-catalog).
   - `sort: {field, direction, fields}` (`SortObject`).
   - Order `entities` by `sort` (asc/desc on the cell's `value`).
3. **Re-evaluate on every local change** — including two-way edits inside vendor fragments (§5.2). Sort write-back (`SortControl` writes the whole object back to `/sort`) → re-order; must trigger no generation bump and no round trip (the synthesis surface is derived, nothing refs into it).
4. **Stale**: when a vendor stamp's `generations[surface]` ≠ `wiring.computedAgainst[surface]`, mark every cell with a ref into that surface `stale: true` until a new wiring lands (4.2 decision 3 — visible reason before the model call resolves).
5. **Validate** incoming wiring against `WIRING_SCHEMA` with what the client already has (zod is in the client; the sdk ships no validator — 4.2 decision 12). On failure: report as the client already reports `VALIDATION_FAILED` for a surface.
6. **Mount**: the synthesis surface is a fragment in a slot like any vendor's; its `catalogId` is the shell catalog's — confirm the catalog resolver serves the shell catalog for a *fragment* (today it is the stage catalog). `DerivedValue`/`SortControl` bind by one `DynamicValue` path each (`cell: {path: 'best'}` relative inside the `/entities` template; `sort: {path: '/sort'}`).

## Gotchas found this session

- The derived tree is orchestrator-generated (4.4 decision 1): `Column[SortControl(/sort), Row[Text labels], Column{children: {path: '/entities', componentId: 'entity'}}]`, `entity = Row[DerivedValue(cell: {path: field.name}) …]`. No `format` is set, so numbers render as `899`, not `$899` — acceptable for M2; a later wiring field could carry a format hint.
- `absent` in a cell object holds namespaced surface ids; `DerivedValue` derives the app id for display via `parseSurfaceId`. Display names would be a nicety (open item, 4.3).
- The client's returning `a2uiClientDataModel.surfaces` now includes `shell:synthesis` — the orchestrator's `applyClientDataModel` ignores unknown/derived surfaces harmlessly, but be aware it round-trips.
- Under index-only refs, a leaf edit *inside* an array element bumps the generation (conservative floor, 4.4 decision 3). Expect stale → re-synthesis more often than the finished system; that is the phase's design.
- Upstream typing nit (finding #4, `_dev/a2ui-findings.md`): bound `DynamicValue` props are typed by their literal branches; the shell components already work around it.

## Live-produced wiring (real Gemini, ~2.5 s) to build against

```
fields:   name "Camera Model" · shopA_price "Shop A Price" · shopB_price "Shop B Price" · best_price "Best Price"
entities: 2 — cells: value(a /items/i/name) · value(a /items/i/price) · value(b /items/i/price) · min(a /items/i/price, b /items/i/price)
sort:     best_price asc
computedAgainst: {"shop-a:list": 1, "shop-b:list": 1}
```

Reproduce: `cd apps/orchestrator && set -a; source .env; set +a; A2UIVERSE_SYNTHESIZER_LIVE=1 pnpm exec vitest run test/synthesizer.live.test.ts --reporter=verbose`.

## Parallel

4.6 (`[apps]` two mock storefronts) is startable alongside 4.5 and is what 4.8 needs to run the real thing end to end; until then the orchestrator's `test/orchestrator.test.ts` synthesis scenarios (fake vendors + `FakeSynthesizer`) are the executable reference for the event sequence the client sees.
