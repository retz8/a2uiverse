# @a2uiverse/sdk

The app contract of A2UIVerse: the app manifest (schema, types, validation) and the A2A/A2UI protocol extension (SPEC §9.1, §14). The only platform package a vendor app may depend on.

## Consumers

- `apps/orchestrator` — Registry, install, Validator
- `apps/marketplace` — publish gate
- `apps/client` — loading an installed catalog implementation
- vendor apps (`../a2uiverse-apps`, external apps) — as a published package, never as a workspace sibling

Depends on nothing in this workspace.

## Commands

```
pnpm --filter @a2uiverse/sdk build | typecheck | test | lint
```
