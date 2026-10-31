# 17.2 — The orchestrator's model

The orchestrator's Planner and Synthesizer able to run on a model named by its provider, Gemini as it is, the effort setting carried to each provider through the AI SDK. Sub-task 17.2 of Phase 17 (`_dev/docs/spec/phase-17-latency.md`), worked on the phase branch (phase decision 3).

## Scope

- The model seam: a provider registry behind `getModel.ts`, Google and Anthropic registered.
- The model name's form, the keys, the effort setting's translation, what stops boot and what fails at the call, the provider's warnings in the log.
- The seam's folder and the names of its exports.
- The live proof and the Gemini check.
- The orchestrator README.
- Out: the Vercel AI Gateway; any provider beyond Google and Anthropic; the orchestrator design record — sub-task 17.12; the orchestrator trial — 17.6.

## Locked decisions

### 1. A provider registry

The seam is the AI SDK's provider registry with two providers registered, `google` and `anthropic`. A further provider is its package and one entry in the registry. The Vercel AI Gateway is not used.

### 2. The name carries the provider

A model is named `provider/model`. A name with no slash is Google, so `gemini-3.8-flash` reaches Google as before and `google/gemini-3.8-flash` is the same model spelled in full. The recorded defaults stay as they are.

### 3. One key per provider

`GOOGLE_API_KEY` and `ANTHROPIC_API_KEY`. At boot the orchestrator warns once for each key that a configured model's provider needs and that is missing, naming the variable and the seam that needs it; the orchestrator boots, and a turn on that seam fails at the call. A key no configured model needs is not mentioned.

### 4. The effort setting rides the SDK's reasoning option

The setting keeps its two words. `low` is sent as the SDK's `reasoning: none` and `default` as `provider-default`, on both providers; each provider translates the word for its model, and the seam sets nothing provider-specific.

Before today's explicit Gemini thinking budget of zero is dropped, a Planner live call on Gemini at `low` through `none` has its reasoning-token count read. A count of zero keeps the SDK on both providers. Otherwise a second call with the budget of zero is compared: a match keeps the SDK; a difference keeps Gemini on the explicit budget, recorded as an exception.

### 5. The seam's home

`src/model/`, holding `getModel.ts`. The settings type and the effort function are named for the model call, not the Planner. The tests follow the import.

### 6. An unknown provider stops boot

A configured model name whose provider is not registered throws when the config loads, the message naming the variable and listing the registered providers. The model half of the name is judged by the provider at the call.

### 7. Provider warnings in the log

A call whose result carries a warning from the provider logs one line through the hub's log, naming the seam, the model and the warning. A call with none logs nothing.

### 8. What proves it

The Planner's live smoke test on a Claude model at `low` and on Gemini at `low`: two calls, a third Gemini call only when decision 4's count is not zero. The live tests gate on the key the configured model's provider needs. Every other claim is a unit test on the scripted model: the name rule, the seam's output per provider and word, the boot stop and the boot warning, the Synthesizer's wiring. Gemini unchanged is proven by the suites. The seam's own unit test is rewritten to the seam's new output. The handoff names the Claude model used.

### 9. The dependency

`@ai-sdk/anthropic` is a plain dependency, as `@ai-sdk/google` is.

### 10. Docs with the change

The orchestrator README: the environment table gains a row for the Anthropic key, the model rows say the `provider/model` form with a bare name meaning Google, the effort rows say `low` is the least thinking the provider accepts and `default` the provider's own; the quick-start line and the diagram no longer name Gemini alone. The design record is sub-task 17.12's.

## Invariants

- A bare model name reaches Google exactly as before; a Gemini-only setup sees no change in behaviour and no mention of Anthropic.
- The Synthesizer follows the Planner's model when its own is unset, as today.
