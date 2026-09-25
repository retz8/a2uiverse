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

### 13. A fragment carries no time of its own

The question's time on the parked banner is the canvas's one time; the attribution marker carries no paint time. Replaced: the paint's landing time after the name at rest, drawn at the start of case 1 under decision 2, then moved into the marker's hover and focus on case 1, then dropped on case 2 — a clock time the reader compares against now, differing between fragments only where the reader acted. Phase decision 8, SPEC §5.4 and §6.4 amended. Raised on cases 1 and 2.

### 14. A past canvas keeps its colors

A past canvas's page is drawn as the live one is; the parked band, the trail's Viewing mark and Return to live say it is past. Replaced: the page drawn in grayscale after board F5 (task 9.6). Raised on case 2.

### 15. The way back sits at the right edge of the attribution row

The back and forward arrows sit at the right edge of the attribution row, the marker at its start, each a soft accent icon button named for where it goes on hover and for assistive technology. Replaced: a gray ghost icon beside the marker, 23px in the marker's caption register, then a soft accent "← Back" button beside the marker on case 2. Phase decision 13 and SPEC §4.3 amended. Raised on case 2.

### 16. A combination never seen is covered by one remembered over fewer sources

A step to a combination never merged restores the wiring remembered over fewer sources — every source it names where it stands now, the rest having painted since — with no call, on the orchestrator and the client alike; the sources painted since wait as late, the merge slot repainted with them, and Include folds them in. Only a combination nothing covers falls to the walk and its call. The journal's step records the sources it left late. Phase decision 3 and SPEC §6.5 amended. Raised on case 2: Calendar's back after Gmail's Retry had been folded in over Calendar's event made a call, the view without Gmail already made.

### 17. A step's walk is for the combination on screen

A walk only steps released is abandoned by the next step — its call aborted, the step's journal line `abandoned` — and the next step is answered at once. The merge line follows the latest step: a step restoring a seen or covered combination ends the working an earlier unseen step left. Replaced: every later step waiting behind the walk, and the merge line working until that step's stream ended (task-9.7 decision 6). Phase decision 3 and SPEC §6.5 amended. Raised on case 2.

### 18. Back and Trail are a sidebar of their own

The gutter holding Back and Trail is a sidebar down the left edge on the page's background, with no divider. The live canvas's condensed bar and the parked band start past it. Replaced: Back and Trail floating over the page, the condensed bar spanning the full width beneath them with its bottom edge through the Trail icon, the band's edge likewise. Raised on case 2.

### 19. The pressed fragment holds its place while its step runs

From a press on a fragment's back or forward arrow until the step ends, every change above that fragment — the merged view restored over another combination, the late row the orchestrator's repaint adds or takes away — is absorbed by scrolling, so the fragment's row and the arrow under the pointer stay where they were. The reader's own scrolling ends the hold. Replaced: the fragment row moving by the merged view's change in height on every step, the arrow leaving the pointer, and moving again a round trip later with the late row. Raised on case 2.

### 20. No status strip; the canvas's error closes the progress line

The status strip at the foot of the canvas is gone, and with it the app's name there. The canvas's sticky error — a message of its own that failed or never arrived, cleared by its next dispatch — closes the progress line under the question in the danger tone, an alert on the full line, the condensed bar carrying it too; with no canvas, a replay that could not start says so under the empty page's hint. The Ask pill and the notices sit 24px and 80px above the page's foot. Replaced: the strip naming the app, carrying the error in its place (task-8.7 decision 16). Raised on case 2.

### 21. The live canvas has no refresh press

"Ask this again now" stays on a past canvas's band alone; the live canvas's question is asked again from its header's "Edit and ask again". Replaced: "Ask this again now" drawn at the end of the live canvas's question row under decision 2. Phase decision 7 and SPEC §6.4 amended. Raised on case 3.

### 22. Back follows the branch

The gutter's Back goes to the canvas the one on screen was asked from — up its branch, as the trail's spine draws it — and is disabled on the session's first question. A canvas closed hands its parent to the canvases asked from it, so Back runs on through it. Back has no Forward: a canvas may have several children, and going down a branch is the trail's. Replaced: Back to the chronological neighbour, the canvas asked just before (phase decision 16). Phase decision 16 and SPEC §6.4 amended. Raised on case 3: from "Only the calendar part", asked from "Needs attention today", Back went to "Attention for today", asked just before it on another branch.

### 23. A drill-down shows as the vendor answers; the merged view catches up

An action's paint is held per source, not per turn: the source's settled marker swaps in what survives of its paint, a surface it created and cleaned up again discarded. A vendor paint swapped in inside a live composition holds the merged view at its last values, its line working ("Joining …"), until the turn ends with the re-synthesis; a payload accepted meanwhile lands at once. Replaced: the fragment's paint held until the turn ended, after the re-synthesis — a CircleCI run answered in 7ms shown after 27s. Raised on case 5.

### 24. A button of the shell's shows the pointer

Every button the shell draws on Radix Themes — a fragment's back and forward arrows, the sort control and its direction, Retry, Include, Try again, the capability tile's press, a painted `Button`, the Ask pill — shows the pointer on hover, as the gutter's Trail, a trail entry and a merged cell do. Replaced: Radix's default arrow cursor on its buttons. Raised on case 6.

## Found and fixed during the run

- **A trail entry picked under the pointer left its preview behind.** The pick closes the rail with the pointer still on the row, so the row never saw it leave, and the next opening of the rail showed that entry's preview unasked. A closed rail clears its preview. Case 3; the canvas app suite's test of an entry picked under the pointer.
- **The journal read a step's combination after its wait.** A step waiting behind a merge in the making was journaled with the combination a later step had left, so a Forward read `calendar 0`. The combination is read as the step makes it. Case 2; the orchestrator's abandoned-walk test asserts both steps' combinations.

## Invariants

- Live verification drives tunnel URLs, never localhost.
- The vendor agents are unmodified.
- One automatic synthesis per canvas; every further Synthesizer call has a press or a step behind it.
- Only asking makes a trail entry; a past canvas is never destroyed by a press on it.
