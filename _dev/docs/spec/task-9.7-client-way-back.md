# Task 9.7 — Client, the fragment's way back

The client's part of Phase 9's way back inside a fragment (`_dev/docs/spec/phase-9-durable-composition.md`, decisions 2, 3 and 13; `_dev/docs/spec/task-9.2-composition-contract.md`, decisions 5 and 7; `_dev/docs/spec/task-9.4-orchestrator-fragment-history.md`; `_dev/docs/spec/task-9.5-shell-catalog-way-back-arrows.md`): the per-agent stacks on the canvas runtime, the arrows' presses, a step back restoring the paint and the remembered wiring, the partition reported. SPEC §4.3, §6.5, §7.

## Scope

- The per-agent stack on each canvas runtime: what a step holds and when it is captured.
- The count, kept in agreement with the orchestrator's.
- The wiring remembered per combination on the client, and what the merged view shows on a step back, seen or unseen.
- The step press: its message, its place among the presses, its failure.
- The arrows: the neighbours the host computes, and the arrows while the source's repaint is in flight.
- Tests and the design-check fixture.

## Locked decisions

### 1. A step holds the paint as last seen

The current step is the live surface itself, never a stored copy. When the stack moves off a step — a new create or a step press — the client captures the source's surfaces as they stand then: their trees, their data models with every update the vendor pushed into them, and the paint's title. Stepping back shows what the user last saw there.

### 2. The count runs at the wire

Every vendor `createSurface` the client receives is a step the moment it arrives, in arrival order, one per create op, before any apply or staging decision — the orchestrator's rule mirrored. A create that never reached the stage, one the client could not draw, and a question-kind create each occupy their index as a placeholder that holds nothing to return to; the neighbour computation skips placeholders, so Back lands on the nearest step with a paint. A new create landing after a step back drops the forward steps and purges the client's wiring entries keyed with that source at a dropped index.

### 3. The client mirrors the wiring memory

On every accepted synthesis payload the client files it under its own current combination — every source with a stack, mapped to its current index, keyed as the orchestrator keys it. A step back to a combination the client has seen restores the paint and the recalled wiring together, at once, re-evaluated over the restored paint, with no call.

### 4. Unseen holds the merge line working

On a step back to a combination the client has not seen, the paint is restored at once and the merged view stands as it is with the merge line in its working state until the step's stream ends. A synthesis paint on that stream lands as usual. A silent end with no paint drops the working state, leaves the current wiring evaluated over the restored paint, and files it under the combination, so the two memories converge.

### 5. The step press

The step message carries the whole canvas's client data model, as an action does, sent after the restore so the orchestrator receives the restored paint. A step is a press in the store, so the trail's loading mark and the progress line treat it as they treat Retry. A step that fails — refused, unreached or lost — is quiet: the restored screen stands, the reason goes to the console, the press is removed; the next action heals the orchestrator's partition.

### 6. The arrows and the busy source

The host fills the 9.5 history context from the stacks: per source the back and forward neighbours with their indices and titles. The context gains a per-source busy flag; while a source's repaint is in flight its arrows are drawn disabled, the same state as the canvas-wide press disabling. 9.5's wording on disabling is amended in 9.10. The trail's preview provides no history, so it draws no arrows. A step in a past canvas works as on live, the stacks living on the canvas runtime.

### 7. Tests and the design-check fixture

The trail beat's root canvas gains one surface-action turn that repaints a fragment, so that fragment's marker shows Back on the live canvas, and the canvas-surface spec takes one baseline of the marker row with the arrow. The other arrow states stay on the shell catalog's states page. Unit tests cover the stacks, the counting parity with the orchestrator, the capture as last seen, the wiring memory, the forward drop and its purge, the busy flag and the quiet failure. The step's choreography as beats is 9.8's.

## Invariants

- A step back costs no call when the screen it returns to was seen.
- The way back only ever lands on a paint the user saw in the slot.
- The client's step indices agree with the orchestrator's by construction.
