# @a2uiverse/sdk

The contracts A2UIVerse's parts agree on — what the orchestrator adds around the A2UI it relays to the client, what a catalog artifact is, what the marketplace serves and takes — and the checks every side runs over them, plus generic A2UI tools. The orchestrator, the client, the shell catalog, Stellify, the marketplace and the registry snapshot all build on it; no vendor app needs to.

## Install

Inside this monorepo:

```json
"@a2uiverse/sdk": "workspace:*"
```

Outside it, as a git dependency:

```json
"@a2uiverse/sdk": "github:retz8/a2uiverse#path:packages/sdk/js"
```

One entry point, `@a2uiverse/sdk`. ESM, runs in Node and the browser.

## Quick start

**Stamp an event, read the stamp back**

```ts
import {STAMP_KEY, namespaceSurfaceId, readStamp} from '@a2uiverse/sdk';

// orchestrator
event.metadata = {...event.metadata, [STAMP_KEY]: {source: 'gmail', role: 'fragment'}};
namespaceSurfaceId('gmail', 'inbox'); // "gmail:inbox"

// client
const stamp = readStamp(event.metadata); // {source: 'gmail', role: 'fragment'} | undefined
```

**Validate an A2UI tree against a pruned catalog**

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

**Read and check a synthesis payload**

```ts
import {readSynthesis, validateSynthesisPayload, walkModel} from '@a2uiverse/sdk';

const checked = validateSynthesisPayload(readSynthesis(event.metadata));
if (checked.ok) {
  const {leaves, claims} = walkModel(checked.value.dataModel);
} else {
  console.error(checked.errors); // one line per finding
}
```

**Check an app's catalogs at install**

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

**Verify a catalog artifact's files**

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

**Resolve a pointer**

```ts
import {locatePointer, resolvePointer} from '@a2uiverse/sdk';

resolvePointer(model, '/threads[id="1a06f2"]/time');
// {found: true, value} | {found: false, reason: 'missing' | 'ambiguous' | 'null' | 'positional'}

locatePointer(model, '/threads[id="1a06f2"]/time');
// the same, plus `path`: the concrete path with positions, e.g. "/threads/3/time"
```

## What's in it

| Area                         | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Composition**              | The stamp on every relayed event — which source painted it, the app and its account (`gmail.2`), the build of each catalog the registry holds, and where a source's stream ends; surface ids namespaced by source (`gmail.2:inbox`); a paint's title; the reader's presses the client sends back — Retry, Include, Try again, a step, Not now, an account chosen, an app offered and installed, a canvas closed — and a catalog load failure                             |
| **Authority**                | What an agent sends when it needs more access mid-task: an `auth-required` task carrying the scheme and the missing scopes by their keys on its card                                                                                                                                                                                                                                                                                                                     |
| **Contexts and session**     | Each question's answer is an A2A context, its id minted by the orchestrator and carried by every later message, a child naming its parent; every client message names its page load's session and, when the browser gives them, the person's local time and time zone                                                                                                                                                                                                    |
| **Synthesis**                | The merged view's wiring — formulas over refs into each app's data, match claims that say which entries are one thing, sorts — with its schema and validator                                                                                                                                                                                                                                                                                                             |
| **Resolution**               | Pointers with key predicates, like `/threads[id="1a06f2"]/time`, resolved against a data model                                                                                                                                                                                                                                                                                                                                                                           |
| **A2UI tools**               | An A2UI v0.9.1 validator that follows upstream's, and catalog pruning                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Catalogs**                 | What a catalog package exposes (`CATALOG`, an optional `Provider`); the host-module interface the client lends (`0.9.1`: seven specifiers and `loadStylesheet`); which imports Stellify leaves to the host, bundles or refuses; the checks over an app at install — the catalog ids a card declares, coverage both ways, each app's entitlement, the app id's grammar                                                                                                    |
| **Credential bar**           | The terms no painted component, property or declared option may carry, and the check over a paint the hub runs before it relays                                                                                                                                                                                                                                                                                                                                          |
| **Artifacts and the gate**   | The artifact descriptor, `artifact.json`, with its validator; the file hash and the artifact id; the static gate over one handed artifact, run by the registry at install and the marketplace at publish                                                                                                                                                                                                                                                                 |
| **Marketplace**              | What the marketplace serves and takes, so the orchestrator, Stellify and the trusted page agree without importing it: the routes, the index entry and the preview with their JSON Schemas, the publisher's name and token, the wire bodies, the eight update states and the words the App Library and the Planner say them in, and why an install was refused, with the Store's words for it that the Store, the App Library and a slot's offer and update tile all read |
| **The rules both sides run** | The additive-evolution check within a catalog id; the retirement rule; ahead-of-the-Store detection over an entry and a live card; the smoke test's checks — the words, the paint, the sign-in answer                                                                                                                                                                                                                                                                    |

The normative definitions are the JSON files beside the code, which the package is tested against:

```
contracts/a2uiverse.v0.9.json             the A2UIVerse extension — the platform's one A2A extension, versioned in its URI
contracts/catalog.json                    the catalog contracts' terms
contracts/catalog-artifact.schema.json    the artifact descriptor's JSON Schema; the package compiles its mirror
contracts/marketplace.json                the marketplace contracts' terms — routes, publisher, ownership, versions, evolution, retirement, ahead of the Store, the smoke test, the wire bodies
contracts/marketplace-entry.schema.json   the index entry's JSON Schema; the package compiles its mirror
contracts/marketplace-preview.schema.json the captured preview's JSON Schema; the package compiles its mirror
a2ui-spec/                                a pinned copy of the A2UI v0.9.1 schemas, capabilities, basic catalog and validator cases
js/                                       the TypeScript package
```

## Exports

| Area           | Main exports                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | In                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Stamp          | `CompositionStamp` (`{source, role?, settled?, refused?, builds?}`, `builds` each catalog id's artifact id), `STAMP_KEY`, `A2UIVERSE_EXTENSION_URI`, `namespaceSurfaceId`, `parseSurfaceId`, `sourceId`, `parseSourceId`, `sourceName`, `readStamp`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `js/src/a2uiverse.ts`                |
| Parent context | `CanvasParent` (`{parent}`), `canvasParentMetadata`, `readCanvasParent`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `js/src/a2uiverse.ts`                |
| Paint meta     | `PaintMeta` (`{surfaceId, title?, kind?}`), `PAINT_META_MIME_TYPE`, `QUESTION_PAINT_KIND`, `clipPaintMetaTitle` (48 characters), `paintMetaData`, `readPaintMeta`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `js/src/a2uiverse.ts`                |
| Client session | `ClientSession` (`{session, now?, timeZone?}`), `ClientClock`, `clientSessionMetadata`, `readClientSession`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `js/src/a2uiverse.ts`                |
| Presses        | `CompositionOperation` (`{kind, sources, step?, gap?}`), `OPERATION_KINDS` (`retry`, `include`, `tryAgain`, `step`, `dismiss`, `close`, `useAccount`, `useApp`), `operationData`, `readOperation`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `js/src/a2uiverse.ts`                |
| Authority      | `AuthRequired` (`{security}`), `SecurityRequirement`, `AUTH_REQUIRED_STATE`, `authRequiredData`, `readAuthRequired`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `js/src/a2uiverse.ts`                |
| Synthesis      | `SynthesisPayload`, `Ref`, `Formula`, `MatchClaim`, `SortDeclaration`, `SYNTHESIS_SCHEMA`, `SYNTHESIS_KEY`, `readSynthesis`, `validateSynthesisPayload`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `js/src/synthesis.ts`, `validate.ts` |
| Resolution     | `parsePointer`, `resolvePointer`, `locatePointer`, `isFormula`, `walkModel`, `refsOf`, `reachSortPath`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `js/src/pointer.ts`, `walk.ts`       |
| A2UI tools     | `createA2uiValidator`, `formatA2uiFinding`, `pruneCatalog`, `A2UI_SPEC_COMMIT`, and their types                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `js/src/a2ui/`                       |
| Catalogs       | `CATALOG_EXPORTS`, `checkCatalogExports`, `HOST_INTERFACE_VERSION`, `SUPPORTED_HOST_INTERFACES`, `checkHostInterface`, `HOST_INTERFACE_GLOBAL`, `HOST_SPECIFIERS`, `HOST_STYLESHEET_LOADER`, `HostInterface`, `classifySpecifier`, `BASIC_CATALOG_ID`, `PUBLIC_CATALOG_IDS`, `readSupportedCatalogIds`, `clientCapabilities`, `checkCoverage`, `coverageErrors`, `entitlementOf`, `checkAppId`, `claimAppId`                                                                                                                                                                                                                                                                                                                                                                                            | `js/src/catalog.ts`                  |
| Credential bar | `CREDENTIAL_TERMS`, `wordsOf`, `credentialTermIn`, `CatalogOptions`, `catalogOptions`, `basicCatalogOptions`, `mergeCatalogOptions`, `CredentialFinding`, `credentialInputIn`, `describeCredentialFinding`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `js/src/credential.ts`               |
| Artifacts      | `ArtifactDescriptor`, `ARTIFACT_DESCRIPTOR_FILE`, `ARTIFACT_DESCRIPTOR_SCHEMA`, `validateArtifactDescriptor`, `hashArtifactFile`, `artifactIdOf`, `verifyArtifactFiles`, `checkArtifactSchema`, `checkCatalogSchemaCompiles`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `js/src/artifact.ts`                 |
| Gate           | `gateArtifact`, `GateResult`, `GatedArtifact`, `ArtifactFiles` — the static gate over one handed artifact                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `js/src/gate.ts`                     |
| Marketplace    | `MARKETPLACE_ROUTES`, `entryPath`, `previewPath`, `artifactPath`, `searchPath`, `SEARCH_QUERY_PARAM`; `checkPublisherName`, `mintPublisherToken`, `checkPublisherToken`, `hashPublisherToken`; `IndexEntry`, `INDEX_ENTRY_SCHEMA`, `validateIndexEntry`; `PreviewDocument`, `PREVIEW_SCHEMA`, `validatePreview`; `readClaimRequest`, `readPublishRequest`, `readUnpublishRequest`, `readReportRequest`, `readSearchResponse` and the bodies' field lists; `UpdateState`, `UPDATE_STATES`, `UPDATE_STATE_DETAILS`, `readUpdateState`; `UPDATE_WORDS`, `stateWords`, `updateWords`, `asksForMore`; `INSTALL_REFUSALS` (`store-behind`, `app-unreached`, `checks`, `store-unreached`, `unheard`, `not-in-store`), `InstallRefusal`, `refusalOf` (a refusal's words and press, for an install or an update) | `js/src/marketplace.ts`              |
| Evolution      | `checkAdditiveEvolution`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `js/src/evolution.ts`                |
| Retirement     | `retiredLines`, `unnamedRows`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `js/src/retirement.ts`               |
| Ahead of Store | `aheadOfStore`, `Drift`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `js/src/drift.ts`                    |
| Smoke test     | `SMOKE_GREETING`, `smokeWords`, `a2uiMessagesIn`, `a2uiMessagesOf`, `checkPaint`, `checkSignInAnswer`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `js/src/smoke.ts`                    |

Three things worth knowing about the checks:

- `validateSynthesisPayload` checks the payload's shape — every leaf a formula, every match claim relating two refs in two different sources, every sort well formed. Whether a relation actually holds is the caller's.
- `checkAdditiveEvolution` compares the two schema files as the gate reads them, a `$ref` as a string, never resolved; a keyword it doesn't know is ignored, never refused. `checkPaint` groups an answer's messages by surface and validates each against its own catalog, judging each tree as it stands when the answer ends — each component's last copy, only what the root reaches — so an agent streaming its tree as it's written passes when the finished tree does.
- `credentialInputIn` matches the terms as whole words, case-insensitively, against painted components' types, property names, and the literal values their catalog declares as options — `enum` and `const` strings, never descriptions; free text and the data model are not read. `pin` alone is allowed, `pin code` is not.

## Commands

```bash
pnpm --filter @a2uiverse/sdk build | typecheck | test | lint
pnpm --filter @a2uiverse/sdk sync-a2ui-spec    # refresh a2ui-spec/ from the A2UI fork's upstream
```

`a2ui-spec/` is never edited by hand; `a2ui-spec/UPSTREAM.json` records the commit it was copied from.

## Further reading

- [`docs/design/synthesis.md`](../../docs/design/synthesis.md) — the merged view end to end.
- [`docs/design/app-install.md`](../../docs/design/app-install.md) and [`docs/design/marketplace.md`](../../docs/design/marketplace.md) — the catalog and marketplace contracts in use, from Stellify's pack to the client's load, and from publish to install.
- [`docs/design/orchestrator.md`](../../docs/design/orchestrator.md) and [`docs/design/client.md`](../../docs/design/client.md) — how each side uses the contract.
- [`docs/design/authority.md`](../../docs/design/authority.md) — the request for more access and the credential bar in use.
- [`docs/design/trusted-page.md`](../../docs/design/trusted-page.md) — the marketplace contracts and the update states on the Store, the App Library and Publish.
