# Task 11.7 — Manifests out, Stellify in

Sub-task 11.7 of Phase 11 (`_dev/docs/spec/phase-11-app-bundle-registry.md`, decisions 3 and 5), an `[apps]` sub-task: `manifest.json` removed from every app, Stellify a dev dependency of every catalog package at a pinned ref with `check` green on all seven, and the scaffolder's port suggestion given a source the apps repo still holds. Completes task 11.3's decision 15 — the hand-run proof becomes each vendor's own `check`.

## Scope

- `manifest.json` removed from the seven apps and from what the scaffolder generates.
- The scaffolder's port suggestion off the manifests.
- Stellify as a dev dependency of the seven catalog packages and of both scaffolder catalog templates, at one pinned commit of this repo; `check` in each, run by the apps repo's gates and CI.
- Stellify's hand-run `prove` script removed from this repo.
- The registry snapshot's pin on the apps repo moved.
- Every document the changes make wrong, in both repos.
- The proof.
- Out: the acceptance run (11.8); `docs/design/app-install.md` and the platform's READMEs (11.9).

## Locked decisions

### 1. The manifests go

`manifest.json` is deleted from all seven apps, and the scaffolder no longer generates one for a new app. Nothing the manifest carried is lost: the name is the card's, the catalog id is the schema's, the port is the agent's own.

### 2. The port suggestion reads the agents' own ports

The scaffolder suggests one above the highest `default_port` among the sibling agents' configs, or 11001 when there is none — the same places searched as today, the immediate subfolders of the working directory and of the target's parent, and the same rule. The agent's own config is the one place the apps repo states a port; the platform's launcher roster is never read.

### 3. Each catalog package spells the dependency in full

Each catalog package names Stellify as a `github:` dev dependency at the pinned commit with the subdirectory path, written in full in its own manifest — no workspace-level pin — so each installs on its own, as a vendor's package does.

### 4. The pin is this repo's newest pushed commit

This repo's `main` is pushed and the seven pin its newest pushed commit, so the Stellify a vendor checks with is the one the launcher packs with.

### 5. `check` runs in the apps repo's gates

Each catalog package carries a `check` script running Stellify's `check`. The apps repo runs it as a task after the package's own build, inside its `pnpm verify`, so its CI checks all seven on every push. No `pack` script.

### 6. A new app is born with Stellify

Both scaffolder catalog templates carry the same dev dependency at the same pin and the same `check` script, and the scaffolder's drift gate runs `check` on a freshly scaffolded catalog.

### 7. `prove` is retired

Stellify's hand-run proof over the seven is removed — the script, its package script and its README lines. The gate over each package's source is its own `check`; the gate over all seven seen from this repo is the registry snapshot. The change lands on this repo's `main` directly.

### 8. The registry snapshot's pin moves

The registry snapshot's pin on the apps repo moves to the commit 11.7 lands, so this repo's `pnpm verify` exercises installing a catalog from git with Stellify among its dev dependencies.

### 9. Docs

11.7 corrects every mention its changes make wrong, in both repos. In the apps repo: the README, `CLAUDE.md`, each app's README, each agent README's connecting section — the launcher lines 11.6 left behind among them — the kit's and the scaffolder's READMEs, the scaffolder's templates, prompts and port help, and the mock stores' catalog-id docstrings; the README's gates line names `check`. In this repo: `docs/design/agent-kit.md` and the sdk's manifest comment. The 11.9 line in `_dev/TODO.md` drops the apps repo's README.

### 10. Proof

The apps repo's `pnpm verify` green — `check` on all seven, tests for the port suggestion, the scaffolder's drift gate with `check` on both templates. No `manifest.json` left in the apps repo. This repo's `pnpm verify` green, the moved snapshot pin included. The launcher's listing reports all seven ok. The apps repo pushed after this repo, and its CircleCI verify job green.

## Open items

- When the pins move after 11.7 is not decided here; install's gate in the orchestrator stays the authority.
