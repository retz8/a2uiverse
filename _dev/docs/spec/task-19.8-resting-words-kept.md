# 19.8 — A slot answered in words alone keeps its words past the next turn

A slot whose source answered in words and never painted rests on those words for as long as the composition stands, not for one turn. Sub-task 19.8 of Phase 19 (`_dev/docs/spec/phase-19-v09-beside-v091.md`), found in 19.6: Calendar's sentence beside the entity join went at a press in CircleCI's fragment, the slot's label left over nothing. Parallel with 19.7; before Phase 20.

## Scope

- The lifetime of the words a source said without painting, as the client holds them: how long they rest in the slot, and what takes them off.
- The proof: the turn runner's tests on the moments the words stay and go, and a live look at the case 19.6 found.
- The client design record: what the client holds of a composition beside the placement map and the roster.
- Out: the orchestrator — it holds no words, and its slot state for a clean completion holding no surface stays what it is; the shell catalog's `Slot`, which already draws whatever the host rests a collapsed slot on; the notice line and its per-turn fade; the Planner's reading of such a slot, "answered with nothing to show"; every recording and fixture; the Phase 19 spec and 19.6's spec, which stay as they are — the finding lives in the TODO line.

## Locked decisions

### 1. The words belong to the composition

What a source said without painting is composition state, as the placement map and the roster are: kept across every turn inside the composition — a press inside a fragment, a Retry, an Include — and cleared with the roster and the slot states when the composition retires. Today the words belong to the turn and go the moment a new one opens, with the notice stack. The notice stack keeps its per-turn life; only what the slot rests on changes.

### 2. A source's words go when its slot is painted loading again

When a source that answered in words is sent again inside the composition, its words leave at the shell's repaint that paints that source's slot loading again — `pending`, or no state with no fragment in it, both read from the same repaint, which the client already treats as the orchestrator's word on what a slot is doing. Not at the press that sent it, and not at the first chunk of its next answer. The slot shows loading over nothing, as a first dispatch does; a source's words leaving take no other source's with them.

### 3. What proves the sub-task

The turn runner's tests (`canvas/turn/canvasTurn.test.ts`) over the four moments: a turn begun by a press inside the composition leaves a collapsed slot's words resting and the progress line's `done` for that source standing; a repaint that paints that source's slot loading again takes its words and nothing else's; the composition's retirement takes them all; a composition after it starts with none. `pnpm verify` green. A live look through the tunnel at the case as 19.6 found it: the entity join on `stub`, Calendar answering in words, a press in CircleCI's fragment, the sentence still beside the join after the press.

### 4. The client design record names the third thing the client holds of a composition

In `docs/design/client.md`, the paragraph of "Routing by the stamp" that names the two projections the runner reads off the layout paint — the placement map and the roster — gains the third: the words of a source that answered without painting, resting in its collapsed slot in the shell's grey quoting, kept across the presses inside the composition like placement and the roster, gone when the slot is painted loading again or the composition retires; the notice line's per-turn fade stated as the different thing it is. No new row in the design-decisions table.
