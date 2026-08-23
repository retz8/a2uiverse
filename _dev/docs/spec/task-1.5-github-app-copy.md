# Task 1.5 — GitHub app copy

The GitHub app moves from `a2ui-github` into `a2uiverse-apps/github/` and the platform client switches to the catalog at its new home (phase spec decisions 3, 15, 16; acceptance 6). `[apps]` sub-task: worked on `a2uiverse-apps` `main`. Parent: `_dev/TODO.md` 1.5, `_dev/docs/spec/phase-1-spine.md`.

## Scope

- `a2uiverse-apps/github/`: `agent/` (both agent packages), `github-catalog/`, `manifest.json`.
- The platform client and orchestrator on the new catalog package and id.
- Gates green in both repos; the copied agent runs from 11001.
- Not in scope: a registry or publish step; a uniform agent launcher or flag convention (kit phase); CSS token scoping across bundles (Phase 2).

## Locked decisions

### 1. No registry — the catalog is a git dependency

`github-catalog` is never published. The client consumes it as a git dependency on the public `a2uiverse-apps` repo at the package's subdirectory, following `main`, with the resolved commit held by the lockfile and the package built on install. This is the light form of install: the bundle record points at where the app lives.

### 2. Identity

The package is named `github-catalog` — a module name only. The catalog id is the package's repo-path URL at its new home, `https://github.com/retz8/a2uiverse-apps/blob/main/github/github-catalog/catalogs/v0.9.1/catalog.json`; every vendor catalog in `a2uiverse-apps` uses the same URL shape, versioned by path.

### 3. The bundle owns its provider and CSS

The package has one entry exporting the catalog, the catalog id, and the Provider. The Primer provider and the primitives CSS move out of the client into the package. The bundle ships its design system itself — Primer, octicons, primitives as its own dependencies at exact versions; the host supplies only the shared runtime that must be a singleton: React, the A2UI runtime, zod. The client applies a catalog's Provider around that catalog's fragment only, through the existing `catalogId → {catalog, Provider}` map — nothing is registered at the app root and the host lists no vendor design system.

### 4. The agent is copied with two deliberate edits

Both agent packages come over as they are, except: the catalog locator resolves the sibling `github-catalog/` at the new depth, and both default ports become 11001. The catalog package's Yarn-only patch dependency is dropped.

### 5. Dropped from the copy

The source's client, adapter template, docs, and the agent's recordings and untracked artifacts do not come over — the platform client owns beat recording. The agent's knowledge examples come over with the catalog id rewritten, as runtime input.

### 6. Manifest placeholder

`github/manifest.json` mirrors the orchestrator's registry record (id, display name, agent URL, auth, catalog id, catalog package) and notes that the schema lands with the `sdk` manifest in Phase 9. Nothing reads it in Phase 1.

### 7. Platform switch

The registry entry and the three recorded beat fixtures take the new catalog id in place; no re-recording. The `link:`-era scaffolding (path pins, dedupe) is removed and restored only if a real duplicate-identity error appears. The platform's scripts and READMEs follow the package name.

### 8. Gates

In `a2uiverse-apps`, the agent folder is excluded from Prettier; its Python suite is run by hand as acceptance and joins the gate in the kit phase. `pnpm verify` is green in both repos.

## Invariants

- `a2ui-github` is not edited.
- `a2uiverse-apps` depends on nothing in the platform beyond `@a2uiverse/sdk` and the protocols.

## Open items

- `NavList`, `TreeView`, `Card` inspect their React children like `PageHeader` did; check them when Phase 2 first paints with them.

- Phase 2 carry-over: a bundle's CSS scopes its tokens to the fragment wrapper, not `:root`, so two design systems on one surface cannot collide.
