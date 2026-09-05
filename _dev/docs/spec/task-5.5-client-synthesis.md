# Task 5.5 — Client: synthesis over the synthesize data model

The client becomes the consumer of what 5.4 sends: the synthesis payload evaluated over the free-form derived model with predicate refs, sorts over declared arrays, the stale marker over the sdk kit, and the synthesis region rendered as shell content. Phase 5 spec decisions 3, 4, 6, 13, 17, 18, 20, 22, 23; task 5.2 (the contract), task 5.3 (`SortControl`), task 5.4 (what is painted); SPEC §4.3, §4.5, §5.2, §6.2.

## Scope

- Intake of the payload under `a2uiverseSynthesis`, validated by the sdk.
- The BindingEvaluator over the free-form model: refs resolved through the sdk kit, predicate and index alike; a cell object at every formula path; the declared arrays sorted; each declaration with the user's current choice at `/sorts/N`.
- The stale marker per ref through the sdk kit.
- The synthesis slot rendered as shell content: no boundary, no attribution, quiet pending and failed states.
- The SPEC §4.3 and §4.5 amendments.
- The Phase 4 `SortObject` alias, the client's zod mirror of the wiring, and the legacy wiring (`wiring.ts`, `composition.v0.2.json`) removed.
- The synthetic synthesis beat and the canvas synthesis test re-recorded.
- The orchestrator's painter change for the synthesis slot rides in this sub-task.

## Locked decisions

### 1. The synthesis slot is shell content by declaration

`Slot` gains an optional fixed prop, `content: "fragment" | "shell"`, defaulting to fragment. The orchestrator paints the synthesis slot with `content: "shell"` and no `Attribution`. The client's roster reads an unpaired shell-content slot as the reserved `shell` source. A shell-content slot is still a reserved position with a fixed place in the layout; it is painted like the shell's own UI.

### 2. Shell content renders without a boundary

The synthesis surface renders through the catalog frame, so it still sits under the shell catalog's Provider, inside the per-surface error boundary, with no fragment boundary element: no tile styling, no region role, no source label. Containment stays; provenance and isolation do not apply to the shell's own content.

### 3. Quiet states

Pending is one subdued line, "Painting…", beside a Radix spinner: no box, no reserved floor. Failed is "Couldn't paint this." in the same register. Collapsed is unchanged: nothing, or the decline reason resting there as prose.

### 4. Stale is per ref through the sdk kit; any stale ref marks the cell

Ref validity is the sdk's: a predicate ref never goes stale, an index ref is stale once its surface's generation moved from what the payload was computed against. A cell with any stale ref wears the stale marker until the re-synthesis lands; a cell whose refs are all predicates never does. The cell object is unchanged.

### 5. The user's sort sticks by array path

The user's choice of key and direction is kept per sorted array path. On a new document, a declaration at the same path inherits the chosen key and direction while the key is still among its options, and otherwise takes the declaration's own initial choice. The index N is not the identity. A new utterance turn starts from the document's choice.

### 6. Intake: shape by the sdk, operators by the client, both validation

The payload is validated with the sdk's payload validator, replacing the zod mirror; the client additionally rejects an operator the shell catalog does not declare. Either failure is reported as `VALIDATION_FAILED` for the synthesis surface, so the hub fails the slot and journals it. A ref that does not resolve is absent at evaluation time, never a validation failure.

### 7. The synthetic beat is built from the sdk's camera comparison example

The example's two storefront shapes, their data and its document are the beat's fixture; the re-synthesis is that document with its refs re-pointed by hand. One author for the shape the prompt teaches, the orchestrator validates, and the client renders.

### 8. Carried over from 4.5 unchanged

The evaluator is a pure whole recompute written in one root write; re-evaluation rides the data model's own reactivity, now subscribed on `/sorts`; absent is unresolvable or null; the comparison rules and stable ties; source selectors write the app id; parked entries re-sort over their frozen partitions with the captured payload.

## Conventions

- The evaluated model mirrors the derived model: a cell object at every formula path, branches keeping their shape, each declared array reordered in place, each declaration with the current choice at `/sorts/N`.
- SPEC §4.3 gains that attribution is for vendor fragments and the shell's own content carries none; §4.5 gains that the reserved synthesis position paints a quiet marker, not a tile.

## Invariants

- The renderer sees plain values and plain paths; `DerivedValue` and `SortControl` bind by one path each to objects the evaluator owns.
- Both processes resolve pointers and judge validity through the sdk kit, never a private copy.
- Sort is free: no generation bump, no round trip.
- Absent is not invalid.
