# Task 8.3 — Orchestrator: deadlines, the failure on the repaint, the merge's collapse

The orchestrator's part of Phase 8 (`_dev/docs/spec/phase-8-late-arrival-failure.md`, decisions 1–6, 9, 12 and 13 as amended): the soft deadline and the hard cap in the AgentsPool, the turn's end, the failure's cause painted on the `Slot`, every collapse of the merge left as one line, the column marks on both model calls, and the dev-only fault map. SPEC §4.5, §5.1, §5.2, §5.3, §8, §14.

## Scope

- The soft deadline, the hard cap and the answer held past it; both lengths from the environment.
- The turn's final, and a new utterance ending the in-flight turn on the orchestrator, with A2A's cancel sent to every vendor it aborts.
- The failure's cause and the vendor's words painted on the `Slot`; which sources count as arrived.
- The painter's `noun` on each vendor slot, `declined` on the shell slot, and a collapse cause on the shell slot with the shell catalog's line for it.
- The failed home source collapsing the merge without a call.
- The merge's own source set.
- `columnSources` from the Planner, and the Synthesizer's brief and validator for it.
- The dev-only fault map; the journal.

Retry and Include themselves, releasing a held answer among them, are task 8.4's. The kit honouring A2A's cancel is task 8.9's. Quiescence and the invalidated synthesis are task 8.10's. The client's side of a failed source's data, the progress line's states and removing the decline's prose copy are task 8.5's.

## Locked decisions

### 1. The soft deadline is 10 s of quiet once a merge is possible

The soft deadline runs only when the plan reserved a merge, and only once the sources that arrived could make one on their own: at least two, the home source among them under a join. It fires 10 s after the most recent source settled, however many are still out; each settle restarts it. When it fires, every source still out counts as resolved and the turn's one automatic synthesis runs over what arrived; the stragglers' dispatches keep running. The home source is never on a soft deadline.

### 2. The hard cap is 300 s, and an answer past it is held

300 s after a source is dispatched, its slot flips to failed with the `timeout` cause. The orchestrator keeps listening to the dispatch. An answer arriving after the cap is held: not drawn, not in the partitions the merge reads, not seen by the IntegrityChecker's walk, until the reader presses Retry.

### 3. Both lengths come from the environment

The soft deadline and the hard cap are read from the orchestrator's environment, 10 s and 300 s by default. A value other than the default is logged at boot.

### 4. The turn's final and its end

The turn's single final is emitted once every dispatch has arrived, failed, or reached the hard cap. A new utterance ends the previous turn on the orchestrator: its dispatches aborted, the listening past the cap and any held answer dropped, a running Planner or Synthesizer call aborted, the turn journaled as superseded. Whenever the orchestrator aborts a dispatch it sends the vendor A2A's cancel.

### 5. The cause of a failure

- The vendor's final is `failed`, `rejected` or `canceled`: `vendor`, with the text of that final's status message as the vendor's words when it has any.
- The connection is refused, a non-2xx comes back, the card cannot be fetched, or the stream ends with no final: `unreachable`.
- The hard cap: `timeout`.
- The client's report that a paint could not be drawn: `invalid`.

A vendor that ends with words and nothing on screen, including the kit's own give-up, is not a failure; its words rest in its slot as today. `input-required` and `auth-required` stay as today. A source counts as arrived only when it holds a surface at its end.

### 6. The vendor's words ride only on the Slot

The orchestrator takes the vendor's words off the failed final it relays and paints them into the `Slot`'s failure prop. They do not reach the client as prose.

### 7. A failed source's data is out of the merge

A fragment still drawing when its source fails is replaced by the failure tile; the source is not arrived and the Synthesizer's refs into its partition are rejected. A source reported `invalid` leaves the merge the same way whenever the report arrives, with no model call.

### 8. A failed home source collapses the merge at once

Under a join, when the home source fails — at the hard cap, fast, or reported `invalid` after the merge landed — the merge slot collapses at once with no Synthesizer call. A home source that arrives with no instances goes to the Synthesizer, which declines.

### 9. Every collapse of the merge leaves one line

The painter sets the decline's reason as `declined` on the shell slot. Every other collapse carries a cause the painter sets on the shell slot, and the shell catalog composes the line from it, drawn where the decline's line is:

- The home source failed: "Can't join without Linear issues." — the home source's display name and its noun from the join.
- Fewer than two sources arrived, once every source has ended: "Only GitHub answered, so there's nothing to merge.", or "No app answered, so there's nothing to merge." The painter supplies the arrived sources.
- The Synthesizer's call threw, or its output stayed malformed after its retry: "The merged view couldn't be made."

The shell catalog's addition is part of this task. The decline's prose copy stays until task 8.5 removes it.

### 10. The noun on each vendor slot

Under a join the painter sets `noun` on each vendor slot: the source's display name with the plan's noun for it, "CircleCI runs". Without a join no noun is painted.

### 11. The merge keeps its own source set

The merge holds the set of sources it was built over. The IntegrityChecker's walk, and any re-synthesis it fires, cover only that set. A source arriving after the merge, or an answer held past the hard cap, joins it only through Include or Retry; a failure removes a source from it.

### 12. The Planner writes the column marks

The merged view's dispatch entry carries `columnSources` beside `columns`, required whenever `columns` is written: the same length, each entry a dispatched vendor or null. The painter carries it onto the shell slot. The Planner's validator refuses the painter's props — `noun`, `failure`, `declined`, `columnSources` and the collapse cause — written on a `Slot`.

### 13. The Synthesizer keeps the reserved columns

The Synthesizer's brief carries the plan's column marks and names the dispatched sources missing from this synthesis. Its validator checks the Table's `columnSources` — the same length as its columns, each entry a source or null — and rejects a Table that drops a column the plan marked to a missing source, the finding going back on its one retry.

### 14. The fault map

The AgentsPool reads one environment variable holding JSON keyed by app id, never anything from the wire, and logs the active faults at boot. Six faults, each optionally starting after a delay:

- `delay` N s — holds the vendor's stream, then forwards it.
- `hang` — forwards nothing and never ends.
- `break` — forwards part of the paint, then ends with no final.
- `refuse` — ends before any event, as a failed connection.
- `fail` with a message — ends with a vendor `failed` final carrying it.
- `invalid` — replaces one component of the paint with one the catalog does not have.

A fault hits the plan's dispatch of its source only, unless marked for every dispatch.

### 15. The journal

Per dispatch: the failure's cause and the vendor's words, the first paint's time, the settle time, whether it reached the cap, whether an answer arrived past the cap and was held and when, the fault applied. Per synthesis: what released it — every source settled, the soft deadline, or the home source landing — and when, the sources it ran over, the sources missing with each one's state. Per collapse: its cause. Per turn: the soft deadline and the cap in force, and whether a new utterance superseded it. Dead air is measured from the synthesis's release.

## Invariants

- One automatic synthesis per turn; every further Synthesizer call has a press behind it.
- The canvas never reverses a failure it has shown without the reader's press.
- Anything the canvas calls failed shows nowhere as data.
- Every line the shell draws is the shell catalog's, except the vendor's words and the decline's reason.
- Vendors are untouched; faults are applied in the AgentsPool.

## Open items

- The 10 s soft deadline is revisited against the live runs.
