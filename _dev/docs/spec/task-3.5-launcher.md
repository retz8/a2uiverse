# Task 3.5 — Launcher

Spec for sub-task **3.5** of Phase 3 (`_dev/TODO.md`), realizing phase decision 6 (`_dev/docs/spec/phase-3-agent-kit.md`): the platform's `dev:agents` rewritten table-free.

## Scope

- Replace the launcher's hardcoded `AGENTS` and `MODES` tables with manifest-driven discovery over the agents directory, and retire the launch-contract comment.
- Pass `--mode` through to the kit entrypoint.
- Add a listing mode over the same discovery path.
- Keep the existing flags (`--only`, `--mode`, `--wait-for-cards`, `--then`) and the existing behaviors: colored per-agent line prefixing, card polling behind `--wait-for-cards`, one agent exiting reported and survived, no credential handling.
- Tests for the discovery and validation logic.

Out of scope: the fourth-app scaffold proof, `dev:all` end to end, the apps-repo README, and the live tunnel pass — all 3.6. The platform README documents the launcher's own flags and discovery here. The scaffold CLI is untouched.

## Locked decisions

### 1. The launch target comes from convention

An app is `<app dir>/agent`, run as the kit entrypoint with `--mode`. The layout is the scaffolder's own emitted shape, so it holds for anything generated. `agent/pyproject.toml` is the launchability check. The manifest supplies `id` and the agent URL only; it grows no launcher field, and its formalization stays with the Phase 10 sdk schema.

### 2. Discovery outcomes

Four outcomes per directory under the agents dir: no `manifest.json` (not an app, invisible); malformed JSON; valid JSON without an `id` or a parseable port; manifest present without `agent/pyproject.toml`. The first is silent. The other three are reported by name with their reason and skipped, and the healthy agents run.

### 3. `--only` naming a skipped agent is fatal

An unknown id stays fatal as it is today, and a named-but-broken id joins it. `--only` validates against discovered ids rather than a table.

### 4. Port collisions are fatal

Two agents claiming the same port stop the run rather than yielding a partial one.

### 5. Degrade when it cannot run an agent; stop when it cannot trust the run

The rule behind decisions 2–4. A skipped agent leaves a smaller set where every member is what it claims to be. A collision leaves a set of the right size whose contents are wrong — two ids resolving to one process, with card polling reporting both ready. `--only` narrows the set before these checks apply, so a broken or colliding agent outside the requested set does not affect the run.

### 6. Listing is a mode of the launcher

`--list` runs the launcher's own discovery, validation and collision detection and returns before spawning, so what it reports is what a run would do. `agents:list` is an alias over the same path. It prints the resolved agents directory and which source supplied it, then per-agent id, display name, port and status — healthy plainly, skipped with the reason, collisions as the fatal condition. It exits non-zero when it reports a fatal condition.

### 7. `--mode` is validated against a literal list

The launcher checks the three mode values before spawning. The mode→behavior mapping stays in the kit; only the vocabulary is checked here, so a typo fails immediately instead of spawning agents that die and then waiting out the card timeout.

### 8. Agents directory

A `--agents-dir` flag joins the environment variable, which is renamed `A2UIVERSE_AGENTS_DIR`. Precedence is flag, then environment, then the built-in sibling default. Every run and every listing echoes the resolved directory and which source supplied it. The `A2UIVERSE_` prefix is the project's environment namespace; `A2UI_` is the protocol's.

### 9. Tests cover what decides, not what spawns

Discovery and validation are a pure function over a directory, tested with fixture directories and wired into `verify`. `scripts/` does not become a workspace package. Process spawning, output prefixing and card polling stay verified by running the launcher, which 3.6 does live.

### 10. Discovery feeds the existing behaviors

Card polling uses the agent URL the manifest carries rather than rebuilding one from the port. Log prefixes stay keyed on `id`, the vocabulary `--only` takes. A manifest whose agent URL is not local is not special-cased.
