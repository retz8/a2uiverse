# Task 9.4 — Orchestrator, the fragment's history

The orchestrator's part of Phase 9's way back inside a fragment (`_dev/docs/spec/phase-9-durable-composition.md`, decisions 2 and 3; `_dev/docs/spec/task-9.2-composition-contract.md`, decisions 5 and 7): each agent's stack on the composition, the step reported by the client, the wiring remembered per combination of steps. SPEC §6, §6.3, §6.5, §7.

## Scope

- A per-agent step count and current index on the composition, counted from the stream.
- The step operation accepted: the named source's partition written from what the client sent.
- The accepted wiring remembered per combination of the agents' steps, restored on a step when the combination was seen, the walk otherwise.
- The step's refusals.
- Journal.

## Locked decisions

### 1. Every `createSurface` from a source is a step

The orchestrator counts one step per `createSurface` op from a source, in stream order, from index 0, whatever the surface id or the paint's kind — a repeat create of the same id, a create of a new id, a question surface, a held answer drawn on Retry, a create the client later reports it could not draw. A `deleteSurface` and an `updateDataModel` never count. A create landing after a step back takes the index after the current one and drops the steps past it. The step report is task 9.2's: the absolute index, one source, the paint's data model riding `a2uiClientDataModel`.

### 2. The step replaces the source's partition wholesale

A step drops every surface the partitions hold for the named source and takes the surfaces the client sent for that source, with their data models as sent, so the surface id changes with the step when the vendor painted a new id. The other partitions are untouched.

### 3. A combination is every painted source's current index

The key the wiring is remembered under is the current index of every source that has a stack in the canvas, whether or not the merge reads it. A source that has not painted is absent from the key. When a create drops steps, every entry whose key holds that source at a dropped index is purged.

### 4. Filed on every accept and on every silent walk

On every accept — the turn's first merge, Include, Retry, Try again, a walk's call — the live synthesis record as it exists today, with the merge's source set, is filed under the current combination, a later accept at the same combination overwriting. A walk that finds nothing and calls nothing files the current wiring under the combination it ran on. A decline or a collapse files nothing. A step in a canvas with no live wiring writes the partition and walks nothing.

### 5. Seen and unseen share one path

On a step the orchestrator restores the remembered entry when the combination has one, writes the partition, and runs the IntegrityChecker's walk over the restored state with no call. The Synthesizer is called only if the walk fires; the outcome is filed under the new key. On a silent walk the orchestrator paints nothing — the client restored its own paint and wiring.

### 6. What a step refuses

A failed final, in the press's register, when the source has no stack in the canvas, when the index is past the stack's end, or when the message carries no surface of that source in `a2uiClientDataModel`; the closed and unknown canvas refusals as for every press. An index equal to the current one is an idempotent no-op: the partition written, the walk run, nothing else.

### 7. Journal

The step's operation line carries the combination it landed on, whether it was seen, and what the walk did. A call the walk makes records its release as `step`. The drop of forward steps is not journaled.

### 8. Consequences

- The stacks and the remembered wiring live on the composition state and go with the close.
- Only vendor sources have stacks; the shell's layout and synthesis surfaces never count.
- A step while a merge is in the making is a partition change: the in-flight call is thrown away and the loop re-walks over the restored state. A vendor answer landing after a step is the next create.
- The step owes a walk as an action does.
- Orchestrator tests: a step press carrying a data model, a drill-down and return.

## Invariants

- A step back costs no call when the screen it returns to was seen: the entry was filed over that data, so the walk is silent.
- The orchestrator never snapshots a paint; the client's step carries the data model.
