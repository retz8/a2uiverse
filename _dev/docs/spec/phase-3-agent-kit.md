# Phase 3 — Agent building kit

Spec for Phase 3 (`_dev/TODO.md`), milestone **M1k** (SPEC §12): shared vendor-agent logic extracted across the three agents into a published A2UI+A2A agent SDK/CLI in `a2uiverse-apps`.

## Scope

- Extract the shared vendor-agent logic across the GitHub, Gmail, and Calendar agents into a Python SDK package in `a2uiverse-apps`; refactor all three agents onto it with behavior unchanged.
- A scaffold CLI that generates a new vendor app — agent half, catalog half, manifest.
- The uniform run-mode flag, the single launcher, the vendor dependency rule amendment, and the one-provider-and-CSS-setup-per-catalog-bundle rule.
- The spec doc edits the above entail (SPEC §13, §14).

## Locked decisions

### 1. Ambition: extraction refactor, not product SDK

The kit is whatever the three agents demonstrably share, factored into a package they consume; its API is shaped by the three existing consumers. The scaffold path is the one outward-facing piece. The kit deliberately affords both catalog kinds — themed basic catalog (Gmail/Calendar) and full custom catalog (GitHub/Primer) — as a scaffold-time option the user selects.

### 2. Two artifacts: Python SDK + TypeScript scaffold CLI

- **SDK package** (Python): the runtime the agents import — executor, A2A server wiring, recorder, catalog loading/validation, prompt assembly, `paint_meta`, beat-recording pipeline — and the run entrypoint with the uniform `--mode` flag.
- **Scaffold CLI** (TypeScript, a pnpm workspace member of `a2uiverse-apps`): generates the full app folder — agent half depending on the SDK, catalog half from the chosen template, manifest. It is never a runtime dependency of an app.

The catalog side is template-copy, not a shared TS runtime dependency. The basic-themed template is essentially complete (scaffold + basic `catalog.json` with identity fields filled; token table and theme CSS remain as the design work, which stays with the catalog skills). The custom template scaffolds the package shell only; the content goes through `design-catalog-component`/`build-catalog-component`.

### 3. Publishing

The three in-repo agents take the SDK as a path dependency. The CLI writes a version-pinned git dependency into scaffolded apps — the same convention the catalogs already use. No registry publishing.

### 4. Vendor dependency rule amended

The rule becomes: **the agent half depends on the protocols and the agent kit; the kit depends on the protocols alone.** The wire constraint stands untouched. `paintMeta` (`application/json+a2ui-shell`) is the kit's one shell convention — optional and degradable: an agent that never emits it still composes (cause-derived titles; question surfaces render as ordinary paints). Riders: add `paintMeta` to the §14 protocol delta register; reconcile §13's stale claim that the catalog half builds against `@a2uiverse/sdk` (unrealized in code).

### 5. Uniform run-mode flag

Each agent gets one entrypoint with `--mode deterministic|stub|live` — the launcher's established vocabulary, kept (code over doc). The mode→behavior mapping moves inside the kit; the two-module-plus-`TOOL_BACKEND` arrangement retires; the deterministic/llm server version-constant divergence (`VERSION_0_9` vs `VERSION_0_9_1`) collapses into one place.

### 6. Single launcher

The platform's `dev:agents`, rewritten table-free. Discovery is manifest-driven: glob the agents dir for `*/manifest.json` for id and agent URL — no hardcoded table; a scaffolded app becomes launchable by existing. `--mode` passes through to the kit entrypoint. It keeps its existing flags (`--only`, `--mode`, `--wait-for-cards`, `--then`) and adds a command listing the discovered agents. The agents dir resolves from the `--agents-dir` flag, `A2UIVERSE_AGENTS_DIR`, then the built-in sibling default. Its hardcoded agents/modes tables and the launch-contract comment retire.

The scaffold CLI is scaffold-only; it does not launch.

### 7. Extraction boundary

Three strata:

1. **Identical / near-identical** across agents (executor, servers, entrypoints, recorder, catalog loading+validation, prompt assembly, beat scripts, shared tests): kit, parameterized by a small per-vendor config the app supplies.
2. **Structurally shared, vendor-bodied** (the MCP-wiring skeleton, the toolset-wrapper pattern, the tool-shaping skeleton): the kit takes the skeletons as base classes/hooks — gated by the rule that the pattern must already exist in ≥2 agents. Vendor policy bodies stay in the app. Single-vendor patterns stay vendor-side.
3. **Genuinely vendor** (tool selection, shaping policy, prompt prose, fixtures, agent cards): stays in the app, always.

Per-file calls belong to the sub-task specs.

### 8. One-provider-and-CSS-setup-per-catalog-bundle rule

Codification plus template embodiment only — no new runtime mechanism. Written into the spec as a normative, checkable catalog-bundle review rule; both scaffold templates embody it.

### 9. Acceptance

1. **Refactor holds behavior**: all three agents run on the kit; full test suites pass (shared tests move into the kit, vendor tests stay); recorded beats replay unchanged — no re-recording; `pnpm verify` green in both repos plus the kit's pytest.
2. **Uniform contract live**: each agent starts via the kit entrypoint with `--mode`; the launcher discovers all three by manifest; `dev:agents`/`dev:all` work through it.
3. **Fourth-app scaffold proof**: the CLI generates a throwaway vendor app; the basic-themed variant boots in `deterministic` and `stub` modes, is discovered by the launcher, and paints on the canvas through the orchestrator; the custom variant generates and passes gates. The throwaway is deleted, not committed.
4. **Docs codified**: §13 amendment, §14 `paintMeta` row, stale `@a2uiverse/sdk` claim reconciled, one-provider-and-CSS rule written, launch-contract tables retired.
5. **One live sanity pass**: a composed fan-out over the refactored agents via the tunnel.

## Invariants

- Nothing a2uiverse-specific reaches the vendor wire; an existing A2UI agent composes with zero changes (SPEC §14).
- The three agents' observable behavior is unchanged by the extraction.
