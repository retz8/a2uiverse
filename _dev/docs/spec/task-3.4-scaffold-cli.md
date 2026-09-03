# Task 3.4 — Scaffold CLI

Spec for sub-task 3.4 of Phase 3 (`_dev/docs/spec/phase-3-agent-kit.md`, decisions 2, 3, 6, 8): the TypeScript scaffold CLI in `a2uiverse-apps` that generates a new vendor app on the agent kit. An `[apps]` sub-task.

## Scope

- The CLI package in `a2uiverse-apps`, its interaction model, and the inputs it takes.
- The generated app: agent half on the kit, catalog half of either kind, manifest, and vendor extras.
- The two opt-in questions deferred from 3.3: Google ADC, and readiness for the a2uiverse ecosystem (paintMeta wiring).
- The CLI's own verification, including the gate that keeps it in step with the kit.
- Out of scope: the launcher (3.5), the fourth-app scaffold proof on the canvas (3.6), registry publishing.

## Locked decisions

### 1. Flags with a guided walkthrough as fallback

Any input given as a flag is taken as is; anything missing is prompted for. The interactive path is a guided walkthrough, not a required-field check: each step explains what the input is for, shows its default, and the two opt-ins say what saying yes wires in. A non-interactive switch accepts defaults where they exist and fails on the rest.

### 2. Scaffolds anywhere, one dependency form

The target directory is an option, defaulting to a folder named after the app id under the current directory. The scaffolded agent always depends on the kit as a git dependency, whether or not the target is inside the apps repo. No location-aware path-dependency variant.

### 3. Package and name: `create-a2ui-agent`

One pnpm workspace package, `create-a2ui-agent`, with a bin of the same name — the `create-*` idiom. A2A is implicit in the name, as it is in `a2ui-agent-kit`; the README and package description state "A2UI over A2A". The 3.5 launcher joins as a second bin of the same package. Rejected: a2uiverse-branded names; carrying A2A in the name; renaming the kit.

### 4. Hybrid template mechanism

Static template trees are copied for the bulk of the app; the few files whose content varies by answers — the agent config, the agent project file with the kit pin, the MCP wiring module, and the manifest — are generated in code.

### 5. Obtained locally for now

No registry publishing. The CLI is invoked through the workspace inside the apps repo; outside users clone the repo first. The package is built publish-ready (proper bin, files whitelist, no workspace-only runtime assumptions) so that publishing to npm — and with it the `npx create-a2ui-agent` invocation — is a later, one-step decision.

### 6. Pin is the commit sha at scaffold time

The kit dependency is pinned to the apps repo's current HEAD sha, read from the checkout the CLI runs in, with an override flag. The CLI warns when the checkout is dirty or the sha is unpushed. Rider: Phase 3 decision 3 describes the pin as "the same convention the catalogs already use"; the catalogs are in fact consumed as branch-tip git dependencies with no pin. The sha pin is the actual convention for scaffolded agents.

### 7. Eight inputs, everything else derived

Asked: id (kebab-case; folder name and catalog package name derive from it), display name, description, port, catalog kind (basic or custom), Google ADC opt-in, ecosystem-ready opt-in, repository URL. Port defaults to the next free port above the highest manifest found nearby; repository URL defaults to the target's git origin remote. Derived, not asked: the kit sha, the catalog id URL and manifest catalog fields, the card's placeholder skill, all config path fields, the model. Left as marked TODOs: prompt prose, domain knowledge, real stub fixtures, the live toolset.

### 8. Catalog id from the repository URL

The catalog's identity URL is built from the asked repository URL plus the fixed folder layout, and written once into all three places that carry it (catalog.json, the catalog package's id module, the manifest) so they cannot drift at scaffold time. Rejected: a placeholder URL with a TODO; refusing to scaffold without a git remote.

### 9. The catalog half is the full package

For either kind the CLI generates the whole catalog package, in the same shape as the existing basic-themed catalogs: package config, provider with scoped wrapper, theme stylesheet, id module, tests, README, and the catalog JSON with identity fields filled. Basic kind: catalog content comes from the basic catalog; token values and theme CSS content remain design work owned by the catalog skills. Custom kind: the package shell with an empty component and function layout and the registry; content goes through the catalog-component skills. Both embody the one-provider-and-CSS-setup rule by construction.

### 10. Hello-surface floor

A fresh scaffold works before the vendor edits anything. Deterministic mode answers with one canned greeting surface built from basic components; stub mode ships one placeholder tool with a small fixture and enough prose for the model to call it and paint; live mode raises a clear "wire your MCP server here" error. Generated tests (prompt-assembly snapshot, catalog parity, provider) pass on the fresh scaffold; the workspace gates and the agent's test suite are green.

### 11. Install as the final walkthrough step

After writing files the walkthrough asks whether to install now, defaulting to yes, with install / no-install flags for the non-interactive path. The install step prints the commands it runs.

### 12. Placement beside the kit

The package lives at the apps repo root as a sibling of `agent-kit/`, added to the workspace glob. Templates live inside the package and ship with it.

### 13. Verification: snapshots plus the drift gate

The CLI's tests snapshot the generated tree, and a scaffold-and-run test generates a basic app and runs its test suite against the working-tree kit (the harness swaps the pinned dependency for a path dependency in that one case). A kit change that breaks the templates fails the workspace gate.

### 14. Libraries

`commander` for flags and help; `@clack/prompts` for the walkthrough.

### 15. Vendor extras shipped

README (run commands, mode table, TODO markers, the acts-as-your-token's-user warning where the app is write-capable), an env example, and the record-beats driver script. Not shipped: corpus derivation, recordings folders.

## Invariants

- The CLI is never a runtime dependency of an app (Phase 3 decision 2).
- The CLI and the kit are coupled through the templates and versioned together in one repo; a scaffold at a given sha is self-consistent with the kit at that sha.
- Nothing a2uiverse-specific reaches the vendor wire; the ecosystem hook is an opt-in (SPEC §14).
