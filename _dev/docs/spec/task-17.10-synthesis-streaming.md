# 17.10 — Streaming the synthesis fragment

The Synthesizer's answer read as the model writes it, the merged view drawn into its reserved slot row by row — SPEC §16's dead-air mitigation. Sub-task 17.10 of Phase 17 (`_dev/docs/spec/phase-17-latency.md`), worked on the phase branch (phase decision 3).

## Scope

- The Synthesizer's request streamed, on Claude and on Gemini.
- The merged view drawn row by row into its reserved slot.
- The order the Synthesizer writes its answer in.
- Where a row lands, the skeleton rows and the view's height.
- A piece failing, the retry, and a merge thrown away mid-stream.
- Which syntheses stream.
- The progress line and the view's busy mark.
- The journal's time to first token and the first row.
- Scripted tests and a live check.
- The design records, the READMEs and the Backlog.
- Out: the SPEC edits — 17.12; the measured numbers — 17.11.

## Locked decisions

### 1. The merged view drawn row by row

The tree comes first, checked against the shell catalog. Each row of the derived data model is checked on its own as it arrives — its refs resolve in the orchestrator's copies of the partitions, its `equal` and `contains` facts hold, its operators are the catalog's, its formula paths are bound only through `DerivedValue` — and goes to the client, which evaluates it and draws it. The checks over the whole document — one source mark per planned column, every column planned for a missing source kept, one sort declaration per list — run once it is complete. A row is an element of a list the tree repeats; a list inside a row arrives with its row; a member of the data model outside a repeated list is drawn once it is finished.

### 2. The answer's order: tree, sorts, data model, note

The Synthesizer's prompt asks for the tree first, then the sorts, the data model and the note. An answer in another order is accepted; it is drawn later. A decline stays its own answer.

### 3. Each row at its sorted place

Each row lands where the list's sort puts it as it arrives. The sort control works from the moment the sorts arrive: a change reorders the rows drawn, and later rows land by it.

### 4. The skeleton rows and the view's height

Rows take the reserved slot's four skeleton rows' places one for one. While the model writes, one skeleton row stays below the last row; it goes once the document is accepted. The fragments below move as the view grows.

### 5. A piece failing mid-stream

Painting stops at the first piece that fails its own check. The model finishes its answer, every check runs, and the retry carries every failure.

### 6. The screen during a retry

The half-drawn view stays as it is until the retry's document is complete and accepted, then is replaced in one step; the retry is not streamed. When the retry fails too, the half-drawn view is taken down and the slot collapses to its line saying the merged view couldn't be made, with Try again.

### 7. Only the turn's first synthesis streams

The turn's first synthesis streams into the reserved slot. Every re-synthesis — Include, Retry, Try again, the walk after a press, a step to a combination never seen — over a landed view or into a collapsed line, lands whole, as today.

### 8. A first synthesis thrown away mid-stream

When the partitions a streaming first synthesis reads change while the model writes, the half-drawn view stays, evaluated live. The merge made again is not streamed and is swapped in whole once accepted; one that ends unmade takes the half-drawn view down and collapses the slot to its couldn't-be-made line, with Try again.

### 9. The journal

Every Synthesizer request is read as a stream and carries its time to first token — the retry's and every re-synthesis's included. The synthesis record carries the instant the first row leaves for the client. `deadAirMs` keeps its meaning: from the synthesis's release to its outcome.

### 10. The progress line and the busy mark

While rows stream in, the progress line keeps its merge step's working words and the view stays marked busy. Both move to their landed state once the document is accepted.

### 11. Scripted tests, then a live check

Scripted tests over a simulated stream cover the order, the row-by-row painting, the sorted placement, the trailing skeleton row, the stop at the first failing piece, the retry's swap, the thrown-away merge, the re-syntheses landing whole and the journal. A live check follows through the tunnel by Claude-in-Chrome, the apps in `stub` mode, the Planner on Claude Sonnet 5.5: a few merge prompts with the Synthesizer on `gemini-3.8-flash` and at least one on Claude Sonnet 5.5, its spend estimated and put to the person before it runs. The measured numbers are 17.11's.

### 12. The docs

17.10's own commit carries the synthesis design record, the orchestrator's and the client's, the shell catalog's when the shell catalog changes, and the READMEs they touch. SPEC §4.5, §5's turn at t7, §5.2 and §14's register row for the synthesize data model join 17.12's doc edits beside §5.5 and §16, phase decision 11 amended. 17.10's closing commit takes the Backlog's two streaming items off — the synthesis fragment's and the Planner's output's.

## Invariants

- Gemini stays reachable as it is on the Synthesizer.
- The Synthesizer's block is followed by the streaming reader 17.9 built beside the shared tagged-block extractor (task-17.9 decision 10).
- The turn's first synthesis stays its only automatic Synthesizer call; one merge at a time, Include and Retry pressed during the stream waiting for the next merge; the wiring remembered per combination of paints stored at acceptance alone.
