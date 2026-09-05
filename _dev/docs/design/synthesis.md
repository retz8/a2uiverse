# Synthesis — how the merged view works

Synthesis is the mechanism that turns several vendors' fragments into one merged view without
any vendor knowing it happened (SPEC §5, §10). It is the platform's own mechanism, introduced in
Phase 4, and it spans both processes: the orchestrator decides *what* to merge and says so once,
the client *computes* the merge and keeps it live. This doc is the narrative end to end. The
per-class records stay in [`orchestrator.md`](orchestrator.md) and [`client.md`](client.md).

## The idea in one paragraph

Every vendor paints its own surface with its own data model — its **partition**. Nothing ever
copies data out of a partition. Instead, after all the vendors have answered, a second model call
(the **Synthesizer**) emits a **wiring**: a list of fields, a list of entities, and for every
cell of every entity one operator over a few **refs** — pointers into the partitions. The
orchestrator paints a small shell surface into a reserved slot and hangs the wiring on that
event's metadata. The client's **BindingEvaluator** resolves the refs against the partitions it
already holds, runs the operators, and writes the result into that surface's data model as
ordinary values. The renderer sees plain values on plain paths. The merged view is a live query
over partitions that stay isolated: the moment a partition changes, the client re-evaluates.

```
vendor A ──paints──▶ partition A ─┐
                                  ├─▶ Synthesizer ──wiring──▶ paint shell:synthesis ──▶ client
vendor B ──paints──▶ partition B ─┘        (orchestrator)        (+ wiring on metadata)     │
                                                                                            ▼
                                       BindingEvaluator: refs → partitions → operators → {entities, sort}
                                                                                            │
                                                                                            ▼
                                                            DerivedValue · SortControl (shell catalog)
```

## A turn, step by step

Take the utterance *"compare camera prices across both shops"* over two storefront vendors.

1. **The Planner reserves the slot.** The plan gains a slot whose `appId` is the reserved
   `shell` source. That slot is the synthesis slot; its `request` is the Planner's guidance to
   the Synthesizer. Whether the screen gets one, and where it sits, is the Planner's judgment.
   The shell paints its layout with all slots pending — the synthesis slot too, attributed
   `Synthesis` — before any vendor has answered.

2. **Vendors fill their slots.** Each vendor's events are relayed as fragments. As each event
   passes through, the orchestrator **materializes the partition**: it applies the vendor's
   messages to a server-side copy of that surface's data model, so it always knows what the
   client holds. Every relayed event's stamp carries `generations: {<surface>: n}` for the
   surfaces it touched (below).

3. **All sources settle → the Synthesizer runs.** Input: the utterance, the slot's request,
   every partition's live data model keyed by namespaced surface id with its app's display
   name, and the operator list with descriptions. Never any component tree. Output, as
   structured model output against the sdk's schema: fields, entities, sort — or a decline.

4. **The orchestrator checks and wraps.** Every operator is one the shell catalog declares, the
   sort field is declared, every entity has exactly one cell per field, every ref points into a
   held partition and resolves *now*. Then it adds `computedAgainst`: the generation of every
   partition the wiring was derived from. The model never sees generations.

5. **The synthesis surface is painted.** `shell:synthesis`, against the shell catalog, into
   `slot-shell`, stamped `{source: shell, slot: slot-shell, role: fragment}` — structurally a
   fragment like any vendor's. The tree is **derived, not model-authored**: a `SortControl`
   bound to `/sort`, a header of field labels, a `Column` templated over `/entities` whose row
   is one `DerivedValue` per field bound by the field's name. The wiring rides the same event
   under the metadata key `a2uiverseWiring`, beside the stamp.

6. **The client evaluates before it renders.** The turn runner hands the wiring to the
   **synthesis session** the moment the surface is live. The session validates it, subscribes to
   every partition the wiring refs, evaluates, and writes `{entities, sort}` to the synthesis
   surface's data model in one root write. Only then does React render, so the first paint of
   the merged view already carries values.

7. **The turn closes.** The journal records the wiring (or the decline), and the **dead air** —
   the interval from the last source settling to the synthesis paint. Dead air is measured, not
   mitigated, in this phase.

## What rides the wire

**The stamp** (every relayed event, `metadata.a2uiverse`):

```json
{"source": "shop-a", "slot": "slot-shop-a", "role": "fragment", "generations": {"shop-a:list": 1}}
```

**The wiring** (the synthesis paint only, `metadata.a2uiverseWiring`) — this one was produced
live by Gemini against two storefronts:

```json
{
  "fields": [
    {"name": "name", "label": "Camera Model"},
    {"name": "shopA_price", "label": "Shop A Price"},
    {"name": "shopB_price", "label": "Shop B Price"},
    {"name": "best_price", "label": "Best Price"}
  ],
  "entities": [
    {"cells": [
      {"op": "value", "args": [{"surface": "shop-a:list", "pointer": "/items/0/name"}]},
      {"op": "value", "args": [{"surface": "shop-a:list", "pointer": "/items/0/price"}]},
      {"op": "value", "args": [{"surface": "shop-b:list", "pointer": "/items/0/price"}]},
      {"op": "min",   "args": [{"surface": "shop-a:list", "pointer": "/items/0/price"},
                               {"surface": "shop-b:list", "pointer": "/items/0/price"}]}
    ]},
    {"cells": ["… the same four cells at /items/1 …"]}
  ],
  "sort": {"field": "best_price", "direction": "asc"},
  "computedAgainst": {"shop-a:list": 1, "shop-b:list": 1}
}
```

Things to notice. **Every cell is a formula**: a plain vendor value is the one-argument `value`
operator, so there is one shape and one evaluator path. **A cell may have no refs** (task 4.8):
it is the cell no source contributes to — how a per-source column says that source does not
carry the entity — and evaluates to absent with a contributor count of 0 of 0. **A ref is a surface and a pointer** —
the namespaced surface id exactly as the client keys its data models, and an RFC 6901 JSON
Pointer, index-addressed in this phase. Provenance is the surface id. **Fields are declared
once and entities are positional**: an entity of the wrong width is a schema violation.
**Membership in an entity is the entity-resolution assertion** — putting shop A's item 0 and
shop B's item 0 in one entity is the claim that they are the same camera. In Phase 4 that is
true by construction; it is what later phases make hard.

The contract lives in `packages/sdk/contracts/composition.v0.2.json` with its TypeScript
projection in `packages/sdk/js/src/synthesis.ts`. The operators are declared as ordinary A2UI
`FunctionDefinition`s in the shell catalog: `value`, `min`, `max`, `sum`, `avg`, `count`,
`argmin`, `argmax` (`packages/shell-catalog/src/functions/operators.ts`).

## What the client writes

The evaluator's output is the synthesis surface's whole data model:

```json
{
  "sort": {"field": "best_price", "direction": "asc",
           "fields": [{"name": "name", "label": "Camera Model"}, "…"]},
  "entities": [
    {
      "name":        {"value": "X100", "contributed": 1, "of": 1, "absent": []},
      "shopA_price": {"value": 949,    "contributed": 1, "of": 1, "absent": []},
      "shopB_price": {"value": 899,    "contributed": 1, "of": 1, "absent": []},
      "best_price":  {"value": 899,    "contributed": 2, "of": 2, "absent": []}
    },
    {"…": "Z6, 1899 / 1999 / 1899"}
  ]
}
```

Every field's value is a **cell object**, never a scalar: `{value, contributed, of, absent,
stale?}`. `DerivedValue` binds to it by one path and owns the interpretation — so a partial
value can never render like a complete one, by construction rather than by review. `absent`
lists the namespaced surfaces whose refs did not resolve; the component shows the app id.
`SortControl` binds to `/sort` and writes the whole object back to the same path when the user
changes it. `entities` is ordered by `sort`.

Evaluation of one cell: resolve each ref against its partition's root (unresolvable or `null`
is **absent**), drop the absents, call the catalog function over the survivors' values, record
`contributed` and `of`. `argmin`/`argmax` return an index over the survivors; the evaluator maps
it back to the ref's surface and writes the **app id** as the value.

## The four states of a cell

| State | Meaning | At rest |
| --- | --- | --- |
| complete | every declared input resolved | the bare value |
| partial | some inputs resolved | value + half-filled circle; detail names the missing sources |
| absent | no input resolved | a dash + dashed ring |
| stale | a generation mismatch was seen; the value is from the previous wiring | previous value dimmed + clock |

These are the vocabulary later phases reuse for failed, declined and not-yet-arrived. There is
no injected caption or summary line: absence shows in the cell where the gap is, the criterion
is the sort control, and provenance is the `Attribution` the slot already carries.

## Absent is not invalid — generations

Two things can happen to a ref after the wiring is written, and they are deliberately different.

**Absent.** The path no longer resolves — a storefront drilled into one product and its list
is gone. Free and reversible: the evaluator recomputes over what still resolves, the cell shows
partial or absent, no model call. When the list comes back, the refs reconnect. Nothing on the
orchestrator moves.

**Invalid.** The path still resolves but may point at a *different* entity — a storefront
reordered its list in place. Under index refs this is silent and wrong: `/items/0/price` now
belongs to another camera. This is the only genuine correctness hazard, and **generation
stamps** exist to catch it.

How generations work. The orchestrator keeps, per surface, a snapshot of the data model as of
the last synthesis. On every applied vendor update it compares each array in the snapshot to the
live model: present with different contents → bump; missing → nothing (absent); identical →
nothing. Arrays only, because the hazard is a re-pointed index. The bumped generation rides the
stamp of the very event that changed the partition.

On the client, the session records the latest generation seen per surface. On every evaluation,
a surface is **stale** when that differs from the wiring's `computedAgainst` for it — in either
direction; a surface never stamped counts as matched. Every cell with a ref into a stale surface
is marked. There is no reset: a new wiring clears stale only because its `computedAgainst` now
matches.

The ordering is what makes the stale marker honest. The bump arrives on the vendor's own event,
*before* the data behind it applies and before any re-synthesis, so the cell dims first; then
the data lands (still dimmed, possibly showing a re-pointed value); then the new wiring lands
and the cell is fresh again. The model call's latency is spent under a visible marker.

## Re-synthesis inside an action turn

A user's in-fragment interaction is an action turn: owner-only dispatch, then a final. Under
synthesis that turn gains the utterance turn's tail. After the vendor's pump settles, its
partition is updated and generations bumped; the **IntegrityChecker** checks the live wiring
against the new generations (`refValid` per binding, generation-backed — under index refs two
refs into one partition can never disagree); if any ref is invalid, the Synthesizer runs and
`shell:synthesis` is repainted with a new wiring, all before the turn's final. A scalar edit
inside a vendor fragment bumps nothing and costs no model call.

On the client the repaint is a repeat `createSurface`, which the apply path expands to delete +
create. In an action turn the stage is occupied, so the repaint streams into staging and lands at
the swap; the session accepts the new wiring the moment the surface is live again and
re-subscribes. The **user's sort survives** a re-synthesis while its field still exists; a new
utterance turn starts from the wiring's sort, because the composition — and the session's state
with it — is replaced.

The phase provokes both paths on purpose with the mock storefronts' two instruments:
**drill-down → absent → free**, **in-place reorder → invalid → re-synthesize**.

## Sort is free

`SortControl` writes `/sort` on the synthesis surface. The session's subscription on that path
fires, records the user's choice, and re-evaluates: `entities` is re-ordered and written back in
the same root write. No generation is touched (the synthesis surface is derived; nothing refs
into it), no round trip, no model call. Comparison: numbers numerically, strings by locale,
absent cells last in both directions, ties keep wiring order so nothing moves when nothing
differs.

## When nothing is joinable

- **Decline.** The Synthesizer says `declined: true` with a reason. The orchestrator publishes
  the reason as the shell's own words in the synthesis slot — a text part stamped as the
  synthesis fragment, no wiring beside it — then collapses the slot through the ordinary
  slot-state repaint; the collapsed slot rests on those words and the fragments stand side by
  side (task 4.8). Journaled `declined`. Only a decline speaks: it is the model's judgment in
  its own words. The other collapses below are the runtime's and stay silent.
- **Malformed.** The output parsed but failed a check (an operator the catalog does not declare,
  a ref that does not resolve now, …). Behaves as a decline; journaled `malformed` with the
  failing check. Never a broken turn — the fragments have already painted correctly.
- **Fewer than two sources arrived.** No model call; the slot collapses; journaled `skipped`.
- **The client rejects the wiring.** Contract drift, in practice: the client's zod mirror or
  its structural checks (unknown operator, undeclared sort field, wrong-width entity) fail. The
  client reports `VALIDATION_FAILED` for `shell:synthesis` on the side channel, the same one a
  fragment that will not render uses; the orchestrator resolves `shell` to `slot-shell` and
  repaints it failed. A ref into a surface the client does not hold is *not* a rejection — that
  is absent at evaluation time.

## Lifetimes

- **The composition.** The session's wiring, subscriptions, generations and user sort belong to
  the composition. `retireStage` — the one place a composition leaves the canvas — retires the
  session with it. A vendor surface re-created by a repaint is watched again; a deleted one
  simply goes absent.
- **The timeline.** A parked composition carries the synthesis surface frozen with its last
  evaluated data model. No wiring, no subscriptions; the sort control in a parked entry does
  nothing. Phase 9's "frozen + stamped" for free.
- **The round trip.** `shell:synthesis` rides back to the orchestrator in the client data model
  like every surface; the orchestrator ignores a derived surface harmlessly.

## What is deliberately not here

- **Dead air** between the last fragment and the synthesis paint is measured in the journal
  (`deadAirMs`) and not mitigated; streaming the synthesis fragment is a backlog item decided on
  that evidence.
- **Key-based refs** and navigation from a merged cell back to the vendor subtree are Phase 5.
  Index refs and the absent/invalid split are permanent; Phase 5 adds beside them.
- **Display names** in a partial cell's detail (rather than app ids) are a nicety, one lookup
  inside `DerivedValue` when it comes.
- **Formatting** of derived values is a fixed `format` prop on `DerivedValue`; the derived tree
  sets none in this phase, so a price renders as `899`.

## Where the code is

| Concern | Orchestrator | Client |
| --- | --- | --- |
| Contract | `packages/sdk/js/src/synthesis.ts` · `packages/sdk/contracts/composition.v0.2.json` | same |
| Operators, components | `packages/shell-catalog/src/functions/operators.ts` · `components/derived-value` · `components/sort-control` | same |
| Partitions, generations | `apps/orchestrator/src/composition/partitions.ts` | `canvas/synthesis/synthesisSession.ts` (generations seen) |
| Synthesizer, checklist | `apps/orchestrator/src/synthesizer/` | — |
| IntegrityChecker | `apps/orchestrator/src/composition/integrity.ts` | — (stale is the client-side half) |
| The paint, the tree | `apps/orchestrator/src/composition/synthesisPainter.ts` | intake in `canvas/turn/canvasTurn.ts` |
| Validation | `synthesizer/checkSynthesis.ts` | `canvas/synthesis/wiringSchema.ts` |
| Evaluation | — | `canvas/synthesis/bindingEvaluator.ts` |
| Proof without mocks | `test/orchestrator.test.ts` (fake vendors, `FakeSynthesizer`) | `src/beats/synthesisFixture.ts` · `?beat=synthesis` · `tests/canvas-synthesis.test.tsx` |
