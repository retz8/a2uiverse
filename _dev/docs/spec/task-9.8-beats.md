# Task 9.8 — Beats

Phase 9's cases as beats (`_dev/docs/spec/phase-9-durable-composition.md`): synthetic and recorded beats for a tab finishing in the background, an action and a press in a past canvas, "Ask this again now" and a question asked from a view, add/drop and "compare these", a step back with the wiring restored, an unseen combination falling to the walk, and closing a loading canvas. SPEC §4.3, §6.4, §7.

## Scope

- A synthetic beat and a recorded beat for each of the seven cases.
- A beat spanning several canvases: turns naming their canvas, turns overlapping on one clock, the user viewing and closing a canvas — in the beat's shape, in replay, and in the recorder.
- Vitest assertions on each new beat's end state and a Playwright visual spec over the new beats.

## Locked decisions

### 1. Every case is synthetic and recorded

Each of the seven cases gets a synthetic beat and a recorded beat over the deterministic roster.

### 2. A beat spans several canvases

Every action, press and step turn names the canvas it acts on by its ordinal among the beat's questions, as `askedFrom` does; without it, the turn acts on the canvas last opened, and the existing beats replay unchanged. An utterance may start at a recorded time while the turn before it is still streaming, so several canvases' streams run on one clock. Two events sit beside a turn: the user viewing a canvas and the user closing one. The recorder sends them and records them as the replay plays them.

### 3. One beat per case

Seven beats, numbered 19 to 25, one per case. A case naming two things carries both in its one beat: "Ask this again now" and a question asked from a view; add/drop and "compare these"; an action and a press in a past canvas.

### 4. The recordings

The model is `gemini-3.7-flash`, each recorded beat carrying the deadlines and fault map it was made under.

| Beat | Case | Conversation |
|---|---|---|
| 19 | A tab finishing in the background | The entity join with CircleCI delayed; the temporal merge asked from live while it loads; the entity join viewed again, finishing there. |
| 20 | An action and a press in a past canvas | The temporal merge with Gmail failing fast, then the entity join; back on the first canvas, an event opened in its Calendar fragment and Retry pressed on Gmail. |
| 21 | "Ask this again now" and a question asked from a view | The temporal merge, then the entity join; back on the first canvas, "Ask this again now", then "Only the calendar part" asked from it. |
| 22 | Add/drop and "compare these" | Beat 4's "Put my inbox and my calendar side by side", then "Add GitHub to this", "without Gmail" and "compare these", each asked from it. |
| 23 | A step back with the wiring restored | The entity join; a CircleCI run opened, re-synthesized; Back on CircleCI, the seen combination restored with no call. |
| 24 | An unseen combination falling to the walk | The entity join; a CircleCI run opened, then a Linear issue opened; Back on CircleCI, a combination never merged, falling to the walk. |
| 25 | Closing a loading canvas | The temporal merge with GitHub delayed, closed from the trail while loading, its dispatch cancelled. |

### 5. A take shows its case

A take that does not show its case is taken again: beat 23's step answered with no synthesis call, beat 24's with one, beat 25's cancel in the journal.

### 6. Tests and specs here, baselines in 9.9

Vitest assertions on each new beat's end state, synthetic and recorded: the trail's entries and their parents, the parent standing; the canvas viewed and the one live; the background canvas's progress line; the action and the press landing in the past canvas with no new entry; the step back's paint and merged view restored with no synthesis on its stream; the unseen step's merge line working until its stream ends; the closed canvas gone and its turn cancelled. A Playwright visual spec over beats 19–25. The baselines are taken in 9.9. The shell catalog's design-check fixture stays as it is.

### 7. A deterministic drill-down is a new paint

In deterministic mode an action that opens a new screen — CircleCI's open-run and open-job, Linear's open-issue, Gmail's open-thread, Calendar's open-event — answers on a fresh surface, as the live agent paints it, so it is a step with a way back; every other action answers in place on the surface it came from. The kit's fixture player answers a fixture carrying a `createSurface` on a fresh surface; each vendor's corpus keeps the `createSurface` for its drill-downs.

### 8. A question asked from a view keeps the viewed canvas's sources

The Router's shortlist for a question naming a parent canvas carries that canvas's vendor sources past the cap, so the Planner can plan the child from what is on screen.
