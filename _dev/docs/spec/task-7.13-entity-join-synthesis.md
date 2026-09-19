# Task 7.13 — The entity join's synthesis lands

The Synthesizer's merged view over the pinned utterance, "what's the status of what I'm working on?", brought to land on the deterministic bed before 7.9, integration and acceptance: the validator's findings handed back whole, the turn measured, and a change to the Synthesizer only where the measurement calls for it. Phase 7 (`_dev/docs/spec/phase-7-entity-resolution.md`) decision 13, item 1, the entity join end to end.

## Scope

- The Synthesizer's validator hands back every finding it can check on each attempt.
- The entity-join turn measured on the deterministic bed.
- Thinking, the model, or a data-model example in the Synthesizer's rules doc, each only where the measurement calls for it.
- The temporal merge checked after the last change.
- The TODO backlog and 7.13 line, the 7.6 and 7.8 specs, the worked examples' header comment, and the orchestrator and synthesis design records follow.
- Not here: a worked example of the entity join in the Synthesizer's prompt; the live bed, which is 7.9's.

## Locked decisions

### 1. No worked example in the prompt

No full worked example of the entity join — utterance, request, sources, tree, model — is added to the Synthesizer's prompt. The today timeline stays its one worked example.

### 2. The validator hands back every finding

A failing sort declaration no longer withholds the other checks. The derived-value rule, ref resolution and holds-now run whenever the derived data model's own structure is sound, so the one retry is handed every finding.

### 3. The measurement runs the whole turn on the deterministic bed

The pinned utterance is sent through the client's turn driver. The Planner and the Synthesizer call the model live; the vendors replay 7.8's recorded corpora. Each run is read from the intent journal; the measurement is not committed as a test.

### 4. What landing is

A run lands when the accepted document is the view acceptance item 1 expects: rows A2U-5, A2U-6 and A2U-7; #6 and #7 attached, each with its CircleCI run; A2U-7's attachments the empty cell, 0 of 0; #8 and the pull requests on `a2ui-project/a2ui` not rows; no entry attached by `judged`.

### 5. Every run lands

A round of the measurement stops at its first failure and passes on three landings in a row.

### 6. One change at a time, by failure kind

- A fact under `match` that does not hold: thinking on — the Synthesizer's effort from `low` to `default` on `gemini-2.5-flash` — then, if facts still fail, the model to `gemini-3.7-flash`.
- A form error — a dotted path, a ref to an attachment the data does not carry: the data-model example in the rules doc.
- A failed run showing both: thinking first; the data-model example only if form errors remain.

After each change the measurement runs again. The change that closes the task becomes the Synthesizer's committed default.

### 7. The data-model example shows the synthesis itself

Where the measurement calls for it, the example is a piece of the derived data model in the rules doc, not a full worked example.

### 8. When nothing closes it

If runs still fail after thinking, the model and the data-model example, the task stops and the next step is discussed.

### 9. The temporal merge after the last change

After the last change is committed, "What needs my attention today?" runs once on the deterministic bed and lands. If it does not, the change is reconsidered within this task.

### 10. Records

The backlog's "Stream the synthesis fragment" item gains the closing round's dead air, with the Synthesizer's model and effort. The backlog's Synthesizer effort item is updated to what was committed, or removed. The 7.13 line, when done, names what closed it.

### 11. Earlier docs follow

The 7.6 spec's not-here line and decisions 9 and 18, the 7.8 spec's opening paragraph and not-here line, the worked examples' header comment, and the TODO's 7.13 line name 7.13 as the entity join's synthesis landing. The orchestrator and synthesis design records follow what the task changes.

### 12. Done

The closing round's three landings, the temporal merge's run landing, and the gates green with the vendor agents stopped.

## Open items

- The data-model example's content — its domain, its data, which forms it shows — settled in chat within this task, only if the measurement calls for it.
