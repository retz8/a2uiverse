# Task 9.9 — Integration + acceptance

Spec for sub-task 9.9 of Phase 9 (`_dev/docs/spec/phase-9-durable-composition.md`): the phase's acceptance run — every durable-composition case seen working end to end, live through the tunnel, with the reader's UX and design review against board F5 folded into the run. Phase decisions 1–17 and the phase's invariants; task 9.6's open items; task 9.8 decision 6; task 8.7's run as the pattern.

## Scope

- The beds each case runs on.
- The two items task 9.6 left for these sittings.
- The tour: its order, how each case is reviewed, and how a UX or design point raised during it is handled.
- The phase's invariants, observed in the journal and on the trail.
- A clean regression pass.
- The live subset.
- The visual baselines: task 9.8's visual spec's taken, the existing ones retaken.
- Where the code is worked; outward actions; the shell catalog's design-check fixture.
- The write-up and the doc amendments.

## Locked decisions

### 1. The deterministic roster is the review bed; the live vendors run two cases

Every case of beats 19–25 runs once on the deterministic roster through the tunnel, the fault map provoking its timing; the Planner and the Synthesizer run live on it. The live vendors run two of them: a step back with the wiring restored, over a live drill-down, and closing a loading canvas, the vendor's log showing A2A's cancel arrive. Every other case lives on the deterministic bed only.

### 2. The two items task 9.6 left are drawn in their cases

The per-fragment time of phase decision 8 is drawn during the tab finishing in the background; the refresh on the live canvas of phase decision 7 is drawn during "Ask this again now". Each is judged by the reader on screen. One the reader finds is noise is dropped there, and the phase decision it came from is amended.

### 3. The tour, one case at a time, watched live

Each case is its own orchestrator boot with that case's faults. The reader watches the controlled browser as each case runs. The run stops after each case and moves on when the reader says so.

### 4. A point raised during the tour is fixed at once

A UX or design point the reader raises is fixed on the spot, shown in the same case, and the tour moves on. A point that changes one member of a shared vocabulary is applied to its siblings at once, and the sibling cases show it when their turn comes. Each point becomes a numbered decision in this spec with what it replaced. A case found breaking a locked decision is a defect, fixed like any other.

### 5. The invariants are read from the journal and the trail

After each sitting the journal's synthesis records are tabulated per canvas in the write-up, by what released each: the automatic kind or the pressed kind. A canvas showing a second automatic release is a defect. Each case's evidence names the journal line that shows it: no Synthesizer call on a seen step back, the walk's one call on a combination never merged, the dispatch's cancel on a close, the records of an action and a press in a past canvas carrying that canvas's id. Only asking making a trail entry, and the parent standing, are read off the trail in the screenshots. No tooling is committed for this; if the tabulation proves tedious, a script is promoted in-session and the write-up says so.

### 6. A clean regression pass

With no fault map, one utterance each on the deterministic bed: the entity join landing, the temporal merge, a single-agent turn, the platform question, and the mock storefronts composing. Then a fast failure and Retry on the live canvas.

### 7. The order of work

The gate — `pnpm verify` and the Playwright specs that are not visual comparisons. Then the seven cases on the deterministic bed, in beat order: a tab finishing in the background; an action and a press in a past canvas; "Ask this again now" and a question asked from a view; add/drop and "compare these"; a step back with the wiring restored; an unseen combination falling to the walk; closing a loading canvas. Then the regression pass of decision 6. Then the two live cases of decision 1. Then the baselines. Then the write-up.

### 8. Baselines taken once, at the end

Task 9.8's visual spec over beats 19–25 has its baselines taken, and the existing ones retaken, once, after the tour's design changes have landed. Each diff is read and named to a design decision or to rendering drift. No tolerance is added to the comparison. The visual comparisons are known red until the end.

### 9. Worked on `main`

The code is worked directly on `main`, no worktree and no plan, the gate green at each commit.

### 10. Outward actions

None. The live sittings only read from the vendors. A write needed to reach a case is asked first, one case at a time. The reader sets the client and orchestrator ports public at the start of each sitting.

### 11. The design-check fixture follows the catalog

The shell catalog's design-check fixture is updated in the same session as any catalog change a design decision makes.

### 12. The write-up and the doc amendments

This spec gains: the design decisions made during the tour, numbered, each with what it replaced; found and fixed during the run, each with its case and its test; evidence per case, including the journal table of decision 5; findings not fixed. The TODO's 9.9 line is rewritten to this scope; 9.10's line accumulates what it is to record. The phase spec is amended only where a decision made during the run changes one of its locked decisions, marked as amended during the run; SPEC and its §14 delta register likewise where a design decision adds or changes a convention. The design records stay with 9.10, which reads this write-up.

## The look, decided during the run

### 13. The paint's time is part of the marker's full attribution

Each fragment's paint carries the time it landed on its slot; a step back shows the older paint's own time. The attribution marker shows it after the name and the account on hover and focus, and its accessible name always carries it; at rest the marker is the name alone. Replaced: the time after the name at rest, drawn at the start of case 1 under decision 2, the same stamp on every fragment. Raised on case 1.

## Invariants

- Live verification drives tunnel URLs, never localhost.
- The vendor agents are unmodified.
- One automatic synthesis per canvas; every further Synthesizer call has a press or a step behind it.
- Only asking makes a trail entry; a past canvas is never destroyed by a press on it.
