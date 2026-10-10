# @a2uiverse/stellify

_Stellify: to turn into a star._ Stellify packs a catalog package into the **catalog artifact** A2UIVerse installs, the folder of files the client loads at runtime to draw an app's UI, and takes your app to the **marketplace**: claims your publisher name, captures your app's first screen, publishes, unpublishes, and lists what you have published. You run it inside your catalog package. It reads your built code, never edits it, and writes one folder.

## What it does for you

- **One command to ship a catalog.** `stellify pack` bundles your built entry, your stylesheets, your fonts and icons and your catalog schema into a folder with a descriptor listing every file and its hash. That folder is what the registry installs and what you publish.
- **One command to publish.** `stellify publish` sends your app id, your agent's card URL and the packed folders to the marketplace, which fetches your live card, runs the same checks the registry runs at install, asks your agent its first screen, and lists the app. What the marketplace says comes back to you word for word.
- **Your credential stays with you.** An app whose card requires sign-in cannot be tried by the marketplace, which holds no credential. `stellify preview` asks your running agent its first screen on your machine, with a credential you supply, and writes the paint the marketplace will show as the app's preview. The credential rides the request to your agent and goes nowhere else.
- **Told when the Store is behind your agent.** Every contact with the marketplace first prints a notice for each of your apps whose live card declares a catalog or a version the Store does not have yet, so a change you made without publishing never goes unnoticed.
- **Your source stays yours.** You import React, `@a2ui/react` and your CSS the way you always did. Stellify rewrites those imports in the bundle, not in your files: React and the other host packages become reads from the client's shared copies, and each stylesheet import becomes a load the client performs. No wrapper to write, no build step to change.
- **A dry run that tells the truth.** `stellify check` runs the exact same pipeline in memory, then the same checks the registry runs over an artifact's files at install, and writes nothing. Green here means the registry's gate will pass your artifact; the install itself can still refuse the app for what lies outside the artifact, such as a card that doesn't name the catalog.
- **Same input, same bytes.** Packing the same package tree with the same installed dependencies and the same Stellify version gives the same artifact, hash for hash, wherever the package sits, in its own checkout or installed in a `node_modules`. Two apps sharing a catalog share one row in the registry and in the marketplace. Two installs of one package can still differ: esbuild spells each bundled module's path from the package into the entry, so a dependency resolved at another path, or at another version, changes `index.js`.
- **Zero configuration** when your package looks like the catalog packages in [`a2uiverse-apps`](https://github.com/retz8/a2uiverse-apps): a built entry named by `exports["."]`, a schema at `catalogs/v0.9.1/catalog.json`. Anything else is a four-field config file.

## Packing

Build your package first. Stellify bundles the built entry, not the source.

```bash
pnpm build
stellify check              # the package in the working directory; exit 1 on any finding
stellify pack               # writes dist/artifact/
stellify pack --out ../packed --json
```

Findings print one per line as `file: reason`, and any finding exits 1. `--json` prints the descriptor, the findings and the folder written (`null` under `check`) as one object, for CI. `--out` is relative to the working directory; the config's `outDir` to the package.

A package that departs from the convention adds a `stellify.config.ts`:

```ts
import {defineConfig} from '@a2uiverse/stellify';

export default defineConfig({
  entry: 'lib/index.js', // default: what exports["."] names, else main
  schema: 'schema/catalog.json', // default: catalogs/v0.9.1/catalog.json
  catalogId: 'https://example.com/star/catalog.json', // must equal the schema's
  outDir: 'build/artifact', // default: dist/artifact
});
```

Every field is optional. Keep the file a plain object: one that reads the environment or the clock makes your artifact differ from run to run.

## Publishing

A **publisher** is a name plus a secret. You claim the name once, against the marketplace you publish to; the marketplace mints a token and returns it once, and Stellify keeps it, with the marketplace's address, in your home directory, never in a checkout. Every later verb reads it from there. A lost token is a lost name: there is no recovery.

```bash
stellify claim acme --marketplace http://localhost:10002
#   claimed acme at http://localhost:10002 · token kept in ~/.config/stellify/publisher.json
```

The file is `publisher.json` under `stellify` in your XDG configuration directory, `~/.config` unless `XDG_CONFIG_HOME` says otherwise, readable by you alone. `STELLIFY_HOME=<dir>` keeps it elsewhere. One publisher per machine: a second `claim` refuses while the file holds one, and `--replace` claims another name, forgetting the kept token. The token is never printed; read the file if you want a copy.

Then, with your agent running:

```bash
stellify publish <app-id> <card-url> [<artifact-dir> ...] [--preview <file>]
stellify preview <app-id> <card-url> [<artifact-dir> ...] [--out <file>]
stellify unpublish <app-id>
stellify list
```

`publish` and `preview` take what the orchestrator's `registry install` takes: your app id, your agent's card URL, and the folders `stellify pack` wrote, one per catalog your card declares. They never pack. The card URL goes on every publish, because the marketplace fetches your live card and publishes what it says. A catalog the marketplace already holds for you need not be handed again: a publish that changes the card alone hands nothing.

`publish` prints the marketplace's answer as `registry install` prints the registry's: a summary line, `published shop · card 0.1.0 · catalog sha256-xxxxxxxx…`, then each note, the catalog ids now yours, a held build counted as covered, a build moved with the apps of yours that followed, a line retired. A refusal prints `refused <app-id>:` and every finding indented, in the marketplace's words, and exits 1. A 401 means the token on this machine is not one this marketplace knows: the name was claimed elsewhere, or the marketplace was reset; claim again with `--replace`.

**`preview` is required for an app whose card requires sign-in** and a helper for any other. It fetches your live card, picks the header your credential rides in from the card's `security` and `securitySchemes` exactly as the orchestrator will after install, a bearer `Authorization` header for OAuth, OpenID Connect and `http` bearer, the named header for `apiKey`, sends your agent the same request the marketplace sends, its first skill's first example or "Hello! Show me what you can do.", with your app's catalogs plus the basic catalog advertised, and checks the paint as the marketplace will: a surface is created, every surface is in your catalogs, each tree validates against its catalog's schema, no credential input is painted. It writes `preview.json` in the working directory, `--out` elsewhere, and prints one line: the card version, the surfaces painted, the file. The credential is read from `STELLIFY_CREDENTIAL`:

```bash
STELLIFY_CREDENTIAL=<your token> stellify preview github http://localhost:11001/.well-known/agent-card.json ../github-catalog/dist/artifact
stellify publish github http://localhost:11001/.well-known/agent-card.json ../github-catalog/dist/artifact --preview preview.json
```

For a card that needs no sign-in, `preview` sends no credential, a set `STELLIFY_CREDENTIAL` noted and ignored, and still writes the document so you see the screen; the marketplace captures that app's preview itself at publish, and refuses a handed one. A catalog your card declares that you did not hand, one the marketplace already holds for you, has its schema fetched from the marketplace; a marketplace that cannot be reached is a note, and the run goes on with what you handed. Two timeouts, the marketplace's own: `A2UIVERSE_CARD_TIMEOUT_SECONDS`, 10 by default, for the card fetch, and `A2UIVERSE_SMOKE_TIMEOUT_SECONDS`, 60 by default, for your agent's answer.

`unpublish` removes the app from the marketplace's index and search; registries that installed it keep it, and the names stay yours. `list` prints one line per app of yours: the app id, the card version, each catalog at its build, the lines retired, and what the Store lacks when the app is ahead of it.

Every verb that reaches the marketplace first prints, to stderr, one notice per app of yours that is **ahead of the Store**, a live card declaring a catalog the Store has no artifact for or a version it does not know:

```
notice: shop is ahead of the Store: its card declares catalog https://…/shop/catalog.json the Store has no artifact for, and version 0.2.0 the Store does not know; publish it
```

`--json` on every verb prints a machine-readable result on stdout: `claim` the name, the address and the path; `preview` the document; `publish` and `unpublish` the marketplace's response body as it came; `list` the apps. Findings exit 1, a usage error 2.

## What it checks

Every failure is a finding, and all of them are reported together:

1. The config has only known keys, and its `catalogId` matches the schema's.
2. `package.json` has a name and a version, and names a built entry that exists and bundles. Any import of a host package the client does not lend is refused, with the list of what it does lend: `react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`, `@a2ui/react/v0_9`, `@a2ui/web_core/v0_9`, `zod`.
3. Every stylesheet reached, and every `url()` or `@import` inside it, resolves to a file inside your package or one of its dependencies.
4. The entry exports `CATALOG`.
5. The schema parses, has a `catalogId`, and is a valid A2UI catalog: it compiles, and its `catalogId` is the one the descriptor carries.
6. The descriptor is well formed, names the host-module interface the client lends (`0.9.1`), and lists every file with its hash.

Stellify runs none of your code. Exports are read from the bundle, the id from the schema file. Whether `CATALOG.id` agrees is the client's check when it loads the artifact.

`preview` runs the registry's gate over each folder you hand it before any request, so a folder that would fail at publish fails here first; `publish` hands the folders on unchecked, the marketplace's gate being the gate.

## From code

```ts
import {stellify, writeArtifact} from '@a2uiverse/stellify';

const result = await stellify('path/to/catalog-package');
if (result.findings.length === 0) await writeArtifact(result);
```

`stellify()` returns the artifact in memory: `descriptor`, `files` (a sorted `Map` of artifact path to bytes) and `findings`. It never throws on a refusal. `writeArtifact()` is the one thing that touches disk; it empties the output folder first. `artifactFiles()` gives you the same files `writeArtifact()` would write, `artifact.json` among them, without touching disk — what you hand an install request, or `publish`.

The marketplace verbs are functions too, each taking the marketplace's address and the token explicitly, never reading the publisher file, and each returning the marketplace's answer or its findings, never throwing on a refusal:

```ts
import {claim, listPublished, preview, publish, unpublish} from '@a2uiverse/stellify';

const claimed = await claim({marketplace, name: 'acme'}); // {ok, publisher, token} — keep the token
const captured = await preview({
  appId,
  cardUrl,
  catalogs: [files],
  credential,
  marketplace,
  publisher,
});
const published = await publish({
  marketplace,
  token,
  appId,
  cardUrl,
  catalogs: [files],
  preview: captured.document,
});
await unpublish({marketplace, token, appId});
const mine = await listPublished({marketplace, publisher: 'acme'}); // {ok, apps, notices}
```

`catalogs` are the maps `artifactFiles()` returns. `preview` returns the document, whether the card requires sign-in, the findings, the notices and the notes; `publish` returns the summary and the notes, or the findings with the marketplace's status. The launcher in this repo publishes the dev roster this way, with a token of its own.

<details>
<summary>What the artifact looks like</summary>

The artifact mirrors your package, so nothing inside a stylesheet has to be rewritten. Your own files keep their path from the package root, wherever the package sits; a dependency's go under the name its `package.json` gives, never pnpm's real path:

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

`dist/` is committed for exactly this reason: a git install sees no workspace siblings, so the build ships with the sdk inlined and needs no build step of its own. Its two runtime dependencies, esbuild and the A2A client `@a2a-js/sdk`, come from npm.

</details>

## Developing Stellify

```bash
pnpm --filter @a2uiverse/stellify build       # dist/: index.js with the sdk inlined, cli.js, declarations
pnpm --filter @a2uiverse/stellify test        # vitest over the fixture catalog, a scripted agent and a scripted marketplace
```

`dist/` is checked in and must match the source: `pnpm verify` at the root rebuilds it and fails on any difference. After editing `src/` or the sdk, run `build` and commit the result.

The tests pack the fixture catalog in `test/fixtures`, and drive the marketplace verbs against two fakes of their own: an in-process A2A agent scripted per turn, and a marketplace scripted per route, each recording what it received so the tests assert on the wire. The round trip against the real marketplace is run by hand, and by the launcher under its publish flag.

<details>
<summary>Where things are</summary>

| Concern                             | File                                           |
| ----------------------------------- | ---------------------------------------------- |
| Pipeline and checks                 | `src/pack.ts`                                  |
| Bundler and the two rewrites        | `src/bundle.ts`                                |
| Artifact paths                      | `src/layout.ts`                                |
| Stylesheet assets                   | `src/stylesheets.ts`                           |
| Config file                         | `src/config.ts`                                |
| The package's entry and name        | `src/manifest.ts`                              |
| Writer                              | `src/write.ts`                                 |
| The publisher file                  | `src/publisher.ts`                             |
| The marketplace's routes over fetch | `src/marketplace.ts`                           |
| claim, publish, unpublish, list     | `src/verbs.ts`                                 |
| preview                             | `src/preview.ts`                               |
| The smoke request's transport       | `src/transport.ts`, `src/card.ts`              |
| The credential's header             | `src/credential.ts`                            |
| The notices                         | `src/notices.ts`                               |
| A packed folder read                | `src/tree.ts`                                  |
| Command line                        | `src/cli.ts`, `src/main.ts`                    |
| The API and its types               | `src/index.ts`, `src/types.ts`                 |
| The committed build                 | `scripts/build.mjs`                            |
| Fixture catalog and dependency      | `test/fixtures/`                               |
| The scripted agent and marketplace  | `test/fakeAgent.ts`, `test/fakeMarketplace.ts` |

</details>

How the artifact is installed and loaded, end to end, is in the design record [`docs/design/app-install.md`](../../docs/design/app-install.md); the marketplace's side of publish is in [`apps/marketplace/README.md`](../../apps/marketplace/README.md).
