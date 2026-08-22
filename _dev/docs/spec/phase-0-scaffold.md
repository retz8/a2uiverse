# Phase 0 — Scaffold

Monorepo shape, workspace packages, root commands, per-package READMEs, the sibling `a2uiverse-apps` skeleton, the doc edits that follow from the naming decisions, and the nightly-routine setup for both repos. No behavior. Covers `## Phase 0` in `_dev/TODO.md`; SPEC.md §9, §11, §13.

## Scope

- The `a2uiverse` monorepo: its packages, toolchain, run commands, and READMEs.
- The `a2uiverse-apps` skeleton: its layout rule and root docs, with no vendor yet.
- Spec and doc edits in both repos reflecting the vocabulary and package set decided here.
- Nightly-routine (daily-work harness autonomous layer) setup for both repos.
- Every package is empty: a manifest, a README, a stub entry point, a placeholder test. Gates must pass green on the empty scaffold.

## Locked decisions

### 1. Package set, cut by process vs. library

Three **processes** — what runs in a terminal at the final stage: `client` (canvas shell web app), `orchestrator` (A2A agent server), `marketplace` (local index, hosting, publish). Two **libraries**: `sdk` and `shell-catalog`. The layout makes the distinction visible: `apps/` holds the processes, `packages/` holds the libraries. All five are scoped `@a2uiverse/*`; only `sdk` is ever published. SPEC §13's `client · orchestrator · marketplace · shell-catalog · bundle` is superseded by this.

### 2. Orchestrator in TypeScript

The orchestrator is a Node/TypeScript A2A server, sharing one toolchain and direct type imports with the client. Python is not used in this repo; it remains the natural choice for mock vendor agents in `a2uiverse-apps`.

### 3. Vocabulary: "catalog", not "adapter"

The package pairing a `catalog.json` with its React implementation is called a **catalog**. Upstream's terms name the two faces — **catalog schema** (the JSON) and **catalog implementation** (the framework code). **"Adapter" is retired** from this project's vocabulary and reserved for upstream's meaning: the framework layer (`@a2ui/react` is the React adapter). Vendor packages follow `<vendor>-catalog`; the shell's own is `shell-catalog`. `primer-a2ui-adapter` keeps its name as an external package.

### 4. `@a2uiverse/sdk` is the vendor-facing contract

`sdk` holds what an app needs to exist on the platform: the app manifest contract (schema, types, validation) and, as it materializes, the §14 protocol extension (slot archetype + budget, auth-required state). It is the **only** platform package a vendor may depend on. Platform-internal shared code (Composition types, binding vocabulary, Validator abstractions extracted from client/orchestrator) goes to a separate, private package when it is extracted — not in Phase 0, not named now. "Bundle" survives only as the informal word for the installed artifact, not as a package.

### 5. `shell-catalog` is an instance of what `sdk` describes

`shell-catalog` is the shell's own catalog — standard catalog plus composition primitives — as schema + React implementation, the same artifact shape a vendor ships. It depends on `sdk`; `sdk` defines the shape, `shell-catalog` is the first thing of that shape.

### 6. `a2uiverse-apps` layout: one folder per app

Each mock vendor is one self-contained folder: its agent, its `<vendor>-catalog`, and its app manifest. One folder is one app — the unit `sdk` describes and the orchestrator installs — mirroring `a2ui-github`. A root workspace spans the catalogs so they share one toolchain; each agent is its own project. Phase 0 ships the layout rule and root docs only; the first vendor arrives with Phase 1's `[apps]` sub-task, and the agent language is that sub-task's call.

### 7. pnpm workspaces + Turborepo, both repos

pnpm is the package manager; Turborepo runs tasks over the workspace graph. Root script names match the `a2ui-github` habits (`build`, `typecheck`, `test`, `lint`, `format`, `dev`). `a2ui-github` itself stays on Yarn, untouched.

### 8. Toolchain carried over from `a2ui-github`

TypeScript (same base config), ESLint 9 flat config with typescript-eslint and the React plugins for React packages, Prettier, Vitest per package, Playwright only in `client`. Every package exposes the same `build · typecheck · test · lint` scripts. Server-side apps build with plain `tsc` and run on `node`; no bundler outside the client. Package manager and Node versions are pinned.

### 9. Run commands: both forms

A root `dev` starts all three processes together; per-app `dev` via pnpm filtering runs one in its own terminal. This repo's commands never start vendor agents or `a2ui-github`. In Phase 0 each app's `dev` is a placeholder that prints its name and exits cleanly. Ports are fixed and documented (root README and the tunnel doc); the numbers are Phase 1's.

### 10. README template, concise

Each package README: what it is (with the SPEC sections that bind it), consumers/dependencies (for `sdk`, the vendor-import rule), commands, ports (apps only). No design content. The root README gains a repository-layout section and the two `dev` forms.

### 11. Doc edits included in Phase 0

Done first, on `main`, before scaffolding:
- SPEC.md §13 — the monorepo line becomes the `apps/` + `packages/` set.
- SPEC.md §9.1–9.2 — "adapter" → "catalog implementation"; the two faces = one `<vendor>-catalog` package; the contract package is `sdk`.
- SPEC.md §15 — "App bundle format" noted as living in `sdk`.
- `a2uiverse-apps` README + CLAUDE.md — one-folder-per-app rule, the `sdk` dependency rule, pnpm + Turborepo.
- `a2ui-sdk-design` skill in both repos — vocabulary realigned to catalog / schema / implementation; "adapter" only for the framework layer. `a2ui-github`'s copy is unchanged.
- Root README "Ecosystem" diagram — untouched.

### 12. Nightly routine setup, per repo, last in Phase 0

For each of `a2uiverse` and `a2uiverse-apps`: create the harness labels (`autonomous-ready`, `kind:spec`, `kind:standalone`, `blocked-by`-style dependency labels as needed, `blocked:setup`, `review-ready`, `needs-input`, `needs-attention`, `autonomous-revise-ready`); confirm gates run from a fresh clone; register the plugin's `nightly-routine-prompt.md` via the `schedule` skill as a Remote, nightly routine on a capable model against that repo's `origin`; record the routine in the repo's CLAUDE.md. Registration is done in-session under the user's auth; any Routine setting the skill does not expose (e.g. unrestricted branch pushes) is verified at execution time and handed to the user only if necessary.

### 13. CLAUDE.md documents fresh-clone setup and the gate command

The nightly prompt is project-neutral; it reads setup and gates from the repo. Each repo's CLAUDE.md states the fresh-clone setup (install at root; per-agent Python setup in `a2uiverse-apps` once agents exist) and the single root gate command. The existing "no guessed run commands" rule stays.

## Invariants

- Gates are green on the empty scaffold before Phase 0 closes; a routine's first fire on an empty queue reports "nothing queued" cleanly in both repos.
- `a2uiverse-apps` never imports the platform; `sdk` is the one allowed dependency.
- `_dev/` is edited on `main` only.

## Open items

- Name of the platform-internal shared package — settled when it is first extracted (Phase 2–3), not now.
- Whether the §14 protocol extension later splits out of `sdk` into its own package.
