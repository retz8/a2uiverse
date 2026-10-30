# 17.6 — The cache strategy, and other novel ideas for latency and tokens

The Planner's and the Synthesizer's prompts cached on both providers, their fixed prompts written compact, the `low` tier on Claude at its least effort, and a plan cache for a question asked again — built without a model run of its own, before 17.7 measures the Planner on Claude on top of it. Sub-task 17.6 of Phase 17 (`_dev/docs/spec/phase-17-latency.md`), worked on the phase branch (phase decision 3).

## Scope

- The fixed prompts of the Planner and the Synthesizer written compact.
- Prompt caching on Gemini and on Claude, on both seams.
- What the `low` tier sends on Claude.
- A plan cache for an utterance asked again.
- The journal's records of both caches.
- A capped live check, its findings in the notes.
- The orchestrator's design record and README.
- Out: the ideas recorded in the Backlog or set aside (decision 13); measuring the Planner on Claude — 17.7.

## Locked decisions

### 1. Scripted tests, and a live check capped at $0.50

Every part is proven by scripted tests. What scripts cannot prove is checked live, at most $0.50 for the whole check: Gemini's explicit cache created and used on the Planner and the Synthesizer, and whether the API refuses the prompt sent beside the cache's name; Claude's one-hour cache written then read on Haiku 5.5 and Sonnet 5.5; Claude accepting the thinking and effort of decision 6; the prompts' real token counts once compact. Its findings land in the notes.

### 2. The fixed prompts written compact

Every JSON part of both fixed prompts — the catalog schema, the output schema, the worked examples — is written without indentation or line breaks, in the Planner's prompt and the Synthesizer's. All twelve of the Planner's examples stay.

### 3. Gemini: an explicit cache on both seams

Each seam's fixed system prompt — the Planner's with its tools — is held in Gemini's explicit cache, and a request names the cache in place of sending them.

### 4. Gemini's cache created on first use and kept alive by use

The first turn sends the full prompt and creates the cache beside it without waiting for it. Each later use pushes its expiry an hour out, a call the turn does not wait on. An expired cache or a failed cache call sends that turn the full prompt, and a new cache is created. The cache is created through Gemini's REST API; no Google SDK is added beside the AI SDK.

### 5. Claude: one mark, an hour

One cache mark at the end of each seam's fixed system prompt, covering the tools ahead of it. The cache lives an hour, each use restarting it.

### 6. `low` on Claude is the least thinking and the least effort

On Claude, `low` sends the lowest thinking setting the model accepts — `between_tools` on Sonnet 5.5, thinking off on Haiku 5.5 — with effort `low`, on both seams. `default` stays the provider's own. Task-17.2 decision 4 amended: `low` is the least thinking and the least effort the provider accepts.

### 7. The plan cache: exact match on the whole request

A plan is reused only when the request the model would receive is byte for byte the same: its key is a hash of the fixed system prompt and the tools, the turn as built — the utterance, every shortlisted app's card with its accounts and sign-in state, the platform's card — the model and the effort. A hit calls no model; the validator re-checks the plan.

### 8. Stored after a clean turn, thrown out on a failure

Only a plan that called no tool is stored, once the validator accepted it — a retry's included — and every app it asked answered or asked the person to sign in. A stored plan is thrown out when a reuse fails the validator or an app it asked fails on that turn.

### 9. On disk, 200 plans, 7 days

The plan cache lives in the orchestrator's state folder beside the journal and survives a restart. The least recently used plan leaves past 200; a plan older than 7 days is not reused. Both numbers are starting values with no source behind them, set again from the hits the journal counts.

### 10. On by default, off for the measured passes

The plan cache is on by default and turned off by one setting: off for 17.7's passes and 17.11's acceptance, which send the same prompts three times.

### 11. The journal

A plan served from the plan cache is marked. Each model request's record carries the cache's writes beside the cached reads it already holds.

### 12. Neither cache breaks a turn

A cache that cannot be created, read, renewed or written leaves the turn to plan and merge as it does without it.

### 13. The ideas left out

To the Backlog: the Synthesizer writing edits for its retry and its merge again; speculative dispatch, beside 17.9; a fast path for simple utterances; a short written draft in place of thinking. Set aside: the catalog parts and examples chosen per turn; one Synthesizer call per slot; planning while the person types; predicted outputs; prompt compression.

### 14. The design record and the README

The orchestrator's design record and README are updated in this sub-task. The record carries the sources the plan cache and the prompt caches rest on, each checked against its primary text: storing only after a successful run ("Agentic Plan Caching", NeurIPS 2025), evicting an entry once it proves wrong (the AWS database blog, February 2026), keying on the whole request (Cloudflare's AI Gateway), and the evidence on exact against similarity matching.

## Invariants

- Gemini stays reachable as it is; a turn without either cache behaves as today.
- No model call beyond the live check.

## Open items

- 17.7 reads Claude, on this sub-task's compact prompts, against a Gemini baseline taken before them; whether Gemini is measured again on them is 17.7's decision.
