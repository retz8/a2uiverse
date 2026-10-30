# Phase 17 notes — the latency survey and A2UI-unique prompts

The write-up of Phase 17, the latency phase. Where the time goes, the survey of the levers with their sources, and the prompts that exercise what only a composition across independent agents can answer. Every run's results, the baseline among them, are in [`latency-and-token-experiment-results.md`](latency-and-token-experiment-results.md).

---

## 1. Where the time goes today

Every model call runs on `gemini-3.8-flash`. The orchestrator's Planner and Synthesizer run at low effort, Gemini's `low` thinking level (17.3). The agent kit's vendor agents run with thinking on.

| Measurement | Value | Where recorded |
| --- | --- | --- |
| Linear live run, first UI byte (`paintMeta`, then `createSurface`) | 28.7 s, 29.0 s | `docs/design/agent-kit.md`, "One question, end to end" |
| Live roster, dispatch settle after the plan — Linear · CircleCI · GitHub | 27–30 s · 33–36 s · 51–65 s | `_dev/TODO.md` backlog, dead-air entry (7.9) |
| Plan, live roster | 6–7 s | same entry |
| Upstream's own measurement: 722 output tokens on 6,800 prompt tokens · 2,248 on 7,256 | 10.6 s · 19.5 s | [Issue #1826](https://github.com/a2ui-project/a2ui/issues/1826) |

In the kit's live mode every action inside a fragment is framed as text for the model, which composes the next surface: one click, one full generation (`docs/design/agent-kit.md`, step 2).

---

## 2. The survey

The levers of the day for the Planner, the Synthesizer and the agent kit (task 17.4), read on 2026-10-28 with no model call made. Each fact carries its grade: **ours** — A2UIVerse's code or its own measurements; **provider** — the provider's own pages, a speed figure there the provider's claim; **third-party** — benchmarks, dated, speed only. Artificial Analysis's figures are medians over the past 72 hours on a prompt of about 10k input tokens, its time to first token counting the model's thinking [32]; OpenRouter's are medians over its live traffic, the prompt length unstated [33]. Three columns of every lever wait on the baseline (17.5): the wait it attacks, its expected saving, its measuring spend.

### 2.1 The prompts today (ours)

| | Planner | Synthesizer | GitHub agent | Linear agent |
| --- | --- | --- | --- | --- |
| System prompt | 114,683 characters | 73,704 characters | 299,694 characters | 73,945 characters |
| Of it, the catalog schema | 40,056 (pruned) | 32,258 (pruned) | about 216.5k | about 24.0k |
| Examples | 12 | 1 | 4 | 3 |
| Fixed across turns | the whole system prompt, built at boot; every per-turn part after it | the same | the whole system prompt; the session's history growing each turn | the same |
| Cache marked | none | none | none | none |
| Usage recorded | none | none | per model request, since 17.3 | per model request, since 17.3 |
| Model requests | up to five steps an attempt, two attempts | one, two on a retry | one per tool round, one for the paint | three on beat 1 (17.3) |

Sources: `apps/orchestrator/src/planner/prompt.ts:68-83` and `src/synthesizer/prompt.ts:119-134`, the lengths from the real prompt builders; `planner.ts:41-43`, `synthesizer.ts:64`; in `a2uiverse-apps`, `agent-kit/src/a2ui_agent_kit/prompt.py:61-94`, each agent's system-prompt dump of 2026-10-27, `measurement.py`, `responder.py:139-145`.

### 2.2 Models

Price per million tokens, input / output / cached input (provider). Speed as output tokens per second and time to first token (third-party).

| Model · host | Price | Least thinking | Artificial Analysis | OpenRouter | Context / output |
| --- | --- | --- | --- | --- | --- |
| `gemini-3.8-flash` · Google | 0.75 / 3.75 / 0.075 to 2026-12-31, then 1.50 / 7.50 / 0.15 [1] | `low`; `minimal` refused; thinking not fully off [3][4] | at `high`: 132.6, 27.26 s; `low` not measured [31] | 72, 3.19 s [33] | 1,048,576 / 65,536 [2] |
| `gemini-3.6-flash` · Google | 0.75 / 3.75 / 0.075, doubling on 2027-01-01 [1] | `minimal` [3] | at `high`: 202.5, 14.40 s [31] | — | 1,048,576 / 65,536 [2] |
| `gemini-3.5-flash-lite` · Google | 0.30 / 2.50 / 0.03 [1] | `minimal`, its default [3] | 460.6, 6.63 s, level not stated [31] | — | 1,048,576 / 65,536 [2] |
| `gemini-3.1-flash-lite` · Google | 0.25 / 1.50 / 0.025 [1] | `minimal`, its default [3] | not found | — | 1,048,576 / 65,536 [2] |
| `gemini-4-argon` · Google | 2.00 / 10.00 / 0.10 to 2026-11-30, then 4.00 / 20.00 / 0.20 [1] | `low`; thinking cannot be disabled [3] | at `high`: 82.0, 46.64 s [31] | — | 1,048,576 shared / 65,536 [2] |
| Claude Haiku 5.5 · Anthropic | 0.10 / 0.50 / 0.01 up to 100k prompt tokens; 0.50 / 2.50 / 0.05 above [8] | thinking `disabled`, effort `low` [10][11] | at `low`: 185.0, 7.51 s; `medium` 175.1, 10.36 s [31] | 159, 1.91 s [33] | 1M / 128K [7] |
| Claude Sonnet 5.5 · Anthropic | 2 / 10 / 0.10 [8] | `between_tools`, effort `low`; `disabled` refused [10][11] | at `low`: 109.4, 1.29 s [31] | 95, 1.86 s [33] | 1M / 128K [7] |
| Claude Opus 5.5 · Anthropic | 4 / 20 / 0.20; fast mode 8 / 40 [8][13] | effort `low`; `disabled` refused [10][11] | at `low`: 82.1, 5.24 s [31] | — | 1M / 128K [7] |
| Claude Fable 5.1 · Anthropic | 10 / 50 / 0.25 [8] | effort `low`; `disabled` refused [10][11] | at `max`: 66.4, 132.23 s [31] | — | 1M / 128K [7] |
| gpt-oss-120b · Cerebras | 0.35 / 0.75; a cached token at the full price [21][22] | a reasoning model, run at `low` | at `low`: 1,991, 0.37 s [31] | 476, 0.38 s [33] | 131k / 40k [21] |
| gpt-oss-120b · Groq | 0.15 / 0.60 / 0.075 [24] | as above | at `low`: 471, 0.67 s [31] | 325, 0.20 s [33] | 131,072 / 65,536 [24] |
| GLM-5.3-Flash · Together | 0.15 / 0.50 / 0.03 [26][27] | not read | 253, 0.67 s [31] | 168, 0.55 s [33] | 1,048,575 [26] |
| MiniMax M3.1 Flash · Together | 0.15 / 0.60 / 0.015 [26][27] | not read | 225, 0.57 s [31] | 191, 0.67 s [33] | 1,048,576 [26] |
| DeepSeek V4.1 Flash 1017 · Together | 0.30 / 1.20 / 0.006 [26][27] | not read | at `max`: 347, 0.32 s [31] | 269, 0.22 s [33] | 1,000,000 [26] |
| GPT-6 Luna · OpenAI | 0.10 / 0.50 / 0.01 [28] | `none` | at `low`: 121, 2.60 s; without reasoning 116, 0.89 s [31] | 66, 2.54 s [33] | 1.05M / 128K [28] |

Ours, one prompt and one sample each (17.2): the Planner on Sonnet 5.5 3.7 s at `default` and 5.3 s at `low`, on Haiku 5.5 5.4 s at `default` and 8.4 s at `low` with one retry; the Synthesizer at `low` on Haiku 5.5 5.9 s, on Sonnet 5.5 8.9 s. On `gemini-3.8-flash` called directly, the `low` thinking level 1.6 s to first token, a zero budget not honoured (17.3).

Reach: Google and Anthropic on both seams as they are; a third provider is one official AI SDK package and one registry entry on the orchestrator — `@ai-sdk/cerebras`, `@ai-sdk/groq`, `@ai-sdk/togetherai`, `@ai-sdk/openai`, each on the `@ai-sdk/provider` release that the current `ai`, `@ai-sdk/google` and `@ai-sdk/anthropic` share [30] (task 17.2 decision 1) — and a road the kit does not have (task 17.1 decision 1). Groq's gpt-oss models make no parallel tool calls [25]. Cerebras's strict JSON schema allows at most 5,000 characters of schema text [23].

### 2.3 The Planner and the Synthesizer

**Prompt caching**
- Evidence: both system prompts are fixed at boot with every per-turn part after them, nothing marks a cache and nothing records usage, so whether Gemini's implicit cache serves them today is unknown (ours, section 2.1). Gemini caches implicitly from 4,096 prompt tokens on 3.8 Flash, a cached token at a tenth of the input price, no saving guaranteed; explicit caching on Gemini 3 adds storage, 0.50 per million tokens an hour on 3.8 Flash [1][5] (provider). Claude caches only what a request marks, from 512 tokens on Haiku 5.5 and Sonnet 5.5, read at 0.1× the input price — 0.05× on Sonnet 5.5 and Opus 5.5 — and written at 1.25× for five minutes; a change of the effort or thinking setting invalidates it [8][9] (provider). The AI SDK marks it with `providerOptions.anthropic.cacheControl` on the system message and reports cached reads as `usage.inputTokenDetails.cacheReadTokens` on both providers [15][16] (provider). Anthropic's launch post: a 100k-token prompt from 11.5 s to 2.4 s to first token, a 10k-token one from 1.6 s to 1.1 s [14] (provider's claim).
- Code: the model seam, `apps/orchestrator/src/model/` — `a2uiverse`.
- Provider and key: Anthropic for the marking; Gemini as it is.
- Wait · saving · spend: the prompt's part of a plan and a merge. The Planner's requests cached on 4 of 21 in the baseline, 29,533–29,569 of about 32k prompt tokens when they did, the Synthesizer's on none (ours, the baseline's tokens). Over the Planner's 21 requests the time fits about 4.4 s plus 7.5 ms an output token (r² 0.92), and the four cached requests ran no faster than the fit (ours, the extract): no saving in time is seen. On Gemini the saving is the price: about $0.18 a pass on the Planner's and the Synthesizer's uncached prompts at a tenth of the input price [1]. On Claude it is marked with a Claude model. Spend: none of its own.

**The Store search in fewer rounds**
- Evidence: a Planner attempt takes up to five steps — the three readers, the search, the answer — each sending the whole conversation again, system prompt first; the AI SDK runs one step's tool calls concurrently, the model choosing whether to make several in one step (ours, `src/planner/planner.ts:42-43, 101-109`; [17] provider). Plans that searched the Store took 28 s, 33 s and 41 s, and 66 s over three searches (ours, task 15.11).
- Code: the Planner — `a2uiverse`.
- Provider and key: none new.
- Wait · saving · spend: the camera comparison's plan, 21.5 s at the median — its request ending in the Store search 3.5–4.3 s and the search 17–22 ms, before the plan's own request, 16.5–27.4 s (ours, the baseline's split of the wait). Fewer rounds save at most that first request, 3.5–4.3 s on the one prompt that searches. Spend: the camera comparison end to end three times, its Planner requests and Shop A $0.07–0.10 a pass: about $0.25 (ours, the extract).

**The model and the effort**
- Evidence: section 2.2. The Synthesizer at `default` effort on the current model is one row (phase decision 7).
- Code: configuration on Google and Anthropic; a package and a registry entry for a third provider — `a2uiverse`.
- Provider and key: per row.
- Wait · saving · spend: the plan, 6.7–54.8 s at the median, and the dead air, 11.0–28.1 s. The Planner's time follows its output, about 4.4 s plus 7.5 ms an output token over its 21 requests (r² 0.92), 83% of the output reasoning at `low`, its text a median 506 tokens (ours, the baseline and the extract): a plan without reasoning keeps the text and the fixed part, about 6–8 s on this model; 17.2's sense put the Planner on Sonnet 5.5 at 3.7–5.3 s and on Haiku 5.5 at 5.4–8.4 s (ours, one sample each); `gemini-3.8-flash` offers nothing below `low` [3][4]. The Synthesizer reasons almost nothing at `low`, 3,397 tokens over 12 requests, and writes its merged views, 1,899–4,547 tokens, at 132–181 tokens a second (ours, the baseline): its dead air falls with a model's output speed — 460.6 tokens a second on `gemini-3.5-flash-lite`, 185.0 on Haiku 5.5 at `low` [31] (third-party). At `default` the model thinks as it decides [3]. Spend: three end-to-end passes, the rest of the stack at the baseline's cost of a pass less the seam measured, $2.42 a pass for the Planner and $2.55 for the Synthesizer (passes 2 and 3, the baseline's cost), the seam at its model's price on the baseline's counts — the Planner's 223,200 prompt and 18,700 output tokens a pass, Sonnet 5.5 $0.63, Haiku 5.5 $0.03, `gemini-3.5-flash-lite` $0.11; the Synthesizer's 76,800 and 8,500, Sonnet 5.5 $0.24, Haiku 5.5 $0.01, `gemini-3.5-flash-lite` $0.04 [1][8]. A Planner model $7.35–9.15; a Synthesizer model $7.68–8.37.

**Native structured output**
- Evidence: the Planner and the Synthesizer write JSON as text, validated after, one retry carrying the failure (ours, `planner.ts:41, 127-154`; `synthesizer.ts:64, 138-168`). Schema-constrained output is offered on both providers; on Anthropic a schema's first use waits for its grammar to compile, kept 24 hours, and a change of output format invalidates the prompt cache [12] (provider). On Haiku 5.5 with thinking off, a request for JSON output can skip a tool call the model needs [10] (provider).
- Code: the Planner and the Synthesizer — `a2uiverse`.
- Provider and key: none new.
- Wait · saving · spend: the retry. The Planner's plans were accepted on the first try 18 of 18; the Synthesizer's merges 7 of 9, one refused for a match claim whose fact did not hold, one for a schema error in its sorts, that retry 23.3 s of dead air (ours, the baseline's journal). Schema-constrained output answers the second kind: one retry in nine merges. Spend: three end-to-end passes, the rest of the stack at the baseline's cost of a pass less the seam measured, $2.42 a pass for the Planner and $2.55 for the Synthesizer (passes 2 and 3, the baseline's cost), the seam at its model's price on the baseline's counts, about $7.90.

**A compact output format**
- Evidence: upstream A2UI's Express writes components as one-line assignments, compiled to A2UI JSON, claimed 55–70% fewer output tokens, targeting v1.0, v0.9 and v0.9.1 [34] (provider). Upstream's own evaluation on `gemini-3.5-flash` at a thinking budget of zero, medians: Express 307 output tokens against 958 for direct JSON, 9.30 s against 5.54 s, schema accuracy 0.961 for both, no reason for the slower time recorded [35] (third-party). OpenAI's latency guide: halving output tokens cuts about 50% of latency, halving the prompt 1–5% [29] (provider's claim, for its own models). The Planner's layout surface is A2UI in the shell catalog; of the Synthesizer's document only the tree is (SPEC §5.2, §5.6).
- Code: the Planner's prompt and the orchestrator's parse — `a2uiverse`.
- Provider and key: none new.
- Wait · saving · spend: the output. The Planner's text is a median 506 tokens, 17% of its output (ours, the baseline): 55–70% fewer is about 280–350 tokens, some 2–3 s at 7.5 ms a token. The Synthesizer's merged views are 1,899–4,547 tokens, of which only the tree is A2UI. Upstream's own run had Express slower than direct JSON [35]. Spend: three end-to-end passes, the rest of the stack at the baseline's cost of a pass less the seam measured, $2.42 a pass for the Planner and $2.55 for the Synthesizer (passes 2 and 3, the baseline's cost), the seam at its model's price on the baseline's counts, about $7.90.

**A faster serving tier**
- Evidence: Gemini's priority inference costs 75–100% more than standard, for billing tiers 2 and 3, its latency "seconds" against standard's "seconds to minutes" [6] (provider's claim); on OpenRouter, `gemini-3.8-flash` on AI Studio's priority tier 2.79 s to first token against 3.19 s on standard [33] (third-party). Opus 5.5's fast mode raises output tokens per second up to 2.5×, not the time to first token, at 8 / 40 [8][13] (provider's claim).
- Code: a provider option at the model seam — `a2uiverse`.
- Provider and key: Google, on a higher billing tier; Anthropic.
- Wait · saving · spend: the plan and the merge follow their output (ours, the baseline); the one figure for Gemini's priority tier is the time to first token, 0.4 s sooner [33] (third-party), none for the output speed. Spend: three end-to-end passes, the rest of the stack at the baseline's cost of a pass less the seam measured, $2.42 a pass for the Planner and $2.55 for the Synthesizer (passes 2 and 3, the baseline's cost), the seam at its model's price on the baseline's counts, about $7.90, the measured seam 75–100% dearer [6].

### 2.4 The agent kit

**Prompt caching on Claude**
- Evidence: on Gemini the implicit cache already serves — Linear's beat 1 re-read a 25–32k-token prompt on each of its three requests, Gemini's cache serving most of it from the second (ours, 17.3). On Claude nothing is cached: ADK's Anthropic class places cache breakpoints from 2.8 on, only under an app-level context cache config [18][19] (provider), and the kit builds ADK's Runner with no App (ours, `responder.py:139-145`); GitHub, Gmail and Calendar lock google-adk 2.5.0, whose Anthropic class places none (ours, each app's `uv.lock`). Claude's rules and prices as in the Planner's row [8][9].
- Code: the kit and every app's google-adk lock — `a2uiverse-apps`.
- Provider and key: Anthropic.
- Wait · saving · spend: on Gemini the apps' prompts are cached already, 43–85% of their prompt tokens (ours, the baseline's tokens); the lever stands only with Claude on the kit, where nothing is cached and GitHub's tool rounds send a median 145,944 prompt tokens each (ours, the extract). Spend: with a Claude model on the kit.

**Tool calls in one step**
- Evidence: a turn makes one model request per tool round and one for the paint, three on Linear's beat 1 — two tool calls, then the paint (ours, 17.3). ADK runs the tool calls of one response concurrently, an async tool not blocking the rest [20] (provider); the kit asks for one tool per turn only in its correction after a malformed function call (ours, `executor_llm.py:71-75`).
- Code: the kit — `a2uiverse-apps`.
- Provider and key: none new.
- Wait · saving · spend: the apps' tool rounds. 249 of their 257 tool-call responses called one tool; a round's first token took a median 2.5–5.3 s by app; a run made 0–32 rounds, 0–241 s of model time, Gmail on prompt 10 the most (ours, the baseline and the extract). The saving is the rounds folded together, each about its first token; how many of a run's calls stand apart from one another is not measured. Spend: GitHub's and Linear's recorded beats agent alone (phase decision 8) — GitHub's beats 8 and 9, Linear's 1, 2 and 3's proposal and confirm — three times without the lever and three with, at the baseline's cost of a run, a median $0.25 on GitHub and $0.07 on Linear: about $4.65 (ours, the extract).

**A smaller prompt**
- Evidence: GitHub's catalog schema is about 216.5k of its prompt's 300k characters (ours, section 2.1). A catalog subset per turn through upstream's `ComponentPruningTransformer`, and the catalog as a skill the model loads on demand, are named in a reply to discussion #2779 [38] (third-party). GitHub's agent loads every MCP toolset, each tool's definition riding every request (ours, `github/agent/app/mcp.py:33`) — the app's own file (phase decision 4).
- Code: the kit — `a2uiverse-apps`.
- Provider and key: none new.
- Wait · saving · spend: a round's first token barely follows the prompt's size, most of it cached — medians of 2.5 s on Shop A's 15k-token rounds, 4.6 s on Linear's 23k, 3.6 s on CircleCI's 28k, 5.3 s on Gmail's 115k, 4.9 s on GitHub's 146k (ours, the extract): a second a round at most. The cost follows it: GitHub's prompt tokens were $2.99 of the passes' $8.74 (ours, the baseline's tokens). Spend: as tool calls in one step, about $4.65.

**The model and the thinking tier**
- Evidence: section 2.2, Gemini by name and Claude as `anthropic/…` on the kit.
- Code: configuration; a third provider a road the kit does not have — `a2uiverse-apps`.
- Provider and key: per row.
- Wait · saving · spend: the apps' paint, the longest part of the longest leg. A run's request ending in text waited a median 48.5 s for its first token (8.3–118.9), thinking a median 6,470 tokens, about 142 a second, at the kit's `default`, then generated for a median 8.8 s (ours, the baseline). On the direct check the `low` level left no thinking and 1.6 s to first token, against 18k thinking tokens and 123 s with nothing set (ours, 17.3); the Planner at `low` still reasons a median 1,766 tokens on its own prompt (ours, the baseline). The saving is most of the paint's first token, up to about 45 s a run. `low` is configuration, `MODEL_EFFORT=low`. Claude on the kit waits on section 2.5's defects and an uncached prompt. Spend: as tool calls in one step, about $4.65.

**A compact output format**
- Evidence: Express as in the Planner's row [34][35]; in upstream's Python SDK, Express does not stream, only direct JSON does [36] (provider). The kit streams a paint as it parses it (ours, `responder.py:187-192`).
- Code: the kit — `a2uiverse-apps`.
- Provider and key: none new.
- Wait · saving · spend: the paint's generation, a median 1,656 output tokens in 8.8 s, about 176 a second (ours, the baseline): 55–70% fewer is some 5–6 s a paint [34]. Express does not stream [36], so the kit's first batch waits for the whole paint. Spend: as tool calls in one step, about $4.65.

**Templates on frequent presses**
- Evidence: in live mode every press inside a fragment is one full generation (ours, `docs/design/agent-kit.md`, step 2). Upstream issue #657, template-based inference, open at P2 since 2026-02-23, its template-schema child #721 closed as not planned on 2026-10-15 [37]; replies in discussions #1207, #2779 and #3068 name a fixed tree with data updates on hot paths, or the model picking a template and filling its data [38][39] (third-party). No measurement found.
- Code: the kit — `a2uiverse-apps`.
- Provider and key: none new.
- Wait · saving · spend: the presses; the baseline presses nothing (task-17.5 decision 7), so it has no number to read a saving against. Spend: not estimated.

### 2.5 Defects found

- The kit's `low` on a Claude model sends a thinking budget of zero, which ADK's Anthropic class maps to thinking disabled (ours, `modes.py:53-72`; google-adk `anthropic_llm.py:190-191`); Sonnet 5.5, Opus 5.5 and Fable 5.1 refuse disabled thinking with a 400, Haiku 5.5 accepts it [10] (provider). The record does not name the Claude model 17.1's proof ran on.
- ADK's Anthropic class caps a response at 8,192 output tokens by default (ours, google-adk 2.8.0 `anthropic_llm.py:932`); the Claude models allow 128K [7] (provider).
- `@ai-sdk/google` 4.0.106 resolves the least thinking level on Gemini 4 Argon to `minimal` (ours, read in its source, not run), which Argon refuses [3] (provider).

### 2.6 The recommendation

Each lever's saving read against the baseline's split of the wait (the baseline), within the Gemini and Claude keys held today. Recommended:

| Lever | Side | The wait it attacks | Expected saving | Code · repo | Key | Measuring spend |
| --- | --- | --- | --- | --- | --- | --- |
| The thinking tier `low` | the kit | the paint's first token, a median 48.5 s an app's run | most of it, up to about 45 s a run (ours, 17.3 and the baseline) | configuration · `a2uiverse-apps` | Gemini | about $4.65 |
| The Planner on Claude Sonnet 5.5 | the Planner | the plan, 6.7–54.8 s at the median | to about 3.7–5.3 s (ours, 17.2's one sample and the baseline) | configuration · `a2uiverse` | Claude | $9.15 |

Together about $13.80. The rest, each with its spend above: the Synthesizer's model, $7.68–8.37; tool calls in one step, about $4.65, its saving unmeasured; the Store search in fewer rounds, about $0.25, at most 3.5–4.3 s on one prompt; prompt caching on its own, no saving in time seen and $0.18 a pass; native structured output, one retry in nine merges; a compact output format, about 2–3 s a plan and 5–6 s a paint, the kit's streaming lost; a faster serving tier, no source for its output speed; a smaller prompt, a second a round; templates on presses, no press measured; Claude on the kit, behind section 2.5's defects.

Chosen on 2026-10-30: the recommendation, the Planner on Claude tried on both Sonnet 5.5 and Haiku 5.5, with the cache strategy beside Claude's cache.

| Lever | Sub-task | Measuring spend |
| --- | --- | --- |
| The cache strategy, the Planner's and the Synthesizer's prompts on both providers, and other novel ideas for their latency and tokens | 17.6 | none of its own, measured in 17.7's passes on Claude |
| The Planner on Claude Sonnet 5.5 and on Claude Haiku 5.5, with 17.6's cache | 17.7 | $9.15 and $7.35 |
| The kit's thinking tier `low` | 17.8 | about $4.65 |

Together about $21.15.

### Sources

All read on 2026-10-28.

1. [Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing) — provider
2. [Gemini models](https://ai.google.dev/gemini-api/docs/models), and each model's page under it — provider
3. [Thinking — Gemini API](https://ai.google.dev/gemini-api/docs/generate-content/thinking) — provider
4. [What's new in Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/whats-new-gemini-3.8) — provider
5. [Context caching — Gemini API](https://ai.google.dev/gemini-api/docs/generate-content/caching) — provider
6. [Priority inference — Gemini API](https://ai.google.dev/gemini-api/docs/generate-content/priority-inference) — provider
7. [Models overview — Claude](https://platform.claude.com/docs/en/about-claude/models/overview) — provider
8. [Pricing — Claude](https://platform.claude.com/docs/en/about-claude/pricing) — provider
9. [Prompt caching — Claude](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) — provider
10. [Thinking — Claude](https://platform.claude.com/docs/en/build-with-claude/thinking) — provider
11. [Effort — Claude](https://platform.claude.com/docs/en/build-with-claude/effort) — provider
12. [Structured outputs — Claude](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — provider
13. [Fast mode — Claude](https://platform.claude.com/docs/en/build-with-claude/fast-mode) — provider
14. [Prompt caching, the launch post](https://claude.com/blog/prompt-caching) — provider
15. [Google provider — AI SDK](https://ai-sdk.dev/providers/ai-sdk-providers/google) — provider
16. [Anthropic provider — AI SDK](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) — provider
17. [Tool calling — AI SDK](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) — provider
18. [Context caching — ADK](https://adk.dev/context/caching/) — provider
19. [ADK Python changelog](https://github.com/google/adk-python/blob/main/CHANGELOG.md), its 2.8.0 entry — provider
20. [Tool performance — ADK](https://adk.dev/tools-custom/performance/) — provider
21. [OpenAI GPT OSS — Cerebras](https://inference-docs.cerebras.ai/models/openai-oss) — provider
22. [Prompt caching — Cerebras](https://inference-docs.cerebras.ai/capabilities/prompt-caching) — provider
23. [Structured outputs — Cerebras](https://inference-docs.cerebras.ai/capabilities/structured-outputs) — provider
24. [GPT-OSS 120B — Groq](https://console.groq.com/docs/model/openai/gpt-oss-120b) — provider
25. [Tool use — Groq](https://console.groq.com/docs/tool-use) — provider
26. [Available models — Together](https://docs.together.ai/docs/serverless/models) — provider
27. [Pricing — Together](https://www.together.ai/pricing) — provider
28. [Pricing — OpenAI](https://developers.openai.com/api/docs/pricing), and [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna) — provider
29. [Latency optimization — OpenAI](https://developers.openai.com/api/docs/guides/latency-optimization) — provider
30. The npm registry's entries for `@ai-sdk/cerebras`, `@ai-sdk/groq`, `@ai-sdk/togetherai` and `@ai-sdk/openai` — provider
31. Artificial Analysis, each model's providers page under `https://artificialanalysis.ai/models/` — third-party
32. [Performance benchmarking methodology — Artificial Analysis](https://artificialanalysis.ai/methodology/performance-benchmarking) — third-party
33. OpenRouter, each model's page under `https://openrouter.ai/` — third-party
34. Upstream A2UI, `specification/proposals/express/a2ui_express.md` at `upstream/main` `ccf5dc20d` — provider
35. Upstream A2UI, `eval/iterative_format_optimizer/baselines/{direct_json,express}/budget_0_run_meta.json` at `ccf5dc20d` — third-party
36. Upstream A2UI, `python/a2ui_agent/agent_development.md` at `ccf5dc20d` — provider
37. [Issue #657, Implement Template based inference](https://github.com/a2ui-project/a2ui/issues/657), and [#721](https://github.com/a2ui-project/a2ui/issues/721) — third-party
38. [Discussion #2779](https://github.com/a2ui-project/a2ui/discussions/2779) — third-party
39. [Discussion #1207](https://github.com/a2ui-project/a2ui/discussions/1207) and [#3068](https://github.com/a2ui-project/a2ui/discussions/3068) — third-party


---

## 3. A2UI-unique prompts

Prompts whose answer spans independent apps and whose screen cannot be enumerated ahead. Built on the five agents' declared skills: Gmail — inbox triage, reading a conversation, drafting a reply, filing and labelling; Calendar — what is coming up, one event, putting something on the calendar, answering an invitation; GitHub — pull request triage, reading a pull request, composing a review, acting on GitHub; Linear — issues, an issue's detail, updating an issue, filing and commenting; CircleCI — pipeline status, a run's workflows and jobs, why a job failed, rerunning and canceling. A *control* is the single-app version a fixed screen answers.

### Relations no single app holds

1. **"Which of my open pull requests are blocked on something outside GitHub?"**
   Dispatch GitHub, Linear, CircleCI. One row per pull request, a column each for its CI outcome and its issue's state. Control: "show my open pull requests" in GitHub alone. Watch: the Synthesizer writes operators and match claims, not verdict words, so the blocker reads across the columns.
2. **"Is anything in my inbox about a pull request that's already merged?"**
   Dispatch Gmail, GitHub. Threads naming a pull request number joined to the pull request's state by a `contains` relation on the number. Watch: needs inbox content naming pull requests; the second deterministic Gmail account can be seeded.
3. **"What did I agree to in email that isn't on my calendar yet?"**
   Dispatch Gmail, Calendar. Commitments in mail as rows, the matching event or the empty cell beside each. The join is `judged`, so every match reads as guessed. The best test of the disclosure marks.

### A task spine across tools

4. **"Help me close out A2U-7: show the issue, its pull request and its CI run, and let me act on each."**
   Dispatch Linear, GitHub, CircleCI. The three fragments plus the joined row; the person moves the issue, merges, reruns, each inside its own fragment, the row re-pointing as fragments repaint. Also tests SPEC §7's fan-out rule: a command about one object naming three apps' parts. Each act is a vendor round trip: the latency showcase.
5. **From that canvas, after opening A2U-7's detail: "what else is tied to this?"**
   Planned from the viewed canvas through the Planner's this-canvas reader. Control: the same words on a fresh canvas.

### Two agents, one question

6. **"Is main green right now? Ask CircleCI and GitHub."**
   Dispatch CircleCI, GitHub. Both answers over the same commit, agreement or disagreement on the row. Scenario S3 in SPEC §3, listed and never proven. Watch: the Planner may fold the two into one source.

### Context around one thing

7. **"What's happening around my next meeting?"**
   Calendar as home under an anchored join hypothesis; Gmail for threads with its attendees; Linear or GitHub for anything its description names. Control: "what's my next meeting" in Calendar alone.

### Cross-app search and counting

8. **"Show me everything mentioning 'invoice' across my apps this month."**
   Every app with search. One attributed timeline sorted by time. Scenario S6. Watch: the backlog's time-format sort problem will surface.
9. **"How many things are waiting on me per app, and which is oldest?"**
   Every app. A summary row of counts and a minimum date, each computed by the runtime over the partitions, every count disclosing its source set.
10. **"Across both my Gmail accounts, which threads mention a Linear issue, and what state is it in?"**
    Gmail twice, Linear. Scenarios S5 and S2 at once.

### Running them

- Prompts 1, 4, 6 and 10 run on data this repository already has: the A2U issues, pull request #8, the CircleCI project.
- Prompts 2, 3 and 8 depend on inbox content; seeding the second deterministic Gmail account makes them repeatable.
- Record on every run: plan time (`plan.planMs`), each dispatch's settle time, dead air (`synthesis.deadAirMs`). These runs are the baseline the latency work is measured against.
