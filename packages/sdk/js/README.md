# @a2uiverse/sdk

The TypeScript projection of the A2UIVerse app contract: the composition extension (SPEC §14) — extension URI, composition stamp, surface-id namespacing, and the synthesize data model with its validator, resolution kit and prompt builder — with the app manifest to follow in Phase 10. The normative definition is [`../contracts`](../contracts); `src/composition.contract.test.ts` asserts this projection against it — drift is a red build.

This is the only projection. The extension is platform-internal (orchestrator ↔ client), so nothing a2uiverse-specific rides the vendor wire and an agent has nothing to consume here; a projection in another language is created when a real consumer for it exists.

## Consumers

- `apps/orchestrator` — stamps relayed events, namespaces surface ids, assembles the Synthesizer's prompt, validates its output, resolves refs
- `apps/client` — reads stamps into the placement map, validates and evaluates the synthesis payload
- `apps/marketplace` — publish gate
- vendor apps (`../a2uiverse-apps`, external apps) — the catalog/TS half, as a published package, never as a workspace sibling

Depends on nothing in this workspace; `ajv` for the validator.

## Commands

```
pnpm --filter @a2uiverse/sdk build | typecheck | test | lint
```

`build`, `typecheck` and `test` first run `scripts/embed-docs.mjs`, which embeds `../docs/composition.md` into `src/prompt/composition.doc.generated.ts` (generated, gitignored).
