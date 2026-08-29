# @a2uiverse/sdk

The TypeScript projection of the A2UIVerse app contract: the composition extension (SPEC §14) — extension URI, composition stamp, slot request, surface-id namespacing — with the app manifest to follow in Phase 9. The normative definition is [`../contracts`](../contracts); `src/composition.contract.test.ts` asserts this projection against it. The agent-facing Python projection lives in [`../python`](../python).

## Consumers

- `apps/orchestrator` — stamps relayed events, namespaces surface ids, sends slot requests
- `apps/client` — reads stamps into the placement map
- `apps/marketplace` — publish gate
- vendor apps (`../a2uiverse-apps`, external apps) — the catalog/TS half, as a published package, never as a workspace sibling

Depends on nothing in this workspace.

## Commands

```
pnpm --filter @a2uiverse/sdk build | typecheck | test | lint
```
