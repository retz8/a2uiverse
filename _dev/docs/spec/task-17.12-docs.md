# 17.12 — Design records, READMEs and doc edits

The phase written where a reader finds it: bring your own model, the keys and the effort in the agent-kit and orchestrator design records and READMEs; a summary of the latency work with its numbers in the root README, the reasoning behind each model and effort setting in its area's design record; the lines the phase made false corrected; SPEC's sections as the phase leaves them. Sub-task 17.12 of Phase 17 (`_dev/docs/spec/phase-17-latency.md`), its last, `[apps]`, worked on the phase branch in both repos (phase decision 3).

## Scope

- The root README: a section summarizing the latency work with its numbers, each model and effort setting with its reason, and that other models can be set.
- The orchestrator, synthesis and agent-kit design records: each seam's setting as an engineering decision; on the agent kit, bring your own model, the effort, Claude's limits on the kit and the per-request measurement.
- The orchestrator README's link to the root README's section; the kit README's note on Claude's limits.
- The lines the phase made false, in the root README and the orchestrator design record.
- The SPEC edits the phase spec lists (phase decision 11 and its amendments).

## Locked decisions

### 1. The summary in the root README

A section of the root `a2uiverse` README, "How fast it answers", after "How it works". It opens with one line naming the two measurements — six questions on 2026-10-29, and again on 2026-10-31 after a round of latency work — and names no phase.

### 2. The six-question table

The six questions in plain words, each with its plan, its first app on screen and its whole screen settled, before → after: the baseline's median of three passes on 2026-10-29 beside the acceptance's pass on 2026-10-31. Under the table, one line on Gemini spend a pass, and one line on the reading's limits: one pass against a median of three, the repos' data moved since, and "is main green" slower for GitHub's refused answer, its cause since fixed.

### 3. Each setting, one line

The Planner's, the Synthesizer's and the apps' settings, model and effort, each one line: the setting, its reason with its number, and the variables that change it. One sentence says they are defaults, with one example of naming another model.

### 4. Other models, as the code takes them

The Planner and the Synthesizer take any Gemini model, or any Claude model as `anthropic/<model>`. The apps take any Gemini model; Claude runs on them with the limits the kit README lists. The section names no provider beyond these two.

### 5. The reasoning in each area's design record

Each line of decision 3 links to the design record of its area: the Planner's to the orchestrator record, the Synthesizer's to the synthesis record, the apps' to the agent-kit record. There the setting is an engineering decision with what it buys and what it costs, the alternatives tried and their measurements, each number with its date. The Synthesizer's carries its run on Sonnet 5.5 beside `gemini-3.8-flash` (task-17.11 decision 9, amended).

### 6. Every run, in full

Under the table, one link, "Every run, in full", to `_dev/docs/latency-and-token-experiment-results.md`.

### 7. The agent-kit design record

The agent-kit design record gains bring your own model on the kit — a model named by its provider, its key — and the effort tier; Claude's three limits on the kit — the kit's `low` turning thinking off, which Sonnet 5.5, Opus 5.5 and Fable 5.1 refuse; an answer capped at 8,192 tokens by ADK's Claude class; nothing cached on Claude through the kit; and a section on how each model request is measured: ADK's before- and after-model hooks, what a record holds, where it is written.

### 8. The package READMEs

The orchestrator README stays as it is but for a link from its configuration to the root README's "How fast it answers". The kit README's `MODEL_NAME` row points to a short note under its table: Claude's three limits on the kit, and `MODEL_EFFORT=default` for Sonnet, Opus and Fable.

### 9. The lines the phase made false

Corrected beside the new section: the root README's "Try it" asking for a Claude key beside the Gemini one; its "How it works" diagram, and its step 2, the apps asked as the plan names them while the layout is still written; its "Where it's headed" line on models beyond Gemini, reworded to the apps' agents tried on Claude once the kit's three limits are fixed. In the orchestrator design record, its diagram and its sentence naming Gemini as the model the two steps ask.

### 10. SPEC

As the phase spec lists them (phase decision 11 and its amendments): §9.4's mode names as the kit spells them, `stub` and `live`; §4.5, §5's turn at t7, §5.2, §5.5, §5.6, §14's register row for the synthesize data model and §16, as the two streamings leave them.
