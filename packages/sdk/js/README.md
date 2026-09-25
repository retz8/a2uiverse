# @a2uiverse/sdk (TypeScript)

The TypeScript package of the [sdk](../): the contract between A2UIVerse's orchestrator and its client, and generic A2UI tools. How to use it, and what it exports, is in [the sdk README](../README.md).

## Kept in step with the contract

The contract itself is [`../contracts/composition.v0.8.json`](../contracts/composition.v0.8.json). `src/composition.contract.test.ts` and `src/synthesis.contract.test.ts` check this package against it, so any drift fails the build. This is the contract's only package; another language gets one when something needs it.

## Used by

- **`apps/orchestrator`**: stamps what it relays, namespaces surface ids, narrows the shell catalog for each model call and validates what the model writes, resolves refs.
- **`apps/client`**: reads the stamps to place each fragment, and checks and evaluates the merged view's wiring.
- **`packages/shell-catalog`**: narrows its catalog to what each model is shown, and types the presses its components send.

## Commands

```bash
pnpm --filter @a2uiverse/sdk build | typecheck | test | lint
pnpm --filter @a2uiverse/sdk sync-a2ui-spec    # refresh ../a2ui-spec from the A2UI fork's upstream
```

`build`, `typecheck` and `test` first copy the pinned A2UI schemas from `../a2ui-spec` into `src/a2ui/spec.generated.ts`, which is generated and not committed.

It depends only on `ajv`.
