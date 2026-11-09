# CLAUDE.md — a2uiverse

## How to Use these Guides

> **INSTRUCTION FOR ALL AGENTS — do this before any task:**
>
> 1. **Read [SPEC.md](SPEC.md) in full.** It is the authoritative design for this project.
> 2. **For authoring, refactoring or reviewing TypeScript — the client, the orchestrator, the marketplace, the sdk, the shell catalog, a vendor catalog:** read [.claude/skills/coding-principles/SKILL.md](.claude/skills/coding-principles/SKILL.md) and follow its routing.
> 3. **For moving code to a newer A2UI SDK or protocol version:** read [.claude/skills/a2ui-migration/SKILL.md](.claude/skills/a2ui-migration/SKILL.md) in full.
> 4. **For writing a README, a design record, a doc or a PR description:** read [.claude/skills/natural-writing/SKILL.md](.claude/skills/natural-writing/SKILL.md) in full.

This file (`CLAUDE.md`) holds only the **operational rules** not covered elsewhere. It does **not** restate the project design (that lives in SPEC.md) or the coding and writing standards (those live in the skills under `.claude/skills/`).

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
- **How to read the spec.** From the `upstream/main` ref of `../A2UI`, never its working tree, which is usually on a feature branch:
  - list a tree: `git -C ../A2UI ls-tree -r --name-only upstream/main specification/`
  - read a file in full: `git -C ../A2UI show upstream/main:specification/v0_9_1/json/server_to_client.json`
  - search: `git -C ../A2UI grep <pattern> upstream/main -- specification/`
- **Critical sources of truth** under `specification/<version>/`, each read in full for the targeted version: the JSON schemas (`json/server_to_client.json` for stream envelopes, `client_to_server.json` for action events, `common_types.json` for the dynamic binding primitives and the other `$defs`); the catalogs (`catalogs/<name>/catalog.json`, bundled under the version for v0.9 and v0.9.1 and under the repo's `catalogs/` from v1.0; the basic catalog is the structural reference when authoring one); the protocol semantics (`docs/a2ui_protocol.md`); the SDK architecture (`docs/sdks_spec.md`: the core SDK, the inference SDK, the framework adapters); the basic catalog implementation guide (`docs/basic_catalog_implementation_guide.md`); custom functions (`docs/a2ui_custom_functions.md`); the conformance suite (`test/`) the sdk's validator is measured against.

---

## 3. Conventions

- **No guessed run commands:** Consult the local `README.md` of each package for build/run/test steps rather than assuming a sequence.
- **No disposition popups — always plain chat.** Never use the `AskUserQuestion` tool to present dispositions, decisions, or choices. Lay out the options, tradeoffs, and a recommendation as plain chat text so the user keeps full flexibility to respond however they want.
- **Local only.** Everything runs as local processes in separate terminals. Nothing in this project is deployed.

Vocabulary: a **catalog** is the package pairing a `catalog.json` with its framework implementation, named `<vendor>-catalog` (the shell's own is `shell-catalog`); the **catalog schema** is the `catalog.json` and the **catalog implementation** the framework code that renders it, upstream's terms; an **adapter** is upstream's word for the framework layer only (`@a2ui/react` is the React adapter), never a catalog package here.

Catalog-authoring and renderer conventions live in the `coding-principles` skill's TypeScript subskills — A2UIVerse's own in `.claude/skills/coding-principles/subskills/typescript/a2uiverse-catalog-conventions.md` — and the component design flow in `design-catalog-component` and `build-catalog-component`.

### Setup and gates

- **Fresh clone:** `pnpm install` at the root (Node ≥ 22; Corepack resolves the pinned pnpm).
- **Gates:** `pnpm verify` — `turbo run build typecheck test`, then `eslint .` and `prettier --check .`. Must be green before any commit that touches code lands on `main`. A commit that touches only documents — `_dev/`, `docs/`, READMEs, `SPEC.md`, this file — needs only `prettier --check` on the files it changes.
- **Run:** `pnpm dev` starts all three processes; `pnpm --filter @a2uiverse/<app> dev` runs one. Ports and tunnel URLs: `_dev/docs/tunnel-environment.md`.

### Daily-work harness

The dev workflow (phases → sub-tasks, dispatch, branching, wrap-up) lives in the **`daily-work-harness` plugin** — its skills (`daily-work-harness:pick-up-task` / `:wrap-up` / `:rebase-with-main` / `:grill-to-spec`) and the `daily-workflow.md` reference doc they read. Operational rules it relies on:

- **`_dev/` lives on `main`.** Everything under `_dev/` is edited and committed on `main` only — never on a worktree/sub-task branch. Worktree branches carry implementation code only.
- **Implementation plans go to `_dev/docs/plan/`** as `task-<N.M>-<short>.md`.
- **Design records go to `docs/design/`** as `<area>.md` (e.g. `orchestrator.md`): a really friendly guide to the implemented system for a junior frontend engineer — the problem the area solves, its new concepts explained over one real running example with diagrams where they help, one flow end to end, the algorithms, data structures and engineering structures inside it, the engineering decisions with what each buys and costs, trying it without a model, where the code is, and a glossary. `docs/design/synthesis.md` is the model. States what is, checked against the code. Headings carry no leading "The". Updated in the same session as the change that alters the design.
- **READMEs are a DX product.** A README is a doc for a human — concise but understandable and easy to read, not a complex dev doc. Its shape: what the package is, in one line; a quick start that works in a minute; the commands or the API, one line each; the details below in short sections or collapsed; the _why_ pointed at the design record, never restated.
- **Nightly routine.** `a2uiverse nightly producing routine` (Claude cloud Routine, 01:30 KST, Opus) drains `autonomous-ready` issues into labelled PRs per the harness's autonomous contract; triage with `daily-work-harness:review-nightly`. Labels are provisioned on the repo.
- **Commit convention:** conventional commits — `<type>(phase-<N>): …` for phase/sub-task work, bare `<type>: …` off-phase.
- **`[apps]` sub-tasks.** A sub-task whose code lands in `../a2uiverse-apps/` carries an `[apps]` tag in `_dev/TODO.md`. It is worked directly on that repo's `main` — no worktree, no sub-task branch — with `../a2uiverse-apps/` as an additional working directory. Its spec, plan, and handoff stay in this repo's `_dev/docs/`.

---

## 4. Maintenance & Update Policy

- **SPEC.md is the source of truth for design.** When a design decision changes, update SPEC.md — not this file.
- Keep this file synchronized with the targeted protocol version as the project evolves. The skills copied from upstream (`a2ui-migration`, `coding-principles`, `natural-writing`) each open with a provenance line naming the upstream path and commit; refresh one by re-copying it from upstream, keeping A2UIVerse's own additions apart from the copy.
- When the targeted A2UI version changes, update the Authority Rule in this file.
- Suggest documentation updates to the user at the end of a task if any change affects documented files.
