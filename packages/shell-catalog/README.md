# @a2uiverse/shell-catalog

The shell's paint vocabulary (SPEC §4.2): the A2UI basic catalog plus the composition primitives — as schema (`catalogs/v0.9.1/catalog.json`) + React implementation, versioned together.

- **Basic catalog** — re-exported from `@a2ui/react` as-is; no mapping of its own.
- **`Slot`** — a named region whose content the host mounts through `SlotContentContext`; renders its own pending/failed/collapsed states.
- **`Attribution`** — the quiet provenance marker (SPEC §4.3): display name + info glyph, full detail on hover/focus, accessible name always.
- **`Provider`** — binds `--a2ui-*` to Radix Themes variables with explicit fallbacks, scoped to its own wrapper (never `:root`).

The schema is generated from the upstream basic `catalog.json` (`v0_9_1`, `upstream/main` of the sibling `A2UI` fork) plus the two primitive defs.

## Commands

```
pnpm --filter @a2uiverse/shell-catalog build | typecheck | test | lint
pnpm --filter @a2uiverse/shell-catalog dev    # design-check fixture on :5174
```

The fixture renders the Slot/Attribution matrix under Radix light · dark · no-Radix fallback, plus the token-scoping proof. In the tunnel environment open it at `https://vnw20xbg-5174.asse.devtunnels.ms`.
