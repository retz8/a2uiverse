# Task 4.3 — `shell-catalog`: operators, the derived-value component, the sort control

Spec for sub-task 4.3 of Phase 4 (`_dev/docs/spec/phase-4-synthesis.md`): the shell catalog's vocabulary for the merged surface — what the Synthesizer may name and what the client must render. Consumes the wiring contract of `task-4.2-synthesis-wiring-contract.md`.

## Scope

- The operator functions a formula's `op` may name, declared in the shell catalog and implemented in its runtime.
- Two new shell composition primitives: the derived-value component and the sort control.
- The client-internal shape the evaluator writes for the synthesis surface's data model, as fixed by those components' bindings.
- Both components are built directly, as `Slot`, `Attribution`, and `Frame` were — `design-catalog-component` translates an existing design-system component's prop surface, which a from-scratch shell primitive does not have. Names, object fields, and at-rest treatment are decided below (6–8).

Not in scope: the evaluator itself (4.5), the Synthesizer prompt and the validator that enforces the component rule (4.4).

## Locked decisions

### 1. Operator set, and where "operator" is distinguished

The catalog declares, as ordinary A2UI `FunctionDefinition`s: a pass-through, `min`, `max`, `sum`, `avg`, `count`, and the winning-source selector(s). The eleven arithmetic and comparison functions the upstream React implementation ships undeclared stay undeclared — no consumer in this phase, and declaring them widens the renderer's function surface too.

`FunctionDefinition` is closed, so `catalog.json` cannot mark which functions are formula operators. The catalog *implementation* exports the operator list; the parity test pins both directions — an operator not declared, or a declared operator missing from the list, is a red build. The orchestrator reads the list for the Synthesizer's enum and validation; the client dispatches on it. This is where 4.2's open thread lands: the sdk could not test whether `min` is legal; the catalog can.

`catalog.json` stays pure protocol — declaring a function is something any catalog may do. Our addition lives in TypeScript and in what the functions are applied to.

### 2. One implementation: the catalog computes, the evaluator surrounds

Each operator is a single ordinary catalog function over positional values. The evaluator's work is everything around the call: resolve each ref against its partition, drop the absent ones, hand the survivors to the catalog function, record how many contributed. Absent-skipping and the contributor count are evaluator semantics; the arithmetic is the catalog's. The source selectors return the *index* of the winning input; the evaluator maps it back to a surface.

Catalog operators never see a surface id. Provenance is the evaluator's.

### 3. Derived-value component: one bound prop

The component takes one `DynamicValue` binding to an object the evaluator writes atomically — value together with contributor state. The component owns interpretation. One path per cell in the tree; nothing to mis-pair, so a tree cannot bind the value and forget the state. Three scalar props were rejected for exactly that failure; a sibling-path convention was rejected as implicit path arithmetic against A2UI's explicit-binding model.

This fixes the client-internal contract between catalog and evaluator: every field's evaluated value is a cell object, not a scalar.

### 4. Sort control: one bound prop

A dedicated component with one `DynamicValue` binding to an object carrying the current field, direction, and the field list with labels. It renders the criterion by label and offers the others; a user change writes back to the same path as ordinary two-way binding, and the evaluator re-orders on the write. No event plumbing; "sort is free" holds by construction. Reusing the basic `ChoicePicker` was rejected: its options would be model-authored labels restating the field list.

The write-back never bumps a generation or triggers re-synthesis: `sort` lives in the synthesis surface's data model, which is derived — nothing refs into it.

### 5. Four states, each visibly distinct

Complete (unmarked), partial (computed over fewer inputs than declared), absent (no input resolves), stale (a generation mismatch seen on the stamp; the value is from the previous wiring; re-synthesis in flight). Stale is not folded into partial — they tell different stories, and the window between a bump and the new wiring is exactly where §5.3 demands a visible reason. This set is the vocabulary Phases 5 and 7 reuse for failed, declined, and not-yet-arrived.

### 6. Names

`DerivedValue` and `SortControl`.

### 7. The cell object carries the provenance of the gap

`{ value, contributed, of, absent, stale }`. `absent` lists the namespaced surfaces whose refs did not resolve, so the cell can say *which* source is missing — §5.4's "why any source is absent," carried in-cell as decision 14 intended. Surface ids, not display names; the component derives the app id for display. Surfaces that *did* contribute are not listed: `Attribution` on the synthesis surface already answers provenance for complete values.

### 8. At rest, Attribution's pattern per state

Complete is the bare value. Partial, absent, and stale each carry a small marker at rest — three shapes, distinct from each other and from `Attribution`'s info glyph — with detail on hover or focus and the accessible name always carrying value and detail. Always-inline text was rejected as the caption problem re-entering through the cell; colour-only was rejected on accessibility. Absent shows a dash in place of the value; stale shows the previous value dimmed.

`format` is a fixed-configuration prop (`text` · `number` · `currency` with a code): vendors return numeric prices so `min` can compute, and the bound object precludes wrapping the value in the catalog's `formatCurrency` from the tree.

## Invariants

- **Every shell composition primitive on the synthesis surface takes one binding to one object the evaluator owns.** The model places it with one path and cannot half-wire it.
- **The catalog file stays protocol-clean.** Functions and components are ordinary catalog entries; the delta is what they are applied to (4.2's ref) and the operator list in TypeScript.
- **The rule that a formula cell renders only through the derived-value component is the orchestrator's to enforce (4.4); this task makes it checkable by existing.**

## Open items

- Display names (rather than app ids) in a partial cell's detail — a later nicety, not a contract field.
