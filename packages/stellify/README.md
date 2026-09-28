# Stellify

_To turn into a star._ Stellify is A2UIVerse's pack tool: it turns a catalog package into the **catalog artifact** the registry installs and the client loads at runtime — the directory of files SPEC §9.1 describes, under the sdk's catalog artifact contract. It runs in the package's own checkout, writes only its output directory, and leaves the vendor's source untouched: every import of a host package becomes a read from the client's host-module interface, and every stylesheet import becomes a load through it.

## Use

Two verbs. `check` runs the whole pipeline in memory — bundling included — then the gate, and writes nothing; `pack` writes the artifact after the same gate and refuses to leave a failing one on disk.

```sh
stellify check            # the package in the working directory; exit 1 on any finding
stellify pack             # writes dist/artifact/
stellify pack --out ../packed --json
```

Findings print one per line as `<file>: <reason>`; `--json` prints the descriptor and the findings as one object.

**Zero configuration** when the package follows the seven catalog packages' convention: the built entry is what `exports["."]` (then `main`) names, the schema sits at `catalogs/v0.9.1/catalog.json`, the artifact goes to `dist/artifact/`. Build the package first — Stellify bundles the built entry, never the source. A package that departs writes a `stellify.config.ts`:

```ts
import {defineConfig} from '@a2uiverse/stellify';

export default defineConfig({
  entry: 'lib/index.js',
  schema: 'schema/catalog.json',
  catalogId: 'https://example.com/star/catalog.json', // must equal the schema's
  outDir: 'build/artifact',
});
```

Every field is optional. The file is loaded through esbuild and may not read the environment or the clock: the artifact is byte-for-byte deterministic — same package tree, same dependencies, same Stellify version, same bytes — and a config that varies breaks that.

## The programmatic API

```ts
import {stellify, writeArtifact} from '@a2uiverse/stellify';

const result = await stellify('path/to/catalog-package', {outDir: 'elsewhere'});
// result.findings  — empty when the package packs
// result.descriptor — artifact.json, null when there are findings
// result.files      — Map<artifact path, bytes>, sorted, without the descriptor
if (result.findings.length === 0) await writeArtifact(result);
```

`stellify()` never throws on a refusal; a refusal is a finding. The launcher's auto-install and the registry snapshot consume the map.

## What it does

1. Reads `stellify.config.ts` and `package.json`.
2. Reads the schema; the catalog id is its `catalogId`.
3. Bundles the built entry with esbuild into one ESM: no splitting, no minification, no source maps. A specifier the host lends (`react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`, `@a2ui/react/v0_9`, `@a2ui/web_core/v0_9`, `zod`) becomes a read of `__a2uiverse_host__.modules[...]`; any other specifier under a host package is refused with that list. A stylesheet import, static or dynamic, in the vendor's code or a dependency's, becomes `await __a2uiverse_host__.loadStylesheet(new URL(path, import.meta.url).href)`, so a dynamic import resolves when the sheet has loaded.
4. Lays the artifact out as a mirror of the package: `artifact.json`, `index.js` and `catalog.json` at the root; a copied stylesheet or asset at its package-relative path; a dependency's file under `node_modules/<name>/<subpath>`. No CSS is rewritten — relative `url()`s and `@import`s keep resolving because the structure around them is unchanged.
5. Runs the gate, the same list the registry runs at install: the config well-formed and agreeing with the schema; the bundle building with no refused specifier and no stylesheet asset missing or escaping; `CATALOG` exported, read from the bundle; the schema compiling through the sdk's A2UI validator with its id the descriptor's; the credential lint clean; the descriptor valid with every file present and hashed.

Nothing of the vendor's runs: the exports come from the bundler's metafile, the id from the schema file. `CATALOG.id` agreeing with both is the client's check at load.

## Build, test, prove

```sh
pnpm build      # dist/: index.js with the sdk inlined, cli.js, the declarations
pnpm test       # vitest over the fixture catalog in test/fixtures
pnpm prove      # packs the seven catalog packages in ../a2uiverse-apps (A2UIVERSE_APPS_DIR overrides)
```

`dist/` is **committed**: the apps repo installs Stellify as a `github:` dependency with a `path:` subdirectory, and such an install sees no workspace sibling, so the sdk's projection is inlined at build and the result checked in. `pnpm verify` at the root rebuilds it and fails on any difference (`scripts/stellify-dist.test.mjs`); rebuild and commit after any change here or in the sdk.

## Where things are

| Concern                   | File                        |
| ------------------------- | --------------------------- |
| The pipeline and the gate | `src/pack.ts`               |
| The bundler and rewrites  | `src/bundle.ts`             |
| Artifact paths            | `src/layout.ts`             |
| Stylesheet assets         | `src/stylesheets.ts`        |
| The config file           | `src/config.ts`             |
| The writer                | `src/write.ts`              |
| The command line          | `src/cli.ts`, `src/main.ts` |
| The fixture catalog       | `test/fixtures/`            |
| The proof                 | `scripts/prove.mjs`         |
