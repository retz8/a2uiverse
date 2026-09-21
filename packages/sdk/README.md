# @a2uiverse/sdk

The composition contract shared by the orchestrator and the canvas client, plus generic A2UI
tools: an A2UI v0.9.1 validator and catalog pruning. Used by the orchestrator, the client, the
shell catalog and the marketplace. Vendor agents never import it — nothing a2uiverse-specific
goes over the vendor wire.

```
contracts/composition.v0.6.json   the normative contract; the package is tested against it
a2ui-spec/                        pinned copy of the A2UI v0.9.1 schemas, basic catalog and validator cases
js/                               the TypeScript package
```

How the pieces fit into a turn is in [`_dev/docs/design/synthesis.md`](../../_dev/docs/design/synthesis.md).

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

**Composition stamp** — `js/src/composition.ts`

| Export                                  | What it is                      |
| --------------------------------------- | ------------------------------- |
| `CompositionStamp`                      | `{source, role?}`               |
| `STAMP_KEY`                             | `"a2uiverse"`, the metadata key |
| `COMPOSITION_EXTENSION_URI`             | the A2A extension URI           |
| `namespaceSurfaceId` · `parseSurfaceId` | `<appId>:<surfaceId>` and back  |
| `readStamp(metadata)`                   | the stamp, or `undefined`       |

**Synthesis payload** — `js/src/synthesis.ts` · `js/src/validate.ts`

| Export                                                               | What it is                                        |
| -------------------------------------------------------------------- | ------------------------------------------------- |
| `SynthesisPayload`                                                   | `{dataModel, sorts}`                              |
| `Ref` · `Formula` · `ModelNode` · `DerivedModel` · `SortDeclaration` | its pieces                                        |
| `Relation` · `MatchClaim` · `MATCH_KEY`                              | a match claim's pieces, and its key `"match"`     |
| `SYNTHESIS_SCHEMA` · `SYNTHESIS_DEFS`                                | the payload's JSON Schema                         |
| `SYNTHESIS_KEY` · `readSynthesis(metadata)`                          | `"a2uiverseSynthesis"`, and read the payload back |
| `validateSynthesisPayload(input)`                                    | `{ok: true, value}` or `{ok: false, errors}`      |
| `schemaErrors(validate, input)`                                      | an ajv validator's errors as finding lines        |

`validateSynthesisPayload` checks:

- every leaf is a formula and every pointer parses;
- every match claim is non-empty and flat, each relation over two refs in two different apps;
- one sort per array, every sort key a formula with a ref in every element, the initial key an option;
- sort paths are object keys and `*` (`/rows/*/runs` is the `runs` list inside every row).

Whether a relation's operator is a real relation, and whether it holds, is left to the consumer.

**Resolution** — `js/src/pointer.ts` · `js/src/walk.ts`

| Export                           | What it is                                              |
| -------------------------------- | ------------------------------------------------------- |
| `parsePointer(pointer)`          | pointer → steps; throws `PointerSyntaxError`            |
| `resolvePointer(root, pointer)`  | a value, or why not                                     |
| `locatePointer(root, pointer)`   | the resolution plus the concrete path it reached        |
| `isFormula` · `walkModel(model)` | recognise a leaf; list every leaf and every match claim |
| `refsOf(model)`                  | every ref, in leaf order                                |
| `reachSortPath(model, path)`     | every array a sort path reaches                         |

**A2UI tools** — `js/src/a2ui/`

| Export                                                            | What it is                                                 |
| ----------------------------------------------------------------- | ---------------------------------------------------------- |
| `createA2uiValidator({catalog})`                                  | an A2UI v0.9.1 validator over a catalog, after upstream's  |
| `formatA2uiFinding(finding)`                                      | a finding as one line                                      |
| `pruneCatalog(catalog, keepSet)`                                  | a `catalog.json` narrowed to some components and functions |
| `A2uiCatalogSchema` · `A2uiFinding` · `A2uiComponent` · `KeepSet` | the shapes                                                 |
| `A2UI_SPEC_COMMIT`                                                | the upstream commit the pinned spec came from              |

## Commands

```
pnpm --filter @a2uiverse/sdk build | typecheck | test | lint
pnpm --filter @a2uiverse/sdk sync-a2ui-spec    # refresh a2ui-spec/ from the A2UI fork's upstream/main
```

`a2ui-spec/` is never edited by hand; `a2ui-spec/UPSTREAM.json` records the commit it was copied
from. `build`, `typecheck` and `test` first embed the pinned schemas into
`js/src/a2ui/spec.generated.ts` (generated, gitignored).

## Installing

Inside this monorepo:

```json
"@a2uiverse/sdk": "workspace:*"
```

Outside it, as a git dependency pinned in the lockfile:

```json
"@a2uiverse/sdk": "github:retz8/a2uiverse#path:packages/sdk/js"
```

ESM, runs in Node and the browser, depends on `ajv` only.

## Further reading

- `contracts/composition.v0.6.json` — the normative contract; SPEC §14 is its register entry.
- `_dev/docs/design/synthesis.md` — the merged view end to end.
- `_dev/docs/design/orchestrator.md` · `_dev/docs/design/client.md` — each consumer's side.
