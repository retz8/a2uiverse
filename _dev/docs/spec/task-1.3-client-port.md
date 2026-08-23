# Task 1.3 — Client port

Port the `a2ui-github` canvas shell into `apps/client` as a neutral shell that reaches its catalogs through `orchestratorApi`. Parent: `_dev/TODO.md` Phase 1, sub-task 1.3; phase spec `_dev/docs/spec/phase-1-spine.md` §7, §12–15.

## Scope

- The canvas entry, `canvas/`, `a2a/`, message application, shared code, the providers module, the test setup, and the beat-replay mechanism (types + replay loop) with an empty local recordings location.
- The `tests/` integration suites that run on the canvas and A2A code without `fixtures/` or beat recordings; the beat-driven canvas suite comes across skipped until recordings exist.
- The Radix Themes shell, the Primer-scoped fragment wrapper, the two-layer orchestrator projection, the orchestrator URL setting, Playwright chrome tests, dependency hygiene, and the client README.
- Not in scope: the chat, dev, and examples entries; `fixtures/`; client → orchestrator wiring and acceptance (1.4); the adapter copy and publish (1.5).

## Locked decisions

### 1. Copy-and-edit

The named directories are copied wholesale from `a2ui-github/client` and edited only where this spec requires. Canvas parity with the origin is carried, not re-derived.

### 2. Unknown-component patch dropped

The origin's patch to `@a2ui/react` is not carried. Unknown component types render the library's default. Graceful handling of unknowns, if needed, belongs to the Phase 2 composition layer, not the renderer.

### 3. Shell on Radix Themes, minimal swap

A Radix `Theme` wraps the app root. The four Primer shell widgets — the palette text input, the status-strip spinner, and the two buttons in the history chrome and canvas app — become their Radix equivalents. The existing chrome CSS is otherwise kept. Re-skinning the shell onto Radix tokens is deferred to the Phase 2 shell-catalog work.

### 4. Primer scoped to the fragment; provider lives in the client for now

Primer's theme provider, base styles, and primitives CSS move from the app root to the provider component paired with the GitHub catalog in the client's resolver. The primitives token stylesheets remain page-global; this is accepted in Phase 1. At 1.5 the provider and its CSS setup move into the `github-catalog` bundle, and the rule that each catalog bundle owns its own provider and CSS setup — so the canvas never accumulates per-vendor CSS setups as agents are added — carries into the agent-kit phase.

### 5. Two-layer orchestrator projection

`orchestratorApi` exposes an async-shaped surface backed by a static table, returning bundle-style records. A separate client-side catalog resolver maps catalog id to `{ catalog, provider }`; in Phase 1 it is a static table. Runtime catalog and provider objects never cross the `orchestratorApi` boundary, so the M7 move to HTTP is transport-only.

### 6. Wiring takes catalogs as input

The canvas wiring receives the resolved catalog list as a parameter and uses it at every message-processor site. The canvas entry is the only caller of `orchestratorApi` and the resolver. The provider used to render a surface is chosen per surface from that surface's catalog id.

### 7. Orchestrator URL through `orchestratorApi`

`orchestratorApi` reads `VITE_ORCHESTRATOR_URL`, defaulting to the orchestrator's localhost port. A committed `.env.example` carries the localhost default and shows the tunnel form; the per-machine tunnel value lives in an uncommitted local env file. The entry reads no env directly.

### 8. Full catalog-id list in the A2UI extension

The client sends the complete list of resolved catalog ids in the A2UI extension metadata, using the extension's list-valued field. In Phase 1 this is a list of one.

### 9. Versions and the linked adapter

Versions are as phase spec §11. `primer-a2ui-adapter` is consumed via `link:` to its origin folder; its build under the origin's Yarn toolchain is a documented prerequisite in the client README. Duplicated peers from the linked package are resolved by deduplicating React, the A2UI packages, and Primer to the client's copies.

### 10. Playwright: chrome spec only

The canvas-chrome Playwright spec is ported with fresh baselines captured in this repo on the client's port. The visual spec is deferred to 1.4 with the re-recorded beats.

### 11. Dependency hygiene

`@primer/primitives` is declared explicitly. The scaffold's `@a2uiverse/sdk` and `@a2uiverse/shell-catalog` dependencies stay as they are. The client README is rewritten for the ported layout.

### 12. Definition of done

1. Root gates green.
2. Client Playwright green on the fresh chrome baselines.
3. The client dev server serves the canvas chrome in Radix with no Primer CSS loaded until a GitHub surface mounts, verified live through the tunnel with Claude-in-Chrome.
4. With the orchestrator URL pointed directly at the `a2ui-github` agent as a dev-time check, an utterance renders a Primer surface — the port proven end to end before the orchestrator exists. The committed default stays the orchestrator.

## Invariants

- `a2ui-github` is not edited.
- The shell never reaches into a fragment; no shell style leaks into vendor fragments.
- `_dev/` edits land on `main` only.

## Open items

Deferred from this grill:

- Unknown-component handling → Phase 2 composition layer.
- Provider + CSS setup ownership into the `github-catalog` bundle → 1.5; one-CSS-setup-per-bundle rule → agent-kit phase.
- Shell re-skin on Radix tokens → Phase 2 shell-catalog work.
- Beat re-recording through the orchestrator and the visual Playwright spec → 1.4.
