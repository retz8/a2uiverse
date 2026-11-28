# @a2uiverse/converter

Carries A2UIVerse's recorded payloads from A2UI v0.9 and v0.9.1 to v1.0. It lives on the flip branch only and is deleted before the flip lands.

## Quick start

```bash
pnpm --filter @a2uiverse/converter build
pnpm --filter @a2uiverse/converter convert --apps ../a2uiverse-apps   # a dry run over both repos: what would change, nothing written
```

## Commands

```bash
pnpm --filter @a2uiverse/converter convert [--repo a2uiverse|a2uiverse-apps] [<path>...]   # dry run: every recorded file of the repo, or these paths
pnpm --filter @a2uiverse/converter convert --write --repo <repo> [<path>...]                 # write the files that convert whole
pnpm --filter @a2uiverse/converter convert --json <file>                                     # the report as JSON too
pnpm --filter @a2uiverse/converter test                                                      # the rules, and upstream's 43 example pairs as the answer key
```

`--apps <dir>` names the `a2uiverse-apps` checkout (`A2UIVERSE_AGENTS_DIR`, else `../a2uiverse-apps` beside this repo), `--platform <dir>` this one.

## What it changes

Only what the v1.0 evolution guide names, read from the catalog document each surface paints in, never matched by shape: the stamp, the catalog id, bindings and calls written `@path` and `@call`, `@accessibility` and `@checks`, `returnType` dropped, `theme` dropped, a `null` for an `updateDataModel` with no `value`, and `Text`'s heading variants as Markdown. A component id the identifier rule refuses has its hyphens become underscores, wherever it is referred to. A converted beat file says which versions it came from in `convertedFrom`.

A file is written whole or not at all: only when every catalog it paints in has a map in `maps/`, every position it fills is settled by its catalog, and each paint keeps the verdict `scripts/recorded-verdicts.json` took from `main` before the flip.

<details>
<summary><b>Maps</b></summary>

One JSON file per catalog in `maps/`, written by the sub-task that moves the catalog: `name`; `from` and `to`, each a `catalogId`, a `repo` and a `path`; `components` and `properties` renamed; and `heading`, the component whose `variant` takes the heading rule. Nothing else can be said. `maps/basic.json` is the basic catalog's.

The old document is read from git at `main`, then at the tag `last-v0.9`; the new one from the checkout.

</details>
