# Task 10.6 — CircleCI catalog

`[apps]`: code in `../a2uiverse-apps/circleci/`, on that repo's `main`. References: `_dev/references/circleci/circleci-web-app.md`.

## Decisions

1. **Vocabulary** — general building blocks, shaped like Primer: the parts CircleCI's web app is built from, not components named after pipelines, workflows or jobs. It covers what the agent's MCP domain paints — runs, workflows, jobs, a job's steps and log, a rerun or cancel proposal — and grows with that domain.
2. **Colour** — CircleCI's published colours exactly where they are readable; none are (the brand book needs a Figma login), so every colour is a Radix Colors 3.0.0 step, each cited in the references.
3. **Glyphs** — the status pill and the job status glyph keep CircleCI's shapes, drawn as the catalog's own SVGs. No logo, no product icon.
4. **Typeface** — Inter, CircleCI's published primary typeface, shipped in the bundle: `@fontsource-variable/inter` 5.3.0 `inter-latin-wght-normal.woff2` with its OFL, vendored, no npm dependency. `@font-face` family `circleci-catalog-inter`, applied inside the Provider's wrapper only. Logs in the system monospace stack.
5. **Implementation** — hand-written React components and one scoped stylesheet; no design-system dependency.
6. **Unchanged surface** — `CATALOG_ID` (the repo-path URL), and the exports the platform imports: `CATALOG`, `CATALOG_ID`, `Provider`. Nothing in `../a2uiverse/` changes in this task; the client's pin moves in 10.7.
7. **Functions** — the basic catalog's functions, runtime and declarations, from the pinned `@a2ui/react` / `@a2ui/web_core`.

## Components

| Component | Props | Draws |
| --- | --- | --- |
| `Stack` | `children` ChildList · `direction` vertical/horizontal · `gap` none/xsmall/small/medium/large · `align` start/center/end/stretch/baseline · `justify` start/center/end/spaceBetween · `wrap` boolean | a flex container |
| `Panel` | `child` · `padding` none/small/medium/large · `tone` default/muted/danger | the bordered white panel; `muted` the step row's quiet fill; `danger` the failed step's red border and pale red fill |
| `Heading` | `text` Dynamic · `size` large/medium/small | a page, section or subsection title |
| `Text` | `text` Dynamic · `size` medium/small · `tone` default/muted/danger · `weight` normal/medium/semibold · `font` sans/mono · `truncate` boolean | a run of text |
| `Link` | `text` Dynamic · `action` · `font` sans/mono | blue text that acts |
| `Button` | `label` Dynamic · `action` · `variant` primary/secondary/ghost · `size` small/medium · `disabled` DynamicBoolean | the pill button |
| `StatusBadge` | `status` Dynamic | the status pill: glyph and word, toned by the word |
| `StatusIcon` | `status` Dynamic · `size` small/medium | the round status glyph, the word as its accessible name |
| `List` | `children` ChildList · `connector` none/tree | a list; `tree` draws the jobs tree connector |
| `ListItem` | `child` · `action` optional | a list row; with an action, a full-width button with the hover wash |
| `Field` | `label` Dynamic · `child` | a muted label over its value |
| `Divider` | `orientation` horizontal/vertical | a 1px rule |
| `LogBlock` | `children` ChildList | the dark log panel, line numbers in a gutter |
| `LogLine` | `text` Dynamic | one log line, as printed |

Status words map to tones case-insensitively, `_` read as a space: success/succeeded → success; failed/failing/error/infrastructure fail/timedout/unauthorized → failed; running/started → running; on hold → hold; queued/blocked/not running/created → queued; anything else (canceled, not run, …) → neutral.

## Steps

1. **Catalog package** (`circleci-catalog/`)
   - `src/components/<name>/` per component: `*.schema.ts` (zod, `.strict()`), the view and its `createComponentImplementation` entry, a schema test and a view test; child lists through `buildChild(id, basePath)`.
   - `src/catalog.ts` (the registry: components, the basic functions), `src/catalog-id.ts` unchanged, `src/index.ts` exporting `CATALOG`, `CATALOG_ID`, `Provider`.
   - `src/provider.tsx` — one wrapper `div.circleci-catalog`, `display: contents`, `data-appearance` from the OS; loads `theme.css` on first mount.
   - `src/theme.css` — `@font-face`, the tokens under `.circleci-catalog` and `.circleci-catalog[data-appearance='dark']`, every rule led by `.circleci-catalog`, classes and keyframes prefixed `circleci-`.
   - `src/fonts/` — the woff2 and `OFL.txt`; `scripts/copy-theme.mjs` copies the sheet and the fonts to `dist/`.
   - `catalogs/v0.9.1/catalog.json` — hand-written in the GitHub catalog's shape: per component `properties` with the `component` const, `required`, `unevaluatedProperties: false`; the basic functions verbatim; `$defs.anyComponent` / `anyFunction`. Descriptions for the agent, naming no library.
   - Tests: zod ↔ `catalog.json` parity per component (props, required, enums, const); `anyComponent`/`anyFunction` cover exactly what is declared; declared functions equal the pinned basic catalog's; every declared function has an implementation; the runtime catalog registers exactly the declared components; the Provider writes nothing on the document root; `theme.css` defines the same tokens in both appearances, reads only tokens it defines, and leads every rule with the wrapper class.
   - `package.json` description; README.
2. **Agent** (`agent/`)
   - `app/config.py`: `catalog_kind="custom"`.
   - `app/knowledge/brand-guidance.md` rewritten for the vocabulary; the four `app/knowledge/examples/*.json` rewritten in it.
   - `scripts/derive_corpus.py`: the authored decline response in the vocabulary.
   - Re-record the beats in `stub` mode (the model over the recorded CircleCI data; no CircleCI call, nothing rerun), on a free port with a scratch record dir, then derive the deterministic corpus only.
   - Tests updated where they name basic components; the golden prompt skeleton regenerated if it changes.
   - READMEs (app, agent) say what the catalog now is.
3. **Verify** — `pnpm verify` in `a2uiverse-apps`, the agent's `uv run pytest`, and the deterministic agent's four beats rendered by the catalog in the browser through the tunnel.
