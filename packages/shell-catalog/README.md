# @a2uiverse/shell-catalog

The shell's paint vocabulary (SPEC §4.2): the A2UI basic catalog plus the composition primitives — as schema (`catalogs/v0.9.1/catalog.json`) + React implementation, versioned together. Radix Themes is its design system.

- **Basic catalog** — re-exported from `@a2ui/react` as-is until 5.9 maps each component onto its Radix Themes counterpart.
- **`Slot`** — a named region whose content the host mounts through `SlotContentContext`. It renders its own `pending` and `failed` states; `collapsed` asks the host for content first and renders nothing only if there is none, so a source that answered without painting is not left with an attribution marker naming an empty region.
- **`Attribution`** — the quiet provenance marker (SPEC §4.3): display name + info glyph, full detail on hover/focus, accessible name always.
- **`Provider`** — binds `--a2ui-*` to Radix Themes variables with explicit fallbacks, scoped to its own wrapper (never `:root`).
- **`DerivedValue`** and **`SortControl`** — the synthesis primitives: a formula-bound cell with its contributor state, and the sort criterion over a declaration at `/sorts/N`.

Beside the rendering catalog the package ships two things for the process that authors a merged view without rendering one:

- **`@a2uiverse/shell-catalog/schema`** — the catalog's React-free face: `SCHEMA_CATALOG`, the same component APIs (upstream's from `@a2ui/web_core`, the primitives' own zod schemas) as a `Catalog` of APIs, plus `OPERATORS` and `CATALOG_ID`. What the orchestrator feeds a headless `MessageProcessor` to validate a model-authored tree against.
- **`@a2uiverse/shell-catalog/guidance.md`** — `docs/guidance.md`, how to build a merged view out of this catalog: the derived-value rule, which components a merged view is made of, what never to paint. Read into the Synthesizer's prompt beside `catalog.json`.

The schema is generated from the upstream basic `catalog.json` (`v0_9_1`, `upstream/main` of the sibling `A2UI` fork) plus the two primitive defs.

## Commands

```
pnpm --filter @a2uiverse/shell-catalog build | typecheck | test | lint
pnpm --filter @a2uiverse/shell-catalog dev    # design-check fixture on :5174
```

The fixture renders the sort control and the Slot/Attribution matrix under Radix light · dark · no host Theme, plus the token-scoping proof. In the tunnel environment open it at `https://vnw20xbg-5174.asse.devtunnels.ms`.
