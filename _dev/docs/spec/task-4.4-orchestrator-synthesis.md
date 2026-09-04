# Task 4.4 — Orchestrator synthesis core

Spec for sub-task 4.4 of Phase 4 (`_dev/docs/spec/phase-4-synthesis.md`): the turn's second model call and everything around it on the orchestrator — partition materialization, the Synthesizer, the IntegrityChecker and generation stamps, the Planner's synthesis slot, the synthesis surface, decline. Consumes the wiring contract (`task-4.2-synthesis-wiring-contract.md`) and the shell catalog's operators and primitives (`task-4.3-shell-catalog-synthesis.md`). Extends the design recorded in `_dev/docs/design/orchestrator.md`.

## Scope

- The plan schema's synthesis slot and the Planner prompt that places it.
- Partition materialization from relay traffic and the returning client data model.
- Generation stamps on the composition stamp; the IntegrityChecker gating re-synthesis.
- The Synthesizer as a sibling of the Planner behind the same model seam, emitting the sdk's output schema.
- The synthesis surface: the derived tree, painted into the synthesis slot with the wiring on its metadata.
- Decline and malformed output; journal records; the dead-air measurement.
- Re-synthesis inside action turns.

Not in scope: evaluation (client, 4.5), the mocks and their profile (4.6, 4.7), the shell catalog beyond one React-free subpath export for the operator list.

## Locked decisions

### 1. The synthesis tree is derived, not model-authored

The Synthesizer emits only the sdk's `synthesizerOutput` — fields, entities, sort, or a decline. The orchestrator generates the tree deterministically from `fields` and `sort`: the sort control bound to the sort state, a template over the entities, one derived-value cell per field carrying its label. There is exactly one sensible tree for a list of same-shaped entities; asking the model for it adds output tokens in the dead-air window and a validation surface, not judgment. The component rule (phase decision 17) holds by construction. A model-authored tree, when a later milestone wants a surface that is not a list of entities, arrives behind the same generator seam. The phase spec's decision 17 rationale is amended accordingly.

### 2. Re-synthesis runs inline in the action turn

A vendor's in-fragment interaction arrives as an action turn — today owner-only dispatch and one final. That turn gains the utterance turn's tail: after its pump settles, the partition is updated and generations bumped; the IntegrityChecker checks the composition's live wiring; if invalid, the Synthesizer runs and the synthesis surface repaints — all before the turn's final. The bumped generation reaches the client on the vendor's own event, before the new wiring, so derived cells mark stale first and then resolve: the model call's latency is spent under a visible marker (§5.3). Action turns that invalidate the wiring cost a model call; that is the phase's accepted re-synthesis frequency (phase decision 5) appearing where expected. A separate orchestrator-initiated task was rejected (A2A tasks are client-opened); deferring to the next utterance was rejected (stale with no recovery path).

### 3. Generations bump by comparison against the last-synthesis snapshot

The composition keeps, per surface, the data model as of the last synthesis. On every applied vendor update, each array in that snapshot is compared to the live model: present with different contents → bump; missing → nothing (absent, phase decision 6); present and identical → nothing. Before the first synthesis there is no snapshot, so arrival bumps (§5 t5). This is the only rule under which the three cases decision 6 named behave as specified — in-place reorder invalidates, drill-down degrades free, return with unchanged data reconnects free. Arrays only, not scalars: the hazard is a re-pointed index. The rule is per surface, consistent with phase decision 13's collapse under index-only refs. The snapshot is the orchestrator's private means; `computedAgainst` on the wire stays plain generation numbers.

### 4. Malformed output behaves as a decline

Beyond the sdk schema the orchestrator checks: every operator is one the shell catalog declares; the sort field is a declared field; every entity has exactly as many cells as there are fields; every ref names a partition the composition holds and its pointer resolves now. Any failure collapses the reserved slot, sends no wiring, and completes the turn — the runtime declining on the model's behalf. Journaled as `malformed` with the failing check, distinct from `declined` with the model's reason. A broken turn was rejected: the vendor fragments have already painted correctly, and one participant failing never fails a fan-out turn. A retry was rejected: it doubles worst-case latency for an outcome that is either rare or a prompt fix.

A ref whose pointer does not resolve at synthesis time is malformed, not absent. Absent is a runtime state for refs that resolved when written and later stopped.

### 5. The Planner decides whether and where

Whether a screen includes a synthesis surface, and where it sits in the layout, is the Planner's judgment — a model decision, not code. Phase spec decision 8 amended.

### 6. The synthesis slot is a slot whose source is `shell`

No new plan vocabulary. A slot with `appId` `shell` — the source id the Registry already reserves — is the synthesis slot: it takes an archetype like any other, and its `request` is the Planner's guidance to the Synthesizer, authored the way every vendor's request is. The checklist adds only what §5.1 already says: synthesis needs at least two sources, and there is one merged view per screen. The synthesis slot is not special — it is part of the UI the orchestrator paints as the shell, filled by a surface grafted through the same path as any fragment (§4.2). A `kind` field and a top-level synthesis object were both rejected as a second way to say what the source id already says.

## Conventions

Following existing code; recorded so nothing is silently assumed.

- **Synthesizer input**: the utterance, the shell slot's Planner-authored request, every partition's live data model keyed by namespaced surface id with its app's display name, and the operator list with the catalog's descriptions. Data only — never vendor component trees (§10). Truncation policy is the plan's.
- **Operator list in a React-free process**: the orchestrator reaches the shell catalog only through React-free subpaths (`/id` today). A second subpath exports the operator list; no second copy.
- **Derived tree**: a pure module beside the shell painter, in shell-catalog A2UI. Its exact shape is the plan's.
- **State**: partitions, per-surface snapshots, generations, and the live wiring join the composition state; replaced per utterance turn, as today. The synthesis surface is the shell's second surface (`shell:synthesis` beside `shell:main`). Shell events carry no generations.
- **Trigger**: when every dispatched source has resolved (§5.3) — after all pumps settle, before the turn's final. Fewer than two sources arrived → no model call, slot collapses (§5.1).
- **Journal**: the synthesis (wiring) or its `declined` / `malformed` outcome with reason, beside the plan; and the dead-air interval — last source settled to synthesis painted — as a field, so phase decision 16's measurement is read from the journal.

## Invariants

- **The Synthesizer never sees generations.** It emits the inner output; the orchestrator wraps it with `computedAgainst` (4.2 decision 10).
- **Vendor finals stay demoted; the executor owns the single final** — now after synthesis, in both utterance and action turns.
- **The wiring rides the synthesis surface's paint event**, never a separate message, never on a decline (4.2 decisions 2, 11).

## Open items

- The precise diff cost of snapshot comparison on large partitions — measured, not designed, in this phase.
