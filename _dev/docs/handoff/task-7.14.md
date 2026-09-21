# Handoff — task 7.14, UI/UX improvement

Not started; runs after 7.10. The session opens with a discussion of the review below, which decides what 7.14 takes up. Nothing in it is decided yet.

## The review

2026-09-21, after 7.9 closed. Two independent reviewers drove the built client over the replay beats and live utterances on the deterministic real roster: one on the flow of a turn (asking, waiting, reading, acting, navigating, going back), one on the visual language of a composed screen (several design systems on one page, the merged view, attribution, density, dark mode, width). Their screenshots were in a session scratchpad and are not kept.

State reviewed: nothing drawn around a fragment; a derived value's certainty as its own contrast; hover detail only on marked cells (7.9 decisions 21–25).

### Where the canvas breaks the spec's own promises

- **The merged view shoves the fragments down when it lands.** The reserved synthesis slot is one ~20px "Painting…" line; when the table arrives 10–20 s after the fragments, all of them jump ~200px while being read. SPEC §5's turn says nothing else moves when the synthesis paints; §4.5 reserves the slot only as a quiet pending marker, so the reservation holds no height. Both reviewers found it; confirmed on the live bed.
- **Dark mode makes GitHub's fragment unreadable.** Primer does not follow the shell into dark: dark gray text on near-black, light-mode chips. Calendar's dark cards are also low contrast in the temporal merge. Confirmed.
- **At 820px wide the merged table clips**, hiding the broken amber value — the one mark built to escalate. Fragments do not stack; Linear's timestamps spill out of its card.
- **The past-view banner covers content**: it clips the attribution caption and the heading beneath it.
- Unconfirmed: a tooltip on a guessed cell stayed open after the pointer left, blocking the cell above it. Possibly the capture tool's mouse.

### The question on screen

- After Enter the palette closes and the utterance moves to a 12px gray status strip. During the Planner's wait (10–12 s live) the canvas shows the same empty "A2UIVerse / ⌘K to ask" as before typing. After landing, the question is no longer on screen. The merge wait (10–20 s) says only "Painting…".
- Proposal, supported by both reviewers: the user's words, verbatim, become the canvas header from Enter until the next question. It gives the wait a subject, gives the capability tile's "No installed app can do this" its "this", and labels a parked composition in the timeline. The Planner stops restating the question in its framing (SPEC §5.6 allows "a restated question").
- Refinements offered: the model's title ("Active work status") becomes a label on the merged view under the header; clicking the header opens the palette pre-filled; the status strip reports progress only — a tick per source, the merge state.
- Also offered for the wait: the Router's shortlist shown faintly during the Planner's call; the merge wait naming the join hypothesis ("Joining Linear issues to GitHub PRs and CircleCI runs"), each part computed, not model-written.

### The merged view as the answer

- It mostly repeats the fragments. On the entity join recording (beat 9: Linear, GitHub, CircleCI and the merged table, four rows) "Pull Request" repeats each issue title and "Status" is "In Progress" in every row; the one fact that matters, A2U-8's failed build, is a plain word in the fifth column; the issue key is missing. The temporal merge (beat 5) paints two tables, and its "Source" column spells vendor names as text.
- Offered: a one-sentence lead line above the table ("1 of 4 is blocked: A2U-8's build failed"); constant and duplicated columns dropped; a semantic tone for words the user must act on (failed = red), apart from the certainty contrast; the merged view dominant — full width, display-size lead, space before the vendor band — and the fragments beneath as evidence. The lead line and the columns are the Synthesizer's, so these reach its rules.
- For the reflow above: reserve the table's height at plan time, drawing the planned column headers with no rows and streaming rows in. Relates to the backlog's item on streaming the synthesis fragment into its reserved slot.

### Smaller

- **Attribution captions** sit closer to what is above than to their own fragment: "ⓘ Linear" reads as a footnote to the merged table, and in beat 8 (one vendor slot and the shell's own words) the shell's table reads as the vendor's. Offered: about 32px above a caption, 8px below.
- **No way back after tapping a merged value**: the table scrolls away and the landed element is not linked to the row. Offered: a "back" pill or Esc to the row and scroll position, the row softly marked until return, or the table pinned while the fragment scrolls.
- **History**: back is a blind jump into a yellow-flooded past view; the banner never says which question, "Return to live" and "Repaint" read alike. Offered: a filmstrip of past canvases labelled with their questions, a desaturated parked state, "Repaint" renamed "Ask this again now". Relates to Phase 9.
- **The palette over a canvas** does not say whether it asks fresh, refines, or forks from a past view. Offered: the current question above the input, refinements suggested from the canvas, "Branching from 06:52 PM" when parked.
- **Failure** is said in three places — a top bubble, a 12px slot line, the status strip — none where the hole is; the empty-canvas mark shows through a failed paint. Offered: the failed slot says it in body size with a retry, the vendor's own words beneath.
- **A fragment asking a question** dims the whole canvas, the shell's own controls included, and outlines the asking fragment — the one outline left. Offered: dim only the other fragments; a shell line naming the asking app.
- **The capability tile** is the one box the shell still draws, 1400px wide with small text. Offered: no border, the ask echoed, a real call to action, two or three likely apps.
- **Certainty marks**: a guessed row grays its identity (the camera's name) and reads as disabled — soften only the values the guess carries; the broken value shows ⚠ twice; booleans show as "true"/"false"; the join beat stacks two "Sort by" controls with no sign of which list each sorts.

### Already good, by both

Fragments without a drawn boundary read as one page. Contrast as certainty reads without shouting. The hover wording on marked cells. The landing ring's precision. The shell's own question overlay.

### Bolder directions

- **Watch the join happen**: faint threads between matching entities across fragments (A2U-8 ↔ PR #8 ↔ its failed run) while the merge is worked out, firming as each match is confirmed, the table condensing out of them; a guessed match could be refused before it lands. Offered by both.
- **The question as a live, editable sentence**: edit it and only the affected parts re-plan; strike a vendor's name to drop the source, drag an app onto it to add one.
- **The shell as the only colourless voice**: strictly monochrome and typographic, so every colour on the page is a vendor's; a vendor hue used only in the shell's own marks as attribution.
- **History as a spatial trail**, forks visible where a question was asked from a past view.
