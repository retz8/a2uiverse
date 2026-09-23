# Task 8.6 — Beats

Phase 8's cases as beats (`_dev/docs/spec/phase-8-late-arrival-failure.md`, decision 13): synthetic beats for every late-arrival and failure case, and recorded beats over the deterministic roster through the AgentsPool's fault map for every case it reaches. SPEC §4.5, §5.1, §5.3, §8.

## Scope

- A synthetic beat for each case: a fast failure with Retry, a late arrival with Include, the home source straggling, an answer held past the hard cap drawn by Retry, a half-drawn fragment failing, an invalid paint, each collapse's line, the Retry race, a failed fold-in, Include after a decline, Try again, a collapsed merge brought back by Retry.
- A recorded beat for each case the fault map reaches.
- The press as a turn of a beat: in the beat's shape, in replay, and in the recorder.
- Vitest assertions and a Playwright visual spec over the new beats.

## Locked decisions

### 1. A beat carries the presses as a turn of its own

Retry, Include and Try again are a kind of turn in a beat: the operation and the slot or merge it names, its own stream, and its start measured on the turn it runs beside. Replay routes that stream into the live composition the way a live press's stream is routed. The recorder sends presses as well as utterances.

### 2. Replay fires a press at its recorded time, through the real press handler

A press turn fires by itself at its recorded time, through the same handler the button calls; a replay transport answers it with the recorded stream. The pressed state, focus and announcements draw as they do live, and a beat plays through with no click.

### 3. Every case the fault map reaches is recorded

Every case gets a synthetic beat. Every case the fault map reaches also gets a recorded beat, one recording per case: a fast failure and Retry, a late arrival and Include, the home source straggling, an answer held past the cap drawn by Retry, the Retry race, a half-drawn fragment failing, an invalid paint, the collapse lines for a failed home source and for fewer than two sources arriving. A failed fold-in, Try again on a merge that couldn't be made and its collapse line, a decline and Include after it are synthetic only.

### 4. The hard cap is shortened for its recordings

A beat that reaches the hard cap is recorded under a short cap from the orchestrator's environment, keeping its real timing. Every recorded beat carries the hard cap and soft deadline it was made under.

### 5. The recordings

A case with a home source is recorded over beat 9's prompt, the entity join over Linear, GitHub and CircleCI; a case among peers over beat 5's, the temporal merge over GitHub, Gmail and Calendar. The model is `gemini-3.7-flash`, as for the existing recordings. New recorded beats are numbered on from 10, one case to a beat.

### 6. Tests and specs here, baselines in 8.7

This task adds Vitest assertions on each new beat's end state and a Playwright visual spec for the new beats. The baselines are taken in 8.7 beside the existing ones retaken. The shell catalog's design-check fixture stays as it is.
