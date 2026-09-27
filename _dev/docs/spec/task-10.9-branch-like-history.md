# Task 10.9 — Branch-like history per vendor

What a vendor's history becomes when the user goes back and opens something else: a linear list of visits over paints kept by id, the wiring remembered per paint, the step's report and the walk, deterministic mode's paint titles, and the proof. Phase 10 (`_dev/docs/spec/phase-10-vendor-catalogs-professional-project.md`, scope "Branch-like history per vendor, and the doc edits that follow it"). SPEC §4.3, §6.5, §7, §14.

## Scope

- Each vendor's history as a linear list of visits over paints kept by id, on the client and the orchestrator.
- The merged view's remembered wiring keyed by paint id.
- The step's report, and when the walk runs.
- `[apps]` Deterministic mode carrying `paintMeta`.
- The proof: tests, a new recorded client beat of the branching case, a live check through the tunnel.
- The design records and the backlog this change touches.

## Locked decisions

### 1. No additional UI per vendor

A vendor's attribution row keeps its two arrows, Back and Forward, and gains no control.

### 2. Paints kept once, by paint id

Each paint is kept once under its paint id — one per `createSurface`, counted alike on the client and the orchestrator — and is never dropped.

### 3. A vendor's history is a linear list of visits

A vendor's history is the list of the paint ids visited, walked by the two arrows. Each arrow is named by the paint it lands on.

### 4. A new paint after a Back records where the user landed

A new paint arriving while the user is not at the end of the visits first appends the paint landed on, then the new paint. The paints passed through on the way back are not recorded. A new paint at the end is appended.

### 5. The remembered wiring is keyed by paint id

The merged view's remembered wiring is keyed by the paint id each vendor has on screen, so a paint reached again by any route finds the wiring remembered for it.

### 6. The step names a paint id

The step operation names a paint id. The orchestrator keeps which paint each app has on screen; the list of visits lives on the client alone. The drop of forward steps and its wiring purge are removed.

### 7. The walk waits for a quiet

Every press is reported at once: the orchestrator writes the partition and journals the step. The walk starts only after a quiet with no further step on that canvas, each step restarting the quiet. The quiet's length is set in the plan against a reference; the candidate is the operating system's double-click interval.

### 8. `[apps]` Deterministic mode carries `paintMeta`

The deterministic corpus keeps `paintMeta` — the title and the question kind — when it is derived from the recordings, and the deterministic executor emits it ahead of the `createSurface` it names. The backlog entry for the corpus dropping `paintMeta` closes with it.

### 9. GitHub's deterministic pull-request detail stays out

GitHub's `open-pull-request` stays unanswered in its deterministic corpus. A backlog entry records it beside Gmail's unanswered "Draft a reply".

### 10. Proof

Unit tests on both sides: the list of visits, paints kept by id, wiring found by paint id, rapid presses starting no walk. A new scripted client beat recorded over the deterministic roster — CircleCI's runs list → a run → its failing job → Back, Back → another run → Back, Back — its arrows titled, no landing making a Synthesizer call, the journal showing every step seen; the beat's replay and end-to-end tests. A live check through the tunnel. 10.8 films its README demo from this beat.

### 11. Docs

10.9 updates the design records it touches — `docs/design/client.md`, `synthesis.md`, `orchestrator.md`, `agent-kit.md` — and the backlog. 10.10 edits SPEC.md: §6.5 and §14's row for the step operation.

## Invariants

Unchanged from today:

- A create that never reached the screen, one the client could not draw, and a question-kind create take their paint id; the arrows skip them.
- An in-place update changes the paint on screen; a paint returns as last seen.
- The history is per canvas and per vendor; a reload starts fresh.
- The lookup of wiring remembered over fewer sources works as before, over paint ids.
