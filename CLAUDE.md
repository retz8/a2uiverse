# CLAUDE.md — a2uiverse

## How to Use these Guides

> **INSTRUCTION FOR ALL AGENTS — do this before any task:**
>
> 1. **Read [SPEC.md](SPEC.md) in full.** It is the authoritative design for this project.
> 2. **For work on the shell catalog, a vendor catalog, or a renderer:** also read [.claude/skills/a2ui-sdk-design/SKILL.md](.claude/skills/a2ui-sdk-design/SKILL.md) in full.

This file (`CLAUDE.md`) holds only the **operational rules** not covered elsewhere. It does **not** restate the project design (that lives in SPEC.md) or the spec-navigation/design mechanics (those live in the `a2ui-sdk-design` skill).

`a2uiverse` is the **platform** of A2UIVerse — `apps/` client (canvas shell) · orchestrator · marketplace, and `packages/` sdk (the app contract vendors depend on) · shell-catalog. It is a **downstream consumer** of the A2UI and A2A protocols — not the protocol repo. The protocol, schemas, and standard catalogs live in the sibling fork at `../A2UI/`, which tracks `a2ui-project/a2ui` via its `upstream` remote. Read the spec from the `upstream/main` ref (see §2), not the fork's working tree.

Apps are never built in this repo. Vendor apps — all external apps; there are no internal agents — live in the sibling `../a2uiverse-apps/`; `../a2ui-github/` is the origin of the GitHub app, copied there at the end of Phase 1. Neither may depend on this repo — see SPEC.md §13.

---

## 1. What is A2UI?

**A2UI (Agent-to-User Interface)** is a platform-agnostic, streaming-first UI protocol designed to let LLMs and autonomous agents generate user interfaces.

Key capabilities:

- **Streaming UI:** Progressive rendering of components and values on the fly to minimize latency.
- **Two-Way Data Binding:** Seamless state synchronization between client and agent.
- **Local Function Evaluation:** Execution of validation/logic functions registered in Component Catalogs.

---

## 2. Protocol Versioning & Authority

This project targets a single protocol version at a time.

- **Authority Rule:** Default to version **v0.9.1** as the primary authority, unless the user specifies otherwise.
- **Refresh the spec:** Include the phrase **"sync spec"** in your prompt. A `UserPromptSubmit` hook (`.claude/hooks/sync-spec-hook.sh`, wired in `.claude/settings.json`) runs a non-destructive `git fetch upstream` that updates the `upstream/main` ref without touching the fork's working tree or branch.
- Do not hardcode schema contents; read them from the `upstream/main` ref dynamically.
- **Protocol deviations** are recorded in the protocol delta register in SPEC.md §14, tagged *local convention* or *upstream candidate*. Add every new deviation there.
- **How to read the spec** (paths, git commands, critical source-of-truth files): see the `a2ui-sdk-design` skill's "Specifications Navigation".

---

## 3. Conventions

- **No guessed run commands:** Consult the local `README.md` of each package for build/run/test steps rather than assuming a sequence.
- **No disposition popups — always plain chat.** Never use the `AskUserQuestion` tool to present dispositions, decisions, or choices. Lay out the options, tradeoffs, and a recommendation as plain chat text so the user keeps full flexibility to respond however they want.
- **Local only.** Everything runs as local processes in separate terminals. Nothing in this project is deployed.

Catalog-authoring and renderer-design conventions live in the `a2ui-sdk-design` skill (read per the top instruction before that work).

### Setup and gates

- **Fresh clone:** `pnpm install` at the root (Node ≥ 22; Corepack resolves the pinned pnpm).
- **Gates:** `pnpm verify` — `turbo run build typecheck test`, then `eslint .` and `prettier --check .`. Must be green before any commit lands on `main`.
- **Run:** `pnpm dev` starts all three processes; `pnpm --filter @a2uiverse/<app> dev` runs one. Ports and tunnel URLs: `_dev/docs/tunnel-environment.md`.

### Daily-work harness

The dev workflow (phases → sub-tasks, dispatch, branching, wrap-up) lives in the **`daily-work-harness` plugin** — its skills (`daily-work-harness:pick-up-task` / `:wrap-up` / `:rebase-with-main` / `:grill-to-spec`) and the `daily-workflow.md` reference doc they read. Operational rules it relies on:

- **`_dev/` lives on `main`.** `_dev/TODO.md` and everything under `_dev/docs/` is edited and committed on `main` only — never on a worktree/sub-task branch. Worktree branches carry implementation code only.
- **Implementation plans go to `_dev/docs/plan/`** as `task-<N.M>-<short>.md` — `superpowers:writing-plans` must emit there.
- **Nightly routine.** `a2uiverse nightly producing routine` (Claude cloud Routine, 01:30 KST, Opus) drains `autonomous-ready` issues into labelled PRs per the harness's autonomous contract; triage with `daily-work-harness:review-nightly`. Labels are provisioned on the repo.
- **Commit convention:** conventional commits — `<type>(phase-<N>): …` for phase/sub-task work, bare `<type>: …` off-phase.
- **`[apps]` sub-tasks.** A sub-task whose code lands in `../a2uiverse-apps/` carries an `[apps]` tag in `_dev/TODO.md`. It is worked directly on that repo's `main` — no worktree, no sub-task branch — with `../a2uiverse-apps/` as an additional working directory. Its spec, plan, and handoff stay in this repo's `_dev/docs/`.

---

## 4. Maintenance & Update Policy

- **SPEC.md is the source of truth for design.** When a design decision changes, update SPEC.md — not this file.
- Keep this file and the `a2ui-sdk-design` skill synchronized with the targeted protocol version as the project evolves.
- When the targeted A2UI version changes, update the Authority Rule in both this file and the skill.
- Suggest documentation updates to the user at the end of a task if any change affects documented files.
