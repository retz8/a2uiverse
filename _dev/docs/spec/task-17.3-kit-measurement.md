# 17.3 — The kit's measurement

The agent kit in `../a2uiverse-apps/` measuring every model request a turn makes — the time to its first token, the generation time after it and its token usage — and keeping the numbers where the kit records its runs: the plumbing the baseline (17.5) and the vendor trial (17.7) read, and the prompt-size gate (phase decision 9) is judged on. Sub-task 17.3 of Phase 17 (`_dev/docs/spec/phase-17-latency.md`); an `[apps]` sub-task, worked on the apps repo's `phase-17/latency` branch (phase decision 3).

## Scope

- One record per model request, with its instants, its outcome and its usage.
- The records in the recorder's turn, riding into the beat fixture.
- The model and the effort tier the agent ran under, stamped on the turn by the agent.
- The numbers in the agent's log and in the beat driver's per-beat line.
- The kit README's module table.
- The proof: scripted tests and one live run on Linear.
- Out: the baseline numbers themselves — 17.5; the prompt-size reduction — 17.8; a way for the driver to record a trial run without overwriting the committed beats — 17.7; the agent-kit design record — 17.12.

## Locked decisions

### 1. The grain is the model request

A turn is several requests to the model — a tool round trip is one, the painting generation another, a retry adds more — and each gets its own record, with its position stated: the attempt it belongs to and its index within the attempt. Time to first token at this grain is the provider's prefill, which is what the prompt-size gate asks about; the coarser sums per attempt and per turn are derivable from it.

### 2. The three instants

A request starts when it leaves for the provider. Its first token is the first content the model streams that is not a thought — text or a tool call — so thinking time counts toward time to first token on Gemini and on Claude alike, and shows up as the thoughts count in the usage. It ends at the aggregate the provider's closed stream produces, the one carrying the usage. Generation time runs from the first token to the end.

### 3. What a record holds

The three instants as offsets on the turn's clock, the same clock the recorded batches use, so a request lines up with the parts that left during it; the two durations, time to first token and generation time, spelled out beside them. The attempt and the index. How the request ended: in text, in one or more tool calls with the tools named, or in an error with no content. Four usage counts — prompt, output, thoughts, cached prompt — each absent when the provider gave none; not the provider's whole usage shape.

### 4. The records live in the turn

A `requests` list in the recorder's turn, beside its batches, outcome and duration. The beat driver copies the turn whole, so the committed beat fixture carries its own timing and usage and a trial row is one fixture read; replay reads the batches alone and the list costs it nothing. Armed as everything the recorder keeps is, by `A2UI_RECORD_DIR`; nothing is written when unarmed.

### 5. The agent stamps its conditions, the driver checks

The turn carries the model name and the effort tier the agent resolved at startup, from the agent itself. The driver's `--model` stays; when the agent's model disagrees with it, the driver says so in its log and keeps the agent's word in the fixture.

### 6. The seam is the model layer

The measuring code hooks ADK's before- and after-model callbacks on the agent the kit builds: before marks the start; after marks the first non-thought content and, on the aggregate, the end and the usage, with the tool names read off the response. The records collect per turn; the executor opens the collection when a turn starts and hands it to the recorder's turn at the end. The responder protocol is untouched, so every fake responder in the tests stays as it is.

### 7. The numbers show in the log and on the driver's line

The agent logs one line per request with the record's numbers, armed or not, in place of today's "first model token received" line. The driver's per-beat line adds the turn's totals: the requests made, the time to first token of the painting request, the generation time, the prompt and output tokens.

### 8. What proves it

Without a model: the measurement on a scripted event sequence — a request ending in a tool call, one ending in text, a thought part ahead of the first text, an aggregate with usage and one without; the recorder's turn carrying the requests, the model and the effort; the driver's `--model` check and its per-beat line; the existing beat fixtures, carrying none of this, still replaying and still judged good. Live: one run, Linear's beat 1 agent alone through the beat driver on Gemini at `low`, the fixture read back for its requests and its stamped model and effort, the committed beat restored from git afterwards — the baseline records the real one.

### 9. Docs with the change

The kit README's module table: the recording row gains what each model request cost in time and tokens. Nothing else; the environment table already lists the model and the tier.

## Invariants

- A measurement failure never fails a turn, as the recorder's rule already holds.
- A fixture without `requests` is as valid as before; every app's tests pass unchanged.
- Stub and live are measured alike, being one code path.
- Gemini and Claude are measured through the one usage shape ADK gives both.
