# Task 3.6 — Integration + acceptance

Spec for sub-task **3.6** of Phase 3 (`_dev/TODO.md`), the phase's proof sub-task: it demonstrates that the kit, the scaffold CLI and the launcher compose, and closes the phase's remaining documentation debt. Phase spec: `_dev/docs/spec/phase-3-agent-kit.md`, acceptance 2–5.

## Scope

- The fourth-app scaffold proof, both variants, wired far enough to paint and then removed entirely.
- The live tunnel sanity pass over the three refactored agents.
- The apps-repo README and run-command sweep left stale by the module collapse in 3.2.
- The `allowBuilds` re-pointing in the platform's `pnpm-workspace.yaml`, off-phase.

Out of scope: the platform README's launcher surface, done in 3.5. The `build-catalog-component` skill's stale paths, which belong to the `a2ui-github` project rather than this one.

## Locked decisions

### 1. The fourth-app proof runs all the way to pixels

The scaffolded app is registered by hand — an orchestrator registry entry, the client's catalog record and resolver table entry, and a local dependency on its catalog package — because the registry's URL overrides can only rewrite entries that already exist, not add one. The wiring is throwaway scaffolding, exactly like the app: what the proof is for is the templates, and whether a generated catalog renders, brings its own styles, and mounts a generated agent's surface is answerable only by rendering it.

### 2. The throwaway lives inside the apps repo, untracked

It is scaffolded where a real vendor would put it, so the launcher discovers it in the default agents dir with no flags, port suggestion runs against its real siblings, and the custom variant is gated by the same `verify` that gates every other package there. The basic variant goes first and is removed before the custom variant is scaffolded, so only one generated app is ever in the tree.

### 3. The throwaway is given a distinct domain

It is scaffolded with an id, display name and description naming a domain none of the three real agents covers, and driven with a prompt only that domain answers. Retrieval cannot exclude it — four apps against a shortlist cap of five — so the Planner is the only thing that can, and an unambiguous domain makes a routing failure mean something instead of reading as bad luck.

### 4. Two runs; the tunnel pass is last, on the clean tree

The launcher takes one mode for every agent it starts, so the throwaway and a live fan-out cannot share a run. The throwaway proof runs first with all four agents in deterministic mode. Everything it required is then reverted — the app, the four wiring edits, the lockfile — and the live tunnel sanity pass runs afterwards over the three refactored agents, on exactly the tree that gets committed. A pass run before the revert would prove a state nobody will have again, and would hide what the revert itself can break.

### 5. Both runs are verified in the browser through the tunnel

Client and orchestrator are reached at their tunnel URLs, never localhost. Each run leaves a screenshot: the throwaway's is the acceptance-3 artifact, the fan-out's is acceptance 5's.

### 6. The doc sweep covers the apps-repo READMEs

The apps root README and the calendar and gmail agent READMEs, modelled on the GitHub agent's README, which 3.7 already converted. It is a path-and-run-command sweep: where the docs describe behavior — calendar's admitted inventory, its non-notifying guarantee — the prose stands and only the module paths and run lines change.

### 7. `allowBuilds` is re-pointed, off-phase

The catalog entries are keyed by resolved tarball and were not re-pointed on the last bump, leaving stale entries at old hashes and unresolved placeholders at the current ones — so those catalogs would not build on a fresh install, against a README that promises a fresh clone reaches a working screen with nothing to configure. Nothing about the agent kit caused it, so it lands as a bare `fix` commit rather than phase work, and it is done before the proof's install rewrites that neighborhood.

## Invariants

- The throwaway app and every edit made to accommodate it are removed before the phase closes; neither is committed.
- The stale `deterministic_agent/` and `llm_agent/` directories hold only bytecode and are absent from version control in both repos — there is nothing to remove beyond local cleanup.
