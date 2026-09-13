# @a2uiverse/sdk

What several consumers of A2UIVerse must agree on, and nothing any one author owns: the
composition contract that crosses between the orchestrator and the canvas client, and generic
A2UI tools. One normative JSON contract, one pinned copy of the A2UI v0.9.1 spec, one TypeScript
package.

```
contracts/composition.v0.5.json   normative; the package is tested against it
a2ui-spec/                        A2UI v0.9.1 schemas, basic catalog, validator conformance cases — pinned copy
js/                               @a2uiverse/sdk — types, validators, resolution kit, A2UI tools
```

Consumers today: the orchestrator, the client and the shell catalog. The sdk knows no author and
never knows the shell catalog: a catalog and a keep-set reach it as inputs. Nothing here reaches a
vendor agent; nothing a2uiverse-specific rides the vendor wire.

## Background

One turn on the canvas, and where this package sits in it:

```
 utterance ──▶ ORCHESTRATOR                                  CLIENT (canvas shell)
              Planner ▸ lays out slots, briefs each agent     paints the layout
              AgentsPool ▸ relays each agent's answer ──stamp──▶ mounts it into its source's slot } fragments
              Synthesizer ▸ writes the merged view ──payload──▶ evaluates it live                } merged view
```

- **Shell** — the platform's own canvas. It paints a layout of **slots**; each slot holds a
  source, and that source's answer fills it as a **fragment**, its own A2UI surface in its own
  catalog.
- **Partition** — one fragment's data model as the client holds it, keyed by its namespaced surface
  id `<appId>:<surfaceId>`. Partitions never see each other.
- **Composition stamp** — metadata on every relayed event: which app painted it, and whether it is
  the shell or a fragment. The client places a fragment by the stamp's `source`.
- **Synthesis payload** — the merged view's wiring as the client receives it: a data model whose
  every leaf is a **formula** over **refs** into partitions, and sort declarations. Wiring, never
  values: the client evaluates the formulas and keeps the view live. The tree that binds to it is
  painted as ordinary A2UI.
- **Ref** — `{surface, pointer}`: a JSON Pointer into one partition, selecting array elements by
  key (`/threads[id="…"]/time`), never by position.

## Quick start

Every snippet below is what the platform runs today.

### Stamp a relayed event, place it on the client

```ts
// orchestrator — on every event relayed from an agent
import {STAMP_KEY, namespaceSurfaceId} from '@a2uiverse/sdk';

event.metadata = {...event.metadata, [STAMP_KEY]: {source: 'gmail', role: 'fragment'}};
const surfaceId = namespaceSurfaceId('gmail', 'inbox'); // "gmail:inbox"

// client — on every event received
import {readStamp} from '@a2uiverse/sdk';

const stamp = readStamp(event.metadata); // CompositionStamp | undefined
if (stamp?.role === 'fragment') mount(event, stamp.source); // the Slot whose source is 'gmail'
```

### Validate a model-authored A2UI tree against a pruned catalog

```ts
import {createA2uiValidator, formatA2uiFinding, pruneCatalog} from '@a2uiverse/sdk';

const catalog = pruneCatalog(catalogJson, {
  components: ['Column', 'Text', 'Table', 'TableRow', 'DerivedValue'],
  functions: ['value', 'min'],
});
// The same pruned catalog goes into the author's prompt.
const validator = createA2uiValidator({catalog});

const findings = validator.validate([
  {version: 'v0.9', createSurface: {surfaceId: 's', catalogId}},
  {version: 'v0.9', updateComponents: {surfaceId: 's', components}},
]);
if (findings.length > 0) return retryWith(findings.map(formatA2uiFinding));
```

The validator follows upstream's `A2uiValidator`: the messages against the spec's
`server_to_client.json` and `common_types.json` with the given catalog — known components and
props, functions through the catalog's declared ones — and the component graph: duplicate ids, the
root, dangling references, self-references, cycles, depth, orphans, path syntax. A finding is
`{category, message, path?, componentId?}`.

### Send the merged view, receive it

```ts
// orchestrator — paint the tree as ordinary A2UI; the wiring rides the metadata
import {SYNTHESIS_KEY} from '@a2uiverse/sdk';

event.metadata = {...stampOf(shell), [SYNTHESIS_KEY]: {dataModel, sorts}};

// client — read it back and check it before evaluating
import {readSynthesis, validateSynthesisPayload, walkModel} from '@a2uiverse/sdk';

const payload = readSynthesis(event.metadata); // SynthesisPayload | undefined
const checked = validateSynthesisPayload(payload);
if (!checked.ok) report(checked.errors);
for (const leaf of walkModel(checked.value.dataModel).leaves) assertKnownOperator(leaf.formula.op);
```

### Resolve refs, notice what broke

```ts
import {resolvePointer, refsOf} from '@a2uiverse/sdk';

const hit = resolvePointer(partition, '/threads[id="1a06f2"]/time');
// {found: true, value} | {found: false, reason: 'missing' | 'ambiguous' | 'null' | 'positional'}

// after a vendor repaints: the refs that stopped resolving
const absent = refsOf(payload.dataModel).filter(
  ref => !resolvePointer(models(ref.surface), ref.pointer).found,
);
```

Resolution is validity: a ref is good while its keys resolve, and an in-place reorder breaks
nothing.

## Exports

One entry point, `@a2uiverse/sdk`. Grouped by module.

**Composition stamp** — `js/src/composition.ts`

| Export                                  | What it is                      |
| --------------------------------------- | ------------------------------- |
| `CompositionStamp`                      | `{source, role?, generations?}` |
| `STAMP_KEY`                             | `"a2uiverse"`, the metadata key |
| `COMPOSITION_EXTENSION_URI`             | the A2A extension URI           |
| `namespaceSurfaceId` · `parseSurfaceId` | `<appId>:<surfaceId>` and back  |
| `readStamp(metadata)`                   | the stamp, or `undefined`       |

**Synthesis payload** — `js/src/synthesis.ts` · `js/src/validate.ts`

| Export                                                               | What it is                                            |
| -------------------------------------------------------------------- | ----------------------------------------------------- |
| `SynthesisPayload`                                                   | `{dataModel, sorts}`, what the client receives        |
| `Ref` · `Formula` · `ModelNode` · `DerivedModel` · `SortDeclaration` | the pieces                                            |
| `SYNTHESIS_SCHEMA` · `SYNTHESIS_DEFS`                                | the payload's JSON Schema, and its shared definitions |
| `SYNTHESIS_KEY` · `readSynthesis(metadata)`                          | `"a2uiverseSynthesis"`, and read the payload back     |
| `validateSynthesisPayload(input)`                                    | `{ok, value}` or `{ok, errors}`, one line per finding |
| `schemaErrors(validate, input)`                                      | an ajv validator's errors as those lines              |

Schema plus structure: every leaf a formula, every pointer parses, one sort per array, every sort
key a formula with refs in every element, the initial key an option.

**Resolution kit** — `js/src/pointer.ts` · `js/src/walk.ts`

| Export                           | What it is                                           |
| -------------------------------- | ---------------------------------------------------- |
| `parsePointer(pointer)`          | pointer → steps; throws `PointerSyntaxError`         |
| `resolvePointer(root, pointer)`  | `Resolution`: a value, or why not                    |
| `isFormula` · `walkModel(model)` | recognise a leaf; enumerate every leaf with its path |
| `refsOf(model)`                  | every ref, in leaf order                             |

**A2UI tools** — `js/src/a2ui/`

| Export                                                            | What it is                                                           |
| ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| `createA2uiValidator({catalog})`                                  | an A2UI v0.9.1 validator over a catalog; `validate(payload)`         |
| `formatA2uiFinding(finding)`                                      | a finding as one line, path or component first                       |
| `pruneCatalog(catalog, keepSet)`                                  | a `catalog.json` narrowed to a `KeepSet` of components and functions |
| `A2uiCatalogSchema` · `A2uiFinding` · `A2uiComponent` · `KeepSet` | the shapes                                                           |
| `A2UI_SPEC_COMMIT`                                                | the upstream commit the pinned spec was copied from                  |

## The pinned spec

`a2ui-spec/` holds the A2UI v0.9.1 `server_to_client.json` and `common_types.json`, the v0.9.1
basic catalog, and upstream's validator conformance cases (`conformance/core/validator.yaml` with
the schemas it names), copied from `upstream/main` of the sibling A2UI fork. `a2ui-spec/UPSTREAM.json`
records the commit. The copy is never hand-edited; to refresh it, sync the spec and run:

```
pnpm --filter @a2uiverse/sdk sync-a2ui-spec
```

The v0.9 conformance cases run in the sdk's tests; the v0.8 ones are skipped.

## Installing

Inside this monorepo, every consumer takes the package from the workspace:

```json
"@a2uiverse/sdk": "workspace:*"
```

Outside it, no registry publishes the package yet. Take it the way vendor catalogs are taken today,
as a git dependency on this repo pinned to a commit in the lockfile:

```json
"@a2uiverse/sdk": "github:retz8/a2uiverse#path:packages/sdk/js"
```

Later it ships to npm under the same name, its version tracking the contract's. The package is
ESM, runs in Node and the browser, and depends on `ajv` alone.

## Further reading

- `contracts/composition.v0.5.json` — the normative contract; SPEC §14 is its register entry.
- `_dev/docs/design/synthesis.md` — how the pieces are used across a turn, both processes.
- `_dev/docs/design/orchestrator.md` · `_dev/docs/design/client.md` — each consumer's side.
