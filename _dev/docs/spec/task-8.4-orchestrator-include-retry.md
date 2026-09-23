# Task 8.4 — Orchestrator: Include, Retry and Try again

The orchestrator's part of Phase 8's presses (`_dev/docs/spec/phase-8-late-arrival-failure.md`, decisions 6, 10 and 11 as amended): Include, Retry and Try again as operations on the composition, what each covers, a press's call that fails, a collapsed merge brought back, the facts painted for the client's lines, the operation's wire shape in the composition contract, and the journal. SPEC §4.5, §5.3, §8, §14.

## Scope

- Include, Retry and Try again as operations on the composition, each with the reader's press behind it.
- What a press covers, and a press's call that fails.
- A collapsed merge brought back by Retry, Include or Try again.
- Presses while the turn runs, while a merge is in the making, and when a new utterance arrives.
- What the Synthesizer is handed on a call a press causes.
- The facts painted on the shell `Slot` for the client's lines.
- The operation on the wire and in the composition contract; its stream.
- The journal.

Drawing the lines and buttons and wiring the presses in the client and the shell catalog are task 8.5's. The parked composition — a previous tab, not frozen — is Phase 9's.

## Locked decisions

### 1. One Include covers every late source waiting

Include folds in every source that arrived after the merge and is waiting at the moment of the press: one line names them all, one button, one Synthesizer call, one reorder.

### 2. A press covers what it named

A source arriving while an Include's call runs is not taken into it; once the view lands, it gets its own line and Include. A retried source's fold-in covers that source only; late sources waiting for Include keep their line until the reader presses it.

### 3. A failed re-synthesis keeps the landed view

When a re-synthesis's call throws or its output stays malformed after its retry, the landed view stays as it was. After a fold-in — Include or a retried source — the sources stay out of the merge's source set and the label row says they couldn't be included, with Include again. After any other re-synthesis — the walk after a press inside a fragment — the label row says the merged view couldn't be updated, with Try again.

### 4. Retry's press

At the press the failure tile gives way to the pending slot; the source's progress tick and its reserved column read loading again. An answer held past the hard cap is drawn at once. A retry that fails again brings the tile back with its new cause and the vendor's new words.

### 5. The Retry race

When the capped dispatch still runs with nothing held, the first of the two to arrive holding a surface fills the slot, drawn whole, and the other is cancelled with A2A's cancel. The slot follows the re-dispatch: when it fails — the vendor, unreachable, or its own hard cap — the tile returns with that cause while the original keeps running, an answer from it held for the next Retry. The original failing first changes nothing visible.

### 6. Retry before the first merge

A source retried before the first merge rejoins the pack: from the press it counts as out for the synthesis trigger, as if it had never failed. The press does not restart the soft deadline's quiet.

### 7. An arrival never restarts a merge in the making

A merge in the making lands as made; a retried source arriving meanwhile folds in straight after. Everything owed when the merge lands — every retried source's fold-in, a queued Include's sources, the walk's change account — runs as one call. A press's call never takes a waiting late source the reader did not press.

### 8. A collapsed merge brought back

Retry can bring back a merge collapsed for a failed home source, for fewer than two sources, or by a decline. Nothing moves until the merged view lands: at the press the collapse line becomes a waiting sentence, while the Synthesizer works it becomes the working sentence, and only the landed view takes its place, moving the fragments down once. A retry that fails again, a second decline or a failed call changes only the line's words. The merge brought back is made like the turn's first merge, over every source arrived by then.

### 9. Include and Try again on a collapsed merge

After a decline, or after the merged view couldn't be made, a source arriving later gets Include under the collapse line; the press makes the merge over every arrived source, and a second decline shows its new reason. The merged view couldn't be made carries Try again, which makes the merge over every arrived source. Try again is the third press, beside Include and Retry.

### 10. Presses while the turn runs

Retry, Include and Try again work whenever their button shows, the turn running beside them: the sources still loading keep loading, their fragments keep mounting. Only a new utterance ends a turn.

### 11. A new utterance ends every press in flight

A new utterance ends every Retry, Include and Try again in flight on the composition it replaces: re-dispatches aborted with A2A's cancel sent, calls aborted, journaled superseded. A press aimed at a composition that isn't current is refused.

### 12. What the Synthesizer is handed

A fold-in is handed the previous synthesize data model beside the partitions of the merge's source set and the joining sources, those named as joined; the missing sources are those still out. A merge brought back, and Try again after the merged view couldn't be made, are made like a first merge, handed no previous document and no earlier decline's reason. Try again after the merged view couldn't be updated walks again from the last accepted document, then re-synthesizes. Every call a press causes is handed the composition's question, and so is the walk's re-synthesis.

### 13. The facts on the shell Slot

The painter sets on the shell `Slot` the facts the client's lines are drawn from: the merge's source set, the late sources waiting for Include, a press's call in progress with its kind and sources, the last press's call failed with its kind and sources, and a collapsed merge a running Retry could bring back. The client and the shell catalog compose the words. The props join the shell catalog's `Slot` schema; the Planner's validator refuses them on a `Slot`.

### 14. The operation on the wire

A press is a data part of its own on a new A2A message in the composition's context, beside the action, the error report and the utterance: `{version, operation: {kind: 'retry' | 'include' | 'tryAgain', sources}}`. The composition contract carries it, moving to v0.7; the sdk projects it for the client to build and the orchestrator to parse, under the contract test.

### 15. The press's stream

Each press is its own orchestrator task. Its stream carries everything the press causes — the repaint at the press, the answer that fills the slot, a fold-in, a merge brought back — and ends when that work is done: for Retry once the slot has settled and any fold-in it owed has landed or failed, for Include and Try again once the merge has landed or failed. A winning original's answer is relayed on the Retry's stream. What no press caused stays on the plan turn's stream. The final is `completed` whenever the press was handled, the outcome shown on the canvas, never on the final; a refused press — a composition not current, a source not failed, no late source waiting — ends `failed` with a plain reason.

### 16. The journal

A press is a journal turn of its own kind, `operation`, described by its kind and sources and linked to the turn whose composition it acts on. Its dispatch records carry task-8.3's fields, the race's winner and the other's cancel, and when a drawn answer was held. A synthesis's release gains `include`, `retry`, `tryAgain` and `walk`. Its outcome is completed, refused with the reason, or superseded. It enters the recent-turns ring.

### 17. SPEC, phase spec and TODO amendments

SPEC §5.3 records Try again as the third press, a failed re-synthesis keeping the landed view, and Include after a decline or a merge that couldn't be made; SPEC §4.5 records a collapsed merge brought back moving nothing until it lands. The phase spec's decisions 6, 10 and 11 and its invariants gain Try again. The delta register's Include row covers Try again. TODO: 8.4's line; 8.5 gains the new lines and buttons; 8.6, 8.7 and 8.8 follow; Phase 9 gains the parked composition as a previous tab, not frozen — whether presses work there and what it keeps running.

## Invariants

- One automatic synthesis per turn; every further Synthesizer call has a press behind it: Include, Retry or Try again.
- A press's call covers only what was pressed or owed.
- Anything the canvas calls failed shows nowhere as data.
- Every line the shell draws is the client's words, except the vendor's words and the decline's reason.
