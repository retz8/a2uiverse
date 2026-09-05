# Phase 5 — Heterogeneous shapes

Temporal merge over Calendar · Mail · GitHub (M3): unrelated data models, shared-axis merge, key-based refs, decline, quiescence across unsynchronized arrivals. SPEC §3 (S1), §5, §6, §12. The phase re-frames the Synthesizer from the Phase 4 wiring into an author of the merged view, the same act as an A2UI agent authoring its surface.

## Scope

- The Synthesizer's output becomes the **synthesize data model** — the data model for a2ui composition: a model-authored shell-catalog tree, a free-form derived data model whose leaves are formulas, sort declarations, and a note. The Phase 4 fields/entities wiring and the runtime-derived table are replaced.
- Key-based refs (path predicates) beside index refs, through the IntegrityChecker.
- The Planner's prose brief to the Synthesizer and to the vendors, for a merge.
- Re-synthesis handed its previous output.
- Quiescence proven over the real roster with real latency spread.
- The composition contract bumped to v0.3.
- The mock storefronts continue as the regression bed; the S1 turn is recorded as beats.
- SPEC and TODO amendments named below; the design records (`synthesis.md`, and the Synthesizer sections of the orchestrator and client records) rewritten to this design as a closing sub-task.

## Locked decisions

### 1. The synthesis UI plan is prose

The Planner's guidance to the Synthesizer — what the merged view shows and how it is ordered — is the prose `request` on the plan's `shell` slot, as it is today. No structured view vocabulary. Archetypes are untouched in this phase.

### 2. The Synthesizer authors the synthesis tree

The Synthesizer returns a shell-catalog component tree, validated against the shell catalog like any agent's surface. The runtime no longer derives a tree.

### 3. The derived data model is free-form, with formulas at the leaves

The Synthesizer authors a JSON shape of its own choosing. Every leaf is a formula — an operator the shell catalog declares over refs into partitions — never a literal value. The tree binds to paths in that model. "Wiring, never values" holds at the leaves.

### 4. Sort is declared beside the tree and model

The output carries `sorts`: for each sorted array, its path in the derived model, the key path inside each element, and the direction. The Synthesizer names the criterion from the Planner's prose; the runtime sorts the array, keeps the criterion as user-changeable state, and the tree shows it through `SortControl`.

### 5. The synthesize data model is the synthesis half of the composition contract, v0.3

One contract file, one version line. The stamp half is unchanged; the synthesis half is redefined under this name. The SPEC §14 register row for synthesis wiring is rewritten to it.

### 6. Key-based refs are a predicate segment in the pointer

A ref stays `{surface, pointer}`. A pointer segment of the form `[key=value]` selects the element of an array whose field equals the value; any other segment is an index. A predicate ref is valid while the key resolves; an index ref is valid while the partition's generation is unchanged. The Synthesizer uses predicates when the observed data offers a stable key and index refs otherwise, in the same output.

### 7. The Synthesizer receives the shell catalog, never vendor trees

Input: the utterance, the shell slot's request, every partition's data model, and the shell catalog — its component schema, its operator functions, and the composition rules in a2uiverse words (partitions, refs and predicates, formula leaves, the derived-value rule, sorts). No vendor component trees. Planner and Synthesizer know only the shell catalog.

### 8. A deviation from the plan is journaled, never painted

The output carries a free-form `note`: what was delivered and why it differs from the request, when it differs. Journaled beside the plan's request. The user never saw the plan, so nothing is disclosed on the surface.

### 9. The Planner asks vendors for what the merge needs, in prose

When the plan reserves a synthesis slot, each vendor's request also asks in plain language for the data the merged view depends on (ids, times). Nothing a2uiverse-specific rides the vendor wire; an agent that ignores it composes less well.

### 10. Vendors are never changed for a2uiverse

No vendor prompt, domain doc, or agent code is touched so that it serves the merge. A vendor that paints no usable field is the §4.4 fallback, recorded as a finding.

### 11. S1 beats are recorded from unmodified agents

The "today" turn is sent to each unmodified agent in live mode and recorded as an ordinary beat, giving the temporal merge a deterministic replay. This is the phase's only `[apps]` work.

### 12. Quiescence is proven, not extended

The Phase 4 trigger and invalidation stay as built and are exercised over three live vendors with real latency spread. A vendor that never answers holds synthesis open; per-source deadlines remain Phase 8. The M3 line in SPEC §12 drops "late arrival", which belongs to M6.

### 13. Re-synthesis receives the previous output

On a re-synthesis the Synthesizer is handed its previous synthesize data model beside the fresh partitions, told the user is looking at it: re-point what became invalid, keep the tree and shape unless the data no longer supports it, say in the note what changed. The first synthesis of a turn is a fresh call. The user's current sort is applied by the runtime as today.

### 14. Navigation from a merged cell is Phase 7

Not in this phase. The Phase 7 TODO line gains it.

### 15. Dead air is measured only

`deadAirMs` is recorded over the real roster with the new output; no streaming. Model and effort settings for Planner and Synthesizer are unchanged.

### 16. The synthesize data model is produced as text, validated after

The Synthesizer writes JSON as text against the contract and the shell catalog described in its prompt. The orchestrator parses and validates against the sdk contract and the catalog; one retry carries the validation failure back to the model; a second failure is `malformed`. The Planner keeps structured output.

### 17. Decline is unchanged

A decline is its own output with a reason spoken into the slot; fewer than two sources collapses without a call.

### 18. The derived-value rule is a validator check

A tree that binds any component other than `DerivedValue` to a formula path is `malformed`. Literal props in the tree — labels, headings — are presentation and are allowed.

### 19. No new operators in this phase

The timeline needs `value` and `count`. New operators come on evidence from the real roster.

### 20. The mock storefronts stay the regression bed

Their comparison view is now model-authored; their fixtures and the client's synthesis fixture are re-recorded.

### 21. Doc amendments

- SPEC: §5.2 and the §5 turn line; the §10 Synthesizer row; the §12 M3 line; the §14 rows for synthesis wiring, path predicates, and the derived-value rule.
- TODO: the Phase 6 entry drops "Framing decided in Phase 5's grill" and gains that Phase 6 expands the Planner's framing in the same sense this phase expanded the Synthesizer's — the archetype vocabulary revisited, the Planner authoring in prose what the shell should show — with the shell-as-agent framing decided in Phase 6's own grill. The Phase 7 entry gains navigation from a merged cell.

### 22. The synthesis region is shell content, not a fragment

Decided in task 5.2's grill. The merged view renders as the shell writing on its own page: no fragment boundary, no attribution tile; provenance is in the cells. The synthesis slot stays reserved in the plan so its position is fixed (§4.5), but on the screen it is a quiet in-progress marker while pending, the view written in place when delivered, the shell's words written in place when declined. SPEC §4.3 (attribution is for vendor fragments) and §4.5 (the pending synthesis state is quiet) are amended with the client change.

### 23. The sdk ships a validator and the shared resolution kit

Decided in task 5.2's grill. The orchestrator validates the Synthesizer's output with the sdk's validator; both processes resolve pointers and predicates, walk the model, and judge ref validity through the sdk's kit, never a private copy. Consumers switch in 5.4 and 5.5.

### 24. The shell catalog is a Radix Themes mapping of the basic catalog

Decided in task 5.3's grill. The shell catalog's implementation maps each basic component onto its Radix Themes counterpart, as `primer-a2ui-adapter` maps onto Primer; Radix Themes is the shell catalog's design system, brought by its Provider under the §9.2 bundle rule. The token-themed re-export of upstream's implementation goes. Sub-task 5.9, after 5.3, parallel with 5.4 and 5.5, before 5.7, with the SPEC §4.2 amendment and the §15 table row.

## Invariants

- The shell catalog is the closed vocabulary; the plan's semantics are open prose.
- Every leaf of the derived data model is a formula. No value is copied out of a partition.
- Nothing a2uiverse-specific reaches the vendor wire.
- Absent is not invalid; generation stamps remain the correctness floor for index refs.

## Open items

Task-internal, left for the sub-tasks' own specs: how a predicate that matches nothing or more than one element is classified; how the client's stale marker treats a cell mixing predicate and index refs; the exact contract field names.
