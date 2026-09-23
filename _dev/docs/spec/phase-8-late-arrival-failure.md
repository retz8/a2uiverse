# Phase 8 — Late arrival + failure

Late arrival and failure (M6): per-source deadlines, the failure tile, decline, and a late source absorbed into the merged view on request. The failure tile is board F6 of the 7.14 design canvas (https://claude.ai/artifact/W324EkZXFze2CxddzNve1o). The declined merge's collapse is the item task 7.15 carried here. SPEC §4.5, §5.1, §5.2, §5.3, §5.4, §5.6, §7, §8, §9.4, §10, §12, §16.

## Scope

- Per-source deadlines in the AgentsPool: a soft deadline that releases synthesis and a hard cap that ends a dispatch.
- The turn's lifetime while a source is still in flight after the merge has landed.
- The reserved column: the merged view's column for a source it landed without.
- Include: a late source folded into the merged view on the reader's press.
- The failure tile as board F6, the client's line on it, the vendor's words beneath, Retry.
- The failure's cause and the vendor's words carried on the `Slot`.
- The declined merge's collapse: the reserved view gives its space back, the fragments move up once, one line stays.
- A dev-only fault map in the AgentsPool so beats and end-to-end runs reach every case.
- SPEC and delta-register amendments named below.

## Locked decisions

### 1. The soft deadline is patience after the pack

A source's soft deadline starts when every other dispatched source has settled and fires after a short wait on that one straggler. When it fires the source counts as resolved for the synthesis trigger and the turn's one automatic synthesis runs over what arrived. The straggler's dispatch is not aborted; it keeps running. The wait's length is the task's.

### 2. A hard cap ends the dispatch

A longer per-source timer aborts the dispatch. The outcome is a failure, the slot flips to failed, and the failure tile is painted. The cap's length is the task's.

### 3. The turn's final waits for every dispatch

The turn's single final is emitted only once every dispatch has ended: arrived, failed, or aborted at the hard cap. A straggler therefore always lands inside its turn's open stream. A new utterance cancels the in-flight turn as it does today, aborting every handle of the fan-out.

### 4. The home source is exempt from the soft deadline

Under a join hypothesis the reserved merge slot waits for the home source, skeleton in place, the progress line saying it is waiting for the home source's instances to join. Synthesis fires when the home source lands, over whatever else has arrived. Only the hard cap ends the wait, into a silent collapse of the merge slot and the failure tile in the home source's slot. Without a join hypothesis every source is a peer and no exemption applies.

### 5. The reserved column

A source's planned column stays in the merged view when synthesis lands without that source. The column is marked to its source from plan time, so the reserved skeleton shows the mark too. Its cells are drawn by the client from the slot's state the client already holds: loading while the source is in flight, the failed state once it failed, the header saying the same. When the source is later included, the cells fill in place and nothing moves. The shell catalog's Table gains the per-column source mark as a literal presentation prop the Synthesizer emits.

### 6. A late arrival mounts free; absorb is on request

A source arriving after the merge landed mounts its fragment in its own slot with no model call, the progress line naming it. The merged view stays as it landed. Its label row, beside the view's label and the sort control, carries a client-worded line that the source arrived after this merge and an Include button, drawn by the shell, never in the Synthesizer's tree. The press is one client operation on the composition to the orchestrator, which runs the existing inline re-synthesis handed the previous synthesize data model beside the fresh partition, told the source joined. While it runs the line becomes the working sentence and the reserved column's cells show loading; both settle when the document lands. In a temporal merge Include adds the source's rows the same way. If the reader never presses, the composition stands as it landed.

### 7. The failure tile is board F6

A failed vendor slot draws: the failure said at body size, a Retry button, and the vendor's words beneath under a heading naming the vendor, with no top bubble.

### 8. The client writes the failure line

The tile's line is the client's, computed from the source's display name and the noun the plan carries for that source under a join hypothesis, falling back to a line that the source couldn't answer when there is no noun. No model wording. Beneath it the vendor's own words when the vendor spoke; when nothing was said, a network failure or the hard cap, the orchestrator's own reason in plain words, and the heading changes to fit. The kinds of failure and their exact phrasings are the task's.

### 9. The failure rides on the Slot

The repaint that flips a `Slot` to failed also sets a failure prop on it: the cause as a small closed vocabulary and the vendor's message when there was one. The painter sets it the way it sets the state; the Planner never authors it. The shell catalog's failed branch draws the tile from those props. Retry is host-wired into the failed branch the way resting content is today: the catalog draws the button, the client owns the press. The cause vocabulary and the retry press are delta-register rows, local convention.

### 10. Retry re-dispatches one slot and includes on arrival

Retry re-dispatches only that slot with the same Planner request, no re-plan, as an action turn on the composition. When the source arrives it is included in the merge without a second press. When no synthesis has run yet, the arrival runs the first one.

### 11. One automatic synthesis per turn

The turn's first synthesis is its only automatic Synthesizer call. Every further call has a press behind it: Include, or Retry.

### 12. The declined merge collapses to one line

A decline leaves one quiet line in the Synthesizer's words, where the merged view's label would have sat. The reserved view's skeleton height goes and the fragments move up once to meet that line. The progress line's merge step gains its own declined state in the client's words. The silent collapses stay silent as today: fewer than two arrived, malformed, model failure, and the home source failing under the hard cap.

### 13. A dev-only fault map in the AgentsPool

The AgentsPool reads a fault map from the environment, source to a delay or a failure kind, applied before it forwards the vendor's stream. Vendors are untouched. Recorded beats and end-to-end runs reach lateness, the hard cap, a broken stream, and a vendor failure through it. Its format is the task's.

### 14. SPEC and delta-register amendments

SPEC §5.3's late-arrival sentence becomes: the arrival is visible and attributed, the absorb is on request. SPEC §4.5 records the declined merge's collapse geometry. The delta register gains rows for the failure cause and retry on the `Slot`, the column's source mark on the Table, and the Include operation.

## Invariants

- One automatic synthesis per turn; every further Synthesizer call has a press behind it.
- Every shell-drawn line on the canvas, the failure line, the Include line, the progress line's states, is the client's words, never a model's. The one exception stays the decline's reason, in the Synthesizer's words.
- A reserved thing keeps its place: the slot as before, now the column too. Later revisions fill it in place.
- Vendors are never changed to serve the shell.
