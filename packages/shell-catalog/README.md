# @a2uiverse/shell-catalog

The shell's own catalog (SPEC §4.2): the standard A2UI catalog plus composition primitives (slot, provenance attribution), shipped as catalog schema (`catalogs/`) + React implementation (`src/`). It is a catalog of the same shape a vendor ships — the first instance of what `@a2uiverse/sdk` describes.

## Consumers

- `apps/orchestrator` — validates Planner/Synthesizer output against the schema
- `apps/client` — renders the implementation

Depends on `@a2uiverse/sdk`.

## Commands

```
pnpm --filter @a2uiverse/shell-catalog build | typecheck | test | lint
```
