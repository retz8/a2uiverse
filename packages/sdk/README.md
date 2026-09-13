# @a2uiverse/sdk

The composition contract of A2UIVerse: what the orchestrator and the canvas client agree on to put
several agents' answers onto one screen, and the tools both sides run against it. One normative JSON
contract, one TypeScript package, one prose document the Synthesizer is briefed with.

```
contracts/composition.v0.4.json   normative; the package is tested against it
docs/composition.md               composition rules in the words the model reads
js/                               @a2uiverse/sdk — types, validator, resolution kit, prompt builder
```

Consumers today: the orchestrator and the client. Nothing here reaches a vendor agent; nothing
a2uiverse-specific rides the vendor wire.

## Background

One turn on the canvas, and where this package sits in it:

```
 utterance ──▶ ORCHESTRATOR                                  CLIENT (canvas shell)
              Planner ▸ lays out slots, briefs each agent     paints the layout
              AgentsPool ▸ relays each agent's answer ──stamp──▶ mounts it into its slot   } fragments
              Synthesizer ▸ writes the merged view ──synthesis──▶ evaluates it live         } merged view
```

- **Shell** — the platform's own canvas. It paints a layout of **slots**; each agent's answer fills
  one as a **fragment**, its own A2UI surface in its own catalog.
- **Partition** — one fragment's data model as the client holds it, keyed by its namespaced surface
  id `<appId>:<surfaceId>`. Partitions never see each other.
- **Composition stamp** — metadata on every relayed event: which app painted it, which slot it
  fills. The client routes on nothing else.
- **Synthesize data model** — the merged view as the Synthesizer writes it: a shell-catalog tree, a
  data model whose every leaf is a **formula** over **refs** into partitions, sort declarations, a
  note. Wiring, never values: the client evaluates the formulas and keeps the view live.
- **Ref** — `{surface, pointer}`: a JSON Pointer into one partition, selecting array elements by
  key (`/threads[id="…"]/time`), never by position.

## Quick start

Every snippet below is what the platform runs today.

### Stamp a relayed event, route it on the client

```ts
// orchestrator — on every event relayed from an agent
import {STAMP_KEY, namespaceSurfaceId} from '@a2uiverse/sdk';

event.metadata = {
  ...event.metadata,
  [STAMP_KEY]: {source: 'gmail', slot: 'slot-gmail', role: 'fragment'},
};
const surfaceId = namespaceSurfaceId('gmail', 'inbox'); // "gmail:inbox"

// client — on every event received
import {readStamp} from '@a2uiverse/sdk';

const stamp = readStamp(event.metadata); // CompositionStamp | undefined
if (stamp?.role === 'fragment') mount(event, stamp.slot);
```

### Prompt the Synthesizer

```ts
import {buildSynthesisSystemPrompt, buildSynthesisTurn} from '@a2uiverse/sdk';

const system = buildSynthesisSystemPrompt({
  catalogSchema: shellCatalogJson, // the shell catalog's catalog.json, verbatim
  uiGuidance: synthesisGuidanceMd, // its synthesis-guidance.md
});

const turn = buildSynthesisTurn({
  utterance: 'What needs my attention today?',
  request: plan.shellSlot.request, // the Planner's brief for the merged view
  sources: partitions.map(p => ({
    surface: p.id,
    appId: p.appId,
    displayName: p.name,
    data: p.model,
  })),
});
```

### Validate what the model wrote

```ts
import {extractSynthesisBlock, isDecline, validateSynthesizeDataModel} from '@a2uiverse/sdk';

const block = extractSynthesisBlock(modelText); // the one <synthesize-data-model> block
if (!block.ok) return retryWith([block.error]);

const result = validateSynthesizeDataModel(JSON.parse(block.json));
if (!result.ok) return retryWith(result.errors); // one line per finding, path first
if (isDecline(result.value)) return speak(result.value.reason);

const synthesis = result.value; // {tree, dataModel, sorts, note}
```

The validator covers what the contract can state on its own. Whether the tree is valid against the
shell catalog, and whether each ref resolves in the partitions, are the orchestrator's checks after
it.

### Send the merged view, receive it

```ts
// orchestrator — paint the tree as ordinary A2UI; the wiring rides the metadata
import {SYNTHESIS_KEY} from '@a2uiverse/sdk';

event.metadata = {
  ...stampOf(shell),
  [SYNTHESIS_KEY]: {dataModel: synthesis.dataModel, sorts: synthesis.sorts},
};

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

// after a vendor repaints: the refs that stopped resolving are the change account
const absent = refsOf(payload.dataModel).filter(
  ref => !resolvePointer(models(ref.surface), ref.pointer).found,
);
const again = buildSynthesisTurn({
  utterance,
  request,
  sources,
  previous: synthesis,
  changes: {absent},
});
```

Resolution is validity: a ref is good while its keys resolve, and an in-place reorder breaks
nothing.

## Exports

One entry point, `@a2uiverse/sdk`. Grouped by module.

**Composition stamp** — `js/src/composition.ts`

| Export                                  | What it is                             |
| --------------------------------------- | -------------------------------------- |
| `CompositionStamp`                      | `{source, slot?, role?, generations?}` |
| `STAMP_KEY`                             | `"a2uiverse"`, the metadata key        |
| `COMPOSITION_EXTENSION_URI`             | the A2A extension URI                  |
| `namespaceSurfaceId` · `parseSurfaceId` | `<appId>:<surfaceId>` and back         |
| `readStamp(metadata)`                   | the stamp, or `undefined`              |

**Synthesize data model** — `js/src/synthesis.ts`

| Export                                                                                 | What it is                                     |
| -------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `Synthesis` · `Decline` · `SynthesizeDataModel`                                        | what the model emits                           |
| `SynthesisPayload`                                                                     | `{dataModel, sorts}`, what the client receives |
| `Ref` · `Formula` · `ModelNode` · `DerivedModel` · `SortDeclaration` · `SynthesisTree` | the pieces                                     |
| `SYNTHESIZE_DATA_MODEL_SCHEMA` · `SYNTHESIS_SCHEMA`                                    | the two JSON Schemas, from the contract        |
| `SYNTHESIS_KEY`                                                                        | `"a2uiverseSynthesis"`, the metadata key       |
| `isDecline(document)` · `readSynthesis(metadata)`                                      | branch, and read the payload back              |

**Validator** — `js/src/validate.ts`

| Export                               | What it is                                             |
| ------------------------------------ | ------------------------------------------------------ |
| `validateSynthesizeDataModel(input)` | the model's document → `{ok, value}` or `{ok, errors}` |
| `validateSynthesisPayload(input)`    | the client payload, same shape of answer               |

Schema plus structure: every leaf a formula, every pointer parses, one sort per array, every sort
key a formula with refs in every element, one `root`, unique ids.

**Resolution kit** — `js/src/pointer.ts` · `js/src/walk.ts`

| Export                           | What it is                                           |
| -------------------------------- | ---------------------------------------------------- |
| `parsePointer(pointer)`          | pointer → steps; throws `PointerSyntaxError`         |
| `resolvePointer(root, pointer)`  | `Resolution`: a value, or why not                    |
| `isFormula` · `walkModel(model)` | recognise a leaf; enumerate every leaf with its path |
| `refsOf(model)`                  | every ref, in leaf order                             |

**Prompt builder** — `js/src/prompt/`

| Export                                                         | What it is                                                                  |
| -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `buildSynthesisSystemPrompt(inputs)`                           | role + composition doc + catalog guidance + schemas + examples              |
| `buildSynthesisTurn(inputs)`                                   | the user turn; `previous` + `errors` is a retry, + `changes` a re-synthesis |
| `extractSynthesisBlock(text)`                                  | the JSON inside `<synthesize-data-model>`                                   |
| `SYNTHESIS_TAG` · `DEFAULT_SYNTHESIS_ROLE` · `COMPOSITION_DOC` | the constants                                                               |
| `SynthesisSource` · `ChangeAccount`                            | input types                                                                 |
| `CAMERA_COMPARISON` · `TODAY_TIMELINE` · `SYNTHESIS_EXAMPLES`  | the worked examples                                                         |

`docs/composition.md` is embedded into the package as `COMPOSITION_DOC` by `js/scripts/embed-docs.mjs`
before every build, typecheck and test; the generated file is never edited.

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

- `docs/composition.md` — the composition rules, as the Synthesizer reads them.
- `contracts/composition.v0.4.json` — the normative contract; SPEC §14 is its register entry.
- `_dev/docs/design/synthesis.md` — how the pieces are used across a turn, both processes.
- `_dev/docs/design/orchestrator.md` · `_dev/docs/design/client.md` — each consumer's side.
