# @a2uiverse/shell-catalog

The shell's design system (SPEC §4.2). The shell is every platform-owned surface — canvas container, synthesis surface, trusted pages, authority dialogs — and this package is what they are built from: a React implementation (`src/`) plus a catalog schema (`catalogs/`) exposing the standard A2UI catalog and the composition primitives (slot, provenance attribution) as the orchestrator's paint vocabulary. It is a catalog of the same shape a vendor ships — the first instance of what `@a2uiverse/sdk` describes.

## Consumers

- `apps/orchestrator` — validates Planner/Synthesizer output against the schema
- `apps/client` — renders the implementation

Depends on `@a2uiverse/sdk`.

## Commands

```
pnpm --filter @a2uiverse/shell-catalog build | typecheck | test | lint
```
