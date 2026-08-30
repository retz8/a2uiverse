# @a2uiverse/sdk

The TypeScript projection of the A2UIVerse app contract: the composition extension (SPEC §14) — extension URI, composition stamp, slot request, surface-id namespacing — with the app manifest to follow in Phase 9. The normative definition is [`../contracts`](../contracts); `src/composition.contract.test.ts` asserts this projection against it — drift is a red build.

This is the only projection. The extension is platform-internal (orchestrator ↔ client), so nothing a2uiverse-specific rides the vendor wire and an agent has nothing to consume here; a projection in another language is created when a real consumer for it exists.

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
