# Task 9.5 — `shell-catalog`, the attribution row's back and forward arrows

The shell catalog's part of Phase 9's way back inside a fragment (`_dev/docs/spec/phase-9-durable-composition.md`, decision 13; `_dev/docs/spec/task-9.2-composition-contract.md`, decision 5): the arrows on the attribution marker, host-wired like the presses. SPEC §4.3, §6.5, §7.

## Scope

- Where the catalog learns whether a fragment has somewhere to go back or forward to, and what to call it.
- The arrows' name, place and register on the marker's row.
- The press an arrow raises.
- The arrows under the press state.
- Tests and the design-check fixture.

## Locked decisions

### 1. A host-filled context

Beside `SlotStateContext` and `PressStateContext`, a context the host fills tells `Attribution` where its source's fragment stands in its history. The painted tree and the `Attribution` schema do not change.

### 2. The two neighbours only

Per source the context carries an optional back step and an optional forward step, each the index the arrow reports and the title of that paint when the agent named one. The catalog draws an arrow per neighbour present and computes nothing; the client computes the neighbours from its stacks.

### 3. The name leads with the direction

"Back to <title>" and "Forward to <title>"; "Back" and "Forward" alone when the agent named nothing. The same text on hover, focus and for assistive technology. The arrows sit after the display name and info glyph on the marker's row, back then forward, in the marker's quiet register, with no border — the fragment's boundary stays undrawn.

### 4. The press an arrow raises

The step operation of the composition contract: the one source and the neighbour's index, through the host's press handler with the surface and component that raised it, as Retry is raised. Without a press handler no arrow is drawn.

### 5. The arrows follow the press state

Drawn disabled when the host says no press can be made, as Retry is.

*Amended by task 9.7 decision 6.* Drawn disabled, too, while the host says the source is busy — its repaint in flight — in the same state; the context carries the flag per source beside the two neighbours.

### 6. Consequences

- A step has no held state: the client restores at once, so the arrows move when the context changes, not from a press held until a paint catches up.
- The design-check fixture's Slot and Attribution states gain the arrow states: back only, back and forward, a neighbour with no title, disabled.
- Phase 9 decision 13's wording on the name is amended in 9.10.
