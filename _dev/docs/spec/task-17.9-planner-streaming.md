# 17.9 — Streaming the Planner's output

The Planner's answer read as the model writes it: its dispatch list committed and its sources dispatched before the layout is written, the layout reaching the client component by component (phase 6 decision 9). Sub-task 17.9 of Phase 17 (`_dev/docs/spec/phase-17-latency.md`), worked on the phase branch (phase decision 3).

## Scope

- The Planner's request streamed, on Claude and on Gemini.
- The sources dispatched once the dispatch list is committed.
- The layout tree streamed to the client component by component.
- The order the Planner writes its answer in.
- The hold on what the sources send, the retry, and the failure paths.
- The journal's time to first token and the first layout piece.
- A streaming reader of a tagged block, shared with 17.10.
- A plan from the plan cache.
- Scripted tests and a live check.
- The orchestrator's design record and README.
- Out: the synthesis fragment's streaming and the Synthesizer's time to first token — 17.10; the SPEC edits — 17.12; the measured numbers — 17.11; the prose Sonnet 5.5 writes before its block — the Backlog (decision 13).

## Locked decisions

### 1. The sources dispatched once the dispatch list is committed

The dispatch list is committed, and its sources dispatched, as soon as it is written and passes the checks it can pass on its own: each source among those the Planner was shown, each gap in the words of one of this plan's searches, each account choice well formed. The layout follows. SPEC §4.5's provisional layout committed before any agent is dispatched becomes: the dispatch list is committed before any agent is dispatched, and the layout is painted before any fragment is shown.

### 2. The retry once the sources are dispatched: the layout alone

A dispatch list that fails its own checks dispatches nothing, and its retry is today's, the whole answer. Once the list is committed, a failure in the rest of the answer — a component outside the shell catalog, a dispatch entry with no slot, a data model that is not literal — is retried on the layout, the data model and the title alone, written against the list already sent; a list the retry writes is ignored. One retry, as task-6.4 decision 6 has it; a second failure is a broken turn, and the sources already dispatched are cancelled.

### 3. The layout streamed component by component

Each component of the layout tree goes to the client as the model writes it, once it passes its own check against the shell catalog. The checks over the whole layout — each dispatch entry's slot, no reference to a missing component — run once it is complete.

### 4. The answer's order: title, dispatch list, data model, tree

The Planner's prompt asks for the title first, then the dispatch list, the data model and the tree. An answer in another order is accepted; it dispatches or paints later.

### 5. What a source sends held until the layout is checked

Everything a source sends — its paint, a change to its slot — is held until the whole layout is complete and has passed its final checks, and released then.

### 6. A component failing mid-stream

Painting stops at the first component that fails its own check. The model finishes its answer, every check runs, and the retry carries every failure.

### 7. The screen during a retry

The half-drawn layout stays as it is until the retry's layout is complete and checked, then is replaced in one step; the retry is not streamed. When the retry fails too, the half-drawn layout is taken down and the turn ends as a broken turn does.

### 8. The journal

Every Planner request carries its time to first token, the retry's included, and the turn the instant the first layout piece leaves for the client. `planMs` keeps its meaning — the layout complete and checked. The Synthesizer's time to first token comes with 17.10's streaming.

### 9. Scripted tests, then a live check

Scripted tests over a simulated stream cover the order, the early dispatch, the hold, each failure path and the retry's swap. A live check follows through the tunnel by Claude-in-Chrome, the apps in `stub` mode: a few prompts on Claude Sonnet 5.5, a platform answer among them, and one on Gemini, its spend put to the person before it runs. The measured numbers are 17.11's.

### 10. One streaming reader for both seams

The reader that follows a tagged block as the model writes it and hands over each finished piece is built beside the orchestrator's shared tagged-block extractor (task-6.3 decision 10), knowing nothing of the Planner. 17.9 builds it; 17.10's streaming of the synthesis fragment uses it.

### 11. A plan from the plan cache

A plan from the plan cache is drawn whole and its sources dispatched at once, as today. After a layout-only retry, the plan stored is the plan as used: the first answer's dispatch list with the retry's layout, data model and title.

### 12. The docs

17.9's own commit carries the orchestrator's design record, the client's when the client changes, and the orchestrator README. SPEC §4.5 and §5.6 join 17.12's doc edits beside §5.5; the phase spec's scope gains the layout arriving as the model writes it.

### 13. The prose before the block

The prose Sonnet 5.5 writes before its `<layout-surface>` block — 169–433 characters on 17.7's pass, about 1.3–1.4 s on prompts 1 and 6 — stays as it is in 17.9 and is recorded in the Backlog, found in 17.9.

## Invariants

- Gemini stays reachable as it is on the Planner.
