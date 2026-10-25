# Phase 16 — Upstream upgrade

The packages the A2UI project publishes, brought to their current releases in both repos: `@a2ui/react` and `@a2ui/web_core`, `a2ui-agent-sdk` with `a2ui-core` beneath it, and `a2ui-a2a`, the A2A toolkit split out of it. The phase changes no behaviour of A2UIVerse. Amends SPEC §9.1, §14 and every other section the upgrade's decisions change, and the gated v1.0 item in `_dev/TODO.md`.

## Scope

- The platform runtime on `@a2ui/react` 0.14.0 and `@a2ui/web_core` 0.14.0: the sdk's contracts, the client, the shell catalog, the orchestrator, Stellify and the marketplace.
- The host-module interface, which lends web_core and react to catalog artifacts at runtime, at a new version; every first-party catalog re-packed and republished against it (`[apps]`).
- The agent kit on `a2ui-agent-sdk` 0.9.0, `a2ui-core` 0.4.0 and `a2ui-a2a` 0.1.0, the seven agents following (`[apps]`).
- The local patch on `@a2ui/react`, the workarounds tied to `_dev/a2ui-findings.md`, the kit's shims over the SDK, the sdk's validator ported from upstream's checks, and the tests that pin upstream behaviour — each against the pinned releases.
- The spec copy under the sdk synced to `upstream/main`.
- The verdict on the gated v1.0 migration.
- Dev harness, the live acceptance through the tunnel, the doc edits, the design records and READMEs, the `a2ui-sdk-design` skill.
- Out: adopting capabilities upstream added that A2UIVerse never had — the Express inference format, `RendererState`, `Skill`, `@a2ui/agent`; tracking unreleased `upstream/main`; the next upstream bump; `a2ui-github`, which stays unchanged.

## Locked decisions

### 1. The target is today's releases, at exact versions

`@a2ui/react` 0.14.0, `@a2ui/web_core` 0.14.0, `a2ui-agent-sdk` 0.9.0, `a2ui-core` 0.4.0 and `a2ui-a2a` 0.1.0, pinned exactly rather than by caret, in both repos. `a2ui-adk` is not a dependency. Unreleased `upstream/main` is not a target. The next bump is a decision of its own, not an install.

### 2. The web_core break is carried as a local patch

web_core 0.14.0 gives a `MessageProcessor` no way to take a catalog after it is built, which blocks the client's runtime catalog addition. The fix submitted upstream as PR #3304, `addCatalog`, is carried as a local pnpm patch on web_core 0.14.0, the way the react patch is carried today, and dropped when upstream ships it. Dropping it is a Backlog item.

### 3. Replace what was a workaround, keep what is ours, adopt nothing new

A shim, a patch or a hand-ported piece that exists only because upstream lacked something it now has gives way to upstream's provision: the sdk's validator ported from upstream's checks, the kit's shims over the SDK's stream parser, component cache and prompt, the react patch's placeholders. What is A2UIVerse's own design stays: the shell catalog's functions, the synthesize data model's resolution, the host-module interface. Nothing upstream added that A2UIVerse never had is taken this phase.

### 4. No record of what was patched before

The findings file and the protocol delta register say what is true against the pinned releases. A finding upstream has fixed leaves; a workaround whose cause is gone leaves with it. Nothing notes that it was once otherwise.

### 5. The host-module interface moves to a new version

What the host lends under protocol v0.9.1 changes shape with the new runtime, so the interface takes a new version. An artifact packed for the old one is refused where artifacts already are checked: at publish, at install and at load. Every first-party catalog is re-packed with Stellify against the new host and republished; registries take the new builds through the update path. The host lends one runtime; there is no transition with two.

### 6. The v1.0 gate has not fired

web_core 0.14.0 exports `v1_0`; `@a2ui/react` 0.14.0 has no `v1_0` entry point and its runtime sits on web_core's v0_9 module. Phase 16 stays on v0.9.1 end to end and Phase 19 stands as written. The gate's trigger is restated in `_dev/TODO.md` so it is checkable: it fires when `@a2ui/react` publishes a `/v1_0` entry point.

### 7. The spec copy syncs to upstream's head

The spec copy under the sdk syncs to `upstream/main`'s head at the time its sub-task runs, its file list refreshed to what upstream has now — the v0.9 validator conformance suite and the fixtures it reads, in place of the files upstream deleted — and the commit recorded as before.

### 8. What proves the phase

Gates green in both repos, every e2e suite green, and a live run through the tunnel touching each thing the upgrade changed: every one of the seven catalogs painting live on the new runtime, the agents on the new kit in `llm` mode; the temporal merge and the entity join; the store loop over re-packed builds — the loop with the slot filling and the merge taking it in, the update tile every way in, a new paint on an open canvas drawn in a newer build; a sign-in; a clean regression pass. The exact list is the acceptance task's own spec.

*Amended by task 16.11 decision 27.* The temporal merge runs with every agent `live`; every case after it runs on the deterministic roster, the Planner and the Synthesizer still on the model.

### 9. Three tracks

The platform runtime: the sdk's contracts first, the spec copy early, then the client, the shell catalog, the orchestrator, Stellify and the marketplace. The apps' catalogs (`[apps]`): after the sdk and Stellify, parallel with the rest of the platform track. The agent kit (`[apps]`): beside everything from the first day, the seven agents following, the apps' recorded beats kept as recorded. Then the dev harness once the first two tracks land, the live acceptance, and the records, READMEs and the `a2ui-sdk-design` skill last. Doc edits open the phase: SPEC, the TODO's gate restatement and its stale line on the toolkits' PyPI release, the findings file and the delta register.

## Invariants

- The phase changes no behaviour of A2UIVerse; what the person sees and what the agents do is what it was.
- Nothing A2UIVerse-specific rides the vendor wire.
- The host lends one runtime at a time.

## Open items

Task-level, left to the sub-task that owns each:

- Whether the agent kit keeps its prompt text over upstream's prompt generator — decided in task 16.2 (decision 2): the kit assembles the prompt itself, in today's order, around the base rules and the schema block upstream's generator writes and the examples upstream's `load_examples` reads.
- What replaces the hand-ported validator, measured against the synced v0.9 conformance suite — decided in task 16.4 (decisions 1 and 2): `@a2ui/web_core`'s validation behind the sdk's own API, each bad component a finding and the first topology failure beside them.
- How the host-module interface's version is named now that the runtime can change under one protocol version — decided in task 16.4 (decision 4): by the A2UI runtime release it lends, `0.14.0`.
