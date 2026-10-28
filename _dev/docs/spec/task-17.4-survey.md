# 17.4 — The survey

The levers of the day for the Planner, the Synthesizer and the agent kit, models among them — each with the wait it attacks, what it saves and what it costs — and the set recommended from them, the person's choice deriving the sub-tasks after the baseline. Sub-task 17.4 of Phase 17 (`_dev/docs/spec/phase-17-latency.md`), worked on the phase branch (phase decision 3).

## Scope

- The levers on the orchestrator — anything inside the Planner's and the Synthesizer's turns, the Store search a plan makes among them — and in the agent kit (phase decisions 1 and 4), on every provider.
- Each lever's row, its sources graded.
- The recommended set, with its measuring spend.
- The person's choice, and the sub-tasks from 17.6 on derived from it into the TODO.
- The notes' section 2 replaced.
- Out: any model call made by the survey; the baseline's numbers — 17.5; building or measuring a lever — the sub-tasks derived from the choice.

## Locked decisions

### 1. Every provider

Google and Anthropic, whose keys hold credits, and every other provider are surveyed. A lever on a third provider is named with its cost and the code it needs (phase decisions 2 and 6).

### 2. Gathered beside the baseline, chosen after it

The survey gathers while 17.5 runs and recommends once the baseline has landed, each lever's saving read against the baseline's split of the wait at today's settings. 17.4 closes after 17.5.

### 3. No tokens spent

The survey makes no model call. It works from published sources and from what is already measured: 17.2's sense on Claude, 17.3's run on Linear, 15.11's plans that searched the Store, and the baseline. A model is first run on A2UIVerse's prompts in the sub-task that takes it.

### 4. Each lever's measuring spend

Each recommended lever carries what measuring it will cost: the baseline's token counts for the prompts its sub-task runs, times the provider's published price, times the runs the sub-task needs (phase decision 5). The recommendation states the total; the person approves it or cuts levers before anything is spent.

### 5. Three grades of source

Every number names its source and the source's grade. Strongest, A2UIVerse's own measurements. Next, the provider's own pages — pricing, model cards, the API's documentation of caching and thinking — for price, limits and features; a speed figure there is marked as the provider's claim. Last, third-party benchmarks, dated, for speed only; where two disagree, both are stated. A claim with no source is not written.

### 6. A lever's row

Its side — the Planner, the Synthesizer or the kit; the wait it attacks, from the baseline; what it is expected to save, with its source and grade; the code it needs and the repo it lands in; the provider and the key; its measuring spend.

### 7. The survey recommends, the person chooses

The survey lists every lever it found and recommends a set with its total measuring spend. The person chooses in a session; the choice is written into the notes, and the sub-tasks from 17.6 on are derived from it into the TODO. Phase decision 6 amended: the survey recommends the levers, the person chooses.

### 8. Where it lands

The survey replaces section 2 of `_dev/docs/phase-17-model-trial-notes.md`, its candidate table and its sources; the old sources and the upstream threads carry forward where they back a lever.
