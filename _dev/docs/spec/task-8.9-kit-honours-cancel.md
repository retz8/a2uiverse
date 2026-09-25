# Task 8.9 — `[apps]` The kit honours A2A's cancel

The vendor-agent kit's side of the turn's end under Phase 8 (`_dev/docs/spec/phase-8-late-arrival-failure.md`, decision 3): the orchestrator sends A2A's `tasks/cancel` to every vendor dispatch it aborts, and both of the kit's executors accept it, the running model and MCP work stopped. SPEC §5.3, §9.4.

## Scope

- Both executors accepting `tasks/cancel`: the deterministic executor, and the LLM executor behind `stub` and `live`.
- What a cancel stops: the model, ADK's run, the MCP work.
- What a cancelled turn leaves: the answer, the stored task, the vendor's conversation, the recorder, the debug dumps.
- Tests, and a live check.
- The agent-kit design record (`docs/design/agent-kit.md`): the cancel path and the task-store guard.
- No SPEC or protocol delta register change.

The orchestrator sending no cancel when it aborts before the vendor's task id is known, and Retry's two dispatches running on one vendor conversation, are not this task's.

## Locked decisions

### 1. Only `tasks/cancel` stops the work

A closed stream stops nothing: the task runs on, as A2A 0.3's `tasks/resubscribe` expects. `tasks/cancel` is the one stop.

### 2. What a cancel stops

The model and ADK's run stop: no further tool call is made and no further attempt starts. An MCP tool call already sent is abandoned — the vendor's server finishes it and its reply is discarded; nothing is sent to the MCP server. A `stub` fixture tool already running finishes before the cancel takes effect.

### 3. The answer

Both executors answer a cancel with a final `canceled` status and no message. The deterministic executor has nothing of its own to stop. A task already finished is answered not cancelable.

### 4. A cancelled task stays cancelled

The kit's task store never overwrites a task already in a terminal state, so a cancelled task reads `canceled` from then on. The guard can go at the A2A 1.0 migration (SPEC §14).

### 5. The vendor's conversation keeps the cancelled turn

The ADK session of the cancelled task's conversation keeps what the turn wrote, a tool call left without its reply included. Nothing is erased and the conversation is not started over.

### 6. The recorder writes the cancelled turn

With recording on, a cancelled turn is written with what it streamed and the outcome `canceled`. The cancel writes that outcome only onto the recorder's turn when it is the cancelled task's own; otherwise it writes nothing. A cancelled turn writes neither debug dump.

### 7. Tests

In the kit, offline, with no LLM call, at three levels:

- The executors against fakes: both answer `canceled`; a cancel mid-stream closes the model stream, starts no further attempt, and the recorder writes `canceled`.
- The kit's responder over a real ADK runner, a scripted model and a tool that never returns: a cancel ends ADK's run, drops the tool's wait, and calls the model no further.
- The A2A server end to end over JSON-RPC: a stream opened and closed, then `tasks/cancel` answered `canceled`, the run ended, `tasks/get` still reading `canceled`; a completed task answered not cancelable.

### 8. A live check

One app in `stub` mode on an ADK version other than the kit's — GitHub — checked from the terminal: a stream cancelled mid-model is answered `canceled`, the run ends with no further attempt, and `tasks/get` reads `canceled`.
