# 21.8 — The dev harness

The replay suite and the live suite on the new runtime, the registry snapshot on the catalogs sub-task 21.7 re-packed, and the launcher checked by a launch. Sub-task 21.8 of Phase 21 (`_dev/docs/spec/phase-21-v1-0-migration.md`).

The upstream check (phase decision 17) read `upstream/main` at `36725eee0` of 2026-11-25 and found no event: `@a2ui/web_core` and `@a2ui/react` are at 0.16.1 and `@a2ui/markdown-it` at 0.2.4 on npm, `a2ui-core` is at 0.7.1 and `a2ui-agent-sdk` at 0.12.1 on PyPI, and upstream pull requests 4171, 4170, 4347 and 3930 are open.

## Scope

- The client's replay suite (`apps/client/e2e`) and its baselines, and the client's live suite (`apps/client/e2e-live`).
- The registry snapshot's pin on `a2uiverse-apps`, the lines of `pnpm-workspace.yaml` that allow its catalogs' builds, and the lockfile.
- One hand launch through the launcher.
- A fix for a defect of A2UIVerse's own that the suites find, in this repo or in a catalog of `a2uiverse-apps` (decisions 1 and 6).
- `_dev/a2ui-findings.md` and the Backlog in `_dev/TODO.md`, where decisions 1 and 5 add to them; notes on the lines of later sub-tasks (decision 8).
- A README whose sentence this sub-task makes false.
- Out: the fleet republished and the live pass through the tunnel — sub-task 21.9; the design records and READMEs checked against the pinned releases — sub-task 21.9; the Store captures recorded again; a question asked on the canvas of the hand launch.

## Locked decisions

### 1. A screenshot difference, once traced

Each screenshot difference is traced to its cause before anything is done about it. A defect of A2UIVerse's own, in the client, the shell catalog or a vendor catalog, is fixed where it is found, and its baseline stays. A difference whose cause is upstream's renderer on the new releases, or one of the GitHub catalog's two changes of behaviour in sub-task 21.7 (task-21.7 decisions 3 and 4), is recorded with its cause and its baseline is taken again. An upstream cause a person would notice is also a finding in `_dev/a2ui-findings.md`.

### 2. Two runs

The whole replay suite runs first on `main` as it stands, the snapshot still on the apps repo's commit `7a6d88d`: a difference there belongs to the client, the shell catalog or the runtime the host lends. Then the snapshot's pin moves to `cde22ed`, the apps repo's `main` where sub-task 21.7 landed, and the suite runs again: a difference new to this run belongs to the catalogs. Each run's differences are traced as a list of its own.

### 3. The launcher's launch

One hand launch of all seven apps, both tiers, in `deterministic` mode, each app packed and installed from disk with no marketplace. It passes when the launcher's listing names nothing that would stop it, all seven apps come up, and each is packed for host-module interface `0.16.1` and installed, no app named as left out. No question is asked on the canvas. The live suite's own launch is the check of the launcher under `--publish`.

### 4. The Store captures stay as recorded

The Store captures (`apps/client/recordings/store`) are kept as recorded, as the beats are. The fixed world of the registry snapshot is built on them and takes each build from the snapshot's table. If the fixed world throws on the moved snapshot, that comes back to the phase's owner before anything is recorded again.

### 5. The live suite

All five stories of the live suite are green. A failure follows decision 1's rule: a defect of A2UIVerse's own is fixed, in whichever repo holds it, and an upstream cause is a finding. A story that fails and then passes unchanged on a rerun passes, and the done-notes name it with what its first failure showed; one that matches the Backlog's line on the first question lost after a page reload adds its sighting there, and any other gets a Backlog line of its own.

### 6. A fix outside the client

A fix in a vendor catalog lands on the apps repo's `main`, the catalog at a patch version; the snapshot's pin moves to that commit and the second run of decision 2 is repeated on it. A fix in Stellify or the sdk that forces the catalog packages to be re-packed comes back to the phase's owner first, with its cause and what it would move, before any of it is done.

### 7. What proves it

1. The lockfile holds nothing of the old runtime: no `@a2ui/web_core` 0.14.0, no `@a2ui/react` 0.14.0 and no `@a2ui/markdown-it` 0.2.2.
2. `pnpm-workspace.yaml` allows the builds of exactly the seven catalogs at the new pin, with no line left for `7a6d88d` and none pnpm appended unanswered.
3. The snapshot builds: the seven artifacts and Shop A's second build, each descriptor naming host-module interface `0.16.1`, and the fixed world built on the Store captures as recorded.
4. `pnpm verify` green, uncached.
5. The replay suite green, all 21 specs, the done-notes holding decision 2's two lists: each difference, its cause, and whether it was fixed or its baseline taken again.
6. The live suite green, all five stories, reruns named as decision 5 has it.
7. The hand launch of decision 3.
8. The apps repo's `pnpm verify` green, only if a fix landed there under decision 6.

### 8. `_dev/TODO.md`

The lines of sub-tasks 21.9, 21.11 and 21.20 each take a note, "From 21.8", written when this sub-task is done and only where there is a fact to state, stating facts and nothing of what those sub-tasks do with them. Sub-task 21.9's: each finding added, each README or design-record sentence or image a retaken baseline makes stale, each live story that needed a rerun. Sub-tasks 21.11's and 21.20's: which baselines were taken again and why. The line of sub-task 21.18 takes one only if a catalog fix landed under decision 6: the catalog and its new version.

## Invariants

- No change in behaviour (phase invariant: step 1 changes no behaviour of A2UIVerse).
- The recordings are kept as recorded.
- No baseline is taken again before its difference is traced.
