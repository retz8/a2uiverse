# Task 11.3 — Stellify: handoff

Spec: `_dev/docs/spec/task-11.3-stellify.md`. Worked directly on `main`, no worktree.

## Where it stands

Stellify is built, tested and proven; the docs of the spec's decision 16 are amended.

- `packages/stellify` — `@a2uiverse/stellify`, bin `stellify`: `src/pack.ts` (the pipeline and the gate), `src/bundle.ts` (esbuild with the host and stylesheet rewrites), `src/layout.ts` (artifact paths), `src/stylesheets.ts` (assets a sheet reaches), `src/config.ts` (`stellify.config.ts` through esbuild), `src/write.ts`, `src/cli.ts`. `dist/` is committed with the sdk inlined; `scripts/stellify-dist.test.mjs` at the root fails `pnpm verify` when it is stale. 29 vitest tests over `test/fixtures/star-catalog` (with `star-dialog`, the dependency that reaches `react-dom/client`).
- The sdk: `react-dom/client` is the seventh host specifier (`catalog.json`, `HOST_SPECIFIERS`, the contract test); `checkCatalogSchemaCompiles` in `artifact.ts` over a new `compileErrors()` on the A2UI validator; `checkCatalogExports` documented as the client's load-time check.

## The proof (`pnpm --filter @a2uiverse/stellify prove`, apps checkout at a4771ea)

```
✗ github/github-catalog: 8 findings
    catalogs/v0.9.1/catalog.json: component "Icon": enum value "pin" matches "pin"
    catalogs/v0.9.1/catalog.json: component "Icon": enum value "pin-slash" matches "pin"
    catalogs/v0.9.1/catalog.json: component "TextInput": enum value "password" matches "password"
    catalogs/v0.9.1/catalog.json: component "NavList.GroupExpand": enum value "pin" matches "pin"
    catalogs/v0.9.1/catalog.json: component "NavList.GroupExpand": enum value "pin-slash" matches "pin"
    catalogs/v0.9.1/catalog.json: component "NavList.GroupExpand": enum value "pin" matches "pin"
    catalogs/v0.9.1/catalog.json: component "NavList.GroupExpand": enum value "pin-slash" matches "pin"
    catalogs/v0.9.1/catalog.json: component "AnchoredOverlay", prop "pinPosition": name matches "pin"
✓ gmail-catalog 0.3.0 — 6 files, 202 KB
✓ calendar-catalog 0.3.0 — 6 files, 206 KB
✓ circleci-catalog 0.1.0 — 4 files, 113 KB
✓ linear-catalog 0.1.0 — 4 files, 371 KB
✓ shop-a-catalog 0.1.0 — 3 files, 53 KB
✓ shop-b-catalog 0.1.0 — 3 files, 53 KB
✓ the apps checkout is untouched
```

Six of seven pack clean. The GitHub catalog bundles clean too — `react-dom/client` lent, `@primer/react`'s 96 hashed stylesheets and the two Primer theme sheets copied under `node_modules/`, `primer-scoped.css` beside them — and is refused by the credential lint alone (task 11.2 decision 5), over its schema: the octicon names `pin` and `pin-slash`, the prop `pinPosition`, and `TextInput`'s `type` enum value `password`.

## Open, for 11.7 and the user

- **The GitHub catalog against the lint.** `password` on `TextInput.type` is what the bar of SPEC §8 is for. `pin` (the pushpin octicon) and `pinPosition` are the word list's `pin` (the code) hitting an unrelated word. Whether the list, its matching, or the GitHub schema changes is not 11.3's call; 11.7 needs `check` green on all seven.
- **For 11.5.** The client registers the seventh specifier, and imports each artifact's entry from its served URL, never from a blob: the entry's `import.meta.url` is the base its stylesheet loads resolve against (phase-11 decision 14 as amended).
- **`--out`** on the command line is relative to the working directory; the config's `outDir` and the API's option are relative to the package.
