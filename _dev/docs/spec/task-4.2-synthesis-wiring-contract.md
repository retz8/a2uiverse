# Task 4.2 — `sdk`: the synthesis wiring contract

Spec for sub-task 4.2 of Phase 4 (`_dev/docs/spec/phase-4-synthesis.md`): the contract that carries the Synthesizer's output from orchestrator to client, so both halves build against one normative definition. Extends the composition extension (SPEC §14) in `packages/sdk`.

## Scope

- The wiring shape: fields, entities, cells, refs, formulas, sort criterion, and the generations it was computed against.
- Generation stamps on the composition stamp.
- The metadata channel the wiring rides.
- The `js/` projection: schemas, types, a reader; the contract test extended to cover them.
- Two-line vocabulary rider on SPEC §5.2 and §5.3.

Not in scope: operator implementations (shell catalog, 4.3), evaluation (client, 4.5), the Synthesizer and IntegrityChecker (orchestrator, 4.4), and any description of A2UI content.

## Locked decisions

### 1. One contract, bumped to v0.2

The wiring extends the existing composition contract — `composition.v0.2.json`, one extension URI — rather than a second contract file. Placement and wiring are the same class of thing (composition riding the A2A envelope, orchestrator → client, never reaching a vendor) and SPEC §14 already registers them as sibling rows. The version is in the filename, so extending in place is not an option: a client built against v0.1 cannot read a wiring payload, which is what a version exists to say.

### 2. The wiring rides its own metadata key

A distinct top-level metadata key beside the composition stamp, on the event that paints the synthesis surface. The stamp stays per-event provenance read on every event; the wiring is a payload sent once per synthesis. The stamp's reader and its call sites are untouched. A separate message was rejected: it splits one atomic fact — this surface, with this wiring — across two events that can interleave.

### 3. Generations reach the client on the stamp

The composition stamp gains the current generation of every partition the event touched. It is delivered on the very event that changed the partition, so there is no ordering problem, and the client can mark a derived cell stale the instant a bump arrives — before re-synthesis completes. The field is optional; the shell's own events carry none (the synthesis surface is derived, not a source).

A generation is an integer that only goes up: bookkeeping the runtime compares, never a value the UI shows.

### 4. The contract does not enumerate operators

A formula's operator is a name the shell catalog declares as a `FunctionDefinition`. The contract is normative about the *shape* of a formula; the catalog is normative about *what* can be computed. Duplicating the list into the contract would create the two-sources problem the phase spec avoided. The sdk therefore cannot test whether a given operator is legal; that test belongs to the shell catalog and to the orchestrator's validator, which reads the catalog.

### 5. The wiring shape is JSON Schema

The wiring is embedded in the contract as JSON Schema; the composition stamp stays in the existing descriptive idiom. The wiring is model-produced and nested, and the schema *is* the Synthesizer's output contract: the model is constrained to emit exactly what the client is built to read, and the contract test asserts conformance rather than field spelling. The stamp has no drift problem and is left alone.

The schema must be union-free and non-recursive — the structured-output constraint the plan schema already lives with.

### 6. Every cell is a formula

A cell is one operator over N refs. A plain vendor value is a one-argument formula with a pass-through operator the shell catalog declares. One shape, one evaluator path, no union — and the derived-value component rule (phase decision 17) applies to every cell without a "derived enough?" judgment. The contract does not name the pass-through operator (decision 4).

### 7. A ref is a surface and a pointer

A ref carries the namespaced surface id exactly as it appears on the wire — the identifier the orchestrator materializes partitions under and the client keys its data models by — and an RFC 6901 JSON Pointer, A2UI's own binding syntax, index-addressed in this phase. Provenance is derived from the surface id. The phase introduces no new path language; the only new thing about a ref is that its pointer resolves in another surface's data model. A ref carries no generation: under index-only addressing every ref into one partition shares one, so validity is checked at the wiring level.

### 8. Fields declared once, entities positional

The wiring declares its fields once — each with a name and a label — and every entity is a positional list of cells aligned to them. The schema is the table: an entity of the wrong width is a schema violation, not a runtime surprise; no dynamic keys are needed; every entity has the same cell set, which the synthesis tree's single template requires. Field names become data-model keys and must be valid JSON Pointer segments. The evaluator zips fields and cells into a list of keyed objects, which is the shape A2UI template binding already renders.

### 9. Sort names a field and a direction; all display names live in the fields

`sort` carries a field name and `asc | desc`. Every user-facing name on the merged surface that is not a value is a field label — the model names each field once, and the criterion's display name is its field's label. The sort control is runtime-driven from the wiring: options are the fields, selection is `sort`; the tree only places it. Direction is never inferred from an operator.

**Vocabulary.** The words are *fields* and *entities*. "Row" and "column" appear nowhere in the contract or its projection; the evaluated output is keyed `entities`. The list-of-records shape survives on constraints — union-free schema, a representation for entity resolution, template binding, a sortable list — not on the spreadsheet metaphor, which goes. A single list is Phase 4 scope, not a design truth; a headline value or several lists is an additive later version.

### 10. Generation per surface; the wiring has two authors

A partition is a surface's data model (SPEC §4.1), and one relayed event can touch several surfaces, so the stamp carries generations as a map keyed by namespaced surface id. The wiring's `computedAgainst` is keyed the same way.

The Synthesizer emits fields, entities, and sort. The orchestrator wraps that with `computedAgainst` — it knows the generations; the model never sees them and is not asked to copy them. The contract therefore names two schemas: the **model-facing inner** shape, union-free, and the **full wiring** the client validates, inner plus envelope, free to use a map.

### 11. No wiring on decline

A decline is a union-free branch of the model-facing schema — a flag plus a reason, with empty fields and entities — and goes to the journal. Every key of the model-facing schema is required: the live provider drops optional nested arrays (a first run returned fields and sort with no entities at all), so optionality is expressed as emptiness and the checklist enforces at least one field when not declined. The orchestrator collapses the reserved slot through existing slot-state machinery and sends nothing under the wiring key. From the client's side a decline is indistinguishable from a layout-only turn, which is what SPEC §5.1 says it should be.

### 12. Pure contract — no validator in the sdk

The projection exports both schemas and their types, and a reader on the wiring key sibling to the stamp's. It ships no validator and stays dependency-free: the orchestrator validates model output with what it already has, the client validates incoming wiring with what it already has. The sdk is the thing both sides agree *on*, not the thing both sides run. The exported types must be unable to drift from the schema.

## Invariants

- **The contract never describes A2UI content.** The Synthesizer's one call also emits the synthesis tree, but that tree is ordinary shell-catalog A2UI painted through `createSurface`/`updateComponents`; its schema is the shell catalog's. The sdk owns the wiring only.
- **Nothing a2uiverse-specific rides the vendor wire.** No Python projection; the mocks are ordinary A2UI agents.
- **The JSON is normative; the projection mirrors it; the contract test asserts the mirror.** The existing pattern, extended.

## SPEC rider

- §5.2 — "which paths land in the same row" → the same entity.
- §5.3 — "rows move" → entities reorder.

§10's "spreadsheet/signals semantics" stands: that is the evaluation model, which is affirmed; only the shape vocabulary changes.

## Open items

- The metadata key's name and the mechanism that pins types to the schema — the plan's.
- Declaring the extension URI on the orchestrator's AgentCard — currently exported but unconsumed; not this task's.
