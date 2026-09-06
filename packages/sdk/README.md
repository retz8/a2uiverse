# sdk

The A2UIVerse app contract (SPEC §13): the things the orchestrator and the client must agree on
to compose several agents' answers onto one screen, and the tools they must compute identically.
One normative JSON definition, one TypeScript projection of it, and the prose the Synthesizer is
prompted with.

```
contracts/   composition.v0.4.json — normative; every projection is tested against it
js/          @a2uiverse/sdk (npm name) — the TypeScript projection and the tools
docs/        composition.md — the composition rules, in the words the Synthesizer reads
```

Everything here is internal to the platform: the orchestrator and the client are the two
consumers. Nothing a2uiverse-specific rides the vendor wire, so a vendor agent never depends on
this package; a vendor catalog does not either today. The marketplace lists it for the publish
gate to come.

Two words the rest of this page leans on. The **shell** is the platform's own canvas: on a turn it
paints a layout of **slots** first, and each agent's answer then fills one slot as a
**fragment** — its own surface, in its own catalog. A **partition** is one such surface's data
model as the client holds it, keyed by its namespaced surface id; there is one per painted
surface, and partitions never see each other. The **Planner** is the orchestrator's first model
call, which lays out the slots and writes a prose request for each; the **Synthesizer** is its
second.

The story of how these pieces are used in a turn is `_dev/docs/design/synthesis.md`. This page
says what is in the box.

## What is in the box

| Export                    | Module                                   | Who calls it                                                                    |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------- |
| The contract              | `contracts/composition.v0.4.json`        | the contract tests; a future projection                                         |
| The composition stamp     | `js/src/composition.ts`                  | the orchestrator stamps, the client routes                                      |
| The synthesize data model | `js/src/synthesis.ts`                    | the Synthesizer writes it, the orchestrator paints it, the client evaluates it  |
| The validator             | `js/src/validate.ts`                     | the orchestrator on the model's document, the client on the payload             |
| The resolution kit        | `js/src/pointer.ts` · `js/src/walk.ts`   | the orchestrator's partitions and checklist, the client's evaluator and session |
| The prompt builder        | `js/src/prompt/` · `docs/composition.md` | the orchestrator's Synthesizer                                                  |

## The contract

`contracts/composition.v0.4.json` is the A2A metadata contract for cross-agent UI composition
(SPEC §14). It names the extension URI, the two metadata keys, the surface-id namespacing rule,
and two shapes: the **composition stamp** and the **synthesize data model**. It is normative on
its own — a projection in another language is created when a real consumer for it exists — and
the JS projection carries a contract test asserting its constants, field names and schemas
against the file, so drift is a red build rather than a runtime surprise.

In-workspace consumers take the package as `workspace:*`. No registry publishes it yet, so
anything outside the workspace would take it as a git dependency on this repo, the way vendor
catalogs are taken today. The app manifest schema lands with Phase 10.

## The composition stamp

Every event the orchestrator relays to the client carries a stamp on its metadata under the key
`a2uiverse`:

```json
{"source": "gmail", "slot": "slot-gmail", "role": "fragment", "generations": {"gmail:inbox": 1}}
```

`source` says which app painted this; `slot` says which slot of the layout it fills; `role`
says whether the event is the shell's own layout paint or a fragment filling a slot. The client
routes on nothing else: a fragment goes into the slot its stamp names, a shell paint becomes the
layout. Surface ids are namespaced `<appId>:<surfaceId>` so two apps can never collide.
`generations` are per-surface counters the orchestrator bumps when an array in a partition is
replaced with different contents; they are part of the stamp's contract and are written on every
relayed event, and no consumer reads them today.

`composition.ts` exports the `CompositionStamp` type with its field list pinned by the contract
test, `STAMP_KEY`, `namespaceSurfaceId` / `parseSurfaceId`, and `readStamp(metadata)`.

## The synthesize data model

When several agents have answered the same question, the platform can show one merged view over
their answers — a comparison, a timeline, a list with counts. The **synthesize data model** is
how that view is written down. The Synthesizer, a model call in the orchestrator, authors it the
way an agent authors a surface: as a JSON document, in text, validated after.

The one rule it is built on is **wiring, never values**. The document never contains a vendor's
data. It contains _references_ into the partitions — which the client already holds — and
_formulas_ over those references. The client evaluates the formulas and keeps the result live:
when a vendor's data changes, the merged view changes with it, with no further model call.

A synthesis has four parts:

- **`dataModel`** — a JSON shape of the model's own choosing, object or array at every branch,
  and at every leaf a **formula**: `{"op": "min", "args": [ref, ref]}`, one operator over zero
  or more refs. A **ref** is `{"surface": "gmail:inbox", "pointer": "/threads[id=\"…\"]/time"}`:
  a namespaced surface id and a JSON Pointer into that surface's data model. The pointer is RFC
  6901 with one extension: a segment may carry a **predicate** in square brackets that selects
  the element of an array by its fields — `items[id="x100"]` — with the value written as a JSON
  literal, and several tests joined by commas when one field does not identify the element —
  `prs[repository="a/b",number=11]`. Exactly one element must match. An element is never selected
  by its position. The operators are the functions the shell catalog declares (`value`, `min`,
  `max`, `sum`, `avg`, `count`, `argmin`, `argmax`, `source`); the contract does not list them. A
  plain vendor value is the one-argument `value` pass-through. `argmin`, `argmax` and `source`
  pick one of their inputs (the smallest, the largest, the first that resolved) and the client
  turns the pick into the id of the app that input came from — how a merged row names its
  source without copying anything. A formula with no refs is a cell no source contributes to.
- **`tree`** — the components a surface is painted from, in the shell catalog: the same list an
  agent would put in an `updateComponents`, one component with the id `root`, bound to paths in
  `dataModel`. Two kinds of binding: a component binds a _branch_ to list over it — a table's
  rows template over an array of the model — and a component binds a _leaf_ to show its value.
  The **derived-value rule** is that a leaf binds only to the catalog's `DerivedValue`, the
  component that shows a computed value together with how many of its sources contributed, so a
  value computed over some of its sources never reads like one computed over all. Literal props
  — headings, column labels — are presentation and the model's to write.
- **`sorts`** — one declaration per ordered array of the model: its path, the keys a user may
  sort by with their labels, and the initial key and direction. The runtime sorts and keeps the
  user's choice. What the client writes for the merged view is a data model that mirrors
  `dataModel` — evaluated values where the formulas were — plus a `sorts` array at its root
  holding each declaration with the current choice, at `/sorts/N`; the tree's sort control binds
  there. That is why the root key `sorts` is reserved in `dataModel`.
- **`note`** — what was delivered and why it differs from the Planner's brief, when it differs.
  Journaled, never painted.

Or the model **declines**: `{"declined": true, "reason": "…"}` when the sources give nothing to
merge. The reason is spoken to the user in the shell's own words.

`synthesis.ts` carries this as two JSON Schemas and their types. `SYNTHESIZE_DATA_MODEL_SCHEMA`
(`SynthesizeDataModel = Synthesis | Decline`) is what the model emits. `SYNTHESIS_SCHEMA`
(`SynthesisPayload = {dataModel, sorts}`) is what the client receives: the orchestrator paints
the tree as ordinary A2UI, journals the note, and sends the rest on the metadata of the painting
event under `SYNTHESIS_KEY` (`a2uiverseSynthesis`), beside the stamp. `readSynthesis(metadata)`
reads it back; `isDecline(document)` tells the two branches apart. The types `Ref`, `Formula`,
`ModelNode`, `DerivedModel`, `SortDeclaration`, `SynthesisTree` and `TreeComponent` name the
pieces.

## The validator

`validate.ts` checks what the contract can state on its own, so the orchestrator and the client
never disagree about whether a document is well formed. `validateSynthesizeDataModel(input)`
takes the model's parsed document; `validateSynthesisPayload(input)` takes the client-facing
payload. Both answer `{ok: true, value}` or `{ok: false, errors}`, one line per finding with its
path, so the orchestrator can hand the lines straight back to the model.

Beyond the schema (compiled with ajv), the structural rules: every leaf of the model is a formula
and never a scalar; every pointer parses; each sort names an array of the model, once; inside
every element of that array, each option key points at a formula with at least one ref (a key
with no refs could never place its element on the axis, so such an element belongs in an array
of its own); the initial key is one of the options; the tree has exactly one `root` and unique
ids.

What it does _not_ check is anything that needs the shell catalog — whether a component exists,
whether a prop is well typed, the derived-value rule, whether an operator is declared — or the
partitions — whether a ref resolves in the data. Those are the orchestrator's **checklist**, run
after this validator, and its findings go back to the model the same way.

## The resolution kit

Both processes resolve refs, walk the model, and judge whether a ref is good. They do it through
one implementation, never a private copy (phase-5 spec, decision 23).

`pointer.ts` — `parsePointer(pointer)` splits a pointer into steps, a key or a predicate, and
throws `PointerSyntaxError` on malformed input. `resolvePointer(root, pointer)` walks a data
model and answers `{found: true, value}` or `{found: false, reason}`. There are four reasons, all
absent to a formula: `missing` (no such key, or no element matches), `ambiguous` (more than one
element matches), `null` (the value at the end is `null`), and `positional` (a numeric segment
indexed into an array — not a ref, and named so the caller can say which rule was broken rather
than report missing data). **Resolution is validity**: a ref is good while its keys resolve.

`walk.ts` — `isFormula(node)` recognises a leaf by shape. `walkModel(model)` enumerates every
formula leaf with its path and every scalar found where a node should be. `refsOf(model)` lists
every ref in leaf order — what the client subscribes to and the orchestrator re-checks after an
action.

## The prompt builder

The Synthesizer's prompt is assembled here, so the vocabulary the model is taught and the
contract it is validated against live in one package. (The vendor-side agent kit in
`a2uiverse-apps` assembles a vendor agent's prompt the same way; this is the platform's
counterpart.)

`buildSynthesisSystemPrompt({role?, catalogSchema, uiGuidance, examples?})` joins five parts: a
role (`DEFAULT_SYNTHESIS_ROLE` unless overridden), the **composition doc**, the catalog's
guidance doc, the catalog schema verbatim followed by the contract's output schema, and the
worked examples. The builder never knows the shell catalog: the schema and the guidance are
inputs, read by the orchestrator from the catalog package.

The composition doc is `docs/composition.md`: the rules in a2uiverse words — partitions, refs and
predicates, formula leaves, sorts, the tree, the note, decline, re-synthesis, the answer's form —
in the imperative register a model is briefed in. It is authored as markdown and embedded into
`js/src/prompt/composition.doc.generated.ts` by `js/scripts/embed-docs.mjs` before every build,
typecheck and test, because the package runs in the browser too and cannot read files. The
generated file is never edited.

`js/src/prompt/examples.ts` holds two worked examples, each a complete input and output:
`CAMERA_COMPARISON`, the same cameras in two storefronts under two shapes, and `TODAY_TIMELINE`,
a timeline over three unrelated shapes where one source's times cannot join the axis. The
examples teach form; the doc teaches vocabulary and rules. Both are validated by the validator
in this package's tests and against the shell catalog in the orchestrator's.

`buildSynthesisTurn({utterance, request, sources, previous?, errors?, changes?})` renders the
user turn: the question, the Planner's brief, every source's surface id, display name and data,
and what this turn is. The one `previous` slot serves two cases — a **retry**, when `errors` from
the validator or the checklist are handed back with the failed document, and a
**re-synthesis**: after a user acts inside a fragment and the vendor's data changes so that some
ref no longer resolves, the orchestrator calls the model again with the live document and
`changes` (a `ChangeAccount {absent: refs}`, the refs that stopped resolving), asking it to
re-point what broke and keep the view. The model answers inside one `<synthesize-data-model>`
block (`SYNTHESIS_TAG`); `extractSynthesisBlock(text)` reads that boundary and reports a missing,
unclosed, empty or duplicated block as an error for the model.
