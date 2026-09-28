# Task 11.4 — Orchestrator, the registry: handoff

Spec: `_dev/docs/spec/task-11.4-orchestrator-registry.md`. Worked directly on `main`, no worktree.

## Where it stands

Done; `pnpm verify` green.

- `apps/orchestrator/src/registry/`: `registry.ts` (the registry: install, uninstall, install-over, one at a time; the table; two cards per app), `gate.ts` (the static gate over a handed artifact), `store.ts` (the record file and artifact directories, temp-and-rename writes, verification at load), `api.ts` (the routes under `/registry`), `token.ts` (the write token), `command.ts` + `cli.ts` (the `registry` script). `entries.ts` and `manifests.ts` gone; `A2UIVERSE_AGENT_URLS` and `A2UIVERSE_AGENTS_DIR` no longer read.
- The pool advertises each app's entitlement and refuses a `createSurface` outside it (`catalog` cause, the id on the record); a dispatch to an app not installed fails `uninstalled`. The shell catalog's `Slot` carries both causes, `catalogId` only with `catalog`, with interim words.
- The sdk: `checkHostInterface` with `SUPPORTED_HOST_INTERFACES`, and `artifactIdOf`.
- Tests: `registry.test.ts`, `registryApi.test.ts`, `registryCommand.test.ts` over `registryFixture.ts` (real artifacts, a card server); every older test installs through the operation; four end-to-end tests in `orchestrator.test.ts`.

## The proof

Gmail's catalog packed with Stellify into a scratch directory (the apps checkout untouched), the orchestrator booted on an empty registry, `registry install gmail http://localhost:11002/.well-known/agent-card.json <artifact>` → `installed gmail`; "What's in my inbox?" through the tunnel painted Gmail's fragment in its own catalog; after a restart `registry list` still held Gmail, routable. The dev state directory keeps Gmail installed.

## Open, for later sub-tasks

- **The tunnel adds `Cache-Control: no-cache,no-store`** to every response beside the orchestrator's `public, max-age=31536000, immutable` on artifact files; locally only the orchestrator's is sent. 11.5's session cache by hash is the client's own, so the browser's HTTP cache may not hold artifacts through the tunnel.
- **Display names are the cards' names** now. The fake vendors in the orchestrator tests were named `GitHub`, `Gmail`, `Google Calendar` to match; a real card's `name` is what attribution shows.
- **The launcher still passes `A2UIVERSE_AGENTS_DIR`** and `dev:all` still spawns agents from the manifests; nothing installs them until 11.6. The beat recording scripts (`record-beats`, `check-transparency`) are broken until then.
- **eslint ignores `**/.state/**`**: installed artifacts are vendors' packed JavaScript.
