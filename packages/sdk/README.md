# @a2uiverse/sdk

The contract between A2UIVerse's orchestrator and its canvas client, and generic A2UI tools. The orchestrator, the client and the shell catalog use it.

## What's in it

- **Composition**: what the orchestrator adds around the A2UI it relays. A stamp on every event says which app painted it, and marks where an app's stream ends. Surface ids are namespaced by app (`gmail:inbox`). A paint can carry a short title, and the Planner's title names the canvas. The client sends back the reader's presses: Retry, Include, Try again, a step back or forward in a fragment, and closing a canvas.
- **Canvases**: a canvas is an A2A context. The orchestrator gives it its id when its question is asked, every later message carries that id, and a question asked from a canvas names it as its parent.
- **Synthesis**: the merged view's wiring, with its schema and validator. The wiring is formulas over refs into each app's data, match claims that say which entries are one thing, and sorts.
- **Resolution**: pointers with key predicates, like `/threads[id="1a06f2"]/time`, resolved against a data model.
- **A2UI tools**: an A2UI v0.9.1 validator that follows upstream's, and catalog pruning.

```
contracts/composition.v0.8.json   the contract; the package is tested against it
a2ui-spec/                        a pinned copy of the A2UI v0.9.1 schemas, basic catalog and validator cases
js/                               the TypeScript package
```

## Quick start

### Stamp an event, read the stamp back

```ts
import {STAMP_KEY, namespaceSurfaceId, readStamp} from '@a2uiverse/sdk';

// orchestrator
event.metadata = {...event.metadata, [STAMP_KEY]: {source: 'gmail', role: 'fragment'}};
namespaceSurfaceId('gmail', 'inbox'); // "gmail:inbox"

// client
const stamp = readStamp(event.metadata); // {source: 'gmail', role: 'fragment'} | undefined
```

### Validate an A2UI tree against a pruned catalog

```ts
import {createA2uiValidator, formatA2uiFinding, pruneCatalog} from '@a2uiverse/sdk';

const catalog = pruneCatalog(catalogJson, {
  components: ['Column', 'Text', 'Table', 'TableRow', 'DerivedValue'],
  functions: ['value', 'min'],
});
const validator = createA2uiValidator({catalog});

const findings = validator.validate([
  {version: 'v0.9', createSurface: {surfaceId: 's', catalogId}},
  {version: 'v0.9', updateComponents: {surfaceId: 's', components}},
]);
console.log(findings.map(formatA2uiFinding));
```

### Read and check a synthesis payload

```ts
import {readSynthesis, validateSynthesisPayload, walkModel} from '@a2uiverse/sdk';

const checked = validateSynthesisPayload(readSynthesis(event.metadata));
if (checked.ok) {
  const {leaves, claims} = walkModel(checked.value.dataModel);
} else {
  console.error(checked.errors); // one line per finding
}
```

### Resolve a pointer

```ts
import {locatePointer, resolvePointer} from '@a2uiverse/sdk';

resolvePointer(model, '/threads[id="1a06f2"]/time');
// {found: true, value} | {found: false, reason: 'missing' | 'ambiguous' | 'null' | 'positional'}

locatePointer(model, '/threads[id="1a06f2"]/time');
// the same, plus `path`: the concrete path with positions, e.g. "/threads/3/time"
```

## Exports

One entry point, `@a2uiverse/sdk`.

| Area          | Main exports                                                                                                                                                      | In                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Stamp         | `CompositionStamp` (`{source, role?, settled?}`), `STAMP_KEY`, `COMPOSITION_EXTENSION_URI`, `namespaceSurfaceId`, `parseSurfaceId`, `readStamp`                   | `js/src/composition.ts`              |
| Canvas parent | `CanvasParent` (`{parent}`), `canvasParentMetadata`, `readCanvasParent`                                                                                           | `js/src/composition.ts`              |
| Paint meta    | `PaintMeta` (`{surfaceId, title?, kind?}`), `PAINT_META_MIME_TYPE`, `QUESTION_PAINT_KIND`, `clipPaintMetaTitle` (48 characters), `paintMetaData`, `readPaintMeta` | `js/src/composition.ts`              |
| Presses       | `CompositionOperation` (`{kind, sources, step?}`), `OPERATION_KINDS` (`retry`, `include`, `tryAgain`, `step`, `close`), `operationData`, `readOperation`          | `js/src/composition.ts`              |
| Synthesis     | `SynthesisPayload`, `Ref`, `Formula`, `MatchClaim`, `SortDeclaration`, `SYNTHESIS_SCHEMA`, `SYNTHESIS_KEY`, `readSynthesis`, `validateSynthesisPayload`           | `js/src/synthesis.ts`, `validate.ts` |
| Resolution    | `parsePointer`, `resolvePointer`, `locatePointer`, `isFormula`, `walkModel`, `refsOf`, `reachSortPath`                                                            | `js/src/pointer.ts`, `walk.ts`       |
| A2UI tools    | `createA2uiValidator`, `formatA2uiFinding`, `pruneCatalog`, `A2UI_SPEC_COMMIT`, and their types                                                                   | `js/src/a2ui/`                       |

`validateSynthesisPayload` checks the payload's shape: every leaf is a formula, every match claim relates two refs in two different apps, and every sort is well formed. Whether a relation actually holds is left to the caller.

## Commands

```bash
pnpm --filter @a2uiverse/sdk build | typecheck | test | lint
pnpm --filter @a2uiverse/sdk sync-a2ui-spec    # refresh a2ui-spec/ from the A2UI fork's upstream
```

`a2ui-spec/` is never edited by hand; `a2ui-spec/UPSTREAM.json` records the commit it was copied from.

## Installing

Inside this monorepo:

```json
"@a2uiverse/sdk": "workspace:*"
```

Outside it, as a git dependency:

```json
"@a2uiverse/sdk": "github:retz8/a2uiverse#path:packages/sdk/js"
```

ESM, runs in Node and the browser.

## Further reading

- [`_dev/docs/design/synthesis.md`](../../_dev/docs/design/synthesis.md): the merged view end to end.
- [`_dev/docs/design/orchestrator.md`](../../_dev/docs/design/orchestrator.md) and [`_dev/docs/design/client.md`](../../_dev/docs/design/client.md): how each side uses the contract.
