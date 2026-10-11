# @a2uiverse/sdk (TypeScript)

The TypeScript package of the [sdk](../): the contracts A2UIVerse's platform shares, and generic A2UI tools. How to use it, and what it exports, is in [the sdk README](../README.md).

## Kept in step with the contract

The contracts themselves are JSON in [`../contracts/`](../contracts/): [`a2uiverse.v0.9.json`](../contracts/a2uiverse.v0.9.json), checked by `src/a2uiverse.contract.test.ts` and `src/synthesis.contract.test.ts`; [`catalog.json`](../contracts/catalog.json) with [`catalog-artifact.schema.json`](../contracts/catalog-artifact.schema.json), checked by `src/catalog.contract.test.ts`; and [`marketplace.json`](../contracts/marketplace.json) with [`marketplace-entry.schema.json`](../contracts/marketplace-entry.schema.json) and [`marketplace-preview.schema.json`](../contracts/marketplace-preview.schema.json), checked by `src/marketplace.contract.test.ts` — so any drift fails the build. This is the contracts' only package; another language gets one when something needs it.

## Used by

- **`apps/orchestrator`**: stamps what it relays, namespaces surface ids, narrows the shell catalog for each model call and validates what the model writes, resolves refs.
- **`apps/client`**: reads the stamps to place each fragment, and checks and evaluates the merged view's wiring.
- **`packages/shell-catalog`**: narrows its catalog to what each model is shown, and types the presses its components send.
- **`apps/orchestrator`'s registry**: checks an app at install — its id, its card's catalog ids, coverage, each artifact's descriptor, files, schema and host interface — tells each app its entitlement, and keeps each installed catalog's declared options for the credential check at the paint.
- **`apps/client`'s loader**: registers the host-module interface, and checks each artifact's host interface and its module's exports at load.
- **`packages/stellify`**: classifies the imports it bundles, writes the descriptor and gates its own output with the same checks as install; speaks the marketplace's routes and bodies, and runs the smoke test's checks for `preview`.
- **`apps/marketplace`**: the index entry and the preview it serves, the publisher's token, the publish body it reads, the gate, the additive-evolution check, the retirement rule, the smoke test's checks and ahead-of-the-Store detection.
- **`apps/orchestrator`'s update check**: the eight update states it computes and serves, the drift and retirement functions it decides them with.
- **`packages/registry-snapshot`**: names each packed artifact by its id.

## Commands

```bash
pnpm --filter @a2uiverse/sdk build | typecheck | test | lint
pnpm --filter @a2uiverse/sdk sync-a2ui-spec    # refresh ../a2ui-spec from the A2UI fork's upstream
```

`build`, `typecheck` and `test` first copy the pinned A2UI schemas from `../a2ui-spec` into `src/a2ui/spec.generated.ts`, which is generated and not committed.

It depends only on `ajv`.
