# @a2uiverse/stellify

_Stellify: to turn into a star._ Stellify packs a catalog package into the **catalog artifact** A2UIVerse installs, the folder of files the client loads at runtime to draw an app's UI. You run it inside your catalog package. It reads your built code, never edits it, and writes one folder.

## What it does for you

- **One command to ship a catalog.** `stellify pack` bundles your built entry, your stylesheets, your fonts and icons and your catalog schema into a folder with a descriptor listing every file and its hash. That folder is what the registry installs.
- **Your source stays yours.** You import React, `@a2ui/react` and your CSS the way you always did. Stellify rewrites those imports in the bundle, not in your files: React and the other host packages become reads from the client's shared copies, and each stylesheet import becomes a load the client performs. No wrapper to write, no build step to change.
- **A dry run that tells the truth.** `stellify check` runs the exact same pipeline in memory, then the same checks the registry runs at install, and writes nothing. Green here means the install will be green.
- **Same input, same bytes.** Packing the same package tree with the same Stellify version gives the same artifact, hash for hash. Two apps sharing a catalog share one row in the registry.
- **Zero configuration** when your package looks like the catalog packages in [`a2uiverse-apps`](https://github.com/retz8/a2uiverse-apps): a built entry named by `exports["."]`, a schema at `catalogs/v0.9.1/catalog.json`. Anything else is a four-field config file.

## Running it

Build your package first. Stellify bundles the built entry, not the source.

```bash
pnpm build
stellify check              # the package in the working directory; exit 1 on any finding
stellify pack               # writes dist/artifact/
stellify pack --out ../packed --json
```

Findings print one per line as `file: reason`. `--json` prints the descriptor and the findings as one object, for CI.

A package that departs from the convention adds a `stellify.config.ts`:

```ts
import {defineConfig} from '@a2uiverse/stellify';

export default defineConfig({
  entry: 'lib/index.js', // default: what exports["."] names
  schema: 'schema/catalog.json', // default: catalogs/v0.9.1/catalog.json
  catalogId: 'https://example.com/star/catalog.json', // must equal the schema's
  outDir: 'build/artifact', // default: dist/artifact
});
```

Every field is optional. Keep the file a plain object: one that reads the environment or the clock makes your artifact differ from run to run.

## What it checks

Every failure is a finding, and all of them are reported together:

1. The config has only known keys, and its `catalogId` matches the schema's.
2. The entry exists and bundles. Any import of a host package the client does not lend is refused, with the list of what it does lend: `react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`, `@a2ui/react/v0_9`, `@a2ui/web_core/v0_9`, `zod`.
3. Every stylesheet reached, and every `url()` or `@import` inside it, resolves to a file inside your package or one of its dependencies.
4. The entry exports `CATALOG`.
5. The schema is a valid A2UI catalog: it compiles, and its `catalogId` is the one the descriptor carries.
6. No component name, prop name or enum value in the schema is a credential word such as `password` or `otp`.
7. The descriptor is well formed and lists every file with its hash.

Stellify runs none of your code. Exports are read from the bundle, the id from the schema file. Whether `CATALOG.id` agrees is the client's check when it loads the artifact.

## From code

```ts
import {stellify, writeArtifact} from '@a2uiverse/stellify';

const result = await stellify('path/to/catalog-package');
if (result.findings.length === 0) await writeArtifact(result);
```

`stellify()` returns the artifact in memory: `descriptor`, `files` (a sorted `Map` of artifact path to bytes) and `findings`. It never throws on a refusal. `writeArtifact()` is the one thing that touches disk; it empties the output folder first.

<details>
<summary>What the artifact looks like</summary>

The artifact mirrors your package, so nothing inside a stylesheet has to be rewritten:

```
artifact.json                         the descriptor: every file below with its hash
index.js                              your whole catalog, one ES module
catalog.json                          your schema, byte for byte
dist/theme.css                        your stylesheet, at its path in the package
dist/fonts/inter.woff2                the font it references, beside it
node_modules/@primer/primitives/…     a dependency's stylesheet, under the package that owns it
```

In `index.js`, `import {useState} from 'react'` has become a read from `__a2uiverse_host__.modules["react"]`, and `import('./theme.css')` has become a load through `__a2uiverse_host__.loadStylesheet(new URL("dist/theme.css", import.meta.url).href)`. The stylesheets your entry imports as it evaluates start loading together, in import order, and the entry finishes once they have all loaded, so the wait is the slowest sheet's rather than the sum of every sheet's. A stylesheet imported later still resolves when its sheet has loaded, so a Provider that waits for its theme keeps working.

</details>

<details>
<summary>Installing it in a catalog package</summary>

The apps repo takes Stellify as a git dependency pinned to a commit, pointing at this folder of the monorepo:

```json
"devDependencies": {
  "@a2uiverse/stellify": "github:retz8/a2uiverse#<commit>&path:packages/stellify"
}
```

`dist/` is committed for exactly this reason: a git install sees no workspace siblings, so the build ships with the sdk inlined and needs no build step of its own. esbuild is its only runtime dependency.

</details>

## Developing Stellify

```bash
pnpm --filter @a2uiverse/stellify build       # dist/: index.js with the sdk inlined, cli.js, declarations
pnpm --filter @a2uiverse/stellify test        # vitest over the fixture catalog in test/fixtures
pnpm --filter @a2uiverse/stellify prove       # packs the seven catalog packages in ../a2uiverse-apps
```

`dist/` is checked in and must match the source: `pnpm verify` at the root rebuilds it and fails on any difference. After editing `src/` or the sdk, run `build` and commit the result. `prove` reads `A2UIVERSE_APPS_DIR` when the apps checkout is elsewhere.

<details>
<summary>Where things are</summary>

| Concern                        | File                        |
| ------------------------------ | --------------------------- |
| Pipeline and checks            | `src/pack.ts`               |
| Bundler and the two rewrites   | `src/bundle.ts`             |
| Artifact paths                 | `src/layout.ts`             |
| Stylesheet assets              | `src/stylesheets.ts`        |
| Config file                    | `src/config.ts`             |
| Writer                         | `src/write.ts`              |
| Command line                   | `src/cli.ts`, `src/main.ts` |
| Fixture catalog and dependency | `test/fixtures/`            |
| Proof over the seven           | `scripts/prove.mjs`         |

</details>
