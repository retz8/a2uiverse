# 16.8 — Orchestrator and marketplace

The orchestrator and the marketplace on the upstream releases Phase 16 pins: what 16.4 left of them once it put their validation and their gate on the pinned runtime. Sub-task 16.8 of Phase 16 (`_dev/docs/spec/phase-16-upstream-upgrade.md`).

## Scope

- The orchestrator's dependencies on the pinned runtime: what it supplies the shell catalog's schema face, which it runs.
- Both apps confirmed on the pinned runtime.
- 16.8's line in `_dev/TODO.md`, restated to what the sub-task is.
- Out: the Planner's and the Synthesizer's validation and the marketplace's gate at the new host interface, landed with 16.4; whether the two models still repair their output on a retry, reading web_core's wording, which 16.11's live run carries.

## Locked decisions

### 1. A closing sub-task

16.8 is what 16.4 left of the two apps: the orchestrator's leftover web_core dependency, both apps confirmed on the pinned runtime, and its own line restated.

### 2. The orchestrator supplies web_core at `0.14.0` exactly

The orchestrator depends on `@a2ui/web_core` at `0.14.0` exactly, in place of `^0.10.6`: the version the shell catalog's schema face names as its peer. Its tree holds one web_core.

### 3. The orchestrator lists web_core alone

The orchestrator lists no `zod`: the shell catalog's schema face takes it from the shell catalog's own install, and the AI SDK keeps the zod it resolves from the orchestrator's dependencies today. The shell catalog's React peers are not the orchestrator's, which loads no React face; the marketplace imports the shell catalog's id alone and supplies nothing.

### 4. What proves it

`pnpm verify` green, and the orchestrator's tree holding one `@a2ui/web_core`, `0.14.0`. Running the apps is 16.10's launcher's and 16.11's live run's.

### 5. Worked on `main`

No worktree branch.
