# Phase 17 — Latency

The wait the person feels on a turn — the plan before any slot, the vendors' answers, the merge — worked on from every side it has. The Planner and the Synthesizer are A2UIVerse's own and are worked on deliberately: the model, the effort, the prompt cache, and any piece of their turn replaced or added where something better exists. The vendor agents are worked on through the agent kit. The two streaming items the Backlog holds ship. Opens the agent kit and the orchestrator to models beyond Gemini. Starts from `_dev/docs/phase-17-model-trial-notes.md` and ends in it. Amends SPEC §5.5, §9.4 and §16.

## Scope

- Bring your own model, on both seams: the agent kit's model, and the orchestrator's Planner and Synthesizer. A model named by its provider, Gemini untouched, every test unchanged.
- A survey of the levers of the day for the Planner, the Synthesizer and the agent kit, before any lever moves.
- A baseline of where the time goes today, end to end and per agent, with the measurement the kit lacks added.
- The levers the survey chooses, each built, measured and decided in its own sub-task.
- The Planner's dispatch list streamed ahead of its layout tree, so vendors start before the layout completes.
- The synthesis fragment streamed into its reserved slot.
- The thinking budget and the effort as a dimension of every model the phase measures.
- The end-to-end runs over the A2UI-unique prompts in the notes that run on data the repos already hold — 1, 4, 6 and 10 — one single-app control, and the camera comparison, a plan that searches the Store; the prompts needing a seeded inbox — 2, 3 and 8 — and the flight question optional.
- The decision on the defaults Phase 18 records with.
- Doc edits, the design records and READMEs, the write-up.
- Out: the catalog stylesheet loading (found in 16.11), the tunnel's lost requests.

## Locked decisions

### 1. A latency phase, not a model trial alone

The phase covers every wait inside the Planner's and the Synthesizer's turns — their model calls, and the Store search a plan makes (found in 15.11) — the vendor agents' wait through the agent kit, and the two streaming items from the Backlog — the Planner's dispatch list ahead of its tree, the synthesis fragment into its reserved slot — as shipped runtime work. The client's catalog stylesheet loading and the tunnel's lost requests stay in the Backlog.

### 2. Each lever decided in its own sub-task, the defaults last

Bring your own model ships as a feature on the orchestrator: a model named by its provider, Gemini as it is, tests unchanged. On the agent kit it is the plumbing the kit's levers stand on — a Claude model reachable by name beside Gemini, the modes and every test unchanged, no generic road (task 17.1 decision 1); a further provider on either side is a lever the survey may name. Each lever the survey chooses is built in its own sub-task, measured there beside the baseline, and landed or taken out there by the person's decision. The acceptance measures what landed, together. The model and the effort on each seam — the Planner, the Synthesizer, the kit — are decided at the phase's end from the write-up, for Phase 18's recording.

### 3. One branch per repo, not worktrees

The phase's work, in both repos, is done on one branch, `phase-17/latency`, off `main`, merged to `main` when the phase ends; no branch per sub-task. For this phase `_dev/` edits ride that branch too and reach `main` with the merge. The TODO's line placing the phase in a worktree of the apps repo goes.

### 4. The levers

No lever is fixed ahead; the survey names them. On the orchestrator, anything inside the Planner's and the Synthesizer's turns — the model, the effort, the prompt cache, a piece of the turn replaced or added. On the vendor side, the agent kit alone: what the kit gains, every app on it gains, and no app's own files change for speed. The two streaming items are committed (decision 1).

### 5. Two prompt sets, layered

A kit lever is measured per agent over each app's recorded live prompts, repeated, agent alone — a controlled comparison. The baseline, the orchestrator's levers and the acceptance run end to end through the tunnel over the A2UI-unique prompts 1, 4, 6 and 10 from the notes, one single-app control, and "Compare camera prices at Shop A and Shop B." with Shop B uninstalled. The seeded-inbox prompts 2, 3 and 8, and "Book me a flight to Tokyo next Friday." with Shop A uninstalled, are optional.

### 6. A survey before any lever; the orchestrator first

The spec locks no model, no provider and no lever. A survey of the levers of the day, done before any lever moves, chooses the levers for the Planner, the Synthesizer and the kit, each with its cost and the code it needs, and names the keys they need; the sub-tasks after it are derived from that choice. The notes' candidate table is its starting point and is replaced by it. Model tokens are paid for: credits are held today on a Gemini API key and a Claude API key, and a lever on any other provider is a cost the survey states. The orchestrator's Planner and Synthesizer come first: they are A2UIVerse's own; the vendor agents stand in for vendors.

### 7. What makes a lever not worse on the orchestrator

Plan time, dead air and the first-try rate are measured over the end-to-end prompts. A lever on the orchestrator, a model among them, counts only when its plan — the sources dispatched, the planned columns, the join hypothesis — and its merge — the match claims, a decline, the note — read beside the baseline run's on the same prompts, dispatched the same sources and landed the same joins. The reading is the person's, in the write-up. The Synthesizer at `default` effort on the current model is one row.

### 8. The kit's reach

A kit lever is built and measured on GitHub and Linear. Gmail and CircleCI show what landed through the end-to-end prompts; Calendar is covered by its tests. A kit lever is judged by its paints read beside the recorded beat for the same prompt and by its first-try validation rate against the vendor's catalog.

### 9. The write-up

`_dev/docs/phase-17-model-trial-notes.md` is carried forward as the phase's write-up: the survey replaces its candidate section, the baseline and each lever append their results, the default decision closes it. The feature — naming a model by its provider on the kit and on the orchestrator, the keys, the effort — is documented in the agent-kit and orchestrator design records and READMEs.

### 10. Before and after, no target

The acceptance re-runs the end-to-end prompts through the tunnel after everything has landed and states each number — plan time, time to each fragment, dead air, time to the settled screen — beside the baseline's. No number is set as a target; the decision on the defaults is the person's.

### 11. Doc edits the phase carries

SPEC §9.4's mode names, which the kit spells `stub` and `live`; §16's dead-air consequence and §5.5's streaming line once the streaming items land; the TODO's worktree line.

## Invariants

- Gemini stays reachable as it is on both seams; the kit's modes and every app's tests are unchanged by the feature.
- No model, provider or lever is named by the spec; the survey names them, the write-up records them.
