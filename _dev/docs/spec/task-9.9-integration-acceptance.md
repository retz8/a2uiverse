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

### 25. An action is its source's tick

An action inside a fragment names no action on the progress line: that source's tick is working from the press until the source's settled marker, then done, and the merge step says the rest. Replaced: a working step before the ticks, "<the action's name and its first context value> — generating…", upgraded to the vendor's `paintMeta` title when one came, standing until the turn ended (task-8.5 decision 13). SPEC §4.3 amended. Raised on case 2, decided on case 7.

## Found and fixed during the run

- **A trail entry picked under the pointer left its preview behind.** The pick closes the rail with the pointer still on the row, so the row never saw it leave, and the next opening of the rail showed that entry's preview unasked. A closed rail clears its preview. Case 3; the canvas app suite's test of an entry picked under the pointer.
- **The journal read a step's combination after its wait.** A step waiting behind a merge in the making was journaled with the combination a later step had left, so a Forward read `calendar 0`. The combination is read as the step makes it. Case 2; the orchestrator's abandoned-walk test asserts both steps' combinations.

## Evidence

The deterministic roster through the tunnel unless named. Times UTC on 2026-09-25; a canvas by the first eight characters of its id.

- **Case 1 — a tab finishing in the background** (CircleCI delayed 20 s, soft deadline 60 s). The entity join (`dc4d8017`) released its merge `settled` at 01:17:36, after the second question at 01:17:28; the second canvas (`e647c063`) was planned with the first as its parent.
- **Case 2 — an action and a press in a past canvas** (Gmail failing). The Calendar event and Gmail's Retry landed in the parked canvas (`9730be24`), journaled on it as `walk` and `retry`; no trail entry was added.
- **Case 3 — "Ask this again now" and a question asked from a view.** Both children of `faf8a503`: the question asked again at 03:11:14 (`39d7a125`); "Only the calendar part" at 03:11:51 (`7aea3bdf`), Calendar alone, no merge.
- **Case 4 — add/drop and "compare these".** Planned from the side-by-side canvas (`117945e3`), which made no call: "Add GitHub to this" painted Gmail, Calendar and GitHub (`551f6eef`); "without Gmail" Calendar alone (`7c88ed5f`); "compare these" a merge over Gmail and Calendar, `settled`, one call (`8e442447`).
- **Case 5 — a step back with the wiring restored.** CircleCI's Back at 03:32:34 (`f2af7904`): `seen: true`, `walk: silent`, no attempt. After decision 23 (`eaba3065`) the run showed at 2.3 s and the re-synthesis landed at 12.1 s; both had landed at 27 s.
- **Case 6 — an unseen combination falling to the walk.** On `416a1331` a CircleCI run opened, then Linear's A2U-5, then CircleCI's Back at 03:53:06: `step circleci to 0`, combination `{github: 0, linear: 1, circleci: 0}`, `seen: false`, `walk: landed`, one attempt released `by: step`. The run list returned at once; the merge line worked until the walk landed 8 s later.
- **Case 7 — closing a loading canvas** (GitHub delayed 30 s). `330ab41b` was closed from the trail at 04:11:09 with GitHub still loading: the orchestrator logged the canvas closed and GitHub's dispatch cancelled at 3.5 s, before the delayed dispatch went out; the utterance line reads `closed: true`, with no release. The entry left the trail; its parent `8fd09643` stood as live. An earlier close (`a25f069c`) came after GitHub had answered at 30.0 s and is not counted.
- **The regression pass** (decision 6). With no faults: the entity join, `settled`, one call (`9a482350`); the temporal merge over Calendar, Gmail, GitHub and Linear, `settled`, one call (`620e5f1c`); "Show me the open pull requests on a2ui-project/a2ui that need review." to GitHub alone, no call (`36e74ccb`); "What apps do I have?" answered in the layout, no dispatch, no call (`b9b3fbc1`); on the mock roster, "Which cameras are cheapest across the shops?" a union across Shop A and Shop B, `settled`, one call (`29a5a651`). With Gmail failing fast: the merge `settled` without Gmail beside its tile in the vendor's words, then Retry folding Gmail in, `retry`, one call (`b49f0e63`).
- **Live — a step back over a live drill-down.** On `0f3cc76b` the live CircleCI answered the run in 27.8 s, its tick working throughout. CircleCI's Back at 04:22:51: combination `{circleci: 0, linear: 0, github: 0}`, `seen: true`, `walk: silent`, no attempt, answered in 2 ms.
- **Live — closing a loading canvas.** `c491cdfd` was closed at 04:23:54 with Calendar, Gmail and GitHub out and Linear painted but not settled. Each of the four vendors logged the cancel at 04:23:56 — ADK's "Root node … was cancelled" and the kit's "task … canceled"; the utterance line reads `closed: true`, with no release.
- **Baselines** (decision 8). 42 of the 71 comparisons changed, each diff named. Decision 20 in 41: the strip's name gone, the Ask pill and the notices lowered, the page's foot uncovered, the empty page's hint recentred. Decision 15 in four — the way back's shot, the unseen step, beats 23 and 24: the arrows at the row's right edge, the taller row moving the fragment beneath it. Decision 18 in the condensed bar's edge starting past the sidebar, under the comparison's threshold. Decisions 14, 23, 24 and 25 show nothing in the shots. No rendering drift; no tolerance added. Retaken, all 71 pass on two runs.

### Synthesis releases per canvas

Automatic: `settled`, `soft-deadline`. Pressed: `walk` behind an action, `retry`, `step`. No canvas shows a second automatic release.

| Case | Time | Canvas | Question | Asked from | Released by (attempts) |
|---|---|---|---|---|---|
| 1 | 01:17 | `dc4d8017` | what's the status of what I'm working on? | — | settled (1) |
| 1 | 01:17 | `e647c063` | What needs my attention today? | `dc4d8017` | settled (1) |
| 1 | 01:21 | `1fb960a3` | what's the status of what I'm working on? | — | settled (1) |
| 1 | 01:21 | `7596b0a0` | What needs my attention today? | `1fb960a3` | settled (1) |
| 2 | 02:08 | `9730be24` | What needs my attention today? | — | settled (1), walk (1), retry (1) |
| 2 | 02:08 | `73081447` | what's the status of what I'm working on? | `9730be24` | settled (1) |
| 2 | 02:18 | `a8a02160` | What needs my attention today? | — | settled (1), walk (1), retry (1), step (2) |
| 2 | 02:18 | `14dbf31a` | what's the status of what I'm working on? | `a8a02160` | settled (1) |
| 2 | 02:23 | `acd10a84` | What needs my attention today? | — | settled (1) |
| 2 | 02:39 | `81f1da39` | What needs my attention today? | — | settled (1), walk (1), retry (1) |
| 2 | 02:39 | `333780d8` | what's the status of what I'm working on? | `81f1da39` | settled (1) |
| 2 | 02:58 | `94448f00` | What needs my attention today? | — | settled (1), walk (1) |
| 3 | 03:09 | `faf8a503` | What needs my attention today? | — | settled (1) |
| 3 | 03:10 | `8c67f16e` | what's the status of what I'm working on? | `faf8a503` | settled (1) |
| 3 | 03:11 | `39d7a125` | What needs my attention today? | `faf8a503` | settled (1) |
| 3 | 03:11 | `7aea3bdf` | Only the calendar part | `faf8a503` | — |
| 4 | 03:25 | `117945e3` | Put my inbox and my calendar side by side. | — | — |
| 4 | 03:26 | `551f6eef` | Add GitHub to this | `117945e3` | — |
| 4 | 03:26 | `7c88ed5f` | without Gmail | `117945e3` | — |
| 4 | 03:27 | `8e442447` | compare these | `117945e3` | settled (1) |
| 5 | 03:31 | `f2af7904` | what's the status of what I'm working on? | — | settled (1), walk (1) |
| 5 | 03:40 | `eaba3065` | what's the status of what I'm working on? | — | settled (1), walk (1) |
| 6 | 03:50 | `416a1331` | what's the status of what I'm working on? | — | settled (1), walk (1), walk (1), step (1) |
| decision 25 | 04:07 | `8fd09643` | what's the status of what I'm working on? | — | soft-deadline (1), walk (1) |
| 7 | 04:09 | `a25f069c` | What needs my attention today? | `8fd09643` | soft-deadline (1) |
| 7 | 04:11 | `330ab41b` | What needs my attention today? | `8fd09643` | — · closed loading |
| regression | 04:13 | `9a482350` | what's the status of what I'm working on? | — | settled (1) |
| regression | 04:13 | `620e5f1c` | What needs my attention today? | `9a482350` | settled (1) |
| regression | 04:14 | `36e74ccb` | Show me the open pull requests on a2ui-project/a2ui that need review. | `620e5f1c` | — |
| regression | 04:14 | `b9b3fbc1` | What apps do I have? | `36e74ccb` | — |
| regression | 04:15 | `b49f0e63` | What needs my attention today? | — | settled (1), retry (1) |
| regression | 04:18 | `29a5a651` | Which cameras are cheapest across the shops? | — | settled (1) |
| live | 04:20 | `0f3cc76b` | what's the status of what I'm working on? | — | soft-deadline (1), walk (1) |
| live | 04:23 | `c491cdfd` | What needs my attention today? | `0f3cc76b` | — · closed loading |

## Findings not fixed

- **The tunnel loses a request now and then** (task 8.7's finding). An action on case 2 and Linear's first open on case 6 never reached the orchestrator ("That action failed. The orchestrator did not answer."). Actions have no resend; questions do.
- **The browser automation loses the first question typed after a fresh page load** (task 7.9's note on its input delivery); asking again works.
- **The deterministic Calendar agent opens the same event whichever card is clicked** — its fixture set; the agents stay unmodified.
- **"compare these" over an inbox and a calendar made two stacked tables** — left as it is.
- **The live GitHub agent painted a pull-request card with no title** in "My Open Pull Requests"; the agents stay unmodified.
- **The live merge's line once read "Joined Linear issues to CircleCI runs" with GitHub ticked and no clause for it**, before "GitHub PRs not in this view yet" and Include appeared; seen once, not investigated.

## Invariants

- Live verification drives tunnel URLs, never localhost.
- The vendor agents are unmodified.
- One automatic synthesis per canvas; every further Synthesizer call has a press or a step behind it.
- Only asking makes a trail entry; a past canvas is never destroyed by a press on it.
