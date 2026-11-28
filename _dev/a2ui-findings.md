# A2UI upstream findings

Issues found in the A2UI specification and reference implementations, recorded for
upstream contribution (`a2ui-project/a2ui`). Each finding is self-contained and
reproducible against upstream artifacts only.

---

## 5. Dynamic prop types other than `DynamicBoolean` are unenforced claims (web_core generic binder / DataContext)

**Component:** `@a2ui/web_core` 0.16.1, `src/resolution/generic-binder.d.ts` (`ResolveA2uiProp`,
line 152), `src/resolution/generic-binder.js` (`bindDynamicValue`, line 903) and
`src/resolution/data-context.js` (`DataContext.resolveDynamicValue`, line 490).

**Severity:** typing versus runtime mismatch — components hand-roll defensive coercion against
their own declared prop types.

### Issue

`ResolveA2uiProp` types a dynamic prop by its literal branches: a `DynamicString` prop resolves
to `string`, `DynamicStringList` to `string[]`, `DynamicNumber` to `number`. Nothing enforces
those types at runtime. A `DataBinding` resolves to whatever sits at the path, and a
`FunctionCall` to whatever it returns — `FunctionCallSchema.returnType` explicitly admits
`'object'` and `'any'`. `DataContext.resolveDynamicValue<V>(v): V` casts to a caller-named type
without checking it.

The specification already defines the coercion that would make the declared types true.
`blueprints/modules/a2ui_core.blueprint.md` (Type Coercion Standards) applies it to component
properties and function arguments typed `DynamicBoolean`, `DynamicString` or `DynamicNumber`:
`Any → String`, `null | undefined → String` = `""`, `null | undefined → Number` = `0`, numeric
`String → Number`, and the boolean rules. Since 0.16.0 the binder applies the boolean rules and no
others: the scraper marks a `DynamicBoolean` prop `{type: 'DYNAMIC', isBoolean: true}`, and
`bindDynamicValue` passes its first value and every update through `coerceDynamicBoolean`
(`src/catalog/validation_result_coercion.js`, line 44). A `DynamicString`, `DynamicNumber` or
`DynamicStringList` prop is handed on as it resolved.

Components compensate one at a time, with branches TypeScript considers unreachable:

| site (`@a2ui/web_core` 0.16.1, `src/universal/basic_catalog/components/`) | declared type | written guard |
| --- | --- | --- |
| `Text.js:35` | `string` | `typeof props.text === 'string' ? props.text : String(props.text ?? '')` |
| `ChoicePicker.js:37-41` | `string[]` | `Array.isArray(rawVal) ? rawVal : typeof rawVal === 'string' ? [rawVal] : []` |
| `DateTimeInput.js:69` | `string` | `typeof props.min === 'string' ? props.min : props.min ? String(props.min) : ''` |

### Reproduction

A component declaring `s: DynamicStringSchema`, `n: DynamicNumberSchema`, `b: DynamicBooleanSchema`
and `l: DynamicStringListSchema`, over the data model `{num: 42, str: 'abc'}`, `s` bound to `/num`
and the other three to `/str`: the binder's props hold `s` as the number `42`, `n` and `l` as the
string `'abc'`, and `b` as `false`.

### Fix

Apply the specification's coercion table at the binder boundary for the other kinds, as it is
applied for the boolean. Three changes in `@a2ui/web_core`:

1. **Scraper records the kind.** `getFieldBehavior`'s `{type: 'DYNAMIC', isBoolean?: true}` becomes
   `{type: 'DYNAMIC', kind: 'string' | 'number' | 'boolean' | 'string-list' | 'value'}`, read from
   the `REF:` description marker (`#/$defs/DynamicString` → `string`, etc.) as
   `isDynamicBooleanSchema` already reads `DynamicBoolean`'s.
2. **Coercions beside `coerceDynamicBoolean`** implementing the rest of the blueprint table, aligned
   with the protocol's §"Type conversion" and the existing `coerceToString`
   (`src/common/basic_functions.js`, line 73):
   - `string`: null/undefined → `""`; number/boolean → `String()`; object/array → JSON
     stringify
   - `number`: number as-is; numeric string → parsed; anything else → `0`
   - `string-list`: non-array → `[]`; elements coerced by the string rules
   - `value`: pass through unchanged
3. **Binder applies it.** `bindDynamicValue` picks the coercion by kind, where it now picks
   `coerceDynamicBoolean` by `isBoolean`, for both the initial resolved value and every
   subscription update. `DataContext.resolveDynamicValue` / `resolveSignal` stay unchanged: they
   do not know the declared target kind, and their other callers (action contexts, function args)
   have `value` semantics.

The declared types then hold, and the per-component guards above can be deleted.

`DynamicValue` has no coercion target: its literal branches are the whole of the spec's "any
type", so a bound `DynamicValue` passes through the binder unchanged and stays untypeable. No
first-party component declares one — it appears in the v0.9 `ActionSchema`'s `context`
(`src/v0_9/schema/common-types.js`, line 108) and as `formatDate`'s `value` argument in both basic
catalogs — but it is part of the public schema surface (exported from `src/types/common-types.js`,
line 131, and listed in `CommonSchemas`, which `src/catalog/schema_loader.js` resolves a `REF:` name
against at line 68), so consumer catalogs can declare `DynamicValue` props. The pass-through
behavior is part of the fix's contract, not an omission.

### Prior art

This finding is the same as issue
[#846](https://github.com/a2ui-project/a2ui/issues/846) (Strict Type Coercion in DataContext),
open and triaged P2. The unreachable branches above are evidence it does not currently cite. PR
[#3850](https://github.com/a2ui-project/a2ui/pull/3850) ("feat(core): unify DynamicBoolean coercion
across core SDKs", merged 2026-11-03) made the boolean coercion in the TypeScript, Python, Dart and
Swift cores, and links no issue.

---

## 12. The v0.9.1 capability schemas key their object `v0.9`; the v0.9.1 guide and web_core write `v0.9.1` (spec, Python agent SDK)

**Component:** `specification/v0_9_1/json/server_capabilities.json` and
`specification/v0_9_1/json/client_capabilities.json` (the root's one required key, `v0.9`);
`specification/v0_9_1/docs/a2ui_extension_specification.md`, lines 44 and 129 (`7a776e7a4`, where
`a2ui-agent-sdk` 0.12.1 is tagged); `a2ui-agent-sdk` 0.12.1's `resolve_catalogs`
(`a2ui/utils/catalog_resolver.py`, `_CAPABILITIES_ENTRIES`, lines 40–43); `@a2ui/web_core` 0.16.1's
`MessageProcessor.getRendererCapabilities` (`src/processing/message-processor.js`, line 153).

**Severity:** interoperability — a web_core renderer that advertises v0.9.1 and a Python agent
serving a v0.9.1 catalog cannot negotiate: the agent raises on the renderer's capabilities. The
v0.9.1 guide's own `a2uiClientCapabilities` example fails its schema.

**Reported:** `a2ui-project/a2ui` issue
[#3134](https://github.com/a2ui-project/a2ui/issues/3134), PR
[#3135](https://github.com/a2ui-project/a2ui/pull/3135).

**Resolved:** #3135 merged 2026-11-25.

### Issue

The v0.9.1 guide names the capabilities' version object `v0.9.1` twice: under the example agent card,
"The `params` object corresponds to the `v0.9.1` object in the `server_capabilities.json` schema", and
in its `a2uiClientCapabilities` example:

```json
{"a2uiClientCapabilities": {"v0.9.1": {"supportedCatalogIds": ["…"]}}}
```

Both v0.9.1 capability schemas have one required key, `v0.9`, and no `v0.9.1` — the same root as the
v0.9 files. Elsewhere a version's capabilities sit under its own version string: `v0.9` in v0.9,
`v1.0` in v1.0. The v0.9.1 message schemas accept both versions in `version`
(`"enum": ["v0.9", "v0.9.1"]`).

The implementations split along the same line:

- **`v0.9.1`:** web_core's `getRendererCapabilities` writes each requested version under its own
  string, so `versions: ['v0.9.1']` gives `{"v0.9.1": {...}}`. Python core's
  `MessageProcessor.get_renderer_capabilities` does the same, and Dart core's
  `A2uiRendererCapabilities` reads and writes a `v0.9.1` key as its own entry.
- **`v0.9`:** the Python agent SDK's `resolve_catalogs` looks v0.9.1 up under `v0.9` —
  `_CAPABILITIES_ENTRIES` maps `ProtocolVersion.V0_9_1` to `("v0.9", v0_9.V09Capabilities)`,
  commented "v0.9.1 reuses the v0.9 key" — and raises when that entry is missing.

### Reproduction

```ts
const processor = new MessageProcessor([new Catalog('https://example.com/catalogs/my_catalog.json', 'v0.9.1', [])]);
processor.getRendererCapabilities({versions: ['v0.9.1']});
// {"v0.9.1": {"supportedCatalogIds": ["https://example.com/catalogs/my_catalog.json"]}}
```

```python
catalog = Catalog.from_json(catalog_doc, protocol_version="0.9.1",
                            catalog_id="https://example.com/catalogs/my_catalog.json")
resolve_catalogs([CatalogConfig(catalog=catalog)], caps_from_web_core)
# A2uiValidationError: The renderer capabilities have no 'v0.9' entry, which the registered catalogs read.
resolve_catalogs([CatalogConfig(catalog=catalog)], {"v0.9": caps_from_web_core["v0.9.1"]})
# resolves the catalog
```

Validating the guide's `a2uiClientCapabilities` example against the v0.9.1 `client_capabilities.json`
fails with `'v0.9' is a required property`.

### Fix

The v0.9.1 capabilities keyed `v0.9.1`, in the spec and the Python agent SDK, as #3135 landed:

- both v0.9.1 capability schemas require a `v0.9.1` key in place of `v0.9`. In
  `client_capabilities.json` the entry's shape is `$defs/Capabilities`, which the required `v0.9.1`
  entry and an optional `v0.9` entry beside it both reference, so a client that supports both
  versions sends both and each is checked. Swift core embeds the v0.9.1 `client_capabilities.json`
  as `V09ClientCapabilitiesSchema`, which serves v0.9 and v0.9.1, and picks up the change when it is
  built;
- the v0.9.1 evolution guide lists the key among the changes from v0.9, in its own section;
- in `resolve_catalogs`, v0.9 and v0.9.1 catalogs read the `v0.9.1` entry, and the `v0.9` entry when
  there is no `v0.9.1` entry or it activates no registered catalog. `BasicCatalog("v0.9.1")` returns
  the v0.9 basic catalog, which reports v0.9, so the v0.9 row reads `v0.9.1` too; renaming only the
  v0.9.1 row would leave an agent on the basic catalog reading `v0.9`;
- an inline catalog takes the protocol version of the entry that declares it, not the version of
  the first registered catalog;
- the Direct JSON format's `check_catalogs` and `schema_to_prompt` compare catalogs' release lines
  (`release_line` in `inference_formats/_shared`), on which v0.9 and v0.9.1 are one, so a v0.9.1
  inline catalog beside the v0.9 basic catalog is accepted.

### Prior art

No issue or PR reports this. The Python resolver's mapping came in PR
[#2966](https://github.com/a2ui-project/a2ui/pull/2966) ("refactor(python): remove A2uiCatalog in favor
of core Catalog", merged 2026-10-07), with no review discussion of the key. Closed issue
[#1749](https://github.com/a2ui-project/a2ui/issues/1749) ("a2ui/react: v0.9.1 payload compatibility
gap in v0_9 runtime"), fixed by PR [#1993](https://github.com/a2ui-project/a2ui/pull/1993), made the
renderers accept v0.9.1 messages; capabilities were not part of it. Open issue
[#3097](https://github.com/a2ui-project/a2ui/issues/3097) ("Unify v1.0 protocol version on bare
'1.0'") renames the v1.0 capabilities key from `v1.0` to `1.0`.

---

## 18. Every React component renders inside an element of its own (@a2ui/react)

**Component:** `@a2ui/react` 0.16.1, `chunk-LQ2Y5H7D.js`: each component is hosted in a custom
element named `a2ui-react-<name>` (line 178), styled `display: contents` (line 122), created with
no class (line 434) and no way to render a component without it.

**Severity:** invalid markup and broken style rules — HTML that ties a parent to its child cannot be
written, and a stylesheet's rules between a parent and its children, or between siblings, miss.

### Issue

HTML that requires a child directly inside its parent cannot hold the host element between them. A
row component's `<tr>` lands inside its host under `<tbody>`, which React reports as invalid
nesting; a list item's `<li>` lands inside its host under `<ul>` the same way.

With each child alone in its host, a parent's rules that select its children (`>`) or relate
siblings (`+`, `:first-child`, `:last-child`, `:nth-child`) miss or always hold. In Primer
(`@primer/react` 38.36.0): ActionList's dividers, its item and group spacing, FormControl's and the
checkbox and radio groups' spacing, Timeline's line, SegmentedControl's dividers and AvatarStack's
overlap.

The same release builds each child as a node of its own. A component's render function gets its
child list as the child nodes' own ids (`a2ui-n15`), which name no component, so a parent that
routes a child by its type reads the id from the child list its model holds. And a parent builds
only its own children: building a child's child, or a component that a reference names but the
schema does not mark as a component id, such as an icon two levels down in an array, draws nothing
and reports an unresolved child reference on the surface. web_core resolves a marked field, a child
list, an array of ids, and a marked field one level into an array of objects. A property declared
as a union of a component id and another string is built as a child whatever was written (finding
36).

### Reproduction

A catalog `Table` whose `TableRow` child renders `<tr>`: the rendered DOM puts the row's host
element between `<tbody>` and `<tr>`, and React reports the nesting as invalid. A Primer
`ActionList` with `showDividers` draws no divider between its items: Primer's rule relates sibling
items, and each item sits alone in its host.

### Fix

Let a component render without a host element where the DOM it draws needs to sit directly in its
parent's, or carry the binding a host element provides on the component's own root.

A2UIVerse's shell catalog draws each `TableRow` child's `<tr>` itself and renders only the cells
through the renderer. Its GitHub catalog restates Primer's rules between a parent and its children
in a scoped sheet; its Gmail, Calendar and Linear catalogs' lists draw each `<li>` around the child
they build; Primer's lists keep an item's `<li>` inside its host, inside the list's `<ul>`.

---

## 20. A catalog written in zod over web_core's common types warns in the console at each prop built on them, when its document is written (web_core schema serializer)

**Component:** `@a2ui/web_core` 0.16.1, `src/catalog/schema_serializer.js`: `zodToUnbundledJson`
(line 227) converts a component schema with `zod-to-json-schema` under `$refStrategy: 'none'` (line
233), its only `override` the exclusive-union one (line 234), and only then rewrites a `REF:`-marked
schema to its `$ref` (`rewriteRefMarkers`, called at line 238); `src/catalog/types.js`:
`Catalog.validationSchema` (line 92) and `Catalog.toJson` (line 127) each write it once per catalog
and keep the result.

**Severity:** console noise — a warning for every prop built on a dynamic type, about a part of the
schema the document never holds, the first time a catalog's document or its validation schema is
written.

### Issue

The dynamic types are recursive: a `FunctionCall`'s `args` hold `DynamicValue`s, which hold
`FunctionCall`s. Converting a component schema whose prop is one of them, `zod-to-json-schema`
walks into that recursion and, under `$refStrategy: 'none'`, prints `Recursive reference detected
at …! Defaulting to any`. The serializer then replaces the whole prop with its `$ref` into the
common types, so the document comes out right and the warning is about a subtree it drops.

The basic catalog does not warn there: its generated components are wrapped in `spec()` and shaped
by rule (`src/catalog/spec_shape.js`). A component written in plain zod — every catalog a host or a
vendor writes — goes through `zodToUnbundledJson`. Building a `MessageProcessor` writes no catalog's
document: 0.15.0 removed `linkCatalogs` with cross-catalog `$ref` resolution (PR
[#3575](https://github.com/a2ui-project/a2ui/pull/3575)), and the processor uses its catalogs as they
are. The warnings come when something reads `validationSchema` or `toJson()`: one for each such prop
at each, once per catalog.

`MessageProcessor.getClientCapabilities({includeInlineCatalogs: true})` converts every catalog's
components the same way for an inline catalog below v1.0 (`generateV09InlineCatalog`,
`src/processing/message-processor.js`, line 216), and keeps nothing: a processor holding the basic
catalog alone logs 88 of these warnings at each call.

### Reproduction

```ts
const Label = {name: 'Label', schema: z.object({text: DynamicStringSchema})};
const labels = new Catalog('https://example.com/labels/catalog.json', basicCatalog.protocolVersion, [Label]);
new MessageProcessor([basicCatalog, labels]);
// no warning
labels.toJson().components.Label.properties.text;
// console.warn: Recursive reference detected at
//   #/properties/text/anyOf/2/properties/args/additionalProperties/anyOf/0/anyOf/5! Defaulting to any
// {"$ref": "common_types.json#/$defs/DynamicString", "description": "Represents a string"}
```

### Fix

Stop the conversion at a `REF:`-marked schema instead of rewriting after it: hand
`zod-to-json-schema` an `override` that returns the `$ref` for a schema whose description carries
the marker and defers to `exclusiveUnionOverride` otherwise, so the recursion behind it is never
walked. `generateV09InlineCatalog`'s conversions take the same override. The document is unchanged.

A2UIVerse's client holds the shell catalog and the seven apps' catalogs, all written in zod; neither
repo reads `toJson()`, `validationSchema` or inline capabilities, so on 0.16.1 the client's
processors write none of their documents. Nothing is done locally.

### Prior art

No issue or PR reports it. Issue [#3155](https://github.com/a2ui-project/a2ui/issues/3155) ("Direct
JSON prompt: list common types once instead of bundling them into every catalog schema", closed
2026-10-26) is about the prompt, not the serializer.

---

## 21. Parts of the basic catalog's look no token reaches (web_core basic catalog)

**Component:** `@a2ui/web_core` 0.16.1, `src/universal/basic_catalog/components/Button.js` (its tokens,
lines 54–81; its styles, lines 82–124) and `Text.js` (the caption's `<em>`, line 74; its tokens,
lines 94–117; its styles, lines 118–175).

**Severity:** theming gap — a catalog themed on the basic catalog through its tokens cannot set four
parts of its look, and reaches them only through rules on the components' own classes.

### Issue

- **A button's text.** `.a2ui-button` sets a private `--_a2ui-text-color` to
  `--a2ui-color-on-secondary`, and the `Text` inside reads it; only the primary variant sets it
  again. The borderless variant sets `color` to `--a2ui-color-primary`, which reaches the button but
  not the `Text` it holds, so a borderless button's label draws in `--a2ui-color-on-secondary`.
  `--a2ui-color-secondary` reaches the default variant only through its hover,
  `--a2ui-color-secondary-hover`, which the basic catalog's default styles derive from it
  (`src/universal/basic_catalog/styles/default.js`, lines 58–61); its background reads
  `--a2ui-button-background`, then `--a2ui-color-surface`.
- **A button's font.** `.a2ui-button` sets its weight alone, so the `<button>` keeps the browser's
  own font.
- **A caption's style and size.** The `caption` variant sets its text inside `<em>`, italic by the
  browser, and sizes it from `--a2ui-font-size-xs`, the extra-small size CheckBox, ChoicePicker,
  TextField, DateTimeInput and Slider share. Only its colour has a token,
  `--a2ui-text-caption-color`.
- **A heading's space.** Text sets the margin of every heading, paragraph, list and block it draws
  to `var(--_a2ui-text-margin, 0)`, a private variable; no token gives a heading space above or
  below it.

### Reproduction

A basic catalog surface holding an `h3` Text, a `caption` Text and a default, a borderless and a
primary Button, each with a Text inside, rendered with `@a2ui/react` 0.16.1 in a page set in 18px
Georgia, with `--a2ui-color-primary: red`, `--a2ui-color-on-primary: green` and
`--a2ui-color-on-secondary: blue`. Computed in Chromium:

| element | computed |
| --- | --- |
| the default button's Text | blue, Arial 13.33px |
| the borderless button | red; its Text blue, Arial 13.33px |
| the primary button's Text | green, Arial 13.33px |
| the `h3` | margins 0 |
| the caption | italic, 11.1px (`--a2ui-font-size-xs`) |

### Fix

Public tokens for each, defaulting to today's look: the borderless variant setting the text colour
its `Text` reads, as the primary does; a button font family and size; a caption font style and
size of its own; a heading margin in place of the private variable.

A2UIVerse's themed catalogs — Shop A, Shop B and the scaffolder's basic template — put their accent
on `--a2ui-color-on-secondary` and a tint of it on `--a2ui-color-secondary` beside
`--a2ui-color-primary`, and carry the caption at its row's size and upright, and the heading's
space, in a scoped sheet under the Provider's class; their buttons keep the browser's font.

### Prior art

Closed issue [#975](https://github.com/a2ui-project/a2ui/issues/975) ("Figure out how to let
application developers customize provided basic catalog implementation") ended in the CSS variables
the components document. No issue or PR names these four.

---

## 22. The comment on `A2uiStateError` names missing surfaces, which the processor throws as integrity failures (web_core)

**Component:** `@a2ui/web_core` 0.16.1, `src/errors.js`: `A2uiStateError` (line 105), its comment "Error thrown
for structural issues in the UI tree (missing surfaces, duplicate components)", and `A2uiIntegrityError`
(line 137), a subclass of `A2uiValidationError`; `src/processing/message-processor.js`: a surface created
twice (line 843) and an operation naming no surface (lines 1275 and 1295), each thrown as
`A2uiIntegrityError`.

**Severity:** documentation — a host reading the error classes catches the wrong one for a missing or a
doubled surface.

### Issue

The `MessageProcessor` throws `A2uiIntegrityError` for a `createSurface` naming a surface that exists, for
an `updateComponents` or `updateDataModel` naming one that doesn't, and for a component id given twice in
one `updateComponents`. Upstream's conformance suite pins that choice:
`conformance/core/message_processor_v0_9.yaml` expects `IntegrityError` for "Surface s1 already exists" and
for "Surface not found for message". `A2uiStateError` is thrown for none of them: its throw sites are a
component added twice to a surface's model (`state/surface-components-model.js`, lines 114 and 136), a
component context for a component the model doesn't hold (`resolution/component-context.js`, line 36) and a
resolver handed another catalog (`resolution/node-resolver.js`, line 64). A host that catches `A2uiStateError` for a
missing surface, as its comment says, never sees one; a host that catches `A2uiValidationError` gets the
three as validation failures.

### Reproduction

```ts
const processor = new MessageProcessor([basicCatalog]);
const create = {version: 'v0.9', createSurface: {surfaceId: 's', catalogId: basicCatalog.id}};
processor.processMessages([create, create]);
// A2uiIntegrityError: Surface s already exists.
// instanceof A2uiValidationError: true; instanceof A2uiStateError: false
```

An `updateComponents` naming no surface throws `A2uiIntegrityError: Surface not found for message: nope`,
and one giving `root` twice `A2uiIntegrityError: Duplicate component ID: 'root'`, alike.

### Fix

Bring the comment in line with what throws the class: a component the surface's model already holds, a
component it doesn't, a resolver handed another catalog. The missing and the doubled surface move to the
comment on `A2uiIntegrityError`, beside the tree checks it names.

A2UIVerse's client tells a streamed partial's validation failures from these three by the integrity
subclass, and reports them as they arrive.

### Prior art

Closed issue [#1223](https://github.com/a2ui-project/a2ui/issues/1223) ("[web_core,v0.9]
processCreateSurfaceMessage crashes on duplicate surfaceId") quotes `A2uiStateError: Surface <id> already
exists`. PR [#2884](https://github.com/a2ui-project/a2ui/pull/2884) ("feat(conformance): align message
processor, validator, and catalog parity across SDKs", merged 2026-10-01) moved the surface failures to
`A2uiIntegrityError` and left the comment. No issue or PR names the comment.

---

## 23. The restaurant finder reads every streamed reply twice (samples/agent/adk)

**Component:** `samples/agent/adk/restaurant_finder/agent.py` at `upstream/main` `825beac2`: `token_stream`
inside `RestaurantAgent.stream` (line 286), which feeds `stream_response_to_parts`
(`python/a2ui_a2a/src/a2ui/a2a/parts.py`, line 174). The same reader is in
`samples/agent/adk/custom-components-example/agent.py` (line 506). Run on `google-adk` 2.3.0 and
`gemini-3.6-flash`, the sample's default model.

**Severity:** behaviour — every first answer fails the sample's own stream check and is generated again,
and every answer is painted twice.

### Issue

Under `StreamingMode.SSE`, ADK's runner yields each chunk of a model reply as an event marked `partial`,
then the whole reply once more as one event that is not: `google/adk/utils/streaming_utils.py` marks every
chunk `partial = True` (line 308), and `StreamingResponseAggregator.close()` returns the aggregated
response (line 348). `token_stream` yields the text of every event that has content, partial or not, so the
response stream reads each reply twice.

A first answer creates its surface, and the second reading creates it again: the stream raises
`Surface default already exists`, the sample logs `A2UI stream failed` and runs the whole request again.
The retry's reply opens with `deleteSurface`, so its second reading passes. A first question therefore pays
a second model run, and the client receives the first attempt's surface, its deletion, and the retry's
paint twice. A later answer that opens with `deleteSurface` passes and is painted twice.

### Reproduction

Run the sample as its README says, then:

```bash
curl -N http://localhost:10002 -H 'Content-Type: application/json' \
  -H 'X-A2A-Extensions: https://a2ui.org/a2a-extension/a2ui/v0.9' \
  -d '{"jsonrpc":"2.0","id":1,"method":"message/stream","params":{"message":{"kind":"message","role":"user","messageId":"1","parts":[{"kind":"text","text":"Find me an Italian restaurant in New York"}]}}}'
```

The log reads `A2UI stream failed: Surface default already exists. (Attempt 1)`, then `Attempt 2/2`. The
stream carries the first attempt's `createSurface` with its components and data; then the retry's text,
`deleteSurface`, `createSurface`, components and data, chunk by chunk; then the same text, `deleteSurface`,
`createSurface`, components and data again, in one burst before the last status. On 2026-10-31 six of six
first questions failed their first attempt this way, and each of three button presses painted its answer
twice.

### Fix

While streaming, read only the partial events: under `StreamingMode.SSE`, `token_stream` skips an event
whose `partial` is false, since the reply it carries was already read chunk by chunk; under
`StreamingMode.NONE`, where no event is partial, it reads every event. The same change applies to
`custom-components-example`.

On A2UIVerse each `createSurface` is a paint, so each of the sample's answers is two paints on its way back.

### Prior art

The reader came with PR [#918](https://github.com/a2ui-project/a2ui/pull/918) ("Streaming restaurant
sample"). No issue or pull request on `a2ui-project/a2ui` names the doubled reading or the
`already exists` retry, searched on 2026-10-31.

## 24. `@a2ui/react` hands a universal element its `context` after it is connected, and `@a2ui/angular`'s element wrapper throws at connect without it (@a2ui/react, @a2ui/angular)

**Component:** `@a2ui/react` 0.14.0, `chunk-QAAGXJWH.js` line 214
(`React.createElement(implementation.tagName, {ref: setRef}, children)`) and line 180
(`element.context = node.context`, inside the ref callback); upstream `main` (`825beac28`)
`typescript/renderers/react/src/web_component_node.tsx:83-107`. `@a2ui/angular` 0.13.0,
`fesm2022/a2ui-angular.mjs` lines 325-336 (`AngularWcHost.connectedCallback`); upstream `main`
`typescript/renderers/angular/src/catalog/angular_wc_host.ts:87-105`.

**Severity:** interoperability — an Angular component wrapped as a universal element by
`@a2ui/angular`'s `toWebComponent` cannot be rendered by `@a2ui/react`: the element throws at
connect, the error reaches the window, React carries on, and the element stays empty.

### Issue

`WebComponentNode` creates a universal element with `React.createElement(tagName, {ref})` and
assigns `context` and `node` in the ref callback. React runs the ref callback after it has inserted
the element, so `connectedCallback` runs with `context` unset. Measured with React 19.2.8 under
jsdom 29.1.1, an element logging each step:

```
connectedCallback (context UNSET)
ref callback
context set (isConnected=true)
```

`A2uiLitElement` and the plain element of the universal guide
(`docs/public/guides/authoring-universal-components.md`) re-bind whenever `context` is set, so the
order costs them nothing. `AngularWcHost` does not: `connectedCallback` throws
`Cannot instantiate Web Component '<tag>': 'context' must be set before the element is connected.`
when `_context` is unset, and its `context` and `node` setters only call `updateContext()`, which
returns while `componentRef` is unset (`angular_wc_host.ts:167-195`) — nothing mounts later. Its
own doc states the order it needs ("`context` must be set before the element is attached to the
document", `angular_wc_host.ts:63-65`), and its own host keeps it — `ComponentHostComponent.
setupWebComponent` sets `injector`, `node` and `context` before `appendChild`
(`core/component-host.component.ts:357-361`) — so inside the Angular renderer the throw never
fires. Any host that inserts first, React among them, hits it.

### Reproduction

An `A2uiSurface` from `@a2ui/react` over a catalog whose entries come from `@a2ui/angular`'s
`toWebComponent` or `createComponentImplementation`, with an injector on the element: the window
reports `'context' must be set before the element is connected`, and the element renders nothing.
The order alone, without Angular: define
`class XHost extends HTMLElement { connectedCallback() { log(this.context ? 'set' : 'unset'); } set context(c) { this._context = c; } }`,
render `React.createElement('x-host', {ref: el => { if (el) el.context = {}; }})` through
`react-dom/client`'s `createRoot` under jsdom — `unset` is logged.

### Fix

Either side. In `@a2ui/react`, pass the two as props at create —
`React.createElement(implementation.tagName, {ref: setRef, context: node.context, node}, children)`
— React 19 assigns a non-attribute prop on a custom element as a property before insertion
(measured: `context set (isConnected=false)`, then `connectedCallback (context SET)`); the tag is
defined before the create, so the element is upgraded when the property lands. Or in
`@a2ui/angular`, `connectedCallback` returns instead of throwing when `context` is unset, and the
`context` and `node` setters mount when `isConnected && !componentRef`.

## 25. `@a2ui/angular` swaps web_core's signal implementation for the whole module, so no other renderer can share that web_core (@a2ui/angular, web_core)

**Component:** `@a2ui/angular` 0.13.0, `fesm2022/a2ui-angular.mjs` line 72
(`setSignalImplementation(angularSignalImpl)` in `initializeAngularReactivity`), called at line
111 (`ComponentBinder`'s constructor) and line 510 (`A2uiRendererService`'s constructor); upstream
`main` `typescript/renderers/angular/src/core/reactivity.ts:48-91`,
`core/component-binder.service.ts:58-59`, `core/a2ui-renderer.service.ts:117`, and `provideA2Ui`
registering it as an environment initializer (`:94-96`). `@a2ui/web_core` 0.14.0,
`src/reactivity/signals.ts:52-60` (upstream `main`): the implementation is module-level state —
`let signalImpl`, `let getValueImpl`, … — read by every `signal`, `computed`, `effect`,
`getValue`, `peekValue` and `setValue` in the module.

**Severity:** a page rendering through `@a2ui/react` (or `@a2ui/lit`) that also loads
`@a2ui/angular` over the same web_core stops working at the first Angular binder: every signal the
React renderer's processor and resolver created is a Preact signal, and after the swap web_core
reads them through the Angular implementation — `peekValue` and `setValue` assert an Angular
signal and throw `Received unexpected value. Expected an Angular signal.` (`reactivity.ts:38-42,
78-88`); `getValue` calls the Preact signal as a function. Read from the code; not run.

### Issue

The Angular renderer takes over web_core's reactivity for the module, on the assumption that it
owns the page. Its own comment says so: "Switch web_core to Angular signals before any
`MessageProcessor` or `NodeResolver` exists, so every signal they create is tracked by Angular
`computed` and `effect`" (`a2ui-renderer.service.ts:94-95`). The swap cannot be avoided from
outside: `initializeAngularReactivity` runs in the constructors of `ComponentBinder` and
`A2uiRendererService`, and `AngularWcHost` does `injector.get(ComponentBinder)` at connect
(`angular_wc_host.ts:117`), so an Angular component packaged as a universal element and hosted by
another renderer performs it on first mount. Bundling a second web_core into the Angular package
does not help either: `ComponentBinder.bindNode` reads `peekValue(node.props)`
(`component-binder.service.ts:73`) on a node the host's web_core made — a Preact signal under the
Angular implementation.

The roadmap names web_core "Shared core lib for all web renderers" (`docs/public/roadmap.md:20`),
and `@a2ui/react` already hosts universal elements from any source; the Angular renderer is the one
web renderer that cannot be one of several on a page.

### Reproduction

A page with an `@a2ui/react` `A2uiSurface` over a web_core `MessageProcessor`; then
`createApplication` from `@angular/platform-browser` and `injector.get(A2uiRendererService)` (or
any `ComponentBinder`): the next `peekValue` or `setValue` on the React surface's signals throws.
Read from the code; a run would confirm.

### Fix

Keep the implementation off module state: choose it per `MessageProcessor` (or per
`ComponentContext`), so each renderer's processor carries the reactivity it was built with; or have
`ComponentBinder` bind through the implementation a signal was made with — `isSignal` tells a
Preact signal (`value`/`peek`) from an Angular one (a function) — instead of asserting the Angular
kind.

## 26. Native Angular components reach their surface only through `A2uiRendererService`'s own processor, and leave no `node` on the DOM (@a2ui/angular)

**Component:** `@a2ui/angular` 0.13.0, `fesm2022/a2ui-angular.mjs` line 654
(`this.rendererService.surfaceGroup?.getSurface(surfaceId)` in the component host), line 523 (the
service's own `new MessageProcessor(…)`), lines 737-751 (`setupAngularComponent`, setting nothing
on the DOM) against 753-771 (`setupWebComponent`, setting `injector` and `context` on the element
it creates); upstream `main` `typescript/renderers/angular/src/core/component-host.component.ts:199,
217-219, 318-335, 349-361`, `core/a2ui-renderer.service.ts:107-134`.

**Severity:** a native Angular entry hosted by any renderer but `@a2ui/angular`'s own — through
`toWebComponent` inside a React or Lit surface — renders no children and lands no navigation: its
containers render each child as `<a2ui-v09-component-host>`, which looks the surface up in the
service's processor, never holds it, and waits forever (`Surface <id> not found. Waiting for it...`,
`component-host.component.ts:219`); and a host reading components off the page by the
`A2uiWebComponentElement` contract finds none of the Angular ones.

### Issue

Two couplings to the renderer's own session. First, children: a container's template is
`<a2ui-v09-component-host [componentKey]="child" [surfaceId]="surfaceId()">`
(`v0_9/catalog/basic/column.component.ts:47-48`), and the host resolves the child from
`rendererService.surfaceGroup.getSurface(surfaceId)` — the `SurfaceGroupModel` of the processor the
service built in its constructor; the node the element was given, whose `context.surface` already
holds the surface, is not consulted. Actions fall back the same way: a basic component calls the
action closure when its prop is one, otherwise it goes through the service's surface
(`v0_9/catalog/basic/button.component.ts:107-117`). Second, the DOM: the universal path sets
`injector`, `node` and `context` on the element it creates; the native path sets nothing on
`<a2ui-v09-component-host>` (`display: contents`), so the contract every other renderer's elements
carry — the one `@a2ui/react`'s `WebComponentNode` and the Lit base class honour — is absent for
native Angular components.

### Reproduction

An `@a2ui/react` `A2uiSurface` over a catalog from `createComponentImplementation`, with findings
24 and 25 out of the way and a default injector set: a `Column` of two `Text`s mounts the column's
Angular component and warns `Surface <id> not found. Waiting for it...` for each child;
`document.querySelectorAll('*')` finds no element carrying `node` for any of them. Read from the
code; a run would confirm.

### Fix

Resolve a child from the node the host holds — `node.context.surface` and web_core's
`NodeResolver`, as `renderA2uiNode` does for universal elements — and fall back to the service's
processor only when the host has no node; and set `node` and `context` on the component host
element for native entries as `setupWebComponent` does for universal ones.

## 27. The extension specification names one URI per version; a card carrying several has only samples and a helper to go by (spec, samples/agent/adk, a2ui-a2a)

**Component:** at `upstream/main` `551bd0f48`: `specification/v0_9/docs/a2ui_extension_specification.md`
and `specification/v0_9_1/docs/a2ui_extension_specification.md`, line 11 ("The URI of this extension
is …"); `samples/agent/adk/restaurant_finder/agent.py`, line 77 (the versions it runs) and lines 111–121
(`_build_agent_card`, one entry for each); `python/a2ui_a2a/src/a2ui/a2a/extension.py`, line 121
(`_select_newest_a2ui_extension`) and line 146 (`try_activate_a2ui_extension`).

**Severity:** specification gap — nothing is blocked, and the rule the code follows works. A client
written from the specification alone has no way to know what a card with several entries means.

**Reported:** not filed; a candidate for the community proposal, beside finding 12.

### Issue

Each version's extension specification has one "Extension URI" section naming one URI: "The URI of this
extension is https://a2ui.org/a2a-extension/a2ui/v0.9", and the same with `v0.9.1`. Its example card has
one entry. Neither says that a card may carry an entry per version, what a client does with an entry for
a version it does not speak, which versions a client names in its request, or which one an agent answers
in when it is named several. The v1.0 specification says "A2A gives each version its own extension URI"
(`specification/v1_0/extensions/a2a/docs/a2ui_extension_specification.md`, line 17) and stops there too.

The code assumes several:

- The ADK restaurant finder runs v0.8 and v0.9 and declares one entry for each, each naming that
  version's basic catalog id.
- `try_activate_a2ui_extension` "Activates the newest A2UI extension that the client requests and the
  agent advertises", matching URIs exactly. The conformance suite holds it to that
  (`conformance/extensions/a2a/a2a_integration.yaml`, `test_select_newest`, line 93).
- The Python agent guide's "Multiple Version Support" (`python/a2ui_agent/agent_development.md`, line 584)
  tells an agent to list each version in its card and negotiate through the helper.

So the agent's half has a rule, in code and in a guide. The client's half has none, and two things follow:

- A client that reads only the entry for its own version takes a card declaring catalogs under another
  version's URI as declaring none.
- A client naming v0.9.1 alone activates nothing on the finder's card, though v0.9.1's message schemas
  admit the `v0.9` the agent would answer in. It has to name v0.9 too.

A2UIVerse names the v0.9 and v0.9.1 URIs on every request and reads a card per version: entries under
those two URIs count; an entry for any other version is passed over; a version with no entry of its own
takes the other's catalog ids; each paint is checked against the ids of the version it is stamped with.

This reads beside finding 12, the sibling gap on the capabilities key: that one is how an entry's params
are keyed, this one is which entries there are.

### Reproduction

Run at `9e8a9bac5`, where the sample, the helper and both specifications' URI lines read as they do at
`551bd0f48`. In `samples/agent/adk/restaurant_finder`, with an API key as its README says:

```bash
uv run . --port 11006
curl -s http://localhost:11006/.well-known/agent-card.json | jq -c '.capabilities.extensions[] | {uri, params}'
# {"uri":"https://a2ui.org/a2a-extension/a2ui/v0.8","params":{"supportedCatalogIds":["https://a2ui.org/specification/v0_8/standard_catalog_definition.json"]}}
# {"uri":"https://a2ui.org/a2a-extension/a2ui/v0.9","params":{"supportedCatalogIds":["https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"]}}
```

The helper, against that card:

```python
from types import SimpleNamespace

from a2a.types import AgentCard
from a2ui.a2a import try_activate_a2ui_extension

BASE = "https://a2ui.org/a2a-extension/a2ui/"
card = AgentCard.model_validate(card_json)  # the card fetched above


def activate(*versions):
    context = SimpleNamespace(
        requested_extensions=[BASE + v for v in versions],
        message=None,
        add_activated_extension=lambda uri: None,
    )
    return try_activate_a2ui_extension(context, card)


activate("v0.9", "v0.9.1")  # A2uiProtocolVersion.V0_9
activate("v0.8", "v0.9")  # A2uiProtocolVersion.V0_9
activate("v0.9.1")  # None
```

Live, on 2026-11-05, the sample on `gemini-3.6-flash` was installed into A2UIVerse from that URL alone. Its
v0.8 entry was passed over and the catalogs it may paint in were the v0.9 basic catalog alone. Its log
showed the v0.9 and v0.9.1 URIs requested and `v0.9` activated, and "Find me an Italian restaurant" painted
its list.

### Fix

Say it in the extension specification; the agent's half needs no code change. A card carries one entry
per version the agent speaks, each under that version's URI, its params holding for that version. A client
reads the entries for the versions it speaks and passes over the rest, and names every version it speaks.
An agent answers in the newest version named that its card advertises, the rule the helper and the
conformance suite already hold.

Whether a client naming v0.9.1 alone should reach a v0.9 card is a choice for that text: the helper says
no, and the v0.9.1 message schemas would allow it.

### Prior art

PR [#936](https://github.com/a2ui-project/a2ui/pull/936) ("A2ui extension selection", merged 2026-03-25),
its commit "Select the newest compatible A2UI extension version during activation", brought the rule into
the SDK, right after PR [#926](https://github.com/a2ui-project/a2ui/pull/926) ("Refactor A2UI extension
activation"), whose description reads "The agents may support multiple versions of A2UI extensions". Closed
issue
[#700](https://github.com/a2ui-project/a2ui/issues/700) ("Migrate all agent samples to support both v0.9
and v0.8") asked for the samples. Open PR [#2033](https://github.com/a2ui-project/a2ui/pull/2033) ("remove
a2a extension activation entirely in v1.0") would take activation out of v1.0, the helper's input with it.
No issue or pull request on `a2ui-project/a2ui` asks what a card with several entries means, searched on
2026-11-06.

---

## 28. The A2A extension specifications describe an A2A 0.3 part and name no A2A version (spec)

**Component:** at `upstream/main` `8bf644a37`: `specification/v0_9/docs/a2ui_extension_specification.md`
and `specification/v0_9_1/docs/a2ui_extension_specification.md`, lines 172 to 250 ("Data Encoding");
`specification/v1_0/extensions/a2a/docs/a2ui_extension_specification.md`, lines 177 to 255;
`docs/public/concepts/actions.md`, line 413.

**Severity:** specification gap. An agent or a client on A2A 1.0 cannot tell from the text where the
MIME type goes or what a 0.3 caller receives.

**Reported:** not filed.

### Issue

The three extension specifications name the part "an A2A `DataPart`" and mark it in
`DataPart.metadata["mimeType"]`. Their example parts carry `"kind": "data"`. `DataPart`, `kind` and a
part with no MIME field of its own are A2A 0.3's: A2A 1.0 has one `Part` with no `kind`, and gives every
part a `mediaType` ("The `media_type` (MIME type) of the part content … This field is available for all
part types.", `specification/a2a.proto` at A2A `v1.0.0`, lines 239 to 241). None of the three files
names an A2A version.

Two things follow that the text does not settle:

1. Whether an A2UI part on A2A 1.0 sets `mediaType`, `metadata.mimeType`, or both. A reader on A2A 1.0
   that looks at `mediaType` alone finds nothing on a part written as the specification says.
2. What a caller on A2A 0.3 receives from an agent on A2A 1.0. The 0.3 layers of both A2A SDKs drop
   `mediaType` from a data part, so `metadata.mimeType` is the one mark that survives both wires.

`docs/public/concepts/actions.md` is the one upstream text that ties the encoding to an A2A version:
"The use of a **list** in the `data` field was introduced in **A2A v1.0**. Earlier versions of the A2A
protocol expect the `data` field to contain a single JSON object." The extension specifications do not
carry that sentence, and their example pairs a list with `"kind": "data"`.

A2UIVerse reads a part by what its `data` holds and reads no mark. It writes its own parts marked
`application/a2ui+json` in `metadata.mimeType` and in `mediaType`.

### Reproduction

A scratch agent on Python's `a2a-sdk` 1.3.0 sets `media_type` on an A2UI part and nothing in its
metadata. Asked on A2A 1.0 and through the SDK's 0.3 layer by the client of `@a2a-js/sdk` 1.3.0, the
part on each wire, from `packages/smoke-transport/test/fixtures/python-1.0-media-type.json` and
`python-0.3-media-type.json` in `retz8/a2uiverse`:

```text
A2A 1.0  {"data": {"createSurface": {…}, "version": "v0.9"}, "mediaType": "application/a2ui+json"}
A2A 0.3  {"data": {"version": "v0.9", "createSurface": {…}}, "kind": "data"}
```

The other way, a press marked in both fields reaches the same agent with both on A2A 1.0 and with
`metadata.mimeType` alone on A2A 0.3 (`python-1.0-echo.json`, `python-0.3-echo.json`):

```text
A2A 1.0  {"data": {…}, "metadata": {"mimeType": "application/a2ui+json"}, "mediaType": "application/a2ui+json"}
A2A 0.3  {"data": {…}, "metadata": {"mimeType": "application/a2ui+json"}}
```

Captured on 2026-11-13 by `packages/smoke-transport/scripts/capture-fixtures.mjs`.

### Fix

Say in each extension specification which A2A versions it covers, and for A2A 1.0 where the MIME type
goes. Keeping `metadata.mimeType` as the required mark on both versions costs nothing and survives a
0.3 layer; `mediaType` could be named as an optional second mark on A2A 1.0.

### Prior art

Pull request [#3603](https://github.com/a2ui-project/a2ui/pull/3603) ("docs(spec): put the A2UI MIME
type in DataPart.metadata in the extension specs", merged 2026-11-03) settled the mark on
`DataPart.metadata`. Issue [#3601](https://github.com/a2ui-project/a2ui/issues/3601) and pull request
[#3602](https://github.com/a2ui-project/a2ui/pull/3602), both open, move the Lit and React sample
clients to it. Pull requests [#3162](https://github.com/a2ui-project/a2ui/pull/3162) and
[#2337](https://github.com/a2ui-project/a2ui/pull/2337), both open, let the Python helpers build parts
on `a2a-sdk` 1.x; neither changes the specification's text. No issue or pull request on
`a2ui-project/a2ui` asks which A2A version the extension specifications describe, searched on
2026-11-13.

---

## 29. The list the specification requires in `data` is written by no upstream helper and read by no upstream agent (spec, a2ui-a2a, samples)

**Component:** at `upstream/main` `8bf644a37`: `specification/v0_9_1/docs/a2ui_extension_specification.md`,
lines 178 to 186, with the same text in the v0.9 and v1.0 files;
`python/a2ui_a2a/src/a2ui/a2a/parts.py`, `create_a2ui_part` (line 62) and `get_a2ui_messages`;
`samples/agent/node/restaurant_finder/src/a2a.ts`, lines 75 to 84;
`samples/agent/adk/restaurant_finder/agent_executor.py`, lines 78 to 95;
`samples/client/lit/shell/client.ts`, lines 60 to 89.

**Severity:** specification and implementations disagree. A client that follows the specification
loses every press on upstream's own agents.

**Reported:** not filed.

### Issue

The specification: "The `data` field of the `DataPart` contains a list of A2UI JSON messages (e.g.,
`createSurface`, `updateComponents`, `action`). It MUST be an array of messages." Its processing rules
build on the list, and its client-to-server example wraps one `action` in an array.

The code at the same commit carries one message per part:

1. `create_a2ui_part(a2ui_data: dict[str, Any], …)` puts one message in `DataPart.data`, and
   `get_a2ui_messages` documents it: "Each A2UI `DataPart` carries one A2UI message".
2. The Node restaurant finder takes a press with `data.version === version && data.action`. Given a
   list, no action is found and the press is dropped with nothing said.
3. The ADK restaurant finder takes one with `part.root.data.get("version")` and
   `"action" in part.root.data`. Given a list, `.get` raises.
4. The Lit sample client sends a press as one object in `data`.

A list also cannot ride A2A 0.3 as written: 0.3 types a data part's `data` as an object
(`types/src/types.ts` at A2A `v0.3.0`, lines 799 to 809), and the 0.3 layer of an A2A 1.x SDK wraps a
list as `{"value": [...]}` with `data_part_compat` set in the part's metadata.

A2UIVerse reads one message or a bare list, each entry judged on its own, and writes one message per
part, since that is what every agent read here takes.

### Reproduction

From the same scratch agent, one data part holding a list of two messages, on each wire
(`python-1.0-list.json`, `python-0.3-list.json`):

```text
A2A 1.0  {"data": [{"createSurface": {…}, "version": "v0.9"}, {"updateComponents": {…}, "version": "v0.9"}],
          "metadata": {"mimeType": "application/a2ui+json"}}
A2A 0.3  {"data": {"value": [{"version": "v0.9", "createSurface": {…}}, {"version": "v0.9", "updateComponents": {…}}]},
          "kind": "data", "metadata": {"mimeType": "application/a2ui+json", "data_part_compat": true}}
```

The client of `@a2a-js/sdk` 1.3.0 unwraps the 0.3 form, so a reader on that SDK sees a bare list from
both. A reader on an A2A 0.3 SDK sees the object holding `value`.

For the readers, the two lines of each sample quoted above are the reproduction: neither branch runs
when `part.data` is a list.

### Fix

Choose one and say it in the specification: one message per part on every A2A version, as the helper
and the samples already do; or a list on A2A 1.0 with the readers changed to take one, and one message
per part on A2A 0.3. Either way the helper, the samples and the text would agree.

### Prior art

Issue [#645](https://github.com/a2ui-project/a2ui/issues/645) ("A2UI spec requires DataParts to contain
an array, which they can't do", closed 2026-05-14) raised the conflict with A2A's data part and was
closed once "the underlying libraries now all support lists in a data part". Issues
[#234](https://github.com/a2ui-project/a2ui/issues/234) and
[#549](https://github.com/a2ui-project/a2ui/issues/549), both closed, asked for a list of messages as
one unit. `docs/public/concepts/actions.md`, line 413, says the list came with A2A v1.0. No issue or
pull request reports that the helper and the samples still carry one message per part, searched on
2026-11-13.

---

## 30. No source says whether an A2UI part rides a message or an artifact, and ADK's stock executor sends the last message's parts in both (spec, a2ui-adk)

**Component:** at `upstream/main` `8bf644a37`: the three extension specifications' "Data Encoding"
sections; `python/a2ui_adk/tests/a2a/test_rpc_callback.py`, lines 626 to 643;
`samples/agent/node/restaurant_finder/src/a2a.ts`, lines 130 to 144;
`samples/agent/adk/restaurant_finder/agent_executor.py`, lines 155 to 183;
`samples/client/angular/projects/restaurant/src/server.ts`, lines 162 to 166. In `google/adk-python` at
`v2.3.0`: `src/google/adk/a2a/executor/a2a_agent_executor.py`, lines 292 to 323.

**Severity:** specification gap. A client that reads both carriers paints an answer twice; one that
reads a single carrier misses agents that use the other.

**Reported:** not filed.

### Issue

The specification says how a part is encoded and not what holds it: "Agents and clients encode A2UI
messages as an A2A `DataPart`." A2A 1.0 says results belong in artifacts ("Messages SHOULD NOT be used
to deliver task outputs. Results SHOULD BE returned using Artifacts associated with a Task.",
`docs/specification.md` at A2A `v1.0.0`, section 3.7).

Upstream's agents do three different things:

1. Both restaurant finders put A2UI in the message of a status update and never in an artifact.
2. Agents on ADK's stock `A2aAgentExecutor` send each ADK event as a `working` status update carrying
   a message, then one artifact holding the parts of the last status message. Upstream's own test
   states it: "The reply goes out in the working status update, from the agent, and again as the
   task's artifact."
3. `samples/community/agent/adk/gemini_enterprise/v0_8/agent_engine` uses an artifact alone.

The sample clients differ in the same way: the Lit and React shells read messages only, and the
Angular restaurant sample reads an artifact update too.

A2UIVerse reads A2UI from a bare message and from a status message, never from an artifact, in its
client and in its orchestrator, so an answer from the stock executor is painted once.

### Reproduction

`python/a2ui_adk/tests/a2a/test_rpc_callback.py`,
`test_a2a_agent_executor_sends_the_reply_as_an_a2ui_part`, asserts both carriers hold the same reply:

```python
assert get_a2ui_messages(status_parts) == [_reply()]
assert get_a2ui_messages(artifact_parts) == [_reply()]
```

### Fix

Name the carrier in the extension specification: the status message while a task streams, with a rule
for a client that also finds the same parts in an artifact, or the artifact alone. The agents and the
sample clients can then follow one text.

### Prior art

Pull request [#3795](https://github.com/a2ui-project/a2ui/pull/3795) ("feat(python-a2a,adk): answer
agent function calls in A2A and ADK", merged 2026-11-06) brought the test that states the double send.
No issue or pull request on `a2ui-project/a2ui` asks which carrier an A2UI part rides, searched on
2026-11-13.

---

## 31. `create_a2ui_part` marks a v0.9 message with the deprecated MIME type the v0.9 specification no longer names (a2ui-a2a)

**Component:** at `upstream/main` `8bf644a37`: `python/a2ui_a2a/src/a2ui/a2a/parts.py`, lines 44 to 46
and `create_a2ui_part`, lines 62 to 91; `specification/v0_9/docs/a2ui_extension_specification.md`,
line 176.

**Severity:** specification conformance. A reader that follows the v0.9 text and looks for
`application/a2ui+json` passes over every part the helper writes for v0.9.

**Reported:** not filed.

### Issue

The v0.9 extension specification requires `DataPart.metadata["mimeType"] = "application/a2ui+json"`.
The helper writes the older string for that version:

```python
mime_type = A2UI_MIME_TYPE
if version is None or to_version_number(version) in ("0.8", "0.9"):
    mime_type = DEPRECATED_A2UI_MIME_TYPE
```

with `DEPRECATED_A2UI_MIME_TYPE = "application/json+a2ui"`. Its docstring says the same: "Without
either, or for v0.8 and v0.9, the part uses the deprecated MIME type." `is_a2ui_part` accepts both
strings, so upstream's own readers are unaffected.

### Reproduction

```python
from a2ui.a2a.parts import create_a2ui_part

part = create_a2ui_part({"version": "v0.9", "createSurface": {"surfaceId": "s", "catalogId": "c"}})
print(part.root.metadata)  # {'mimeType': 'application/json+a2ui'}
```

Not run for this finding: the three lines of `create_a2ui_part` quoted above are the evidence, read at
`8bf644a37`.

### Fix

Write `application/a2ui+json` for v0.9, as its specification says, or say in the v0.9 specification
that a v0.9 part may carry either string and a reader must take both.

### Prior art

Commit `c712e0fee` ("POTENTIALLY BREAKING CHANGE refactor: IANA convention requires mime type
application/a2ui+json", pull request [#1493](https://github.com/a2ui-project/a2ui/pull/1493), merged
2026-05-29) renamed the string. No issue or pull request reports the v0.9 text and the helper
disagreeing, searched on 2026-11-13.

---

## 32. No way to put another build of a held catalog in a processor (web_core, Python core, Dart core, Swift core)

**Component:** `MessageProcessor` in `@a2ui/web_core` 0.16.1, `src/processing/message-processor.js`
(`catalogs`, line 107; `addCatalog`, line 121), and `a2ui-core` 0.7.1,
`a2ui/core/processing/message_processor.py` (`add_catalog`, line 241); at `upstream/main`
`36725eee0`, `dart/a2ui_core/lib/src/processing/processor.dart` (`catalogs`, line 106; `addCatalog`,
line 309) and `swift/core/Sources/A2UICore/Processing/MessageProcessor.swift` (`addCatalog`, line 121).

**Severity:** missing capability. A client whose catalogs never change under one id is unaffected; a
client that loads a newer build of a catalog its processor holds has no supported way to create
surfaces in it.

**Reported:** not filed.

### Issue

`addCatalog` (#3304, released in `@a2ui/web_core` 0.16.1 and `a2ui-core` 0.7.1) adds a catalog whose id the processor does not hold, and rejects
one it holds with `A2uiCatalogError`. No method replaces or removes a catalog, and the list cannot be
changed from outside: in web_core it is the private `registeredCatalogs` and `catalogs` returns a
copy, in Dart `catalogs` is an `UnmodifiableListView`, and in Swift the list and the id map are
private. Only Python's `catalogs` is the processor's own list, open to change. The one way left to
create surfaces in a newer build is a new processor, which drops every surface the old one holds.

In A2UIVerse's registry a catalog keeps its id across builds: a newer build is a newer artifact under
the same id. Each paint is drawn in the build the gate assigned to it, so a surface on screen keeps
its build beside a newer one of its catalog (task-15.6 decisions 1 to 6), and the build is put in the
processor's list just before its create (task-16.7 decision 2). On `@a2ui/web_core` 0.16.1, with no
local patch since sub-task 21.5, `BuildProcessor`'s `#hold` (`apps/client/src/catalogs/paintBuilds.ts`,
lines 81–89) takes a catalog the processor does not hold through `addCatalog`. For another build of
one it holds, it reads the private `registeredCatalogs` through a cast (lines 54–55) and splices the
newer build into the held one's place; the processor's `RpcHandler` holds the same array, so the
create that follows and renderer function calls read the newer build.

### Reproduction

```ts
const processor = new MessageProcessor([build1]);
processor.addCatalog(build2); // same id: A2uiCatalogError: Catalog already registered: <id>
```

Run on `@a2ui/web_core` 0.16.1; `a2ui-core` 0.7.1's `add_catalog` raises the same `A2uiCatalogError`.

### Fix

A method that puts a catalog in the place of the held one with the same id, as `replaceCatalog` or
an option on `addCatalog`: `createSurface` messages, renderer function calls and
`getRendererCapabilities` see the new build from the next call on, and surfaces created before keep
the build they were created with, as they do for `addCatalog`. Or `removeCatalog(id)`, after which
`addCatalog` takes the new build; a `createSurface` naming the id between the two calls fails.
Whether upstream wants a catalog to change under one id at all is the first question to ask; if not,
the client gives each build an id of its own and rewrites the `catalogId` of each create it assigns.

### Prior art

No issue or pull request proposes replacing or removing a catalog in a processor (searched
`replaceCatalog`, `removeCatalog`, `remove_catalog` and catalog updates on 2026-11-21).

---

## 33. `@a2ui/web_core` and `a2ui-core` read `"format": "uri"` differently: a URL with no scheme passes one and fails the other (web_core, Python core)

**Component:** at `7a776e7a4`, the commit `@a2ui/web_core` 0.16.1 was released from:
`typescript/core/web_core/src/catalog/schema_loader.ts`, line 511, and `executeOpenUrl` in
`typescript/core/web_core/src/common/basic_functions.ts`, line 647;
`python/a2ui_core/src/a2ui/core/validation/schema_validator.py`, lines 139 to 146, and
`StrictBaseModel` in `python/a2ui_core/src/a2ui/core/schema/common_types.py`, lines 115 to 118, which
reads `_URI_RE` from `python/a2ui_core/src/a2ui/core/schema/_json_schema.py`, line 40. The same lines
are in the published `a2ui-core` 0.7.1.

**Severity:** the two reference SDKs disagree on one schema keyword. A paint whose `openUrl` names a
URL with no scheme is valid for a renderer on `@a2ui/web_core` and invalid for an agent on
`a2ui-core`, and on a web renderer the press opens a page on the renderer's own site.

**Reported:** not filed.

### Issue

Pull request [#4187](https://github.com/a2ui-project/a2ui/pull/4187) (merged 2026-11-16, for issue
[#4173](https://github.com/a2ui-project/a2ui/issues/4173)) made both SDKs judge `"format": "uri"`,
which the v0.9 basic catalog puts on `openUrl.args.url`. The two judge it by different rules.

`a2ui-core` requires a scheme, on its JSON-loaded catalogs and on the ones defined in code alike:

```python
_URI_RE: Final[regex.Pattern[str]] = regex.compile(r"^[A-Za-z][A-Za-z0-9+.-]*:\S*\Z")
```

Its changelog for 0.7.0 calls this "RFC 3986 scheme-prefixed URI syntax". `@a2ui/web_core`'s
`Catalog.fromJson` asks only that the string, trimmed, be non-empty and hold no whitespace:

```ts
s.refine(v => v.trim().length > 0 && !/\s/.test(v.trim()), 'Invalid URI')
```

so `example.com/page` and `www.example.com` pass, and so does `" https://example.com "`, which
`a2ui-core` refuses for its spaces. web_core's 0.16.0 changelog, under the same pull request, gives
"pass a scheme-prefixed URI to `openUrl.url`" as the migration, which its own check does not need.

When such a URL is pressed, `executeOpenUrl` resolves it against the page:
`new URL(target, window.location.href)`. A relative URL then names a page on the renderer's own
origin, which passes the `http:`/`https:` check and opens, where the agent meant another site.

### Reproduction

The same `Button` through each SDK's validator over the v0.9 basic catalog's `catalog.json` at
`7a776e7a4`, loaded from JSON (`Catalog.fromJson` and `PayloadValidator` under `STRICT_VALIDATION`
in `@a2ui/web_core` 0.16.1; `Catalog.from_json` and `PayloadValidator` in `a2ui-core` 0.7.1):

```json
{"id": "go", "component": "Button", "child": "label",
 "action": {"functionCall": {"call": "openUrl", "args": {"url": "example.com/page"}}}}
```

| `url` | `@a2ui/web_core` 0.16.1 | `a2ui-core` 0.7.1 |
| --- | --- | --- |
| `https://example.com/page` | accepted | accepted |
| `example.com/page` | accepted | refused |
| `www.example.com` | accepted | refused |
| `" https://example.com "` | accepted | refused |

Run on 2026-11-26. `a2ui-core` refuses each as an `A2uiValidationError` whose message names the
component's unevaluated properties rather than the URL. Its `OpenUrlArgs` model, the catalog defined
in code, says "Field 'url' must be a valid URI, got 'example.com/page'". The press on a web renderer
is read from `executeOpenUrl`, not run.

### Fix

One rule in both SDKs. Taking `a2ui-core`'s, the JSON Schema `uri` format, which names an absolute
URI, web_core's refinement becomes the same regular expression. A renderer that wants to accept a
relative URL from an agent says so in the specification, and `a2ui-core` relaxes to it.

### Prior art

Issue #4173 and pull request #4187 are the change itself. No issue or pull request reports the two
SDKs disagreeing (searched "format uri", "openUrl scheme", "Invalid URI" and "scheme-prefixed" on
2026-11-26). Issue [#4045](https://github.com/a2ui-project/a2ui/issues/4045) (open) proposes a URL
policy across the SDKs, and pull request [#3199](https://github.com/a2ui-project/a2ui/pull/3199)
(open) adds `mailto` and `tel` to the specification's `openUrl` scheme list.

---

## 34. `@a2ui/react` deprecates `render` in favour of `view`, and still requires `render` and leaves `view` optional (@a2ui/react)

**Component:** at `7a776e7a4`, the commit `@a2ui/react` 0.16.1 was released from, and unchanged on
`upstream/main` at `36725eee0` (2026-11-26): `ReactComponentImplementation` in
`typescript/renderers/react/src/react_component_implementation.ts`, lines 79 and 86, and
`ChildElement` and `NodeContent` in `typescript/renderers/react/src/node-view.tsx`, lines 402 and 489.

**Severity:** a deprecation no implementation can follow. An entry written with `view` alone, as the
deprecation asks, does not type-check, and cast past the type it draws nothing.

**Reported:** not filed.

### Issue

Pull request [#3841](https://github.com/a2ui-project/a2ui/pull/3841) (merged 2026-11-04, released in
0.16.0) deprecates `ReactComponentImplementation.render`: "Implement `view({node, buildChild})`
instead." The interface it deprecates keeps `render` required and `view` optional:

```ts
render: React.FC<ReactRenderProps>;
view?: React.FC<NodeViewProps>;
```

The surface also tells a React entry by its `render`. `ChildElement` takes an entry for a React
implementation when `'render' in node.impl` and hosts any other as a Web Component, and
`NodeContent` returns nothing for an entry with no `render` before it reads `view`. So `render`
cannot be left out: an entry has to carry one that the surface never calls once `view` is there.

### Reproduction

One `Text` entry, its `view` drawing `<p>drawn {node.componentId}</p>`, through `MessageProcessor`
and `A2uiSurface` in `@a2ui/react` 0.16.1 and `@a2ui/web_core` 0.16.1:

| Entry | Type check | Drawn |
| --- | --- | --- |
| `{...TextApi, view}` | refused: `render` is missing | `<a2ui-react-text style="display: contents;"></a2ui-react-text>` |
| `{...TextApi, render: () => null, view}` | accepted | `<a2ui-react-text-2 style="display: contents;"><p>drawn root</p></a2ui-react-text-2>` |

Run on 2026-11-27.

### Fix

The interface takes an entry carrying `view`, `render` or both, and the surface tells a React entry by
either field.

A2UIVerse's shell catalog builds `Slot` and `Attribution` with `createComponentImplementation` and
puts a `view` of its own in place of the one the factory returns, as its `Table` does, so the
factory's `render` fills the field. That `render` draws the component from the binder's props and,
with no component id to name a press by, raises nothing.

### Prior art

Pull request #3841 is the deprecation itself. No issue or pull request asks for `view` alone or
reports `render` still required (searched "render deprecated view", "ReactComponentImplementation
render", "view required render optional" and "deprecate render" on 2026-11-27). Pull request
[#4431](https://github.com/a2ui-project/a2ui/pull/4431) (open) edits the interface's file and leaves
both fields as they are.

---

## 35. `@a2ui/web_core` deprecates `ComponentNode.context`, and the props it names in its place lose a binding inside a function call and a template list's path (web_core)

**Component:** at `7a776e7a4`, the commit `@a2ui/web_core` 0.16.1 was released from, and unchanged on
`upstream/main` at `36725eee0` (2026-11-26): `ComponentNode` in
`typescript/core/web_core/src/resolution/component-node.ts`, lines 100 and 104, and
`wrapDynamicValues` in `typescript/core/web_core/src/resolution/node-resolver.ts`, lines 824 to 847.

**Severity:** a host that reads which data paths a component binds, as A2UIVerse's navigation does,
has no route to them all from the node once `context` is removed. It has to go around the node to
the surface's component model.

**Reported:** not filed.

### Issue

Pull request [#3841](https://github.com/a2ui-project/a2ui/pull/3841) (merged 2026-11-04, released in
0.16.0) deprecates `ComponentNode.context`: "Read resolved values from props; adapters get the
surface from their ambient context. Removed in the next breaking release." The context was a host's
route from a node to the component's model, `context.componentModel.properties`, which holds the
payload's bindings as written, and to the component's scoped data context.

The props it names in their place keep a binding's path only where the payload binds a property
directly: `wrapDynamicValues` gives such a property a `WritableBinding` that holds the authored path,
before scope resolution. A `{path}` inside a function call's arguments becomes a `ResolvedBinding`
holding only the call's result, and a template child list, `{path, componentId}`, becomes its child
nodes, `wrapDynamicValues` passing over a record with a `componentId` by name. The node keeps its
component id and its data path, and names neither its surface nor its component model.

### Reproduction

One surface on the v0.9 basic catalog, through `MessageProcessor` and `NodeResolver` in
`@a2ui/web_core` 0.16.1, its data model `{shop: {name: 'Aperture'}, items: [{name: 'Lumen'}]}`:

| Component            | The property in the payload                                         | The same property in `node.props`                 |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------------------- |
| `title`              | `text: {call: 'formatString', args: {value: {path: '/shop/name'}}}` | `ResolvedBinding`, value `"Aperture"`, no path    |
| `list`               | `children: {path: '/items', componentId: 'row'}`                    | the child node `row`, no path                     |
| `row`, at `/items/0` | `text: {path: 'name'}`                                              | `WritableBinding`, value `"Lumen"`, path `"name"` |

Run on 2026-11-27.

### Fix

The node names every data path its properties bind, a path inside a call's arguments and a template
list's among them, or names the component model it was resolved from.

A2UIVerse's binding index (`apps/client/src/canvas/navigation/bindingIndex.ts`) no longer reads
`context` (task-21.5 decision 6). Each fragment boundary registers its surface with the index; the
index reads a component's bindings from the surface's component model by the node's component id,
and resolves each path against the node's data path, the component's base path, with
`DataContext.resolvePath`. Over every recorded beat, 5,838 components on 163 surfaces, the new read
and the read through `context` agreed on every component and every data path.

### Prior art

Issue [#3095](https://github.com/a2ui-project/a2ui/issues/3095) (open, 2026-10-08) proposes removing
`context` from the node, adapters reading `node.componentId` and `node.dataPath` and views
`node.props` alone; it does not mention a reader of the node's bindings. Pull request
[#2879](https://github.com/a2ui-project/a2ui/pull/2879) (merged 2026-09-30) put the context on the
node. No issue or pull request asks for a node's binding paths (searched "ComponentNode context",
"context deprecated", "WritableBinding path", "data paths component binds" and "componentModel
ComponentNode" on 2026-11-27).

## 36. `@a2ui/web_core` builds a property declared as a union of a component id and another string as a child, whatever was written (web_core)

**Component:** at `7a776e7a4`, the commit `@a2ui/web_core` 0.16.1 was released from, and unchanged on
`upstream/main` at `36725eee0` (2026-11-26): `classifyExplicitProperty` in
`typescript/core/web_core/src/resolution/ref-fields.ts`, lines 932 to 945, and the `single` case of
`NodeResolver` in `typescript/core/web_core/src/resolution/node-resolver.ts`, lines 595 to 601.

**Severity:** a catalog that lets one property hold either an icon's id or text loses the text, and
one that lets it hold an id or a keyword such as `none` loses the keyword. The component receives a
child's id it cannot tell from a real one, and the value the agent wrote is gone from the props.

**Reported:** not filed.

### Issue

Pull request [#3938](https://github.com/a2ui-project/a2ui/pull/3938) (merged 2026-11-11, released in
0.16.0) has `extractRefFields` classify the options of a `ZodUnion` and merge their kinds. A union
with a `CommonSchemas.ComponentId` option is classified `single`, the kind of a plain
`ComponentId`, whatever its other options are. `NodeResolver` then turns every non-empty string at a
`single` key into a child node: the string is taken as the component id, and a string that names no
component becomes a placeholder node. `@a2ui/react` hands the component that node's id.

On 0.14.0 a union was not classified, and the property arrived as written. A catalog that declared
`z.union([CommonSchemas.ComponentId, z.string()])` told an id from text by looking the string up in
the surface; on 0.16.1 there is nothing left to look up.

### Reproduction

One surface through `MessageProcessor` and `NodeResolver` in `@a2ui/web_core` 0.16.1, a catalog of
two components: `Icon`, and `Menu` with `icon: ComponentId`, `trailingVisual` and
`items[].trailingVisual` as `z.union([ComponentId, z.string()])`, and `overflowIcon` as
`z.union([ComponentId, z.literal('none')])`. The surface holds `Icon`s with the ids `glyph` and
`pin`.

| Property                  | Written | In `node.props`                                       |
| ------------------------- | ------- | ----------------------------------------------------- |
| `icon`                    | `glyph` | a child node, component id `glyph`, type `Icon`       |
| `trailingVisual`          | `⌘C`    | a child node, component id `⌘C`, type `Placeholder`   |
| `overflowIcon`            | `none`  | a child node, component id `none`, type `Placeholder` |
| `items[0].trailingVisual` | `⌘C`    | a child node, component id `⌘C`, type `Placeholder`   |
| `items[1].trailingVisual` | `pin`   | a child node, component id `pin`, type `Icon`         |

Run on 2026-11-27.

### Fix

A union classifies as `single` only when every option can hold a component id, or the node keeps
the written value beside the child it builds, so a component can tell a string that names no
component from one that does.

A2UIVerse's GitHub catalog declares `ActionBar.Menu`'s `trailingVisual` and `overflowIcon` as plain
strings in its Zod schema (task-21.7 decision 4), its catalog schema unchanged. The component
receives each as written and draws an id that names an `Icon` from that component's model.

### Prior art

Issue [#3783](https://github.com/a2ui-project/a2ui/issues/3783) (closed 2026-10-30) asked for child
references in open and unannotated schemas to resolve, and #3938 closed it. Pull request
[#4171](https://github.com/a2ui-project/a2ui/pull/4171) (open) writes a v1.0 child reference as an
`@child` key, which would tell a reference from a string on the wire. No issue or pull request
reports a union's other option being lost (searched "union ComponentId", "ComponentId union
string", "child ref union", "Placeholder union", "classifyExplicitUnionOptions", "union child
reference string literal", "ComponentId literal none", and web_core issues on unions and child
references opened since 2026-11-03, on 2026-11-27).

---

## 37. The v1.0 extension specification requires a list of messages in a part's `data`, and the released agent SDKs and upstream's samples carry one message per part (spec, a2ui-agent-sdk, @a2ui/agent, a2ui-a2a, samples)

**Component:** at `7a776e7a4`, the commit `@a2ui/web_core` 0.16.1 and `@a2ui/agent` 0.2.1 were released from: `specification/v1_0/extensions/a2a/docs/a2ui_extension_specification.md`, lines 181 to 191; `typescript/agents/a2ui_agent/src/rpc/renderer-to-agent-message-processor.ts`, `processMessage` (line 144); `python/a2ui_agent/src/a2ui/rpc/processor.py`, `RendererToAgentMessageProcessor.process_message` (line 168); `python/a2ui_a2a/src/a2ui/a2a/parts.py`, `create_a2ui_parts` (line 147) and `get_a2ui_messages` (line 124); `samples/agent/node/restaurant_finder/src/a2a.ts`, `readInboundMessage` (line 65); `samples/client/lit/shell/client.ts`, lines 81 to 84 and 111 to 115.

**Severity:** specification and implementations disagree on v1.0. A renderer that follows the specification loses every press on upstream's agents, and an agent built on either agent SDK refuses it.

**Reported:** not filed.

### Issue

The v1.0 extension specification: "The `data` field of the `DataPart` contains a list of A2UI JSON messages (e.g., `createSurface`, `updateComponents`, `action`). It MUST be an array of messages." Its processing rules and both of its examples build on the list.

The released code at the same commit carries one message per part:

1. `@a2ui/agent` 0.2.1's `RendererToAgentMessageProcessor.processMessage` refuses a list: "A renderer message must be a JSON object, got an array."
2. `a2ui-agent-sdk` 0.12.1's `RendererToAgentMessageProcessor.process_message` refuses one: "A renderer-to-agent message must be an object, got list."
3. `a2ui_a2a`'s `create_a2ui_parts` writes one message per part, and `get_a2ui_messages` reads a part's `data` as one message.
4. The A2A Python SDK `a2ui_a2a` pins, `a2a-sdk` 0.3.25, cannot build a data part whose `data` is a list.
5. The Node restaurant finder reads a press only from a `data` that holds `version` and `action`, so a list is read as no press at all.
6. The Lit sample client sends a press as one object in `data`, and reads each data part as one message.

Finding 29 recorded the same disagreement at v0.9.1 on `upstream/main` `8bf644a37`. On v1.0 it holds for both agent SDKs, whose renderer-message processors were added since.

### Reproduction

Run on 2026-11-28 from `../a2ui-upstream/` at `7a776e7a4`, with its own environment.

```text
a2ui_a2a create_a2ui_parts([create, delete]): 2 parts; ['dict', 'dict']
a2a-sdk 0.3.25 DataPart(data=[...]): refused, Input should be a valid dictionary [type=dict_type, …, input_type=list]
a2ui-agent-sdk RendererToAgentMessageProcessor.process_message([action]): raises A2uiValidationError: A renderer-to-agent message must be an object, got list.
@a2ui/agent RendererToAgentMessageProcessor.processMessage([action]): throws A2uiValidationError: A renderer message must be a JSON object, got an array.
```

The Node restaurant finder, run with `STUB_LLM=true`, sent `message/send` with `a2uiRendererCapabilities` at `1.0` and one data part holding a `submit_booking` press: as one message the task ends `completed`, the booking taken; as a list of that one message it ends `input-required`, the press unread.

### Fix

Choose one and say it in the v1.0 specification: one message per part, as both agent SDKs, the helper and the samples do; or a list, with the processors and the samples changed to take one. Either way the text and the code would agree.

### Prior art

Issue [#645](https://github.com/a2ui-project/a2ui/issues/645) ("A2UI spec requires DataParts to contain an array, which they can't do", closed 2026-05-14) was closed once "the underlying libraries now all support lists in a data part". Finding 29 gives the earlier issues. No issue or pull request reports the agent SDKs' processors refusing a list (searched "DataPart array messages", "data part list of messages", "MUST be an array of messages", "one message per part", on 2026-11-28).

---

## 38. `@a2ui/web_core` takes a v0.9 binding and a v0.9 call on a v1.0 surface, and draws them as literals (web_core)

**Component:** at `7a776e7a4`, the commit `@a2ui/web_core` 0.16.1 was released from: `DataBindingSchema` (line 37) and `FunctionCommonSchema` (line 48) in `typescript/core/web_core/src/v1_0/schema/common-types.ts`, which `DynamicStringSchema` (line 74) and the other dynamic types are built on.

**Severity:** a v0.9 payload sent at `1.0` passes strict validation and draws wrong. A bound text shows an object where the data should be, and a call to a function the catalog lacks is never refused.

**Reported:** not filed.

### Issue

v1.0 writes a binding `{"@path": …}` and a call `{"@call": …}`. The evolution guide says plain objects holding `path` or `call` "are treated as literal dictionary values and are no longer intercepted as dynamic directives". The v1.0 JSON schema's `DataBinding` requires `@path` and its `FunctionCall` requires `@call`, so a `DynamicString` written `{"path": …}` or `{"call": …}` fails it.

`@a2ui/web_core`'s v1.0 Zod schemas take both spellings: `DataBindingSchema` has `@path` and `path` both optional, refined to need one, and `FunctionCommonSchema` does the same for `@call` and `call`. Validation therefore passes `{"path": "/name"}` as a binding and `{"call": …}` as a call. Resolution reads only the `@` keys, so the component receives the object as written. The check of nested calls reads only `@call`, so a function the catalog lacks passes when it is written `call`.

### Reproduction

`MessageProcessor` with the v1 `basicCatalog`, `version: '1.0'` and `STRICT_VALIDATION`, one surface created at `1.0` with the data model `{name: "Ada"}`, a root `Text`, and `NodeResolver` over the surface. Run on 2026-11-28.

| `Text.text` written                | Validation                                    | `text` resolves to                |
| ---------------------------------- | --------------------------------------------- | --------------------------------- |
| `{"@path": "/name"}`               | accepted                                      | `"Ada"`                           |
| `{"path": "/name"}`                | accepted                                      | `{"path": "/name"}`               |
| `{"@call": "nosuch", "args": {}}`  | refused: `Unrecognized function 'nosuch'`     |                                   |
| `{"call": "nosuch", "args": {}}`   | accepted                                      | `{"call": "nosuch", "args": {}}`  |

### Fix

On a surface at `1.0` or later, refuse a `DataBinding` or a `FunctionCall` written without its `@` key, as the v1.0 schema does. Or take the bare keys as the literal dictionary the evolution guide says they are: validated against the property's literal branch, which a `DynamicString` does not have.

A2UIVerse holds what it writes itself to the v1.0 JSON schemas, with the sdk's schema-form check beside the validator (task-21.10 decision 10).

### Prior art

Pull request [#4044](https://github.com/a2ui-project/a2ui/pull/4044) (merged 2026-11-11) moved the component envelope to `@` keys. For the envelope alone, the evolution guide keeps a bare key on v1.0 "when the component's schema does not declare a property of that name"; it names no such transition for `path` or `call`. No issue or pull request reports a bare `path` or `call` passing inside a dynamic value (searched "path binding literal v1.0", "@path legacy path", "call without @ prefix", "reserved key path literal", "plain object path DynamicString", "unknown function call key", on 2026-11-28).

---

## 39. `@a2ui/web_core`'s `MessageProcessor` applies a v0.9 `updateComponents` to a surface created at `1.0` (web_core)

**Component:** at `7a776e7a4`, the commit `@a2ui/web_core` 0.16.1 was released from: `MessageProcessor.validateTargetVersion` (line 955) and `processUpdateComponentsOp` (line 1750) in `typescript/core/web_core/src/processing/message-processor.ts`.

**Severity:** a renderer applies messages of two protocol versions to one surface. The v0.9 update is judged and drawn by the v1.0 surface's rules, and nothing says that the agent changed versions.

**Reported:** not filed.

### Issue

A surface takes its protocol version from its `createSurface`. The evolution guide asks renderers to inspect "the `version` property (e.g., `"1.0"`) to route payloads to version-specific controllers", and v1.0 requires every catalog mixed on a surface to use the same specification version.

The processor checks a message's `version` against nothing but `ValidationConfig.targetVersion`. Without it, even under `STRICT_VALIDATION`, an `updateComponents` stamped `v0.9` for a surface created at `1.0` is applied to that surface.

### Reproduction

`MessageProcessor` with the v1 `basicCatalog` and `version: '1.0'`, a `createSurface` at `1.0`, then an `updateComponents` at `v0.9` setting a root `Text`. Run on 2026-11-28.

| Rules                                           | The `v0.9` update                                                                   |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| no `validationConfig`                           | applied, the surface still at `1.0`                                                 |
| `STRICT_VALIDATION`                             | applied, the surface still at `1.0`                                                 |
| `STRICT_VALIDATION` with `targetVersion: '1.0'` | refused: `Message version 'v0.9' does not match expected target version '1.0'`      |

### Fix

Refuse a message for an existing surface whose `version` is not the surface's own, whatever the validation config. `targetVersion` would still state the one version a processor accepts at all.

A2UIVerse's validator sets `targetVersion` to `1.0`, so every message stamped otherwise is a finding (task-21.10 decision 8).

### Prior art

Pull request [#2997](https://github.com/a2ui-project/a2ui/pull/2997) (merged) added a version adapter registry to the Dart core. No issue or pull request reports a message applied to a surface of another version (searched "targetVersion", "version mismatch surface", "v0.9 message on v1.0 surface", "mixed version surface", "protocolVersion surface message version", "message version differs surface", on 2026-11-28).
