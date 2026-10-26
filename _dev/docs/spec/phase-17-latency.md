# Phase 17 — Latency

The wait the person feels on a turn — the plan before any slot, the vendors' answers, the merge — worked on from every side it has: the models behind the Planner, the Synthesizer and the vendor agents tried against today's, the two streaming items the Backlog holds shipped, and the kit's prompt size measured. Opens the agent kit and the orchestrator to models beyond Gemini as a feature. Starts from `_dev/docs/phase-17-model-trial-notes.md` and ends in it. Amends SPEC §5.5, §9.4 and §16.

## Scope

- Bring your own model, on both seams: the agent kit's model, and the orchestrator's Planner and Synthesizer. A model named by its provider, Gemini untouched, every test unchanged.
- The model trial on the orchestrator's Planner and Synthesizer, and on the vendor agents — GitHub and Linear, the other three real vendors conditionally.
- A survey of the models of the day before any trial.
- A baseline of where the time goes today, end to end and per agent, with the measurement the kit lacks added.
- The Planner's dispatch list streamed ahead of its layout tree, so vendors start before the layout completes.
- The synthesis fragment streamed into its reserved slot.
- Thinking budget as a dimension of every trial row.
- Prompt-size reduction in the agent kit, gated on the baseline.
- The end-to-end runs over the A2UI-unique prompts in the notes that run on data the repos already hold — 1, 4, 6 and 10 — and one single-app control; the prompts needing a seeded inbox — 2, 3 and 8 — optional.
- The decision on the defaults Phase 18 records with.
- Doc edits, the design records and READMEs, the write-up.
- Out: the catalog stylesheet loading (found in 16.11), the Store-search plan time (found in 15.11), the tunnel's lost requests.

## Locked decisions

### 1. A latency phase, not a model trial alone

The phase covers the vendor-agent model trial the TODO named, the orchestrator's model seam, and the two streaming items from the Backlog — the Planner's dispatch list ahead of its tree, the synthesis fragment into its reserved slot — as shipped runtime work. The waits that are not model calls stay in the Backlog.

### 2. Plumbing ships, trials are experiments, defaults are decided last

Bring your own model ships as a feature on the agent kit and on the orchestrator alike: a model named by its provider on each seam, Gemini as it is, the modes and every test unchanged. The trials run as experiments on the same branch and produce the write-up. Whether any default changes — the model, the thinking budget or effort, on either side — is decided at the phase's end from the write-up, for Phase 18's recording; nothing is promised before the numbers exist.

### 3. Branches, not worktrees

The phase's work, in both repos, is done on branches. The TODO's line placing the phase in a worktree of the apps repo goes.

### 4. Four levers

The model; streaming; the thinking budget, tried on Gemini and on every candidate — nothing in the kit sets one today, the orchestrator already runs its two calls at low effort; and the prompt size — the agent kit's system prompt, three-quarters of it the catalog schema block on GitHub — whose reduction is gated by decision 9.

### 5. Two prompt sets, layered

The vendor trial runs per agent over each app's recorded live prompts, repeated, agent alone — a controlled comparison across models. The baseline and the acceptance run end to end through the tunnel over the A2UI-unique prompts 1, 4, 6 and 10 from the notes and one single-app control. The seeded-inbox prompts 2, 3 and 8 are optional.

### 6. A survey before the trials; the orchestrator first

The spec locks no model and no provider. A survey of the models of the day, done before the trials, chooses the candidates for each seam and names the keys they need; the notes' candidate table is its starting point and is replaced by it. Model tokens are paid for: credits are held today on a Gemini API key and a Claude API key, and a candidate on any other provider is a cost the survey states. The orchestrator's Planner and Synthesizer are tried first: they are A2UIVerse's own; the vendor agents stand in for vendors.

### 7. What makes a candidate not worse on the orchestrator

Plan time, dead air and the first-try rate are measured over the five end-to-end prompts. A candidate ranks only among those whose plan — the sources dispatched, the planned columns, the join hypothesis — and whose merge — the match claims, a decline, the note — read beside the baseline run's on the same prompts, dispatched the same sources and landed the same joins. The reading is the person's, in the write-up. The Synthesizer at `default` effort on the current model is one row.

### 8. The vendor trial's reach

GitHub and Linear. Gmail, Calendar and CircleCI only if a candidate beats Gemini on both. A vendor candidate is judged by its paints read beside the recorded beat for the same prompt and by its first-try validation rate against the vendor's catalog.

### 9. The prompt-size gate

The baseline records, per agent and per recorded prompt, the time to first token and the generation time after it; the kit records neither today, and adding them ships. The gate fires when, on GitHub at the baseline model with thinking off, the median time to first token is at least the median generation time. Only then does the kit's schema block get shrunk, and how is that sub-task's own decision.

### 10. The write-up

`_dev/docs/phase-17-model-trial-notes.md` is carried forward as the phase's write-up: the survey replaces its candidate section, the baseline and the trials append their results, the default decision closes it. The feature — naming a model by its provider on the kit and on the orchestrator, the keys, the effort — is documented in the agent-kit and orchestrator design records and READMEs.

### 11. Before and after, no target

The acceptance re-runs the five end-to-end prompts through the tunnel after everything has landed and states each number — plan time, time to each fragment, dead air, time to the settled screen — beside the baseline's. No number is set as a target; the decision on the defaults is the person's.

### 12. Doc edits the phase carries

SPEC §9.4's mode names, which the kit spells `stub` and `live`; §16's dead-air consequence and §5.5's streaming line once the streaming items land; the TODO's worktree line.

## Invariants

- Gemini stays reachable as it is on both seams; the kit's modes and every app's tests are unchanged by the feature.
- No model or provider is named by the spec; the survey names them, the write-up records them.
