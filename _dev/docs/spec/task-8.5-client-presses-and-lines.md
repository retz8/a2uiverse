# Task 8.5 — Client: the presses, their lines, the progress line's states

The client's part of Phase 8 (`_dev/docs/spec/phase-8-late-arrival-failure.md`, decisions 4–12) and the drawing of task 8.4's presses (`_dev/docs/spec/task-8.4-orchestrator-include-retry.md`): Retry, Include and Try again sent and applied on the client, the lines and buttons drawn from the facts on the shell `Slot`, a failed source's data off the canvas, the reserved column's states, the progress line's states, the decline read from the paint. SPEC §4.3, §4.5, §5.3, §8, §14.

## Scope

- The three presses sent as the composition contract's operation, each on a stream of its own beside the turn, and what comes back applied.
- A failed source's fragment on the client.
- The press lines and buttons above a landed merged view and on a collapsed merge, composed in the shell catalog.
- What the reader sees from the click to the answer, and when a press goes wrong; presses in the planning gap and in a parked composition.
- The progress line's per-source ticks and merge step.
- The reserved column's states.
- How long the composition's states live on the client.
- The decline's prose copy removed from the orchestrator; the collapse's one move; the reader's view held still.
- Focus and announcements around a press.
- Verification; SPEC, phase spec, TODO, backlog, design records and READMEs.

## Locked decisions

### 1. A press is a stream of its own beside the turn

A press — Retry, Include or Try again — is sent as the composition contract's operation on a new message and answered on a stream of its own. It is not a turn: it lights no status strip, adds no history row, makes no timeline entry, and never cancels the turn in flight. What comes back is routed by the composition stamp exactly as a turn's batches are — a fragment placed into its slot, slot states and roster merged, the synthesis payload handed to the synthesis session — and applied progressively into the live composition. Several press streams may be open at once.

### 2. A new utterance ends every press stream

When the reader sends a new utterance, the client aborts every open press stream on the composition it replaces and drops whatever still arrives on them; no press is sent for that composition from then on. An action inside a vendor fragment ends none.

### 3. A failed source's fragment leaves the client

When a vendor slot is painted failed, on whichever stream carries the repaint, the client deletes that source's surfaces from the live processor and clears its placement: refs into it go absent, its cells stop navigating, a Retry press shows the pending slot, and a retried answer lands fresh. The fragment-failure report's answer is routed by the stamp, as a press stream is.

### 4. The press lines sit in a row above the merged view's label

Over a landed merged view, the shell draws its lines in a 24px row of its own directly above the view's label row, in the collapse line's geometry: caption size, the quiet register, the button inline at its end. The view moves down one row when a line appears and back when it clears.

### 5. The shell catalog composes the lines; one press handler

The shell catalog's `Slot` composes every press line from the facts painted on it, naming sources through the host's app-name lookup. One press handler on the catalog's options replaces `onRetry`, carrying the operation as the wire has it — its kind and its sources — beside the surface and the component. With no handler, no press button is drawn.

### 6. The row above a landed view

While a press's call runs, the row holds only the working sentence, with no button: "Including CircleCI…" when the call names sources, "Updating the merged view…" when it names none. Otherwise, in order:

| Standing | Line | Button |
|---|---|---|
| the last update's call failed | The merged view couldn't be updated. | Try again |
| late sources, every one of them in a failed Include | Couldn't include CircleCI. | Include again |
| late sources, some in a failed Include | Couldn't include CircleCI. Gmail arrived after this merge. | Include |
| late sources, no failed Include | CircleCI arrived after this merge. | Include |

Names are listed "A", "A and B", "A, B and C". Two rows stand only when "couldn't be updated" and a late line both hold. The working sentence carries a small spinner; each button is a size-1 gray outline. Include sends every late source; Try again sends none.

### 7. The lines on a collapsed merge

In order: while a press's call makes the merge, "Making the merged view…" with a spinner; while a Retry that could bring it back runs, "Waiting for CircleCI, then merging…" with a spinner; after a merge that couldn't be made, "The merged view couldn't be made." with Try again inline; otherwise the decline's reason or the cause's line, as today. Under a decline's line, when late sources wait and no call runs, a second 24px row: "CircleCI has answered since." with Include. A merge that couldn't be made offers Try again alone, which takes every arrived source.

### 8. From the click to the answer

At the click the client draws the pressed state the orchestrator is about to paint — Retry: the pending line and the source's tick working again; Include: "Including CircleCI…"; Try again: "Updating the merged view…" or "Making the merged view…". The pressed state is held in the client's store, read by the `Slot` and the progress line, and cleared when the painted facts catch up or the stream ends.

- A press that never reached the orchestrator brings the line and its button back, with "That didn't reach A2UIVerse." added in place.
- A refused press shows nothing; the painted state stands.
- A stream broken after it answered is replaced in place by "Lost the connection to A2UIVerse. Ask again to see where this stands."
- From a new utterance's send, the old composition's press buttons draw disabled, their lines standing.

### 9. Presses in a parked composition

A parked composition draws its press buttons disabled, its lines as captured.

### 10. The per-source ticks

A source's step is ✓ once it has arrived, a late arrival included; ✕ while painted failed; the spinner while painted pending with nothing placed, or while its own Retry is pressed or running, whether or not the turn is in flight. The compact bar shows the progress line while the turn or any press runs.

### 11. The merge step

Under a join the phrase is the home source's noun joined to the others' nouns; without one, the listed display names. No clause ends in a period.

| Situation | Merge step |
|---|---|
| sources still loading, no merge yet | Joining Linear issues to GitHub PRs and CircleCI runs |
| under a join, only the home source still loading | Waiting for Linear issues, then joining |
| landed over every source | Joined Linear issues to GitHub PRs and CircleCI runs |
| landed without some sources | Joined Linear issues to GitHub PRs, then one clause per missing source in slot order |
| — failed | · no CircleCI runs to join; with no noun, · without Google Calendar |
| — still loading | · CircleCI runs still loading |
| — arrived after, waiting for Include | · CircleCI runs arrived after this merge |
| — its Include failed | · couldn't include CircleCI runs |
| — being included | · including CircleCI runs |
| declined | Found nothing to join across Linear issues, GitHub PRs and CircleCI runs |
| collapsed, the home source failed | Can't join without Linear issues |
| collapsed, fewer than two arrived | Only GitHub answered, nothing to join / No app answered, nothing to join |
| collapsed, couldn't be made | Could not join Linear issues to GitHub PRs and CircleCI runs |
| collapsed, a Retry running that could bring it back | Waiting for CircleCI runs, then joining |
| a press making or updating the view | Joining, over the sources it makes the merge from |

A view that couldn't be updated leaves the merge step at "Joined …".

### 12. The reserved column

A column marked to a source reads:

| The source is… | Column |
|---|---|
| in the merge | the authored cells |
| painted failed | unavailable |
| still loading, or its Retry running | loading |
| being included | loading |
| arrived, waiting for Include, or its Include failed | not included |
| answered in words with no screen | the authored cells |

"Not included" is a new state in the shell catalog's slot-state resolver, beside loading and unavailable: the heading reads "CI build · not included" over the Synthesizer's dashes. The reserved merged view before the first merge reads its headings through the same resolver.

### 13. The composition's states live as long as the composition

The roster, each slot's painted state, the press facts and the pressed states are cleared when the composition is retired — the next utterance's plan replacing it — and kept across action turns. An action turn's working label shows on the progress line while it runs, beside the composition's ticks and merge step.

### 14. The decline from the paint; the collapse's one move

The orchestrator stops sending the decline's reason as prose: the decline is said once, in the collapse line; the merge slot never rests on prose; the progress line reads the painted decline. When the collapse, or a press row appearing or clearing, changes the height of what sits above the reader, the reader's view holds still: the browser's scroll anchoring on the canvas's scroller, checked, and the client's own compensation of the scroll offset where it does not apply.

### 15. Focus and announcements

When a pressed button goes, focus moves to the line that replaced it — the row's sentence or the tile's pending line; a button appearing later on that line does not take focus. "The merged view couldn't be updated.", "That didn't reach A2UIVerse." and "Lost the connection to A2UIVerse. Ask again to see where this stands." are announced politely from the `Slot`; every other change is announced by the progress line alone.

### 16. Verification

Tests in the client and the shell catalog; every new line and state on the shell catalog's design-check fixture page; a short live sanity pass through the tunnel with Claude-in-Chrome over the deterministic roster and the fault map — a fast failure then Retry, a late arrival then Include, a decline, the collapse while scrolled down, focus after a press.

### 17. SPEC, phase spec, TODO and records

- SPEC §5.3: the late arrival's line in the row above the merged view's label; Include offered under a decline's line only, a merge that couldn't be made offering Try again.
- SPEC §4.5 and the §14 reserved-column row: a column reads not included while its source waits for Include. The §14 Include and Try again row: Include after a decline only.
- The phase spec's decision 6: the row above the label; Include under a decline's line only.
- TODO: 8.5's line; Phase 9 — Retry, Include and Try again work on a parked composition, built there; the backlog — re-attaching a stream broken after it answered, through A2A's `tasks/resubscribe`, one design for the plan turn and the press streams.
- 8.5's done updates the client, shell-catalog and orchestrator design records for what it changes; 8.8 keeps `synthesis.md`'s trigger and decline and what 8.6 and 8.7 find.
- READMEs made untrue are updated with the code.

## Invariants

- Anything the canvas calls failed shows nowhere as data.
- Every line the shell draws is the client's words, except the vendor's words and the decline's reason.
- Nothing looks pressable that cannot be pressed.
- Every press outcome is announced once.
