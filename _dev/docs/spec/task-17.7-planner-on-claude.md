# 17.7 — The Planner on Claude

The Planner tried on Claude Sonnet 5.5 and on Claude Haiku 5.5 with 17.6's cache, over the six end-to-end prompts, read beside the baseline and decided there: Claude or Gemini. Sub-task 17.7 of Phase 17 (`_dev/docs/spec/phase-17-latency.md`), worked on the phase branch (phase decision 3).

## Scope

- The Planner on Claude Sonnet 5.5 and on Claude Haiku 5.5 at `low`, the rest of the stack as it is.
- The six end-to-end prompts through the tunnel: a first pass on each model, passes two and three on the person's approval.
- Each plan and merge read beside the baseline's (phase decision 7), the person's verdict per prompt.
- The choice among Gemini, Sonnet 5.5 and Haiku 5.5.
- The results entry, and an extract of each turn's numbers beside it.
- Out: a Gemini run; the `default` effort; the code's default Planner model — 17.11.

## Locked decisions

### 1. Read against the baseline as it stands

Claude, on 17.6's compact prompts and caches, is read against the Gemini baseline of 2026-10-29 (17.5). Gemini is not measured again; the model chosen is measured in 17.11's acceptance. This closes 17.6's open item.

### 2. `low` alone

Both models run the Planner at `low`: the least thinking each accepts, at effort `low` (task-17.6 decision 6). Each record stamps the effort as before.

### 3. A first pass each, the rest on approval

A pass is the six prompts once. A first pass runs on each model; its real cost and its plans are read beside the baseline's, and passes two and three run on the person's approval, only for a model whose plans held up (decision 5).

### 4. Run as the baseline ran

Each pass runs as task-17.5 decisions 7–12 ran the baseline: one utterance turn per prompt on a fresh canvas, nothing pressed inside the answer; sent through the tunnel by Claude-in-Chrome and read from the journal on the orchestrator's clock; the vendors live, every sign-in held, both Gmail accounts checked by name, Shop A installed for the camera comparison alone; as they fall, the first turn after a boot marked; a failed turn counted as it fell, a setup failure fixed and that prompt sent again. Three settings move: the Planner's model, the model under test; the Synthesizer named on `gemini-3.8-flash` at `low`; the plan cache off (task-17.6 decision 10). One model's pass, then the other's after a restart, Sonnet 5.5 first.

### 5. What holds up

Two checks: the plan asks the same apps as the baseline's on that prompt, and where the baseline planned a merge, it plans one on the same join. The planned columns and the merge's outcome — the match claims, a decline, the note — are read, not checked. Each prompt is laid beside the baseline's three passes with the differences marked; the verdict is the person's, per prompt.

### 6. The choice recorded, the default set in 17.11

17.7 ends in the person's choice among Gemini, Claude Sonnet 5.5 and Claude Haiku 5.5, written in the results. The Planner's default model in the code stays `gemini-3.8-flash`; 17.11 runs the acceptance on the choice and sets the default (phase decision 2).

### 7. The write-up

An entry in `_dev/docs/latency-and-token-experiment-results.md` in the baseline's shape: per prompt and per model the plan time, each app's first paint, the dead air, the settled screen and the merge; the Planner's requests with their time, tokens, cache reads and writes, and first tries; each pass's cost; the verdict per prompt. Beside it, each turn's numbers in the baseline extract's shape, `_dev/docs/phase-17-planner-on-claude-extract.json`.

## Invariants

- Nothing the models wrote and nothing the apps returned is committed.
