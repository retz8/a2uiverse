# @a2uiverse/client

The canvas shell (SPEC §4, §10–11): palette, timeline, trusted pages (Store, App Library), UIComposer, render layer with catalog scoping, BindingEvaluator, Validator. Talks only to the orchestrator. Ported from `../a2ui-github/client` in Phase 1.

## Dependencies

`@a2uiverse/sdk`, `@a2uiverse/shell-catalog`. Installed vendor catalogs are loaded through the sdk.

## Commands

```
pnpm --filter @a2uiverse/client dev               # Vite dev server
pnpm --filter @a2uiverse/client build | typecheck | test | lint
pnpm --filter @a2uiverse/client test:e2e          # Playwright (browsers installed separately)
```

## Port

Vite default `5173`; the orchestrator URL the client calls is configured per environment — see `_dev/docs/tunnel-environment.md`.
