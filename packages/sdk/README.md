# @a2uiverse/sdk

The contracts A2UIVerse's platform shares, and generic A2UI tools: what the orchestrator adds around the A2UI it relays to the client, and what a catalog package, Stellify, the registry and the client agree a catalog artifact is. The orchestrator, the client, the shell catalog, Stellify and the registry snapshot use it.

## What's in it

- **Composition**: what the orchestrator adds around the A2UI it relays. A stamp on every event says which app painted it, and marks where an app's stream ends. Surface ids are namespaced by app (`gmail:inbox`). A paint can carry a short title, and the Planner's title names the canvas. The client sends back the reader's presses: Retry, Include, Try again, a step back or forward in a fragment, and closing a canvas; and a fragment whose catalog it could not load, as a catalog load failure the orchestrator fails the slot with.
- **Contexts**: each question's answer is an A2A context. The orchestrator gives it its id when the question is asked, every later message carries that id, and a question asked from an earlier answer names that answer's context as its parent.
- **Synthesis**: the merged view's wiring, with its schema and validator. The wiring is formulas over refs into each app's data, match claims that say which entries are one thing, and sorts.
- **Resolution**: pointers with key predicates, like `/threads[id="1a06f2"]/time`, resolved against a data model.
- **A2UI tools**: an A2UI v0.9.1 validator that follows upstream's, and catalog pruning.
- **Catalogs**: what a catalog package exposes (`CATALOG`, an optional `Provider`), what the client lends a loaded catalog (the host-module interface keyed by A2UI version — `0.9.1`, seven specifiers and `loadStylesheet` — and which versions the platform supplies), which imports Stellify leaves to the host, bundles or refuses, and the checks over an app at install: the catalog ids a card declares, read in both of the shapes the A2UI extension's params are written in, two-directional coverage against the artifacts handed, each app's catalog entitlement, the app id's grammar and its claim, the credential lint over a schema. The marketplace runs the same checks at publish. The app itself is its A2A AgentCard; nothing here describes one.
- **Artifacts**: the catalog artifact's descriptor, `artifact.json`, with its validator; the file hash and the artifact id, the descriptor's own hash spelled URL-safe; the checks that every listed file is there with its hash and nothing else is, that the schema's `catalogId` is the descriptor's, and that the schema compiles as an A2UI catalog.

```
contracts/composition.v0.8.json         the composition contract — an A2A extension, versioned in its URI; the package is tested against it
contracts/catalog.json                  the catalog contracts' terms, versioned with the package; tested against
contracts/catalog-artifact.schema.json  the artifact descriptor's JSON Schema, versioned with the package; the package compiles its mirror
a2ui-spec/                              a pinned copy of the A2UI v0.9.1 schemas, capabilities, basic catalog and validator cases
js/                                     the TypeScript package
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

### Check an app's catalogs at install

```ts
import {
  checkCoverage,
  coverageErrors,
  entitlementOf,
  readSupportedCatalogIds,
} from '@a2uiverse/sdk';

const declared = readSupportedCatalogIds(card); // the ids under the card's A2UI extension, flat or keyed by version
if (declared.ok) {
  const handed = [githubCatalogId]; // the catalog id of each artifact handed with the card
  const errors = coverageErrors(checkCoverage(declared.value, handed));
  // [] when every declared id is handed or public and every handed id is declared
  entitlementOf(handed); // [the basic catalog's id, githubCatalogId]: what the app may paint in
}
```

### Verify a catalog artifact's files

```ts
import {artifactIdOf, validateArtifactDescriptor, verifyArtifactFiles} from '@a2uiverse/sdk';

const descriptor = validateArtifactDescriptor(
  JSON.parse(new TextDecoder().decode(descriptorBytes)),
);
if (descriptor.ok) {
  await verifyArtifactFiles(descriptor.value, files); // [] when every listed file matches its hash and nothing else is there
  await artifactIdOf(descriptorBytes); // "sha256-muNbmR5m…": the artifact's id, the descriptor's hash spelled URL-safe
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

| Area           | Main exports                                                                                                                                                                                                                                                                                                                                                                                                                   | In                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Stamp          | `CompositionStamp` (`{source, role?, settled?}`), `STAMP_KEY`, `COMPOSITION_EXTENSION_URI`, `namespaceSurfaceId`, `parseSurfaceId`, `readStamp`                                                                                                                                                                                                                                                                                | `js/src/composition.ts`              |
| Parent context | `CanvasParent` (`{parent}`), `canvasParentMetadata`, `readCanvasParent`                                                                                                                                                                                                                                                                                                                                                        | `js/src/composition.ts`              |
| Paint meta     | `PaintMeta` (`{surfaceId, title?, kind?}`), `PAINT_META_MIME_TYPE`, `QUESTION_PAINT_KIND`, `clipPaintMetaTitle` (48 characters), `paintMetaData`, `readPaintMeta`                                                                                                                                                                                                                                                              | `js/src/composition.ts`              |
| Presses        | `CompositionOperation` (`{kind, sources, step?}`), `OPERATION_KINDS` (`retry`, `include`, `tryAgain`, `step`, `close`), `operationData`, `readOperation`                                                                                                                                                                                                                                                                       | `js/src/composition.ts`              |
| Synthesis      | `SynthesisPayload`, `Ref`, `Formula`, `MatchClaim`, `SortDeclaration`, `SYNTHESIS_SCHEMA`, `SYNTHESIS_KEY`, `readSynthesis`, `validateSynthesisPayload`                                                                                                                                                                                                                                                                        | `js/src/synthesis.ts`, `validate.ts` |
| Resolution     | `parsePointer`, `resolvePointer`, `locatePointer`, `isFormula`, `walkModel`, `refsOf`, `reachSortPath`                                                                                                                                                                                                                                                                                                                         | `js/src/pointer.ts`, `walk.ts`       |
| A2UI tools     | `createA2uiValidator`, `formatA2uiFinding`, `pruneCatalog`, `A2UI_SPEC_COMMIT`, and their types                                                                                                                                                                                                                                                                                                                                | `js/src/a2ui/`                       |
| Catalogs       | `CATALOG_EXPORTS`, `checkCatalogExports`, `HOST_INTERFACE_VERSION`, `SUPPORTED_HOST_INTERFACES`, `checkHostInterface`, `HOST_INTERFACE_GLOBAL`, `HOST_SPECIFIERS`, `HOST_STYLESHEET_LOADER`, `HostInterface`, `classifySpecifier`, `BASIC_CATALOG_ID`, `PUBLIC_CATALOG_IDS`, `readSupportedCatalogIds`, `clientCapabilities`, `checkCoverage`, `coverageErrors`, `entitlementOf`, `checkAppId`, `claimAppId`, `credentialLint` | `js/src/catalog.ts`                  |
| Artifacts      | `ArtifactDescriptor`, `ARTIFACT_DESCRIPTOR_FILE`, `ARTIFACT_DESCRIPTOR_SCHEMA`, `validateArtifactDescriptor`, `hashArtifactFile`, `artifactIdOf`, `verifyArtifactFiles`, `checkArtifactSchema`, `checkCatalogSchemaCompiles`                                                                                                                                                                                                   | `js/src/artifact.ts`                 |

`validateSynthesisPayload` checks the payload's shape: every leaf is a formula, every match claim relates two refs in two different apps, and every sort is well formed. Whether a relation actually holds is left to the caller.

`credentialLint` matches its terms as whole words, case-insensitively, against a catalog schema's component names, prop names, enum values and constants, never its descriptions; `pin` alone is allowed, `pin code` is not.

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

- [`docs/design/synthesis.md`](../../docs/design/synthesis.md): the merged view end to end.
- [`docs/design/app-install.md`](../../docs/design/app-install.md): the catalog contracts in use, from Stellify's pack to the client's load.
- [`docs/design/orchestrator.md`](../../docs/design/orchestrator.md) and [`docs/design/client.md`](../../docs/design/client.md): how each side uses the contract.
