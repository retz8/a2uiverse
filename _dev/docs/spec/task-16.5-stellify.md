# 16.5 — Stellify

Stellify brought onto the upstream releases Phase 16 pins, packing against the host-module interface at `0.14.0`, and the ref the apps' catalogs consume. Sub-task 16.5 of Phase 16 (`_dev/docs/spec/phase-16-upstream-upgrade.md`).

## Scope

- Stellify's dependencies on the pinned runtime, at exact versions, and its committed build.
- Its version.
- The ref the apps repo pins.
- Its tests and their fixture catalog.
- Out: Stellify's README and the design records, which 16.12 carries; the pins in the apps repo, which 16.9 moves.

## Locked decisions

### 1. The build inlines the sdk alone

Stellify's committed build carries its own code and the sdk's projection and contracts, as task-11.3 decision 2 has it, so a git install needs no build and no workspace sibling. The sdk's npm dependencies — `@a2ui/web_core` 0.14.0, zod and ajv — are Stellify's runtime dependencies, external like esbuild and `@a2a-js/sdk`, at the versions the sdk declares; a test holds the two equal. The library entry and the CLI share one copy of the code.

### 2. Stellify 0.3.0

Stellify's version moves to 0.3.0, the version each artifact it packs names in `packedBy`.

### 3. The ref is 16.5's commit on `main`

The ref the apps repo pins is 16.5's implementation commit on `main`, once pushed. 16.5 changes nothing in the apps repo: 16.9 moves the nine pins — the seven catalogs and the scaffolder's two catalog templates, `basic` and `custom`.

### 4. The pack checks specifiers, not names

The pack refuses an import of a host package the client does not lend, as it does today. A named import that a lent specifier does not export at the host's version packs; the catalog fails in the client. Taking it up is a Backlog item.

### 5. What proves it

- Stellify's tests green on the pinned runtime, the fixture catalog on `@a2ui/web_core` 0.14.0's `Catalog`.
- The fixture importing from `@a2ui/web_core/v0_9/basic_catalog`, its read from the host shown beside the other seven specifiers'.
- The test holding Stellify's runtime dependencies to the sdk's.
- Stellify packed to a tarball, installed outside the workspace, and `stellify check` run there over the fixture.
- The platform's `pnpm verify` green.
