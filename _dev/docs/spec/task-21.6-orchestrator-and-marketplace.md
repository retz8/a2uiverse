# 21.6 — The orchestrator and the marketplace

The orchestrator's pin on `@a2ui/web_core` brought to 0.16.1, on the wire as it is, and the marketplace proven on the release it already runs. Sub-task 21.6 of Phase 21 (`_dev/docs/spec/phase-21-v1-0-migration.md`).

The upstream check (phase decision 17) read `upstream/main` at `36725eee0` of 2026-11-25 and found no event: `@a2ui/web_core` and `@a2ui/react` are at 0.16.1 on npm, and upstream pull requests 4171, 4170, 4347 and 3930 are open.

## Scope

- The orchestrator's pin on `@a2ui/web_core`, and the lockfile.
- The root README's table of upstream packages and the orchestrator design record's sentence on the pin.
- `_dev/TODO.md`: a note on the line of sub-task 21.8.
- Out: the registry snapshot's catalogs and the 0.14.0 entries they keep in the lockfile — sub-task 21.8; the catalogs re-packed — sub-task 21.7; the artifacts packed for `0.14.0` in the two apps' local `.state` directories, which the fleet's republish replaces — sub-task 21.9; the orchestrator and the marketplace on v1.0 — sub-tasks 21.13 and 21.15.

## Locked decisions

### 1. The orchestrator's pin moves

`@a2ui/web_core` is at 0.16.1 exactly in the orchestrator. No file of the orchestrator imports it: the pin stays the declaration of the peer the shell catalog names, as sub-task 16.8 made it. The orchestrator reaches `@a2ui/web_core` through `@a2uiverse/sdk` and `@a2uiverse/shell-catalog`, which resolve 0.16.1 since sub-tasks 21.2 and 21.4.

### 2. The marketplace does not change

The marketplace takes no pin on `@a2ui/web_core`, and its source and its `package.json` stay as they are. It names no host-module interface version of its own: its gate is the sdk's, at `0.16.1` since sub-task 21.2, and its tests take the version from the sdk.

### 3. The documents

In the root README's table of upstream packages, the row of `@a2ui/web_core` 0.14.0 leaves and the orchestrator joins the packages on 0.16.1. In the orchestrator design record (`docs/design/orchestrator.md`), the sentence that states the orchestrator's pin reads 0.16.1.

### 4. `_dev/TODO.md`

The line of sub-task 21.8 takes a note, "From 21.6", stating a fact and nothing of what that sub-task does with it: the seven catalogs of the registry snapshot are the only thing in the workspace that holds `@a2ui/web_core` 0.14.0 and `@a2ui/markdown-it` 0.2.2.

### 5. What proves it

1. `pnpm verify` green.
2. The lockfile's importers read once: no workspace package other than the registry snapshot declares or resolves `@a2ui/web_core` 0.14.0, and the orchestrator's tree resolves 0.16.1 alone.
3. The orchestrator and the marketplace started through the tunnel and booting, the platform drawing its own surfaces (task-21.2 decision 3).

No test is added. The gate refusing an interface the platform does not supply is held by the two apps' own tests, and an artifact packed for `0.14.0` refused by name is held by the sdk's (task-21.2 decision 7).

## Invariants

- No change in behaviour.
