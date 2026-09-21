# @a2uiverse/sdk

The TypeScript projection of the A2UIVerse wire contract and its generic A2UI tools: the composition extension (SPEC §14) — extension URI, composition stamp, surface-id namespacing, and the synthesis payload with its validator and resolution kit — plus an A2UI v0.9.1 validator following upstream's and catalog pruning. Usage and exports: [`../README.md`](../README.md). The normative definition is [`../contracts`](../contracts); `src/composition.contract.test.ts` and `src/synthesis.contract.test.ts` assert this projection against it — drift is a red build.

This is the only projection. The extension is platform-internal (orchestrator ↔ client), so nothing a2uiverse-specific rides the vendor wire and an agent has nothing to consume here; a projection in another language is created when a real consumer for it exists.

## Consumers

- `apps/orchestrator` — stamps relayed events, namespaces surface ids, prunes the shell catalog for each author and validates what each writes, resolves refs
- `apps/client` — reads stamps into the placement map, validates and evaluates the synthesis payload
- `packages/shell-catalog` — its keep-sets, and the derived-value and sort components' shapes
- `apps/marketplace` — publish gate
- vendor apps (`../a2uiverse-apps`, external apps) — the catalog/TS half, as a published package, never as a workspace sibling

Depends on nothing in this workspace; `ajv` for the validators.

## Commands

```
pnpm --filter @a2uiverse/sdk build | typecheck | test | lint
pnpm --filter @a2uiverse/sdk sync-a2ui-spec    # refresh ../a2ui-spec from the A2UI fork's upstream/main
```

`build`, `typecheck` and `test` first run `scripts/embed-spec.mjs`, which embeds the pinned spec schemas from `../a2ui-spec` into `src/a2ui/spec.generated.ts` (generated, gitignored).
