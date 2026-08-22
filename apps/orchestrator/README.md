# @a2uiverse/orchestrator

The orchestrator (SPEC §10–11): an A2A agent server the client talks to exclusively. Router, Planner, Synthesizer, AgentsPool, UIComposer-side validation, IntegrityChecker, AuthVault, Registry, IntentJournal.

## Dependencies

`@a2uiverse/sdk`, `@a2uiverse/shell-catalog`. Vendor agents are reached over A2A only.

## Commands

```
pnpm --filter @a2uiverse/orchestrator dev          # run the process (placeholder in Phase 0)
pnpm --filter @a2uiverse/orchestrator build | typecheck | test | lint
```

## Port

Fixed in Phase 1; documented here and in `_dev/docs/tunnel-environment.md`.
