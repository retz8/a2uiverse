# @a2uiverse/stellify

_Stellify: to turn into a star._ Stellify packs your A2UI catalog package into the **catalog artifact** A2UIVerse installs, and takes your app to the **marketplace**: claim a name, preview, publish. One dev dependency, zero configuration for a package laid out like the ones in [`a2uiverse-apps`](https://github.com/retz8/a2uiverse-apps). It reads your built code and never edits it.

## Install

In your catalog package, as a git dependency pinned to a commit of this repo:

```json
"devDependencies": {
  "@a2uiverse/stellify": "github:retz8/a2uiverse#<commit>&path:packages/stellify"
}
```

## Quick start

```bash
pnpm build                                                   # Stellify bundles the built entry, not the source
stellify pack                                                # → dist/artifact/
stellify claim acme --marketplace http://localhost:10002     # once per machine; the token stays in your home directory
stellify publish shop http://localhost:12001/.well-known/agent-card.json dist/artifact
#   published shop · card 0.1.0 · catalog sha256-1E-0aZuq…
```

Your agent must be running: the marketplace fetches its live card and asks it its first screen before listing it. Then anyone can install your app by its id alone.

**If your card requires sign-in**, the marketplace can't try your agent itself. Capture the first screen on your machine, with a credential of your own, and hand it to publish:

```bash
STELLIFY_CREDENTIAL=<your token> stellify preview shop http://localhost:12001/.well-known/agent-card.json dist/artifact
stellify publish shop http://localhost:12001/.well-known/agent-card.json dist/artifact --preview preview.json
```

## Commands

| Command                                                                     | What it does                                                                                                          |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `stellify check`                                                            | Runs the whole pack in memory plus the registry's install checks, writes nothing. Green here means the gate passes    |
| `stellify pack [--out <dir>]`                                               | Writes the artifact folder, `dist/artifact/` by default                                                               |
| `stellify claim <name> --marketplace <url> [--replace]`                     | Claims your publisher name once; keeps the token and the address in your publisher file                               |
| `stellify preview <app-id> <card-url> [<artifact-dir>…] [--out <file>]`     | Asks your running agent its first screen and writes `preview.json`; required for a card that needs sign-in            |
| `stellify publish <app-id> <card-url> [<artifact-dir>…] [--preview <file>]` | Publishes: the marketplace fetches your live card, checks the folders, tries the agent, lists the app                 |
| `stellify unpublish <app-id>`                                               | Takes the app off the index; registries that installed it keep it, and the names stay yours                           |
| `stellify list`                                                             | What you've published: each app's id, card version, catalogs at their builds, retired lines, and what the Store lacks |

Common to every command: findings print one per line and exit 1; a usage error exits 2; `--json` prints a machine-readable result on stdout. Every command that reaches the marketplace first prints, to stderr, one notice per app of yours that is **ahead of the Store** — a live card declaring a catalog the Store has no artifact for, or a version it doesn't know:

```
notice: shop is ahead of the Store: its card declares catalog https://…/shop/catalog.json the Store has no artifact for, and version 0.2.0 the Store does not know; publish it
```

## Packing

`pack` bundles your built entry, every stylesheet it reaches with their fonts and icons, and your catalog schema into one folder with a descriptor listing every file and its hash. That folder is what the registry installs and what you publish.

- **Zero configuration** when the built entry is what `exports["."]` names and the schema is at `catalogs/v0.9.1/catalog.json`. Anything else is a four-field `stellify.config.ts`, every field optional:

  ```ts
  import {defineConfig} from '@a2uiverse/stellify';

  export default defineConfig({
    entry: 'lib/index.js', // default: what exports["."] names, else main
    schema: 'schema/catalog.json', // default: catalogs/v0.9.1/catalog.json
    catalogId: 'https://example.com/star/catalog.json', // must equal the schema's
    outDir: 'build/artifact', // default: dist/artifact; relative to the package
  });
  ```

  Keep it a plain object: one that reads the environment or the clock makes your artifact differ from run to run. `--out` is relative to the working directory.

- **Your source stays yours.** Import React, `@a2ui/react` and your CSS as you always do. Stellify rewrites those imports in the bundle, not in your files: the host packages become reads from the client's shared copies, and each stylesheet import becomes a load the client performs.
- **Same input, same bytes.** The same package tree with the same installed dependencies and the same Stellify version packs to the same artifact, hash for hash, wherever the package sits. Two installs can still differ: esbuild writes each bundled module's path into the entry, so a dependency at another path or version changes `index.js`.

**What it checks**, every failure reported together as `file: reason`:

1. The config has only known keys, and its `catalogId` matches the schema's.
2. `package.json` has a name and a version and names a built entry that exists and bundles. An import of a host package the client doesn't lend is refused, with the list of what it does lend: `react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`, `@a2ui/react/v0_9`, `@a2ui/web_core/v0_9`, `@a2ui/web_core/v0_9/basic_catalog`, `zod`.
3. Every stylesheet reached, and every `url()` or `@import` inside it, resolves to a file inside your package or one of its dependencies.
4. The entry exports `CATALOG`.
5. The schema parses, has a `catalogId`, and compiles as an A2UI catalog whose id is the one the descriptor carries.
6. The descriptor is well formed, names the host-module interface the client lends (`0.14.0`), and lists every file with its hash.

Stellify runs none of your code: exports are read from the bundle, the id from the schema file. Whether `CATALOG.id` agrees is the client's check when it loads the artifact. `check` passing means the registry's gate will pass; the install can still refuse the app for what lies outside the artifact, such as a card that doesn't name the catalog.

## Publishing

**Your publisher name.** A publisher is a name plus a secret. `claim` registers the name against the marketplace, which mints a token and returns it once; Stellify keeps it, with the marketplace's address, in `publisher.json` under `stellify` in your XDG configuration directory (`~/.config` unless `XDG_CONFIG_HOME` says otherwise; `STELLIFY_HOME=<dir>` keeps it elsewhere), readable by you alone. One publisher per machine: a second `claim` refuses while the file holds one, and `--replace` claims another name, forgetting the kept token. The token is never printed; read the file for a copy. A lost token is a lost name — there's no recovery.

**`publish`** takes what the orchestrator's `registry install` takes: your app id, your agent's card URL, and the folders `pack` wrote, one per catalog your card declares. It never packs. The card URL goes on every publish, because the marketplace fetches your live card and publishes what it says; a catalog the marketplace already holds for you needn't be handed again, so a publish that changes the card alone hands nothing. It prints the marketplace's answer as `registry install` prints the registry's — a summary line, then each note as `note: …` — or `refused <app-id>:` with every finding indented, in the marketplace's words. A `401` means the token on this machine isn't one this marketplace knows: the name was claimed elsewhere, or the marketplace was reset; claim again with `--replace`.

**`preview`** is required for a card that requires sign-in, and a useful look at your Store listing for any card. It fetches your live card, picks the header your credential rides in from the card's `security` and `securitySchemes` exactly as the orchestrator will after install — a bearer `Authorization` header for OAuth, OpenID Connect and `http` bearer, the named header for `apiKey` — and sends your agent the request the marketplace sends: its first skill's first example, else "Hello! Show me what you can do.", advertising your catalogs plus the basic catalog. It checks the paint as the marketplace will — a surface created, every surface in your catalogs, each tree valid against its schema, no credential input — and writes `preview.json` (`--out` elsewhere), printing the card version, the surfaces painted and the file. The credential comes from `STELLIFY_CREDENTIAL`. For a card that needs no sign-in it sends none (a set credential is noted and ignored), still writes the document so you see the screen, and the marketplace captures that app's preview itself at publish, refusing a handed one. Each folder you hand goes through the registry's gate first, so a folder that would fail at publish fails here. A catalog your card declares that you didn't hand — one the marketplace already holds for you — has its schema fetched from the marketplace; a marketplace that can't be reached is a note, and the run goes on. Timeouts, the marketplace's own: `A2UIVERSE_CARD_TIMEOUT_SECONDS` (10) for the card, `A2UIVERSE_SMOKE_TIMEOUT_SECONDS` (60) for your agent's answer.

**From A2UIVerse's Publish.** If you run A2UIVerse, you can publish from Publish, on the page over its canvas, instead of this command line: claim a name there, or sign in with the name and the token from your publisher file, then hand it the folders `pack` wrote and the file `preview` captured. Packing and the preview stay here, on your terminal.

**`--json`** prints, per command: `claim` the name, the address and the path; `preview` the document; `publish` and `unpublish` the marketplace's response body as it came; `list` the apps.

## From code

```ts
import {stellify, writeArtifact, artifactFiles} from '@a2uiverse/stellify';

const result = await stellify('path/to/catalog-package');
if (result.findings.length === 0) await writeArtifact(result);
```

`stellify()` returns the artifact in memory — `descriptor`, `files` (a sorted `Map` of artifact path to bytes) and `findings` — and never throws on a refusal. `writeArtifact()` is the one thing that touches disk; it empties the output folder first. `artifactFiles()` gives the same files without touching disk, `artifact.json` among them: what you hand an install request, or `publish`.

The marketplace verbs are functions too, each taking the address and the token explicitly — never reading the publisher file — and each returning the marketplace's answer or its findings:

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

`catalogs` are the maps `artifactFiles()` returns. `preview` returns the document, whether the card requires sign-in, the findings, the notices and the notes; `publish` the summary and the notes, or the findings with the marketplace's status. The launcher in this repo publishes the dev roster this way, with a token of its own.

<details>
<summary>What the artifact looks like</summary>

The artifact mirrors your package, so nothing inside a stylesheet is rewritten. Your own files keep their path from the package root; a dependency's go under the name its `package.json` gives, never pnpm's real path:

```
artifact.json                         the descriptor: every file below with its hash
index.js                              your whole catalog, one ES module
catalog.json                          your schema, byte for byte
dist/theme.css                        your stylesheet, at its path in the package
dist/fonts/inter.woff2                the font it references, beside it
node_modules/@primer/primitives/…     a dependency's stylesheet, under the package that owns it
```

In `index.js`, `import {useState} from 'react'` has become a read from `__a2uiverse_host__.modules["react"]`, and `import('./theme.css')` a load through `__a2uiverse_host__.loadStylesheet(new URL("dist/theme.css", import.meta.url).href)`. The stylesheets your entry imports as it evaluates start loading together, in import order, and the entry finishes once they have all loaded — the wait is the slowest sheet's, not the sum. A stylesheet your code imports only later, like a Provider's lazy theme, is loaded with them, after the entry's own, so nothing paints before its styles apply; the later import finds it loaded.

</details>

## Developing Stellify

```bash
pnpm --filter @a2uiverse/stellify build       # dist/: index.js and cli.js with the sdk inlined, sharing shared.js; declarations
pnpm --filter @a2uiverse/stellify test        # vitest over the fixture catalog, a scripted agent and a scripted marketplace
```

`dist/` is committed, because a git install sees no workspace siblings: the build ships with the sdk inlined and needs no build step of its own, and its runtime dependencies come from npm: esbuild, the A2A client `@a2a-js/sdk`, and the sdk's own, `@a2ui/web_core`, zod and ajv, at the sdk's versions, which a test holds equal. `pnpm verify` at the root rebuilds `dist/` and fails on any difference — after editing `src/` or the sdk, run `build` and commit the result.

The tests pack the fixture catalog in `test/fixtures` and drive the marketplace verbs against two fakes of their own, an in-process A2A agent scripted per turn and a marketplace scripted per route, each recording what it received so the tests assert on the wire. The round trip against the real marketplace is run by hand, and by the launcher under `--publish`.

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

## Further reading

- [`docs/design/app-install.md`](../../docs/design/app-install.md) — how the artifact is installed and loaded, end to end.
- [`docs/design/marketplace.md`](../../docs/design/marketplace.md) — publish to install: the publisher, the version rules, the smoke test, the update states.
- [`apps/marketplace/README.md`](../../apps/marketplace/README.md) — the marketplace's side of publish.
- [`docs/design/trusted-page.md`](../../docs/design/trusted-page.md) — Publish, the same publish from A2UIVerse's own page.
