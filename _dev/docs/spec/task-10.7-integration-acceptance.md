# Task 10.7 — Integration + acceptance

Spec for sub-task 10.7 of Phase 10 (`_dev/docs/spec/phase-10-vendor-catalogs-professional-project.md`): the phase's acceptance run — the new Gmail, Google Calendar, Linear and CircleCI catalogs composed on the deterministic roster through the tunnel, with the reader's UI feedback folded into the run. The phase's invariant; the items tasks 10.4 and 10.5 handed to 10.7.

## Scope

- The two checks: the client's Playwright suite over the recorded beats, and a live run on the deterministic roster through the tunnel.
- How the reader's UI feedback during the live run is handled.
- The visual baselines: compared against the Phase 9 ones, then retaken.
- The collision detector over a catalog `@font-face`.
- The agent SDK's streaming `Row` placeholders (`_dev/a2ui-findings.md` finding 10).
- The live run's cases and the pass bar for a merged value's navigation.
- Where the code is worked.
- The record: this spec and its write-up.

## Locked decisions

### 1. Both checks

The client's Playwright suite, replaying the recorded beats already re-recorded in the new vocabularies, is the regression pass. A live run on the deterministic roster through the tunnel shows the new catalogs composed, with the reader watching the screen.

### 2. The reader's UI feedback is fixed on the spot

Each point the reader raises during the live run is fixed at once, one at a time, seen on reload, and the run moves on. A fix to a catalog's look lands on `a2uiverse-apps`' `main`, the catalogs linked into the client locally while iterating; at the end `a2uiverse-apps` is pushed once and the client's pin moves once. Feedback that would change what an agent sends is noted and handled after the run.

### 3. The Playwright suite runs before the live run and after it

First against the Phase 9 baselines on disk, every diff named: the vendor fragments drawn in their new vocabularies are expected; any diff outside a vendor's fragment is a point taken into the live run. After the live run's fixes, the baselines are retaken and what the fixes changed is named.

### 4. The collision detector covers `@font-face`

The detector records each catalog's `@font-face` family names, and a family name declared by two catalogs is a collision. The four current catalogs' fonts pass it.

### 5. The streaming placeholders are outside 10.7

The agent SDK's streaming `Row` placeholders, drawn as unknown components in stub and live mode by every catalog without `Row`, are not part of 10.7's check. They become a backlog entry in `_dev/TODO.md`, the fix left open.

### 6. The live run's four cases

1. The temporal merge, "What needs my attention today?": every vendor it dispatches paints in composition, the merge lands, and a merged value from each of Gmail, Calendar, Linear and GitHub is clicked.
2. The entity join, "what's the status of what I'm working on?": the table lands, and a Linear value and a CircleCI value are clicked.
3. "Put my inbox and my calendar side by side.", then "compare these": the two Material 3 catalogs on one page, then merged.
4. Each vendor's drill-downs and one action each — a Gmail thread, a Calendar event, a Linear issue, a CircleCI run and job — each drawn in its vocabulary, the merge following the step and still navigating.

The fault cases of the Phase 8 and Phase 9 acceptance runs stay with the Playwright replay.

### 7. The pass bar for a merged value's navigation

A click passes when the ring lands on the element showing the value, or on its row or card when the vendor does not draw that field. A landing on the fragment boundary or the vendor's slot fails and is fixed on the spot. Which fallback step fired is read from the DOM.

### 8. Worked directly on `main`

The platform's code is worked directly on `main`: no worktree, no plan.

### 9. The record

This spec is the record. Each on-the-spot fix is added as a numbered decision as it lands. The write-up at the end carries each case's evidence with the landing step of each clicked value, the Playwright diffs against the Phase 9 baselines named, what the retaken baselines changed, the collision detector's `@font-face` rule, and the placeholder backlog entry.

## Invariants

- Composition keeps working over the new catalogs: merges still land, and a merged value still navigates to its element in the vendor's fragment.
