# Task 12.11 — Gmail's second deterministic account

The `[apps]` part of Phase 12 (`_dev/docs/spec/phase-12-authority-surfaces.md`, decision 27 and its open item on how Gmail's second account's data is produced) that gives Gmail a second fake account with its own mail, on the kit's fake accounts from task 12.9 (`_dev/docs/spec/task-12.9-agent-kit-sign-in.md`, decision 11). SPEC §3's multi-account scenario, §9.5.

## Scope

- Per-account fixtures in the agent kit, for the stub mail and the deterministic answers.
- Gmail's second fake account and its hand-written mailbox.
- Its deterministic answers, recorded and derived through Gmail's existing pipeline, per account.
- The kit's beat driver signing in, so a recording runs against an agent with sign-in.
- Tests in the kit and in Gmail; Gmail's README.
- Out: the platform's recording scripts and e2e signed in, the real popup, the tunnel URLs (12.12); the two accounts merged on the canvas (12.13).

## Locked decisions

### 1. Produced through the existing pipeline

The second account's data comes from a second hand-written stub mailbox in the captured MCP shapes, run through the same pipeline as the first: the live model recorded over the stub, then the deterministic answers derived from the recordings.

### 2. The same person's personal mail

The second account is the same developer's personal mailbox for the same week as the first account's work mail.

### 3. The two accounts' identities

The first account stays as it is: `you`, `you@example.com`, the work mail. The second is `personal`, `you.personal@example.net`. The vault labels an account by its email, so the label carries the word an utterance naming the personal account lands on.

### 4. Per-account fixtures are a kit convention

An app's stub fixtures and deterministic fixtures may hold one subdirectory per fake-account id; the kit picks the signed-in account's subdirectory, in stub and in deterministic mode. An app with one account keeps its flat layout. Gmail's work mail and answers move under `you`, beside `personal`.

### 5. What the personal mailbox holds

Self-contained, mirroring the work mailbox's shape: about ten threads over the same week, a few needing attention on 2026-09-19, its own labels, and nobody from the work mail or the other apps' data. No other app's data changes.

### 6. The same four beats per account

The personal account is recorded over Gmail's four existing beats, verbatim — the Planner's pinned attention prompt, opening the most recent thread, drafting the reply, listing the labels — so both accounts answer the same actions. Recording and deriving take the account; the hand-written cancel-draft answer exists for each account.

### 7. Recording signs in

The non-interactive entry naming a fake account is honored in stub mode as well as deterministic mode, amending task-12.9 decision 12; live mode still refuses it. The kit's beat driver signs in as a named fake account through it, asking for every scope of the app, and Gmail's recording takes the account.

### 8. What proves it

Kit tests: a two-account test app gets each account's own fixtures; a one-account app is unchanged. Gmail tests: signed in as `personal` through the non-interactive entry, text gets the personal digest while `you` still gets the work one, and a press is answered from the pressing account's set. The publishable-corpus check covers the new subdirectories. Gmail's README covers the second account and recording per account.

### 9. The recording script's stale mode

`record_beats.py`'s docstring naming live mode is corrected to stub mode.
