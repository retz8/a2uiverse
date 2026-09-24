# Task 9.2 — The composition contract for Phase 9

The sdk's part of Phase 9 (`_dev/docs/spec/phase-9-durable-composition.md`, decisions 2, 3, 10, 15 and 17): the wire shapes the orchestrator (9.3, 9.4) and the client (9.6, 9.7) build against — the canvas on every message, the parent canvas, `paintMeta` as a contract shape, and two operation kinds. SPEC §5.6, §6.4, §6.5, §14.

## Scope

- The canvas's identity on the wire and the parent canvas on an opening utterance.
- `paintMeta` declared in the contract, its type and reader in the sdk.
- The Planner's title: its bound and what a title past it costs.
- The step report and the close as operation kinds.
- The contract's version and its test.

## Locked decisions

### 1. The A2A `contextId` is the canvas

Each canvas is its own A2A context. An utterance that opens a canvas is sent with no `contextId`; the orchestrator mints one, A2A's own rule, and the client learns it from the first event. Every later message in the canvas — action, press, error report, step — carries it. The orchestrator's per-context state is per-canvas by that alone; a vendor's context is per canvas.

### 2. The parent rides under the stamp key

The opening utterance of a child canvas carries `a2uiverse: {parent: <contextId>}` in its message metadata; a root canvas carries none. The stamp key is two-directional: outbound the composition stamp, inbound the parent.

### 3. `paintMeta` is a contract shape, in the sdk

The contract declares `paintMeta`: direction orchestrator → client, a data part marked `application/json+a2ui-shell`, `surfaceId` required, `title` and `kind` optional, `kind` one of `question`. The orchestrator emits one for `shell:main` carrying the Planner's title; a vendor's is the agent kit's, in the same shape, relayed untouched — the contract describes the part, it does not own the kit's emission. The client's `PaintMeta` type and its reader move into `@a2uiverse/sdk` beside `readStamp`; the client imports them.

### 4. The title is bounded and clipped

`paintMeta.title` carries a `maxLength` of 48. A longer title from the Planner is clipped at the cap with an ellipsis and journaled, never a plan finding; an empty or missing title is absent, and the client falls back to the question.

### 5. The step report is an operation kind

`compositionOperation` gains `kind: "step"`: `sources` names the one agent; a new field `step` is the index in that agent's stack — one step per surface replacement, counted the same way on both sides — the fragment now shows. The paint's data model rides `a2uiClientDataModel` as on an action, so the orchestrator writes its partition from what is on screen.

### 6. The close is an operation kind

`compositionOperation` gains `kind: "close"`: no sources, sent on the canvas's context. The orchestrator cancels everything running in the canvas, drops its composition and the vendors' contexts for it, and journals the close.

### 7. Where the stack lives

The client holds the paints — per canvas, per agent, each step's tree and data model. The orchestrator holds the step index per agent and the accepted wiring per combination of steps, no per-step partition snapshot. Both in memory for the session.

### 8. The contract goes to v0.8

`composition.v0.8.json`, the extension URI's version with it, the contract test updated. The `sources` rule extends: exactly one with `retry` and `step`, at least one with `include`, none with `tryAgain` and `close`; `step` is required with kind `step`, a non-negative integer, absent otherwise; the reader refuses the rest. `a2uiForkContext` is declared nowhere; its removal from the client is 9.6's.
