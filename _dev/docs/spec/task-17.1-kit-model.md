# 17.1 — The kit's model

The agent kit in `../a2uiverse-apps/` able to run a vendor agent on a Claude model beside Gemini, with the thinking tier settable on both — the plumbing the baseline and the vendor trial stand on. Sub-task 17.1 of Phase 17 (`_dev/docs/spec/phase-17-latency.md`); an `[apps]` sub-task, worked on a branch of the apps repo (phase decision 3).

## Scope

- The kit's model seam: a Claude model reachable by name through `MODEL_NAME`, Gemini as it is.
- The thinking tier, on Gemini and on Claude, resolved as the model name is.
- The kit's text stream over a model that streams its thinking.
- The kit README's environment table and the scaffolder template's `.env.example`.
- The live proof on Linear.
- Out: a generic road to other providers, a provider table; the seven apps' `.env.example` comments and the agent-kit design record — sub-task 17.12; GitHub's and Linear's Claude runs — 17.5 and 17.7.

## Locked decisions

### 1. Trial plumbing, not a feature

The kit reaches Gemini as today and a Claude model through ADK's direct-API Anthropic class, and nothing else: no generic road through LiteLLM, no provider table. Phase decision 2 is amended to say so of the kit; the orchestrator's side, 17.2, stays the feature.

### 2. The name carries the provider

`MODEL_NAME` names a Claude model as `anthropic/claude-…`. The kit recognises the `anthropic/` prefix and builds ADK's Anthropic class for the rest of the name; every other name is handed to ADK exactly as today, so a Gemini name is untouched.

### 3. The thinking tier

Two words, the orchestrator's: `low` spends no thinking — Gemini's budget at zero, Anthropic's thinking disabled; `default` configures nothing, each provider doing what it does on its own. Resolved as the model name is — an environment variable, then the app's config, then the kit's default, which is `default` — so an app that sets nothing behaves as it does today.

### 4. The Anthropic SDK is a plain dependency

The kit depends on the `anthropic` package as it depends on `google-adk`; no optional extra, no install step for an app that wants Claude.

### 5. The stream skips thinking

A model that streams its reasoning surfaces it as thought parts; the kit's text stream passes none of them on, so no reasoning reaches the answer.

### 6. Modes and tests unchanged

The three modes — `deterministic`, `stub`, `live` — are as they are; every app's tests and the kit's existing tests pass unchanged; Gemini's behaviour for an app that sets nothing is unchanged.

### 7. What proves it

Linear, agent alone through the kit's beat driver, on one recorded live prompt: one run at `default` and one at `low`, each paint validating against Linear's catalog. Gemini unchanged is proven by the suites and the beats as recorded, with no call spent.

### 8. Docs with the change

The kit README's environment table: the `MODEL_NAME` row saying the Claude form, a row for the tier. The scaffolder template's `.env.example`, whose comment no longer says Gemini only.

## Invariants

- Gemini as it is: a name without the `anthropic/` prefix reaches ADK exactly as before.
- Nothing A2UIVerse-specific rides the vendor wire; the model behind an agent is the agent's own business.
