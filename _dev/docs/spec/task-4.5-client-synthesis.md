# Task 4.5 — Client synthesis

Spec for sub-task 4.5 of Phase 4 (`_dev/docs/spec/phase-4-synthesis.md`): the client half of synthesis — wiring intake, the BindingEvaluator, the derived data model written into the synthesis surface, sort, and partial-value integration. Consumes the wiring contract (`task-4.2-synthesis-wiring-contract.md`), the shell catalog's operators and primitives (`task-4.3-shell-catalog-synthesis.md`), and what the orchestrator paints (`task-4.4-orchestrator-synthesis.md`). Extends the design recorded in `_dev/docs/design/client.md`.

## Scope

- Intake of the wiring beside the composition stamp on the synthesis paint, and its validation.
- The BindingEvaluator: ref resolution against the client's partitions, operator dispatch to the shell catalog, the cell object per field, sort, stale marking.
- The write into the synthesis surface's data model and the triggers that re-run evaluation.
- Ownership and lifetime of the synthesis state within a composition, including teardown and the timeline.
- Proof without the mocks: evaluator tests and a synthetic beat.
- Design records: `client.md` updated, and a new mechanism doc for synthesis as a whole.

Not in scope: the mocks and their profile (4.6, 4.7), recorded beats and visual specs over real vendors (4.8), any change to the shell catalog's components.

## Locked decisions

### 1. The evaluator is a pure whole recompute

One function from the wiring, the client's per-surface data models, the latest generation seen per surface, and the current sort state to the synthesis surface's data model, `{entities, sort}`. Every trigger recomputes the whole output. No incremental engine, no mutable dependency state; the ref-to-surface lookup stale marking needs is derived inside the function. Tests are a table of inputs to outputs. SPEC §10's signals semantics are met by re-running on every change.

### 2. Sort: the user's choice sticks for the turn

A re-synthesis inside an action turn keeps the current `/sort` when its field still exists in the new wiring, and falls back to the wiring's sort otherwise. A new utterance turn starts from the wiring's sort. This follows from the existing lifetimes — the composition is replaced per utterance turn — and needs no bookkeeping of its own.

### 3. Re-evaluation is driven by the data model's own reactivity

On wiring arrival the client subscribes to the root of every surface the wiring refs and to `/sort` on the synthesis surface, through the library data model's per-path subscription, which notifies on any nested write. One mechanism covers vendor `updateDataModel` messages (a data-model write on the processor's side), two-way edits inside vendor fragments, and the sort write-back. Subscriptions are renewed on wiring arrival and on surface create or delete. Guarding the evaluator's own write against re-triggering, and coalescing a multi-message vendor batch, are the plan's.

### 4. One root write

The evaluator writes `{entities, sort}` as a single root write on the synthesis surface's data model, directly — not through the client's message-apply path. The write is atomic: no render sees a new wiring's entities beside an old sort object.

### 5. A dedicated synthesis object beside the live processor

The wiring, the subscriptions, the latest generation seen per surface, and the last output are owned by one object created by the canvas wiring when a wiring lands, fed stamps by the turn handle, and disposed by the teardown that retires a composition. The canvas store stays UI state: nothing in React reads the wiring, since `DerivedValue` and `SortControl` read the data model. The first evaluation runs in the same synchronous pass as the paint, so the first render already carries values.

### 6. Stale is compared, not reset

For every run, a surface is stale when the latest generation seen for it differs from the wiring's `computedAgainst` entry, in either direction. A new wiring clears stale only because its `computedAgainst` now matches. A surface for which the client has never seen a generation counts as matched. Every cell with a ref into a stale surface is marked stale.

### 7. Absent is unresolvable or null

A ref whose pointer does not resolve, or resolves to `null`, is absent: dropped from the operator's inputs and listed in the cell's `absent`. Any other value goes to the catalog operator as is; what the operator does with an input it cannot use is the catalog's behaviour and renders visibly.

### 8. Source selectors write the app id

`argmin` and `argmax` return the index of the winning surviving input; the evaluator maps it to the ref's surface and writes the app id as the cell's value — the same vocabulary the derived-value component already uses for absent sources. Display names remain 4.3's open nicety, landing later as one lookup inside the component.

### 9. Sort comparison

Numbers compare numerically, strings by locale-aware compare, a mixed pair by string compare. Absent cells go last in both directions. Ties keep wiring order, so the sort is stable. A stale cell sorts on the previous value it still carries.

### 10. Invalid wiring is reported

A wiring the client rejects is reported as `VALIDATION_FAILED` for `shell:synthesis` on the existing side channel, so the hub repaints with the synthesis slot failed and the failure is journaled. The synthesis surface is the one shell surface that lives in a slot, so slot failure is a state it has; the stage surface's "reports nothing outward" rule does not apply to it.

### 11. A zod mirror, type-pinned

The client validates the wiring with a zod schema declared against the sdk's wiring type, so a mirror whose shape drifts from the sdk fails to compile, plus a contract test running the mirror over the sdk's fixtures. No JSON Schema runtime is added.

### 12. Structural checks are validation; resolution is runtime

Beyond shape, the client rejects an unknown operator, a sort field that is not a declared field, and an entity whose cell count differs from the field count. A ref into a surface the client does not hold, or a pointer that does not resolve, is absent at evaluation time and never a validation failure.

### 13. Parked entries hold the synthesis surface frozen

The timeline captures the synthesis surface with its last evaluated data model. A parked entry carries no wiring and makes no subscriptions; sort in a parked entry is inert. The synthesis object's lifetime equals the live composition's.

### 14. Proof: an evaluator table and a synthetic beat

The evaluator is tested as a table with the live-produced wiring from the 4.4 handoff as a fixture. A hand-authored synthetic `synthesis` beat replays the real event sequence through the turn runner — shell paint with a shell slot, two fake vendor fragments carrying generations, the synthesis paint with wiring, a vendor update that bumps a generation, a re-synthesis — and covers intake, subscription, stale, sort write-back, and teardown. The beat is viewable in the app for the tunnel check. Visual snapshots wait for 4.8's recorded beats.

### 15. A mechanism doc for synthesis

`_dev/docs/design/synthesis.md` is the narrative of synthesis end to end across both processes — utterance to painted cell, generations and stale, absent versus invalid, sort, decline, re-synthesis — with the concrete shapes on the wire. It sits beside the per-area records: `orchestrator.md` and `client.md` keep their class-level entries and link to it, and `client.md` gains the evaluator side in this task. Synthesis is a new mechanism the platform introduces, and it gets a doc of its own.

## Conventions

Recorded so nothing is silently assumed.

- Catalog resolution needs no change: the library selects a surface's catalog by `catalogId` alone, and the shell catalog is registered.
- `shell:synthesis` keeps round-tripping in the returned client data model; the orchestrator already ignores it.
- The plan confirms that the orchestrator's failure handler resolves `shell:synthesis` to the shell slot the way it resolves a vendor surface to its slot.

## Invariants

- **The renderer sees plain values and plain paths.** The evaluator is a pre-render layer; `DerivedValue` and `SortControl` bind by one path each to objects the evaluator owns.
- **Sort is free.** The write-back re-orders in the evaluator, bumps no generation, and makes no round trip.
- **The evaluator is deterministic and costs no model call.**
