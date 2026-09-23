# Task 8.10 — Orchestrator: quiescence, the merge thrown away on change

The orchestrator's part of SPEC §5.3's quiescence and invalidation rules under Phase 8 (`_dev/docs/spec/phase-8-late-arrival-failure.md`): a reader's press inside a fragment holds the merge until it is answered, and a merge in the making is thrown away when a fragment it reads changes. SPEC §5.3.

## Scope

- A press inside a fragment holding the merge, the first merge and a re-synthesis alike.
- A merge in the making thrown away when a fragment it reads changes, and made again once the press is answered.
- A source failing while the merge is being made.
- The sources the first merge is made over when it waits or is made again.
- The journal.

## Locked decisions

### 1. A press holds the merge

When the reader presses inside a fragment the merge would read, the merge waits for the press's answer, and the merged view lands once, over what that fragment then shows. The soft deadline does not cut the wait short. A press that hangs is bounded by the hard cap, which fails its source; the merge then lands without it.

### 2. A merge in the making is thrown away when a fragment it reads changes

If the press's answer changes what the fragment holds, the merge in the making is thrown away and made again once the press is answered. If the answer changes nothing, the merge lands as made. Either way it never lands before the press is answered. This holds for the turn's first merge and for a re-synthesis after a merge has landed.

### 3. Several presses, and presses outside the merge

Presses in several fragments the merge reads hold it until every one is answered. A press in a fragment the merge does not read — a source it landed without — neither holds the merge nor throws it away. One merge is in the making at a time.

### 4. The merge made again has the press behind it

A merge made again after a press threw one away has that press behind it; it does not break the turn's one automatic synthesis.

### 5. A source failing while the merge is being made

A source that fails while the merge is being made does not throw it away. The merge lands, and the failed source leaves it as it would right after landing: its column unavailable, the values computed over it recomputed without it, no further call. A failed home source collapses the merge at once, as before.

### 6. The first merge is made over every source arrived by then

Until the first merge has landed, every source that has arrived by the time the merge is made — including one arriving while the merge waited on a press or was being made again — is part of it, with no Include. Once a merge has landed it keeps its own source set (task-8.3 decision 11).

### 7. The journal

Each merge thrown away, with the change that threw it away. Each wait on a press, with its source and how long it held the merge.

## Invariants

- One automatic synthesis per turn; every further Synthesizer call has a press behind it.
- Anything the canvas calls failed shows nowhere as data.
