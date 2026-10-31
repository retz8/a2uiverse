# 17.5 — The baseline

The orchestrator measuring every model request the Planner and the Synthesizer make, the counterpart of the kit's measurement (17.3), and then today's defaults measured end to end before any lever moves, written into the notes. Sub-task 17.5 of Phase 17 (`_dev/docs/spec/phase-17-latency.md`), worked on the phase branch (phase decision 3).

## Scope

- One record per model request of the Planner and the Synthesizer, the tools' and the shortlist's durations, the model and the effort, and the instant the turn's final leaves — in the journal and the log.
- The proof: scripted tests, and the baseline's first prompt read back as the live check.
- The orchestrator README's journal row and the orchestrator design record.
- The six end-to-end prompts, three passes, at today's defaults.
- The notes' baseline section, and an extract of each turn's numbers committed beside it.
- Out: time to first token on the orchestrator — 17.9's streaming; agent-alone runs — the kit levers' sub-tasks; presses inside an answer; the survey's pending columns — 17.4.

## Locked decisions

### 1. The grain is the model request, the waits between them timed too

Every model request the Planner and the Synthesizer make gets its own record: its step and its attempt, its duration, how it ended — in text, in tool calls with the tools named, or in an error — and the usage the provider reports, four counts: prompt, output, cached prompt, reasoning, each absent when the provider gave none. Each request is placed on its record's clock: the plan's on the clock `planMs` runs on, from the utterance arriving; the synthesis's on the clock `deadAirMs` runs on, from its release. Each tool call's duration sits on the tool-call record the plan already journals; the Router's shortlist has its duration on the plan record.

### 2. The numbers are the SDK's

The records are read from the AI SDK's own step results — the step's number, how it finished, its usage, the time waiting on the model and each tool call's execution time — with no clock of the orchestrator's own. The Planner reads them where it walks its steps already; the Synthesizer's model interface gives back the step beside the text, and its test fakes change with it.

### 3. The model and the effort stamped

Each request's record names the model the SDK gives for its step. The plan record and the synthesis record each carry the effort tier their seam ran at.

### 4. In the journal and the log

The records are journaled beside `planMs` and `deadAirMs`. The orchestrator logs one line per model request, as the kit does (task 17.3 decision 7): the seam, the attempt and the step, the time waiting on the model, how it ended with the tools and their times, the four counts. The existing plan and merge lines stay as they are. The turn's journal line gains the instant its final `completed` leaves.

### 5. What proves it

Without a model: a plan that calls a reader and answers, a plan that searches the Store, a plan refused once and accepted on the retry, a synthesis on each of its two attempts, a step with usage and one without — each read back from the journal and the log. Live: no run of its own; the baseline's first end-to-end prompt is read back in the journal and the log before the rest of the runs.

### 6. Docs with the change

The orchestrator README's journal row; the orchestrator design record's journal walkthrough and its Store search passage — the request records, the tools' and the shortlist's times, the model and the effort, the log line. Bring your own model, the keys and the effort stay 17.12's.

### 7. Six prompts, one utterance turn each

The notes' prompts 1, 4, 6 and 10; the control "show my open pull requests", answered by GitHub alone; the camera comparison. Each on a fresh canvas, one utterance turn, nothing pressed inside the answer.

### 8. Sent through the tunnel, read from the journal

Claude-in-Chrome types each prompt into the client at its tunnel URL. The numbers are read from the turn's journal line, on the orchestrator's clock: plan time from `planMs`, each fragment's time from its first paint against the turn's opening, dead air from `deadAirMs`, the settled screen from the final's instant (decision 4). The tunnel's leg is not counted.

### 9. Live, the default roster, Shop A for the camera comparison alone

The vendor agents run live, every sign-in held; both Gmail accounts are checked by name before the first pass. One launch: the default roster, Shop A and Shop B published and left uninstalled; Shop A is installed just before the camera comparison and uninstalled after it, each pass. No setting is moved from today's defaults.

### 10. Three passes, the first approved on

The first pass is also the live check (decision 5); its real cost is read from the usage records, and passes two and three run on the person's approval. Each number is the median of the three, with its spread.

### 11. As they fall

No warm-up turn, no spacing between turns. The cached-prompt counts and the shortlist's duration show what was cold; the first turn after a boot is marked.

### 12. A failed turn counted as it fell

A plan refused twice, an app at the hard cap, a merge declined or collapsed is written as it happened, and each median is taken over the turns that reached that number. A setup failure — a sign-in lapsed, a request the tunnel lost, a process down — is fixed and that prompt sent again.

### 13. The per-agent baseline from the passes

No agent-alone run is made in 17.5. The per-agent numbers — each request's time to first token, generation time and tokens — come from the agents' own records during the end-to-end passes. A kit lever chosen from the survey runs its beats agent-alone in its own sub-task, without the lever and with it, the `low` tier there if its lever is chosen.

### 14. The write-up

The notes' baseline section, after 17.1 and 17.3. Per prompt, the median and spread over the three passes of plan time, time to each fragment, dead air and time to the settled screen, and the split of the wait: the shortlist, the Planner's requests step by step, its tools with the Store search among them, the Synthesizer's requests, each app's requests' time to first token and generation. Beside them the tokens per seam with the cached share, the first-try rate, and what the passes cost.

### 15. The extract beside the notes

Each turn's numbers, committed beside the notes: the prompt and the pass, the timings, the request records — model, effort, durations, token counts, endings, tool names and their times — and the outcomes. No text the models wrote, no data the apps returned. The acceptance (17.11) and every lever's sub-task read the same extract.

## Invariants

- A journal line written before the change is as valid as before.
- Every pass is read-only on the person's accounts.
- Nothing the models wrote and nothing the apps returned is committed.
