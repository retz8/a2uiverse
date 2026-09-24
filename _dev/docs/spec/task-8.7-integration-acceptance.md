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

The orchestrator paints nothing when the soft deadline releases the synthesis, so the step never claims to know whether a straggler will make it. Until a merge is possible — two sources arrived, the home source among them under a join — it reads "Waiting for X and Y, then joining", the sources still awaited in slot order, a failed one not among them. From then it reads "Joining A, B and C" over the arrived sources, then one clause per source not yet in: "X still loading", or for a failed one "no X to join" with a noun and "without X" without, the same clauses the landed form carries. Amends task 8.5 decision 11's first two rows. Raised on case 2: the step read "Joining Google Calendar, Gmail, GitHub and Linear" while the merge was being made over three.

### 21. A press line that asks for a press is the view's action

A row that carries a press — the late sources' line with Include, a failed fold-in with Include again, a view that couldn't be updated or made with Try again, a decline's late sources with Include — reads at body size in ink with a soft accent button named for its object: "Include Gmail" for one source, "Include all" for several. A row that only tells, the working sentence and the decline's reason, stays at caption size in the quiet register. The late line says what the reader needs, not the mechanism: "Gmail answered after this view was made.", and the progress line's clause "Gmail not in this view yet". The absorb stays on request: case 4 showed the fold-in rebuilding the view, a change the reader should choose, not have happen under them. Amends task 8.5 decision 6's wording and decision 11's late-arrival clause. Raised on case 4: the row read as a footnote when it was the one thing left to do.

### 22. The condensed bar keeps the progress line

Once the header has scrolled away, the one-line bar at the top edge carries the question and the progress line whenever the full header carries one, landed as well as running — "Joined … · Gmail not in this view yet" stays in view as the reader scrolls. It had dropped the line the moment the turn was over. SPEC §4.3's sentence and task 8.5 decision 11's compact-bar sentence follow. Raised on case 4, scrolling after Include.

## Invariants

- Live verification drives tunnel URLs, never localhost.
- The vendor agents are unmodified.
- One automatic synthesis per turn; every further Synthesizer call has a press behind it.
