# Phase 8 — Late arrival + failure

Late arrival and failure (M6): per-source deadlines, the failure tile, decline, and a late source absorbed into the merged view on request. The failure tile is board F6 of the 7.14 design canvas (https://claude.ai/artifact/W324EkZXFze2CxddzNve1o). The declined merge's collapse is the item task 7.15 carried here. SPEC §4.5, §5.1, §5.2, §5.3, §5.4, §5.6, §7, §8, §9.4, §10, §12, §16.

## Scope

- Per-source deadlines in the AgentsPool: a soft deadline that releases synthesis and a hard cap that fails a dispatch.
- The turn's lifetime while a source is still in flight after the merge has landed, and its end when a new utterance arrives.
- The reserved column: the merged view's column for a source it landed without.
- Include: a late source folded into the merged view on the reader's press.
- The failure tile as board F6, the client's line on it, the vendor's words beneath, Retry.
- The failure's cause and the vendor's words carried on the `Slot`.
- The merge's collapse: the reserved view gives its space back, the fragments move up once, one line stays — for a decline and for every other collapse.
- A dev-only fault map in the AgentsPool so beats and end-to-end runs reach every case.
- SPEC and delta-register amendments named below.

## Locked decisions

### 1. The soft deadline is patience after the pack

The soft deadline runs only when the plan reserved a merge, and only once the sources that arrived could make one on their own: at least two, the home source among them under a join. It fires after 10 s in which no source has settled, however many are still out; each settle restarts it. When it fires, every source still out counts as resolved for the synthesis trigger and the turn's one automatic synthesis runs over what arrived. The stragglers' dispatches are not aborted; they keep running. The length comes from the orchestrator's environment, 10 s by default.

### 2. The hard cap fails the dispatch

300 s after a source is dispatched, its slot flips to failed with the `timeout` cause and the failure tile is painted. The orchestrator keeps listening to the dispatch; an answer arriving after the cap is held — not drawn, not in the partitions the merge reads — until the reader presses Retry. The length comes from the orchestrator's environment, 300 s by default.

### 3. The turn's final waits for every dispatch

The turn's single final is emitted once every dispatch has arrived, failed, or reached the hard cap. A straggler arriving before the cap therefore lands inside its turn's open stream. A new utterance ends the in-flight turn on the orchestrator: every dispatch aborted and its vendor sent A2A's cancel, the listening past the cap and any held answer dropped, a running Planner or Synthesizer call aborted.

### 4. The home source is exempt from the soft deadline

Under a join hypothesis the reserved merge slot waits for the home source, skeleton in place, the progress line saying it is waiting for the home source's instances to join. Synthesis fires when the home source lands, over whatever else has arrived. When the home source fails — at the hard cap, fast, or its paint found invalid after the merge landed — the merge slot collapses at once with no model call, and the home source's slot carries the failure tile. A home source arriving with no instances goes to the Synthesizer, which declines. Retry on the home source can bring the merge back. Without a join hypothesis every source is a peer and no exemption applies.

### 5. The reserved column

A source's planned column stays in the merged view when synthesis lands without that source. The column is marked to its source from plan time, so the reserved skeleton shows the mark too. Its cells are drawn by the client from the slot's state the client already holds: loading while the source is in flight, the failed state once it failed, the header saying the same. When the source is later included, the cells fill in place and nothing moves. The shell catalog's Table gains the per-column source mark as a literal presentation prop the Synthesizer emits. The Planner writes the mark beside the columns whenever it writes them. The Synthesizer is handed the marks and the sources missing from its synthesis, and keeps every column marked to a missing source.

### 6. A late arrival mounts free; absorb is on request

A source arriving after the merge landed mounts its fragment in its own slot with no model call, the progress line naming it. The merged view stays as it landed. Its label row, beside the view's label and the sort control, carries a client-worded line that the source arrived after this merge and an Include button, drawn by the shell, never in the Synthesizer's tree. The press is one client operation on the composition to the orchestrator, which runs the existing inline re-synthesis handed the previous synthesize data model beside the fresh partition, told the source joined. While it runs the line becomes the working sentence and the reserved column's cells show loading; both settle when the document lands. In a temporal merge Include adds the source's rows the same way. If the reader never presses, the composition stands as it landed. The merge keeps the set of sources it was built over: only Include and Retry add to it, a failure removes from it, and a re-synthesis for any other reason runs over that set.

### 7. The failure tile is board F6

A failed vendor slot draws: the failure said at body size, a Retry button, and the vendor's words beneath under a heading naming the vendor, with no top bubble.

### 8. The client writes the failure line

The tile's line is the client's, computed from the source's display name and the noun the plan carries for that source under a join hypothesis, falling back to a line that the source couldn't answer when there is no noun. No model wording. Beneath it the vendor's own words when the vendor spoke; when nothing was said, a network failure or the hard cap, the orchestrator's own reason in plain words, and the heading changes to fit. The kinds of failure and their exact phrasings are the task's.

### 9. The failure rides on the Slot

The repaint that flips a `Slot` to failed also sets a failure prop on it: the cause as a small closed vocabulary and the vendor's message when there was one, which rides only there. The painter sets it the way it sets the state; the Planner never authors it. The shell catalog's failed branch draws the tile from those props. Retry is host-wired into the failed branch the way resting content is today: the catalog draws the button, the client owns the press. The cause vocabulary and the retry press are delta-register rows, local convention.

### 10. Retry re-dispatches one slot and includes on arrival

Retry is an action turn on the composition for that slot alone, no re-plan. An answer held past the hard cap is drawn at once. With nothing held while the capped dispatch still runs, the same Planner request is dispatched again alongside it, with its own hard cap; whichever arrives first fills the slot and the other is cancelled. After any other failure the same request is dispatched again. When the source arrives it is included in the merge without a second press. When no synthesis has run yet, the arrival runs the first one.

### 11. One automatic synthesis per turn

The turn's first synthesis is its only automatic Synthesizer call. Every further call has a press behind it: Include, or Retry.

### 12. Every collapse of the merge leaves one line

A collapsed merge leaves one quiet line where the merged view's label would have sat. The reserved view's skeleton height goes and the fragments move up once to meet that line. A decline's line is the Synthesizer's reason. Every other collapse's line is the client's, from a cause the painter sets: the home source failed, fewer than two sources arrived, or the merged view couldn't be made. The progress line's merge step gains its own declined state in the client's words.

### 13. A dev-only fault map in the AgentsPool

The AgentsPool reads a fault map from the environment, source to a delay or a failure kind, applied before it forwards the vendor's stream. Vendors are untouched. Recorded beats and end-to-end runs reach lateness, the hard cap and an answer held past it, a broken stream, a refused connection, a vendor failure, and a paint the client cannot draw through it. Its format is the task's.

### 14. SPEC and delta-register amendments

SPEC §5.3's late-arrival sentence becomes: the arrival is visible and attributed, the absorb is on request. SPEC §4.5 records the declined merge's collapse geometry. The delta register gains rows for the failure cause and retry on the `Slot`, the column's source mark on the Table, and the Include operation. SPEC §4.5 and §5.1 record that every collapse of the merge leaves one line, §5.2 the failed home source collapsing without a call and the Synthesizer's brief carrying the column marks and the missing sources, §5.3 the soft deadline, the hard cap's held answer, the turn's end and the merge's source set, §8 Retry's held answer and a failed source's data leaving the canvas, and the delta register a row for the collapse cause.

## Invariants

- One automatic synthesis per turn; every further Synthesizer call has a press behind it.
- Every shell-drawn line on the canvas, the failure line, the collapse lines, the Include line, the progress line's states, is the client's words, never a model's. The one exception stays the decline's reason, in the Synthesizer's words.
- A reserved thing keeps its place: the slot as before, now the column too. Later revisions fill it in place.
- Anything the canvas calls failed shows nowhere as data.
- Vendors are never changed to serve the shell.
