# @a2uiverse/marketplace

The marketplace (SPEC §9.3): a local process holding the AgentCard index (skill embeddings), package hosting, the publish step, and the hello-fragment smoke test. The Store page in the client browses it.

## Dependencies

`@a2uiverse/sdk` (publish gate: manifest validation, catalog review rules).

## Commands

```
pnpm --filter @a2uiverse/marketplace dev          # run the process (placeholder in Phase 0)
pnpm --filter @a2uiverse/marketplace build | typecheck | test | lint
```

## Port

`10002`, reserved; the process lands in Phase 11. See `_dev/docs/tunnel-environment.md`.
