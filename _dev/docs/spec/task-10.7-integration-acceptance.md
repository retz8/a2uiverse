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

### 10. Beat 9 re-recorded over the deterministic roster; beat 5's test to four vendors

The Playwright run against the Phase 9 baselines failed three behavioural assertions, all from two beats re-recorded over the stub agents in 10.4 and 10.5. Beat 9, the entity join, carried the stub GitHub's `a2ui-project/a2ui` pull requests, so no pull request joined a Linear issue, one row tied to its CircleCI run by a judged relation drew its five cells guessed, and the page too short for the condensed bar's 400 px scroll. Beat 9 is re-recorded over the deterministic roster, its bed before 10.5, so its entity join carries GitHub's join again; 10.8 records it once more with the README's GIF. Beat 5, the temporal merge, dispatched Linear beside Gmail, Calendar and GitHub; its test takes the four vendors the recording holds.

### 11. Gmail's and Linear's times carry their zone, fixed before the live run

The Playwright run showed Gmail's and Linear's times four hours late in the merged view. Their payloads carry UTC; since 10.4 and 10.5 their agents write the time zoneless — Gmail `2026-09-05 01:24`, Linear `Sep 19, 2026, 11:00 AM` — and the runtime reads a zoneless time as wall time in US Eastern. Each agent keeps its own spelling and appends `UTC` — Gmail `2026-09-12 09:41 UTC`, Linear `Sep 19, 2026, 11:00 AM UTC` — the model writing it as its brand guidance and knowledge examples show. Both agents' beats are re-recorded, their deterministic corpora derived again, and the client's beats holding a Gmail or Linear paint re-recorded, before the live run.

### 12. A narrow Linear list keeps the title's line

In a quarter-width slot Linear's row gave its title 129 px of 416: the trailing chip, link and time held up to 35% of the row. Under a list width of 720 px, measured by a container query on Linear's own list, every row takes the same three lines: the leading items and the title, then the chip and the link, the link taking what the chip leaves and cut only at the row's edge, then the time. A wider list keeps the one-line row. Replaced: one line at every width, each trailing item capped at 220 px.

### 13. 24px between the canvas's regions

The shell's layout spaces the merged view and the fragments, and the fragments from each other, 24px apart, and the trail's preview of a canvas with it. Replaced: 32px.

### 14. A linked catalog shares the client's React

A catalog linked from `a2uiverse-apps` to work on it locally resolved React and the A2UI runtime from its own `node_modules`, and the page failed to render with two copies of React. The client's Vite config dedupes `react`, `react-dom`, `@a2ui/react` and `@a2ui/web_core`, as it did in the `link:` era before the catalogs became git dependencies.

### 15. A step back restores a component whose own prop is named `type`

Stepping Linear back from an issue to its list drew every row's `StatusIcon` as an unknown component. The client's copy of a paint was built from web_core's `componentTree`, which spreads a component's properties over its type, so `StatusIcon`'s own `type` prop replaced its name. The copy is taken from the model's type and properties.

### 16. CircleCI's run rows align to their first line

A run row whose branch wraps kept its status and repository centred against the wrapped lines. The agent paints its run rows with `align: "start"`, as its knowledge example shows. It changes what the agent sends and is handled after the run, with CircleCI's beats re-recorded, its corpus derived again and the client's beats holding a CircleCI paint re-recorded. Replaced: `align: "center"`.

### 17. A landing scrolls the page, never the app

After a landing on a value low on the page, the whole canvas sat shifted up and the question bar left the top. Each slot's hidden announcement is absolutely positioned; the page's scroll container was not its containing block, so where the slots start below the fold it stretched the body past the viewport, and the landing's `scrollIntoView` scrolled the body. The page's scroll container is the containing block of what is positioned inside it. The navigation spec checks, over the temporal merge, that the body holds no overflow and stays unscrolled after a landing.

## Evidence

The deterministic roster through the tunnel, the Planner and the Synthesizer on `gemini-3.7-flash`, on 2026-09-27. A landing is named by what took the focus: the element bound to the value, its row, the fragment boundary or the slot.

- **Case 1 — the temporal merge.** Google Calendar, Gmail, GitHub and Linear painted and joined. Times read in US Eastern once decision 11 landed: Linear's A2U-5 at 7:00 AM (11:00 UTC), Gmail's first thread at Sep 4, 8:20 PM (`2026-09-05 00:20 UTC`). Calendar paints clock-only times, which the runtime reads as text, so the merged view gave them a section of their own. Landings, every one on the element: Linear's title (`lc-text`), GitHub's title (Primer text), Gmail's subject (`gm-text`), Calendar's "Design review — agenda surface" and "Budget sync" (`gc-text`).
- **Case 2 — the entity join.** Linear, GitHub and CircleCI joined; A2U-5 and A2U-6 carry `retz8/a2uiverse#6` and `#7` and Success. Landings: A2U-5's id and its status on Linear's row (Linear draws the status as an icon); `#6` on the pull request's row in Primer's list (GitHub draws `retz8/a2uiverse#6`); A2U-5's and A2U-6's CI on the `Success` badge of the run on each one's branch; Sep 18, 7:53 AM on Linear's `Sep 18, 2026, 11:53 AM UTC`.
- **Case 3 — side by side, then "compare these".** Gmail and Calendar painted side by side with no merge; "compare these" joined them into a Calendar section and a Gmail section. Landings, every one on the element: Calendar's "Budget sync" and "11:00 – 12:00", Gmail's subject, and the sender on Gmail's avatar, the first element bound to it.
- **Case 4 — each vendor's drill-downs and one action.** Gmail: a thread opened, then Archive, answered by the labels view. Calendar: an event opened, drawn with its room, notes and guests' RSVP badges; it paints no action. Linear: A2U-5 opened; it paints no action. CircleCI: a run opened, then its failed job, then "Rerun from failed", then "Keep as is", answered "Nothing was rerun." The merge followed every step. Landings after the steps, every one on the element: the thread's `2026-09-05 01:24 UTC`, Linear's activity time and title, Calendar's "Today, 11:00 – 12:00" and title. The body stayed unscrolled through every landing once decision 17 landed.
- **The Playwright suite before the live run.** Against the Phase 9 baselines, 56 of 71 passed. Three assertions failed on two beats re-recorded over the stub agents (decision 10). The 13 screenshot diffs, each named: every vendor fragment drawn in its new vocabulary; the merged view's wording, re-authored in the re-recorded beats ("Active work items" became "In-progress work", "CI status" became "CI", Gmail's "From" and "Subject" became "Summary"); Linear's and Gmail's times four hours late (decision 11). No diff fell outside a vendor's fragment and the merged view's content.
- **The Playwright suite after the fixes.** Against the same baselines, 39 passed and 33 differed, every one a screenshot. The first run's 13 again, the fragments now carrying decisions 12 and 16. Twenty more, each under 1% of the page: the 24px spacing between regions (decision 13) — the platform answer's table and "Manage apps" 8px higher, the storefronts beside the merged view 8px to the left, beat 1's GitHub fragment 8px higher. The baselines were retaken: 72 of 72 pass.
- **The collision detector over `@font-face`** (decision 4). It reads seven declared families across the installed catalogs — `gmail-catalog-sans`, `calendar-catalog-sans`, `linear-catalog-inter`, `circleci-catalog-inter` and the shell catalog's three Radix families — none declared twice.
- **Pins.** The client's `linear-catalog` at `a2uiverse-apps` `f77517b`; Gmail's, Calendar's and CircleCI's catalogs unchanged at `da30bbc`, their agents changed only.

## Findings not fixed

- **The streaming placeholders** (decision 5) — the backlog entry in `_dev/TODO.md`, widened to all five vendor catalogs.
- **Deterministic mode promotes no question.** The corpus drops `paintMeta`, so CircleCI's rerun proposal landed with no ring and no scrim; the recorded beats keep it — a backlog entry.
- **Gmail's "Draft a reply" is not answered in deterministic mode** — a backlog entry.
- **The deterministic agents open one fixture whichever row is clicked** — Gmail's thread, Calendar's event, Linear's A2U-5, CircleCI's run; their fixture sets.
- **web_core's `componentTree` lets a `type` prop replace the component's type** — worked around in the client (decision 15), recorded upstream as `_dev/a2ui-findings.md` finding 11.

## Invariants

- Composition keeps working over the new catalogs: merges still land, and a merged value still navigates to its element in the vendor's fragment.
