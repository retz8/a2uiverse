# Task 1.4 — Spine integration + acceptance

Client ↔ orchestrator ↔ the GitHub agent, end to end, and the acceptance evidence for Phase 1 (phase spec decision 19). Parent: `_dev/TODO.md` 1.4, `_dev/docs/spec/phase-1-spine.md`.

## Scope

- Client → orchestrator wiring and `pnpm dev`; the vendor agent is started by hand from `a2ui-github` on 11001.
- A client-side beat recorder and the re-recorded beats.
- The on-demand transparency + journal check.
- The orchestrator card test.
- The visual Playwright spec over recorded beats.
- README and tunnel-doc run commands.
- Claude-in-Chrome live verification through the tunnel.
- Not in scope: the `dev:agents` launcher and `dev:all` — moved to Phase 2, built over `../a2uiverse-apps/`.

## Locked decisions

### 1. All five acceptance items stay in 1.4

Wiring, beats + visual spec, the transparency/action/journal/card checks, and the live verification are all required for 1.4 to tick. The launcher is the only item moved out, to Phase 2.

### 2. Client-side beat recorder

Beats are re-recorded by a script in the client that speaks A2A to a configurable URL and captures what the client receives from the hub, source stamp included, into the existing `BeatFixture` shape under the client's recordings directory. `a2ui-github`'s agent-side recorder is not used.

### 3. Beats 1–3, recorded from the LLM agent on the stub backend

The deterministic agent returns one generic surface for any text prompt, so real beats come from the LLM agent. Only beats 1–3 (PR list, PR detail, the chained review compose) are recorded, with the stub tool backend — a Gemini key, no GitHub PAT, no real account data in committed fixtures.

### 4. Transparency check is an on-demand client script against the deterministic agent

One script records the same utterance direct-to-agent and via the hub and asserts equal A2UI message sequences. Equality strips an explicit list — A2A envelope ids, timestamps, the hub's source stamp, surface-id ordinals — and then requires byte-equal parts per event in sequence. The same run asserts the intent journal grew by exactly one line per turn. It requires a live deterministic agent, so it is run on demand and is not part of `pnpm verify`.

### 5. Card check is an orchestrator unit test

The A2UI extension on the served card is asserted by a unit test in the orchestrator, inside `pnpm verify`. The tunnel-URL part of the card check is live only.

### 6. New surface Playwright spec, stage unmasked

A new spec, separate from the existing chrome spec, loads the recorded beats and snapshots the rendered vendor surface with the stage unmasked — one snapshot per beat state, fresh baselines. The chrome spec is unchanged. `test:e2e` stays outside `pnpm verify`, as today.

### 7. Live verification is a chat handoff note

Acceptance items 1, 2, and 5 are driven by Claude-in-Chrome through the tunnel at the end of the task. The record is a handoff note in chat — what was driven and what the network tab showed — no GIF.

## Invariants

- The client talks only to the orchestrator; live verification confirms no direct client → agent traffic.
- `a2ui-github` is not edited.
