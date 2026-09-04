# Handoff — task 3.5 (launcher)

## Where things stand

3.4 is **done**: `create-a2ui-agent` landed in `a2uiverse-apps` `main` at `a55dc72`, pushed. `pnpm verify` green in that repo. 3.5 has not started.

- 3.4 spec: `_dev/docs/spec/task-3.4-scaffold-cli.md`. Phase spec: `_dev/docs/spec/phase-3-agent-kit.md` (decision 6 is 3.5's).
- Design record: `_dev/docs/design/agent-kit.md`, "Scaffold CLI" section.

## What 3.5 is

Phase decision 6: one launcher, a **command of the CLI package** in the apps repo. Manifest-driven discovery (glob `*/manifest.json` for id and agent URL — no hardcoded table), `--mode` passthrough, parity with the existing flags. A scaffolded app becomes launchable by existing.

Already locked by 3.4's grill: the launcher is a **second bin of the `create-a2ui-agent` package** (one package, two bins). Its bin name is 3.5's own decision.

## What it replaces

`a2uiverse/scripts/dev-agents.mjs` — read it before designing. What it carries today:

- Hardcoded `AGENTS` table (`id`, `dir`, `port`) and a `MODES` table mapping each mode to a module plus `TOOL_BACKEND` env. **The MODES mapping is dead**: agents are `uv run python -m app --mode <mode>` since 3.2, so this launcher is broken against every kit-shaped agent until it is replaced.
- Flags `--only`, `--mode`, `--wait-for-cards`, `--then`.
- Colored per-agent line prefixing over interleaved stdout/stderr.
- Card polling (`/.well-known/agent-card.json`, 90s ceiling, 500ms interval) behind `--wait-for-cards`, because the orchestrator fetches cards once at boot.
- One agent exiting is reported and survived, not fatal.
- Apps-repo location overridable via `A2UIVERSE_APPS_DIR`.

Manifest shape to discover from: `{id, displayName, agent: {url, auth}, catalog: {id, package}}` — the port lives in `agent.url`. `create-a2ui-agent/src/ports.ts` already reads manifests this way.

## Open for 3.5's grill

- The bin name, and how the two bins share the package's build and tests.
- Whether the launcher runs from inside the apps repo only, or takes a directory.
- Whether the flag set stays exactly as above or changes now that discovery is manifest-driven.

## Not 3.5

Platform `dev:agents` delegation and retiring its tables is **3.6**, along with the fourth-app scaffold proof and the live tunnel sanity pass.
