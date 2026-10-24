# 16.4 — The sdk

The sdk brought onto the upstream releases Phase 16 pins: its A2UI validator on `@a2ui/web_core` 0.14.0, its spec copy synced to `upstream/main`, and the host-module interface at a new version. Sub-task 16.4 of Phase 16 (`_dev/docs/spec/phase-16-upstream-upgrade.md`).

## Scope

- The sdk's A2UI validator and its conformance test.
- The spec copy under the sdk and its file list.
- The host-module interface: its version, what it lends, and the gate at publish, install and load.
- The tests across the platform that pin the old interface.
- The phase spec's open items annotated with the decisions that settled them — this task's two and task 16.2's one.

## Locked decisions

### 1. The validator is web_core's, behind the sdk's own API

The sdk's validator is `@a2ui/web_core` 0.14.0's validation — `Catalog.fromJson`, `PayloadValidator`, and `MessageProcessor` under `STRICT_VALIDATION` — behind the sdk's own API: `createA2uiValidator`, its findings, `formatA2uiFinding` and `compileErrors` stay as they are for every caller. The validator ported by hand from upstream's checks and its component-graph code go. `@a2ui/web_core` and zod are runtime dependencies of the sdk.

The catalog gate's compile check stays A2UIVerse's own: a catalog schema is a valid A2UI catalog when each of its components' schemas compiles against the spec's common types, as phase-11 decision 13's install gate has it, at pack, at publish and at install.

### 2. Every bad component, the first topology failure

The sdk collects findings across web_core's checks: each component is checked on its own, one finding per bad component, and the envelope and topology checks add the first failure they report. Topology findings narrow from every problem in a payload to the first problem per attempt.

### 3. The spec copy holds what something reads

The spec copy syncs to `upstream/main`'s head at the time this sub-task runs, the commit recorded as before. It holds `server_capabilities.json`, `client_capabilities.json`, `common_types.json` and the basic catalog at v0.9.1, the v0.9 validator conformance suite `validator_v0_9.yaml`, and the v0.9 basic catalog the suite reads. `server_to_client.json`, the three simplified fixtures and the two files upstream deleted leave it.

### 4. The interface is named by the A2UI runtime release it lends

The host-module interface's version is the release of `@a2ui/react` and `@a2ui/web_core` the host lends: `0.14.0`. Replaced: the A2UI protocol version, `0.9.1` (task-11.2 decision 2, amended where it stands).

### 5. What the interface lends

Under `0.14.0` the host lends today's seven specifiers — `react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`, `@a2ui/react/v0_9`, `@a2ui/web_core/v0_9`, `zod` — and `@a2ui/web_core/v0_9/basic_catalog`, beside `loadStylesheet`. Replaced: the seven alone (task-11.2 decision 2, amended where it stands).

### 6. The interface moves in this sub-task

From this sub-task the platform supplies `0.14.0` alone: an artifact packed for `0.9.1` is refused at publish, at install and at load. The tests that pin `0.9.1` move to `0.14.0`. Until 16.7 and 16.9 land, a live run on `main` draws no vendor catalog.

### 7. What proves it

- The sdk's conformance test running the synced `validator_v0_9.yaml` through the sdk's validator, every case green.
- The sdk's tests covering the gate refusing a `0.9.1` artifact.
- The platform's `pnpm verify` green.

## Invariants

- The host lends one runtime at a time.
