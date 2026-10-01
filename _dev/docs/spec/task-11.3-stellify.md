# Task 11.3 — Stellify, the pack tool

Sub-task 11.3 of Phase 11 (`_dev/docs/spec/phase-11-app-bundle-registry.md`, decisions 5, 7, 8 and 13): the platform package that turns a catalog package into the catalog artifact of the sdk's contracts (task 11.2), in the package's own checkout, with the vendor's source untouched. Amends phase decisions 5, 6, 8, 13 and 14, task 11.2's decisions 1 and 2, and SPEC §9.1 and §13.

## Scope

- The package, its name, where it lives and how the apps repo installs it.
- The two verbs, `pack` and `check`, and the programmatic API.
- The config file and the zero-configuration convention.
- The bundler, the rewrite of host imports and of stylesheet imports, and the artifact's file layout.
- The static gate the verbs run, the same list install runs in 11.4.
- The additions to the sdk this task makes.
- The proof over the seven catalog packages in the sibling checkout, and the tests in this repo.
- The document amendments that follow.
- Out: `publish` and `preview` (M9) and their inputs, the tarball encoder, installing the artifact (11.4), the client's loader (11.5), adding the tool to the catalog packages (11.7), `docs/design/app-install.md` (11.9).

## Locked decisions

### 1. The name is Stellify

The pack tool is **Stellify**: package `@a2uiverse/stellify` at `packages/stellify`, bin `stellify`, "Stellify" the doc term, glossed once as "to turn into a star". It replaces "the pack tool" in SPEC §9.1 and §13, the phase spec and the TODO lines still open.

### 2. Installed from git with its build output committed

The apps repo installs Stellify by the workspace's convention, a `github:` dependency at a pinned ref with a subdirectory path, which pnpm supports and the client already uses for the seven catalogs. Because a subdirectory install from git sees no workspace siblings, and the sdk cannot be installed from git on its own, Stellify's build output is committed — the one package in the monorepo whose `dist` is tracked — with the sdk's projection and contracts inlined, so a git install needs no build and no sibling. `pnpm verify` gains a freshness check that rebuilds and fails on a diff. The sdk stays as 11.2 left it, and SPEC §13's rule that the pack tool is the catalog half's one dev dependency on the platform stays true.

### 3. `check` is a dry pack

`check` runs the whole pipeline in memory, bundling included, then the gate, and writes nothing. `pack` writes the artifact and runs the identical gate, refusing to leave a failing artifact on disk. One verb, one meaning; a vendor's CI runs `check` alone. Gating an already-written directory is the registry's job at install, through the same sdk functions.

### 4. The API returns an in-memory artifact

The core function takes a package directory and options and returns the descriptor, the files as a map from artifact path to bytes, and the gate's findings, empty on success; a refusal is a finding, never a throw. A writer beside it empties the output directory and writes the map with the descriptor, refusing when findings are non-empty; the `pack` verb is its one caller in this task. `defineConfig` and the config and result types are exported. The options carry what the config file could, for a caller without one, plus the host-interface version, defaulting to the sdk's. The launcher (11.6) and the snapshot script consume the map; the form install takes it in is 11.4's decision.

### 5. Verbs and their output

`stellify pack` and `stellify check`, each taking an optional package directory defaulting to the current one, `pack` with an output override. Both print the findings one per line with file and reason, `--json` prints the findings and the descriptor as one JSON object, and `pack` prints the output path and file count on success. Any finding exits with code 1.

### 6. Byte-for-byte determinism

Same package tree, same installed dependencies, same Stellify version, same artifact: no timestamps or absolute paths in the descriptor or the bundle, files in sorted order, the bundler configured for stable output, and a test that packs one package twice and compares hashes. `packedBy.version` is the one field that legitimately changes the hash. Two vendors sharing a catalog then get one row, as 11.2's decision 6 assumes.

### 7. The built entry is the input

Stellify bundles from the package's built entry, the file `exports["."]` names, falling back to `main`: plain JavaScript, every generated file present, the vendor's own typecheck already run. Both verbs refuse with "build the package first" when the file is missing. The config may name a different entry.

### 8. `stellify.config.ts`

The one config format, a TypeScript file at the package root exporting `defineConfig`, loaded through the bundler so no dependency is added; every one of the seven packages already carries a `vitest.config.ts` beside it. Four optional fields: `entry`, `schema` (the convention is `catalogs/v0.9.1/catalog.json`), `catalogId` (must agree with the schema's), `outDir` (default `dist/artifact/`, git-ignored by the vendor). An absent file means every default. A config that reads the environment or the clock breaks the vendor's own reproducibility; the README says so, nothing enforces it.

### 9. esbuild inside

esbuild is the bundler, a direct dependency: one entry, one ESM output, code splitting off, minification off, no source maps in the artifact. Its CSS pipeline is not used. A host specifier resolves to a virtual CommonJS module reading the namespace from the host global, so every named import becomes a property read at runtime and no export list is needed. Any other specifier under a host package is refused with the list of what the host lends, per 11.2's decision 2.

### 10. `react-dom/client` is the seventh specifier

The host interface under 0.9.1 lends `react-dom/client` beside the six of 11.2's decision 2, because `@primer/react`, which the GitHub catalog depends on, reaches it statically and `createRoot` lives only there. The sdk's contract, constants and contract test say seven; the client registers it in 11.5. No artifact exists yet to be broken by the change.

### 11. A stylesheet import becomes an awaited load

Every stylesheet specifier, static or dynamic, in the vendor's code or in a bundled dependency's, resolves to a virtual module that awaits the host's `loadStylesheet` on a URL resolved from the module's own URL. A dynamic import then resolves when the sheet has loaded, so the seven Providers' memoized promises keep their meaning. The loads made while the entry evaluates start together, in import order, and the entry waits for all of them before it finishes, through one top-level await at its end; a load after that waits for its own sheet (amended by the 11.5 follow-up). The artifact's base URL is therefore the entry's own URL, which constrains 11.5: the client imports the entry from its served URL, never from a blob, the session cache by hash notwithstanding. A stylesheet or a `url()` that resolves outside the package and its dependencies is refused.

### 12. The artifact mirrors the package

`artifact.json`, `index.js` and `catalog.json` at the root. Every copied file keeps its path relative to the package root; a dependency's file lands under `node_modules/<package name>/<subpath>`, named by the specifier that reached it, never by pnpm's real path. Relative `url()`s and `@import`s inside a copied sheet keep resolving because the structure around them is unchanged, so no CSS is rewritten; the assets they name are copied the same way. A `url()` to a `data:` or absolute URL is left alone and not copied.

### 13. The gate is static

Nothing is evaluated. The catalog id is the schema file's `catalogId`; the config's, when set, must agree; `CATALOG.id` agreeing with both is the client's load-time check. The exports are read from the bundler's metafile: `CATALOG` required, `Provider` noted when present. The pack gate is exactly what the files alone can prove, matching install's. Amends 11.2's decision 1, which read the id from `CATALOG.id` at pack.

### 14. The gate's items

Run by both verbs, every failure collected and reported together:

1. The config, when present, has only known keys, and its `catalogId` equals the schema's.
2. The entry exists and the bundle builds; every specifier under a host package is one of the seven lent; every stylesheet and every `url()` reached resolves inside the package or its dependencies.
3. The entry exports `CATALOG`.
4. The schema parses and compiles through the sdk's A2UI validator — a new sdk function, so install reuses it, since the pinned spec ships no meta-schema for a catalog — and its `catalogId` equals the descriptor's.
5. The credential lint over the schema is clean.
6. The descriptor validates against the artifact schema, every listed file is present with its hash, and nothing unlisted is in the output.

### 15. Proof

In `pnpm verify`: a vitest suite over a small fixture catalog package committed inside Stellify, following the seven's convention with a Provider, a lazy stylesheet, a font `url()` and a dependency that imports `react-dom/client`, covering every gate item, both rewrites, the pack-twice hash equality and the committed-dist freshness check. Outside it: a `prove` script that builds and packs all seven catalog packages from the sibling apps checkout, validates each descriptor through the sdk, confirms the checkout is clean afterwards, and prints one line per catalog. Run by hand in this sub-task, its output in the handoff; 11.7 makes it each vendor's own `check`. The seven-package run is not part of `pnpm verify`. `packedBy.tool` is written as `@a2uiverse/stellify`.

### 16. Documents

- SPEC §9.1 and §13: Stellify replaces "the pack tool", glossed once; §9.1's export-contract sentence becomes what 11.2 locked, `CATALOG` required and `Provider` optional, no `CATALOG_ID`; the host interface counted as seven where named.
- Phase 11 spec: decisions 5 and 8 name Stellify; decisions 6 and 13 lose `CATALOG_ID`; decision 14 gains the served-URL constraint of decision 11 here.
- Task 11.2 spec: decision 1 amended to where each id check runs; decision 2 amended to seven specifiers.
- The sdk: the contract's rule text and contract test for the seventh specifier; the exports check documented as running at load.
- `_dev/TODO.md`: the 11.3 and 11.7 lines say Stellify; the done 11.2 line stays as written.
- `packages/stellify/README.md` with its build, run and test steps; the root README where it lists packages.
- Not now: `docs/design/app-install.md` (11.9), `client.md` (11.5), `orchestrator.md` (11.4).

## Invariants

- The vendor's source is untouched: Stellify writes only under the output directory.
- Nothing of Stellify reaches runtime; the artifact reaches the host only through the host-module interface.
