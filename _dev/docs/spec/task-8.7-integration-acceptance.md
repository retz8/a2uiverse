# Task 8.7 — Integration + acceptance

Spec for sub-task 8.7 of Phase 8 (`_dev/docs/spec/phase-8-late-arrival-failure.md`): the phase's acceptance run — every late-arrival and failure case seen working end to end, live through the tunnel, with the reader's UX and design review of the failure vocabulary folded into the run. Phase decisions 1–13 and the phase's first invariant; task 8.6 decision 6; task 7.9's run as the pattern.

## Scope

- The beds each case runs on, and the deadlines each bed runs under.
- The cases the fault map cannot reach, and how each is shown.
- The tour: its order, how each case is reviewed, and how a UX or design point raised during it is handled.
- The two findings task 8.6 left.
- The one-automatic-synthesis invariant, observed in the journal.
- A clean regression pass.
- The live subset.
- The visual baselines: the new late-failure spec's taken, the existing ones retaken.
- Where the code is worked; outward actions; the shell catalog's design-check fixture.
- The write-up and the doc amendments.

## Locked decisions

### 1. The deterministic roster is the review bed; the live vendors prove timing

Every case runs once on the deterministic roster through the tunnel, the fault map provoking it. The live vendors run a subset of four cases: the soft deadline releasing the pack, a late arrival then Include, the hard cap waited out with an answer held past it and drawn by Retry, and a new utterance ending the turn with a dispatch still running — the vendor's log showing A2A's cancel arrive. Every other case lives on the deterministic bed only. The mock storefronts get no pass of their own beyond decision 3.

### 2. Deadlines per bed

The deterministic bed runs a shortened hard cap for the cases that need the cap, the soft deadline at its default. The live bed runs both defaults, the 300 s cap waited out once. The write-up names the cap each sitting ran under.

### 3. The cases the fault map cannot reach

The decline, and Include after it, are provoked live on the mock storefronts' pinned decline utterance from Phase 4, with a delay fault on one storefront so a source arrives after the decline. Try again and the failed fold-in are not provoked live: their synthetic beats are replayed through the tunnel, and the write-up says so. No fault is added for the Synthesizer's call.

*Amended during the run.* The mock roster has two storefronts, and among two peers a merge is possible only once both have arrived, so a delayed storefront holds the merge and is declined with the other rather than arriving after the decline. The decline is provoked live on the mocks with "Compare camera prices and shipping costs across both shops"; Include after a decline joins Try again and the failed fold-in on the synthetic beats replayed through the tunnel.

### 4. The soft deadline live

The soft deadline is first left to fire on its own over the entity join with no fault. If every source settles inside it, a delay fault on one peer provokes it, and the write-up says which happened.

### 5. The tour, one case at a time, watched live

Each case is its own orchestrator boot with that case's faults and deadlines. The reader watches the controlled browser as each case runs. The run stops after each case and moves on when the reader says so.

### 6. A point raised during the tour is fixed at once

A UX or design point the reader raises is fixed on the spot, shown in the same case, and the tour moves on. A point that changes one member of a shared vocabulary — a collapse line, the failure tile, the Include row, the progress line, the reserved column — is applied to its siblings at once, and the sibling cases show it when their turn comes. Each point becomes a numbered decision in this spec with what it replaced. A case found breaking a locked decision is a defect, fixed like any other.

### 7. The two findings task 8.6 left

The progress line naming, among what it found nothing to join, a source that arrived after the decline and waits for Include is a defect against phase decision 12, fixed before the sittings start, with a test. The status strip's sticky "Part of this response could not be displayed" beside a failure tile for a paint the client reported is a question of which surface speaks, judged during the invalid-paint case.

### 8. The invariant is read from the journal

After each sitting the journal's synthesis records are tabulated per turn in the write-up, by what released each: settled, the soft deadline or the home source landing as the automatic kind; Include, Retry, Try again or the walk after a press inside a fragment as the pressed kind. A turn showing a second automatic release is a defect. No tooling is committed for this; if the tabulation proves tedious, a script is promoted in-session and the write-up says so.

### 9. Baselines taken once, at the end

The late-failure visual spec's baselines are taken, and the existing ones retaken, once, after the tour's design changes have landed. Each diff is read and named to a design decision or to rendering drift. No tolerance is added to the comparison. The gate before the sittings is `pnpm verify` and the Playwright specs that are not visual comparisons; the visual ones are known red until the end.

### 10. Worked on `main`

The code is worked directly on `main`, no worktree, the gate green at each commit.

### 11. The order of work

The progress-line fix of decision 7. Then the twelve cases on the deterministic bed, in this order: a fast failure and Retry; the hard cap and the held answer drawn by Retry; the Retry race; a late arrival then Include; the home source waiting under the join; the home source failing and the merge collapsing with no call; fewer than two sources arriving; an invalid paint reported by the client; a half-drawn fragment failing; the decline and Include after it; Try again and the failed fold-in as replayed beats; a new utterance ending the turn with presses in flight. Then the regression pass of decision 12. Then the four live cases of decision 1. Then the baselines. Then the write-up.

### 12. A clean regression pass

With no fault map, one utterance each on the deterministic bed: the entity join landing, the temporal merge, a single-agent turn, the platform question, and the mock storefronts composing.

### 13. Outward actions

None. The live sittings only read from the vendors. A write needed to reach a case is asked first, one case at a time. The reader sets the client and orchestrator ports public at the start of each sitting.

### 14. The design-check fixture follows the catalog

The shell catalog's design-check fixture is updated in the same session as any catalog change a design decision makes.

### 15. The write-up and the doc amendments

This spec gains: the design decisions made during the tour, numbered, each with what it replaced; found and fixed during the run, each with its case and its test; evidence per case, including the journal table of decision 8; findings not fixed. The TODO's 8.7 line is rewritten to this scope; 8.8's line accumulates what it is to record. The phase spec is amended only where a decision made during the run changes one of its locked decisions, marked as amended during the run; SPEC and its §14 delta register likewise where a design decision adds or changes a convention. The design records stay with 8.8, which reads this write-up.

## The look, decided during the run

Raised by the reader on the tour, each fixed on the spot and shown in its case (decision 6). Design decisions, not findings.

### 16. The status strip's text starts on Back's left edge

The strip is chrome, on the same level as Back, not content. Its text — the app's name, and the sticky error in its place — starts on Back's left edge, 12px in, not on the content column. Raised on case 1.

### 17. The failure tile is one statement, then Retry

The tile under a failed source's attribution marker draws one statement at body size in ink, then Retry. The statement is the vendor's own words when it spoke; otherwise the client's reason for the painted cause, with no name in it, since the marker above already says whose the tile is: "Couldn't be reached.", "No answer within the time allowed.", "Answered, but its screen couldn't be shown.", and "Couldn't answer." when the vendor ended without a word or no cause was painted. No client line above the words, no heading naming the vendor, and the plan's noun for the source is no longer said on the tile — the reserved column's header and the progress line's clause already say it. Amends phase decisions 7 and 8 and the delta register's failure-tile row. Raised on case 1: the name appeared four times in five lines.

### 18. The attribution marker never says "Painted by"

Full attribution on hover or focus is the app's name and its account label when one is in play. With no account, the hover adds nothing over the resting marker, so it only brightens; the marker's text and accessible name are the name alone, or "name · account". The info glyph stays: it is what tells the marker apart from a vendor's own caption. Raised on case 1.

### 19. The pending slot is a spinner and "Loading…"

A fragment slot waiting for its source, before the first answer or again from Retry, draws a small spinner and "Loading…" in the quiet register, naming nobody: the attribution marker above it says whose the slot is. Raised on case 2: the line read "Gmail…" directly under a marker reading "Gmail".

### 20. The merge step says what the client knows before the view lands

The orchestrator paints nothing when the soft deadline releases the synthesis, so the step never claims to know whether a straggler will make it. With nothing arrived yet it reads "Joining …" over the plan, one short sentence. From the first arrival until a merge is possible — two sources arrived, the home source among them under a join — it reads "Waiting for X and Y, then joining", the sources still awaited in slot order, a failed one not among them. From then it reads "Joining A, B and C" over the arrived sources, then one clause per source not yet in: "X still loading", or for a failed one "no X to join" with a noun and "without X" without, the same clauses the landed form carries. Amends task 8.5 decision 11's first two rows. Raised on case 2: the step read "Joining Google Calendar, Gmail, GitHub and Linear" while the merge was being made over three.

### 21. A press line that asks for a press is the view's action

A row that carries a press — the late sources' line with Include, a failed fold-in with Include again, a view that couldn't be updated or made with Try again, a decline's late sources with Include — reads at body size in ink with a soft accent button named for its object: "Include Gmail" for one source, "Include all" for several. A row that only tells, the working sentence and the decline's reason, stays at caption size in the quiet register. The late line says what the reader needs, not the mechanism: "Gmail answered after this view was made.", and the progress line's clause "Gmail not in this view yet". The absorb stays on request: case 4 showed the fold-in rebuilding the view, a change the reader should choose, not have happen under them. Amends task 8.5 decision 6's wording and decision 11's late-arrival clause. Raised on case 4: the row read as a footnote when it was the one thing left to do.

### 22. The condensed bar keeps the progress line

Once the header has scrolled away, the one-line bar at the top edge carries the question and the progress line whenever the full header carries one, landed as well as running — "Joined … · Gmail not in this view yet" stays in view as the reader scrolls. It had dropped the line the moment the turn was over. SPEC §4.3's sentence and task 8.5 decision 11's compact-bar sentence follow. Raised on case 4, scrolling after Include.

### 23. A merge collapsed on its home source carries that source's Retry on the line

The collapse line for a failed home source reads for the reader, "The merged view needs Linear issues, which didn't load.", and is an action row under decision 21: it carries "Retry Linear", the same Retry operation the home source's tile carries, so the two buttons are one press drawn in sync. Pressed from either, the line becomes "Waiting for Linear, then merging…" at once and the tile its loading line. The other collapse lines keep their register: "Only GitHub answered, so there's nothing to merge." tells, since Retry is per source and each failed source has its tile; the decline's reason stays the Synthesizer's, quiet. The progress line's step keeps "Can't join without Linear issues" as its status vocabulary. Amends phase decision 12's one-line rule to the extent that the line carries a press, and task 8.5 decision 7. Raised on case 6: a first-time reader saw a table's skeleton vanish into a grey line in the shell's own words, the button that restores it on another slot.

### 24. A merge collapsed for too few sources carries Retry all

The collapse line for fewer than two sources reads for the reader, "The merged view needs at least two sources, and only GitHub answered.", or "… and none answered.", and is an action row: it carries "Retry all" over every dispatched source that did not arrive, or "Retry Gmail" when there is one. The orchestrator paints those sources by id on the collapse fact beside who answered, a delta-register amendment to the collapse-cause row. Retry stays a one-slot operation (phase decision 10): the client sends a line's Retry over several sources as one Retry per source, each on its own stream, so every tile's Retry gives way at once and the line reads "Waiting for Gmail, Google Calendar and Linear, then merging…"; the first arrival makes the merge and later ones fold in, by 8.4's rule. A source the bed refuses fails again on its tile, the honest outcome. Amends task 8.5 decision 7. Raised on case 7.

### 25. An undrawable paint is out of the merge before the merge is made

The orchestrator marks the end of each fragment source's stream: one event after the source's last, carrying no A2UI parts, its stamp saying the source is settled — an optional field of the composition stamp, contract v0.7, a delta-register addition. The client judges that source's fragments there, not at the turn's end, so a paint the canvas cannot draw is reported one round trip after the source's stream ends. Because the merge is released the instant the last source settles, the report can still arrive while the merge is being made: a source the merge reads that is reported undrawable then throws that merge away, and it is made again once over the set without it, journaled as thrown away. Amends task 8.10 decision 5 for that case; a failure after the merge has landed keeps its rule. Found on case 8: the merge landed over GitHub's data and the report, at the turn's end 22 s later, left eight rows of dashes.

### 26. The strip does not carry a fragment's failure

The status strip's sticky line is not lit by a fragment's validation failure or structural failure: the tile in that source's slot says it, in the reader's words, and the validator's message goes to the console. The strip keeps its line for a failure no slot carries. Closes the second finding task 8.6 left. Raised on case 8.

### 27. The decline's reason reads in ink, with no press

The decline's reason, the Synthesizer's words and the one line on the canvas that is not the client's, is the whole answer to the merge the reader was promised, so it reads at body size in ink where the view was — not in the quiet register of an aside. It carries no press: Include only applies to a source arriving later, Try again to a view a failed call could not make, and a second call over the same answers would mostly decline again; the reader's next move is to ask differently, which the question header offers. The late sources' Include row stands under it as decision 21 has it; the working and waiting sentences stay quiet. Raised on case 10.

### 28. The progress line takes no room when it has nothing to say

On a platform answer, with no vendor dispatched and no merge, the progress line is not drawn at all, so the question header sits flush over the answer; it had kept its 20px and its margin empty. Raised on case 12.

### 29. A table's first column reads on one line; a table that cannot fit scrolls in its slot

The shell catalog's Table names the row's own thing in its first column, so that column's cells never wrap; every other column wraps, capped at 56 characters so one long-text column cannot take the width from the rest, with 8px above and below so a wrapped cell keeps clear of its dividers. A table that still cannot fit its slot scrolls sideways inside the slot rather than crushing a column. Raised on case 12: the platform's apps table folded "Google Calendar" onto two lines while its description column took the width.

### 30. The join hypothesis names its kind: anchored or union

The Planner's join hypothesis is one of two kinds. Anchored, as Phase 7 built it: `home` is one dispatched source whose instances are the rows, stated when the question owns the entities through one source — "my cameras", "issues assigned to me". Union: `home` is null and `entity` names the thing the rows are, stated when the question ranges over all of them — "all cameras across the stores", "which cameras are cheapest across the shops"; its rows are every instance any source lists, the same thing across sources merged into one row by a match claim, an unmatched entry a row of its own, a source that lacks the thing the empty cell. The Synthesizer's brief carries both row rules; a union declines only when no source brought an instance. The home-source exemption and the home collapse do not apply to a union, which the trigger treats as peers. The progress line reads "Joining cameras across Aperture & Co, Northlight and Fieldstone" for a union. SPEC §10 and phase 7 decision 7 follow. Found on case 11: the union already happened unnamed — every mock comparison was planned with no hypothesis and the Synthesizer still merged the shared cameras by `equal` claims — while the Planner's rule pushed any recurring entity toward a home.

### 31. A heartbeat on every open stream, and the lost turn said in the client's words

An open turn or press stream that has sent nothing for 30 s sends an empty working event — no parts, no stamp, nothing the client paints — so bytes keep flowing while the turn waits on a slow source or the hard cap; the interval is `A2UIVERSE_HEARTBEAT_SECONDS`, 30 by default. A turn that answered and then lost its stream is said on the strip in the client's words, "Lost the connection to A2UIVerse. Ask again to see where this stands.", the same sentence a press uses; one that never reached the orchestrator, "That didn't reach A2UIVerse. Ask again."; the browser's own error text goes to the console. Found on the live cap: the dev tunnel cuts a silent response at 100 s, the same limit 7.9 measured on requests with no first event, so the shipped 300 s cap could not be survived through it — the merge landed at 60 s, the stream died at 160 s, and the cap at 300 s painted into a stream nobody read, the strip saying "The agent request failed. network error" while Calendar's slot still read "Loading…".

## Found and fixed during the run

Each surfaced by a sitting; fixed in the same session, with tests.

- **The progress line after a decline named a late source among what found nothing to join** (task 8.6's first finding). Fixed before the sittings: the sentence runs over the sources the decline was made over, a source that answered since said in its own clause.
- **The Synthesizer wrote the Table's column marks as surface ids.** Twice on the deterministic roster it marked a column "linear:linear-9" where the check wants "linear", the prompt listing every source by its surface; the retry then failed the merge as unmade. A mark that is a surface id of a source in the composition is taken as that source and rewritten before the check. Case 5.
- **An undrawable paint reached the merge.** Reported at the turn's end, 22 s after the source's stream ended, so the merge was made over the source's data and then lost it to rows of dashes. Decisions 25 and 26. Case 8.
- **The tunnel cut a silent turn at 100 s.** Decision 31. The live cap.
- **A Retry's re-dispatch outlived its composition.** After the race was decided the re-dispatch's abort listener was dropped, so a new utterance ended the turn's own dispatches but left the retry's listening past its cap. It stays the composition's to end until it drains; a new utterance now cancels both, the log showing the turn's Gmail dispatch cancelled at 31 s and the Retry's at 2.7 s in. Case 12.

## Evidence

Deterministic bed: the real roster in deterministic mode through the tunnel, the orchestrator booted per case with the case's faults, the hard cap 15 s where a case needed it and 300 s otherwise, the soft deadline 10 s throughout. Live bed: the real roster in live mode, both deadlines at their defaults. Every case watched in the controlled browser by the reader.

- **Case 1, a fast failure and Retry.** Calendar failed 2 ms in with the vendor's words; the merge landed over the three that arrived, "without Google Calendar"; Retry drew Calendar's fragment within 10 s and the fold-in landed with Calendar as a second group, the Synthesizer's note saying its times carry no date.
- **Case 2, the cap and the held answer.** Under a 15 s cap with Gmail delayed 20 s: the soft deadline landed the merge without Gmail; the tile at the cap, "No answer within the time allowed."; the answer arriving 5 s later held, the tile unchanged; Retry drew it, the log saying "held answer drawn", no re-dispatch; the fold-in landed with Gmail's rows.
- **Case 3, the Retry race.** Gmail delayed 90 s under the 15 s cap: Retry pressed with nothing held; the re-dispatch completed in 8 ms and the capped dispatch was cancelled at 30 s; the merge, released before the press and still in the making, landed without Gmail and the fold-in followed as one call.
- **Case 4, a late arrival then Include.** Gmail delayed 25 s under the default cap arrived after the view had landed by the soft deadline, mounted free, the row and Include above the label; the fold-in took 20 s and rebuilt the view with Gmail's eight threads on the timeline.
- **Case 5, the home source waiting.** Linear delayed 20 s on the entity join: the skeleton with Linear's columns marked loading, "Waiting for Linear issues, then joining", no release until Linear landed at 20 s, then "home"; the view landed with three rows once the column-mark fix was in (found and fixed, below); before it, the collapse as "couldn't be made" and Try again making the view.
- **Case 6, the home source failing.** Linear failed 2 ms in; the merge collapsed at once with no call, zero attempts in the journal; Retry from the line or the tile brought it back, the view landing 12 s after the press.
- **Case 7, fewer than two sources.** Gmail failing and Calendar, Linear and CircleCI refused: the collapse with no call; Retry all sent three Retries, Calendar's arrival made the merge over two, Gmail and Linear folded in together as one call, the journal showing both entries sharing one synthesis.
- **Case 8, an undrawable paint.** GitHub's paint made invalid: before the fix the merge was made over GitHub's data and the report, at the turn's end 22 s later, left eight rows of dashes; after decisions 25 and 26 the report arrived a round trip after GitHub's stream ended, the merge in the making was thrown away and made again without it, the view landed with no trace of GitHub, the tile "Answered, but its screen couldn't be shown.", the strip clean.
- **Case 9, a half-drawn fragment.** GitHub's stream broken after its first paint: the slot went from loading to "Couldn't be reached.", the half-drawn fragment never shown, the merge over the other three with no trace of GitHub.
- **Case 10, the decline and Include after it.** Live on the mocks, "Compare camera prices and shipping costs across both shops" declined in one call, the reason in ink where the view was; Include after a decline on the synthetic beat through the tunnel, the press firing at its recorded time and the merge made over all three stores (decision 3, amended).
- **Case 11, Try again and the failed fold-in.** Both on their synthetic beats through the tunnel: "The merged view couldn't be made." with Try again, the press making the view; the reserved column "Fieldstone · not included" with empty cells, the failed fold-in leaving the view as it was with "Couldn't include Fieldstone." and Include again.
- **Case 12, a new utterance ending the turn.** Gmail delayed 90 s on every dispatch under a 15 s cap, Retry pressed at the cap, a new question 3 s later: both Gmail dispatches cancelled, the turn's at 31 s of listening past its cap and the Retry's at 2.7 s in (the second only after the fix below); the old composition's buttons disabled under the new question, the platform answer landing flush under its header.
- **Regression, no faults.** The entity join anchored over three sources, the temporal merge over four, a single-agent turn to CircleCI alone, the platform answer with no dispatch, one call or none each; the mocks composing on the union question and declining on the policy one.
- **Live, the soft deadline and a late arrival.** On the entity join with no fault: Linear settled at 28 s, CircleCI at 33 s, the soft deadline released the merge 10 s after CircleCI over the two; GitHub's first paint reached the orchestrator 0.3 s before the release but its stream ran until 75 s, so it arrived after the view and was offered; Include folded it in, the reserved Pull Request column filling in place, nothing moving.
- **Live, the cancel.** A new question 9.9 s into the entity join: Linear and GitHub cancelled, the orchestrator's cancel sent to both, both vendors' logs showing the agent kit cancelling the running task.
- **Live, the cap waited out.** Calendar delayed 330 s under the 300 s cap on the "today" prompt. The first attempt died at 160 s: the tunnel cut the silent stream at 100 s after the merge landed (decision 31). The second, with the heartbeat, held for the full five minutes with the strip clean: the tile at 300 s, Retry pressed 1.9 s before the answer arrived, the original's answer winning the race and drawn as the held answer, the re-dispatch cancelled with A2A's cancel to the live vendor, the fold-in landing with Calendar's four events on the timeline.
- **Gates.** `pnpm verify` green at every commit; the repository typecheck green; Playwright's behavioural specs green, the visual baselines — local files, ignored by git as before — taken once at the end (decision 9), 60 of 60 green against them, each diff read first: the strip's text moving to Back's edge in every page baseline, the tile, the marker, the press rows, the table's first column and the reserved column where those changed.

### The invariant, from the journal

Every utterance turn's synthesis released by settled, the soft deadline or the home source at most once; every other call with a press behind it.

| Case | Utterance turn | Further calls |
|---|---|---|
| 1 | settled | retry |
| 2 | soft deadline | retry |
| 3 | soft deadline | retry |
| 4 | soft deadline | include |
| 5 | home, malformed twice, then home once after the fix | tryAgain |
| 6 | none, collapsed on the home source | retry |
| 7 | none, collapsed for too few | retry (the merge), retry × 2 (one fold-in shared) |
| 8 | settled, then thrown away and made again once (decision 25) | — |
| 9 | settled | — |
| 10 | settled, declined | — |
| 12 | soft deadline | retry, ended by the new utterance |
| Regression | settled × 2, none × 2 | — |
| Live soft deadline | soft deadline | include |
| Live cap | soft deadline | retry |

## Findings, not fixed

- **A request through the tunnel is still sometimes lost.** Three utterances in the sittings showed "Planning" for 14 s where the orchestrator saw the message once, 4–7 s after it was typed: the first send lost, the 10 s resend from 7.9 landing. Two page loads through the tunnel rendered nothing until a reload. 7.9's finding, unchanged.

- **The layout has no narrow-width rule.** The Planner's `Row` of slots is a flex row with weights that never wraps, and nothing in SPEC or the 7.14 design canvas sets a breakpoint, so on a narrow canvas the fragments share the width however narrow it gets. The rule that fits the design is a container query on the stage: below a width, a `Row` of slots stacks into a column in slot order, each fragment full width. It touches the shell catalog's `Row`, the reserved slots' floors and the design canvas, and is its own design pass with the canvas redrawn narrow. Raised on case 12 over the apps table.


## Invariants

- Live verification drives tunnel URLs, never localhost.
- The vendor agents are unmodified.
- One automatic synthesis per turn; every further Synthesizer call has a press behind it.
