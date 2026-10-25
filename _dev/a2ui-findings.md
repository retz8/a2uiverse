# A2UI upstream findings

Issues found in the A2UI specification and reference implementations, recorded for
upstream contribution (`a2ui-project/a2ui`). Each finding is self-contained and
reproducible against upstream artifacts only.

---

## 5. Dynamic prop types are unenforced claims (web_core generic binder / DataContext)

**Component:** `@a2ui/web_core` 0.14.0, `src/resolution/generic-binder.d.ts` (`ResolveA2uiProp`,
line 118) and `src/resolution/data-context.js` (`DataContext.resolveDynamicValue`, line 410).

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
`blueprints/modules/a2ui_core.blueprint.md` (Type Coercion Standards) specifies `Any → String`,
`null | undefined → String` = `""`, `null | undefined → Number` = `0`, numeric `String → Number`,
and the boolean rules. No layer applies that table at the binder boundary.

Components compensate one at a time, with branches TypeScript considers unreachable:

| site (`@a2ui/web_core` 0.14.0, `src/universal/basic_catalog/components/`) | declared type | written guard |
| --- | --- | --- |
| `Text.js:34` | `string` | `typeof props.text === 'string' ? props.text : String(props.text ?? '')` |
| `ChoicePicker.js:36-40` | `string[]` | `Array.isArray(rawVal) ? rawVal : typeof rawVal === 'string' ? [rawVal] : []` |
| `DateTimeInput.js:68` | `string` | `typeof props.min === 'string' ? props.min : props.min ? String(props.min) : ''` |

### Fix

Apply the specification's coercion table at the binder boundary, keyed on the declared prop
kind. Three changes in `@a2ui/web_core`:

1. **Scraper records the kind.** `getFieldBehavior`'s `{type: 'DYNAMIC'}` becomes
   `{type: 'DYNAMIC', kind: 'string' | 'number' | 'boolean' | 'string-list' | 'value'}`,
   read from the `REF:` description marker (`#/$defs/DynamicString` → `string`, etc.).
2. **Shared coercion utility** implementing the blueprint table, aligned with the protocol's
   §"Type conversion" and the existing `coerceToString` in `basic_functions.ts`:
   - `string`: null/undefined → `""`; number/boolean → `String()`; object/array → JSON
     stringify
   - `number`: number as-is; numeric string → parsed; anything else → `0`
   - `boolean`: boolean as-is; `"true"`/`"false"` case-insensitive, other strings → `false`;
     non-zero number → `true`; null/undefined → `false`
   - `string-list`: non-array → `[]`; elements coerced by the string rules
   - `value`: pass through unchanged
3. **Binder applies it.** `bindDynamicValue` coerces both the initial resolved value and every
   subscription update before they land in props. `DataContext.resolveDynamicValue` /
   `resolveSignal` stay unchanged: they do not know the declared target kind, and their other
   callers (action contexts, function args) have `value` semantics.

The declared types then hold, and the per-component guards above can be deleted.

`DynamicValue` has no coercion target: its literal branches are the whole of the spec's "any
type", so a bound `DynamicValue` passes through the binder unchanged and stays untypeable. No
first-party component declares one — in-repo its only occurrence is
`context: z.record(DynamicValueSchema)` inside `ActionSchema` — but it is part of the public
schema surface (exported from `common-types.ts`, registered in `schema_loader.ts`), so consumer
catalogs can declare `DynamicValue` props. The pass-through behavior is part of the fix's
contract, not an omission.

### Prior art

This finding is the same as issue
[#846](https://github.com/a2ui-project/a2ui/issues/846) (Strict Type Coercion in DataContext),
open and triaged P2. The unreachable branches above are evidence it does not currently cite.

---

## 9. A prop removed by `updateComponents` keeps its last value (web_core generic binder)

**Component:** `@a2ui/web_core` 0.10.6, `src/v0_9/rendering/generic-binder.ts`
(`rebuildAllBindings`, `resolveInitialProps`); the same lines stand on `upstream/main`, and in
0.14.0 at `src/resolution/generic-binder.js` (`rebuildAllBindings`, line 308).

**Severity:** functional bug — a component repainted without a prop still renders with it; no
error raised.

### Issue

`updateComponents` replaces a component's properties wholesale (`message-processor`
`existing.properties = properties`), and the binder rebuilds on the model's `onUpdated`. But
`rebuildAllBindings` resolves the new properties and merges them over the old:

```ts
this.currentProps = {...this.currentProps, ...resolved};
```

A key present in the previous properties and absent from the new ones is never cleared, so the
component keeps receiving the value it last had. Only a prop whose new value is set explicitly
changes; a prop that is dropped to mean "no longer so" cannot be expressed at all.

On 0.14.0 a repaint that only drops props leaves the binder's props as they were, so the component
is not rendered again at all: one that reads its own model's properties instead of the binder's
still shows the dropped prop until something else renders it. Reading them on the model's
`onUpdated` renders it without the prop.

### Reproduction

`updateComponents` with `{id: 'x', component: 'Button', child: 'l', variant: 'primary'}`, then
again with `{id: 'x', component: 'Button', child: 'l'}`: the model's properties have no
`variant`, and the rendered button is still primary.

### Fix

Rebuild from an empty object — `this.currentProps = {}` before resolving in
`rebuildAllBindings` — so the resolution's own writes (`isValid`, `validationErrors` from
checkable rules) land in the fresh props and nothing the new properties dropped survives.

---

## 12. The v0.9.1 capability schemas key their object `v0.9`; the v0.9.1 guide and web_core write `v0.9.1` (spec, Python agent SDK)

**Component:** `specification/v0_9_1/json/server_capabilities.json` and
`specification/v0_9_1/json/client_capabilities.json` (the root's one required key, `v0.9`);
`specification/v0_9_1/docs/a2ui_extension_specification.md`, lines 44 and 129 (`upstream/main`
`409ded29`); `a2ui-agent-sdk` 0.9.0's `resolve_catalogs` (`a2ui/utils/catalog_resolver.py`,
`_CAPABILITIES_ENTRIES`, lines 45–48); `@a2ui/web_core` 0.14.0's
`MessageProcessor.getRendererCapabilities` (`src/processing/message-processor.js`, line 102).

**Severity:** interoperability — a web_core renderer that advertises v0.9.1 and a Python agent
serving a v0.9.1 catalog cannot negotiate: the agent raises on the renderer's capabilities. The
v0.9.1 guide's own `a2uiClientCapabilities` example fails its schema.

**Reported:** `a2ui-project/a2ui` issue
[#3134](https://github.com/a2ui-project/a2ui/issues/3134), PR
[#3135](https://github.com/a2ui-project/a2ui/pull/3135) (in review).

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

Rename the root key of both v0.9.1 capability schemas from `v0.9` to `v0.9.1`. Swift core embeds
the v0.9.1 `client_capabilities.json` as `V09ClientCapabilitiesSchema`, which serves v0.9 and
v0.9.1, and picks up the change when it is built.

In the Python resolver, v0.9 and v0.9.1 catalogs read the `v0.9.1` entry and fall back to the `v0.9`
entry. The resolver takes the key from the registered catalogs' protocol version, and
`BasicCatalog("v0.9.1")` returns the v0.9 basic catalog, which reports v0.9. Renaming only the v0.9.1
row would leave an agent on the basic catalog reading `v0.9`, and would reject an agent that
registers the basic catalog beside its own v0.9.1 catalog.

The opposite direction — keep `v0.9`, and have the guide, web_core, Python core and Dart core write
`v0.9` for v0.9.1 — is also consistent.

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

## 14. No way to add a catalog to a processor after it is built (web_core, Python core, Dart core)

**Component:** `MessageProcessor` in `@a2ui/web_core` 0.14.0 (`src/processing/message-processor.js`),
`a2ui-core` 0.4.0 (`a2ui/core/processing/message_processor.py`) and Dart core
`dart/a2ui_core/lib/src/processing/processor.dart` on `upstream/main` `45633b97`. Each takes its
catalogs in the constructor, links them there (`linkCatalogs` / `link_catalogs`), and hands the same
list to its `RpcHandler`; `createSurface` looks a catalog up in that list, else `Catalog not found`.

**Severity:** missing capability. Nothing breaks for a client that knows every catalog when it
starts; a client that learns of one later has no supported way to render it.

**Reported:** `a2ui-project/a2ui` issue
[#3303](https://github.com/a2ui-project/a2ui/issues/3303), PR
[#3304](https://github.com/a2ui-project/a2ui/pull/3304) (in review).

### Issue

A `MessageProcessor` takes its catalogs once, in its constructor, and exposes nothing to add one: no
method on the processor, none on `RpcHandler`. A catalog is looked up only when a `createSurface`
names it, so the processor could take one later; the API gives it no way in.

The catalogs a client can render are not always known when it builds its processor: a catalog loaded
the first time a surface needs it, components that depend on the user's permissions, device, license
or feature flags (Discussion #3160), or multi agent composition, where a session gains a catalog each
time an agent joins. The protocol already lets the advertised set change, since the renderer attaches
its capabilities to every message it sends. Building a new processor drops every surface the old one
holds.

Until `@a2ui/web_core` 0.13.0, a client could push into the array it handed the constructor, because
web_core kept that array by reference. Since 0.14.0 (#3230, cross-catalog `$ref` resolution) the
constructor links copies of the catalogs (`linkCatalogs` starts from `Array.from(catalogs)`), so that
no longer works. The only way left is to push into the processor's `catalogs` field, which the type
marks private and which skips the linking.

Found building A2UIVerse's client, which loads every vendor catalog at runtime from its registry:
each canvas's processor is built before the catalogs it will need are known.

A2UIVerse carries PR #3304 as a local patch on `@a2ui/web_core` 0.14.0. A second build of a catalog
the processor holds — the same id, a newer artifact — cannot come in through `addCatalog`, which
refuses the id: the client puts the new build in the held one's place in the processor's own list,
linked to the held catalogs with `linkCatalogs` as `addCatalog` links them, and a surface created
before keeps the build it was created in.

### Reproduction

Build a processor over an empty array, push a catalog into that same array, and send a
`createSurface` naming it: with `@a2ui/web_core` 0.13.0 the surface is created; with 0.14.0 the same
message throws `A2uiCatalogError: Catalog not found`. Pushing into `processor.catalogs` instead still
creates the surface on 0.14.0.

### Fix

`addCatalog(catalog)` on `MessageProcessor` (`add_catalog` in Python), in web_core, Python core and
Dart core (PR #3304):

- it rejects a catalog whose id the processor already holds with `A2uiCatalogError`;
- it links the new catalog and the held catalogs to each other with `linkCatalogs`, as the
  constructor does, so cross-catalog `$ref`s resolve in both directions; the catalog passed in is not
  changed;
- it writes the result into the processor's list in place, which the `RpcHandler` shares.

`createSurface` and `getRendererCapabilities` read the list each time, so they see the catalog from
the next call on. Surfaces created before the call keep the catalogs they were created with, left as
an open question in the issue. Dart's processor cached validators, child-reference fields and
composition rules by catalog id; since a linked copy replaces a held catalog of the same id while
earlier surfaces keep the old one, they now belong to the catalog instance, held in `Expando`s that
do not keep a catalog alive, so a copy no surface uses any more is collected with its entries. The
shared conformance suite `conformance/core/add_catalog.yaml` runs in the web_core, Python and Dart
harnesses. Swift core has no `addCatalog` and no cross-catalog linking, and does not load the suite;
the PR leaves Swift as an open question.

### Prior art

No issue or PR proposed adding a catalog to a processor after it is built. Discussion
[#3160](https://github.com/a2ui-project/a2ui/discussions/3160) ("Federated Agentic UI: a component
catalog assembled at runtime from micro frontends") has the same need; its demo loads every remote
before the app starts, so its catalog is fixed for the session.

---

## 15. A function without an argument schema breaks `to_json`, and with it any processor of two or more catalogs (Python core)

**Component:** `a2ui-core` 0.4.0, `a2ui/core/catalog/catalog.py` — `Catalog._derive_model_entries`
(line 2462, `unbundled(assembled_functions.get(name, {}))`) and `_function_document` (line 737,
`document = dict(schema)`); reached from `Catalog.to_json`, from `Catalog._has_cross_document_refs`
(line 1364) and so from `link_catalogs` (line 2889), which the `MessageProcessor` constructor calls
(`a2ui/core/processing/message_processor.py`), and from `a2ui-agent-sdk` 0.9.0's `schema_to_prompt`
(`a2ui/inference_formats/direct_json/schema_prompt.py`) and `validate_payload`
(`a2ui/utils/validation.py`).

**Severity:** functional bug — a processor that holds a catalog with such a function and any other
catalog cannot be built: `TypeError: 'NoneType' object is not iterable`.

**Reported:** `a2ui-project/a2ui` issue
[#3305](https://github.com/a2ui-project/a2ui/issues/3305), PR
[#3306](https://github.com/a2ui-project/a2ui/pull/3306) (in review).

### Issue

`FunctionApi` and `FunctionImplementation` take their argument schema as optional
(`schema: Any = None`), and a function without one works: a single-catalog processor runs a call to
it. But `validation_schema` records the function as `None` (`{'functions': {'greet': None}}`), and
`to_json` passes that entry on: `assembled_functions.get(name, {})` returns the `None`, and
`_function_document` calls `dict(None)`.

`to_json` is called on more paths than serialization:

- `link_catalogs` checks each catalog for cross-catalog `$ref`s through `to_json` whenever it is given
  two or more catalogs, so since #3230 (2026-10-15) the `MessageProcessor` constructor raises for any
  two catalogs one of which has such a function, in v0.9 and v1.0. At `9facb99a`, the parent of
  #3230, the same processor builds. `add_catalog` (#3304) raises the same way.
- `get_renderer_capabilities` with `include_inline_catalogs` for v1.0 serializes each catalog with
  `to_json`, so it raises even for one catalog.
- In the agent SDK, `schema_to_prompt`, which writes the Direct JSON prompt, serializes each catalog
  with `to_json`, so it raises even for one catalog. `validate_payload` raises for two or more
  catalogs, through `link_catalogs`.

Validation is not affected: a processor with `STRICT_VALIDATION` accepts a `Text` whose `text` calls
the function, and rejects one that calls a function the catalog lacks.

`to_json` itself has failed for such a catalog since #3130 (2026-10-13). Python core is the only SDK
that allows the omission: web_core's `FunctionApi.schema` is a required `z.ZodTypeAny`, and Dart's
`FunctionImplementation` requires `argumentSchema`. In the repository, eight functions in
`python/a2ui_core/tests` omit the schema: six `FunctionImplementation`s in `test_processing.py` and
`test_rpc.py`, and two `FunctionApi`s in `test_catalog.py` and `test_rpc.py`. The suite passes, so
none of those tests reaches the failure.

### Reproduction

```python
fn = FunctionImplementation(name="greet", execute=lambda a, c=None, s=None: "hi",
                            allowed_callers="rendererOrAgent")
a = Catalog(catalog_id="a", protocol_version="v1.0", components=[], functions=[fn])
b = Catalog(catalog_id="b", protocol_version="v1.0", components=[])

MessageProcessor([a])     # builds; a call to greet runs
a.to_json()               # TypeError: 'NoneType' object is not iterable
MessageProcessor([a, b])  # TypeError, from link_catalogs; the same for v0.9 catalogs
```

### Fix

Treat a missing schema as `{}` where `validation_schema` records it. A function given `schema={}`
works on every path above: `validation_schema` records `{}`, and `to_json` writes a call whose `args`
may be any object (`"args": {"type": "object"}`), which `from_json` reads back unchanged. Or reject
a missing schema at construction, as web_core and Dart do by type, which breaks the eight test
functions above and any caller that omits it.

#3306 takes the first: where `validation_schema` is assembled, a function whose schema is `None` is
recorded as `{}`. `FunctionApi.schema` and `resolved_function_schema` still return `None`, and the
`FunctionApi` docstring says that `None` means the function takes any args. Strict validation and
renderer function calls accept any args for such a function before and after the change.

### Prior art

No issue, PR or discussion reports it (searched 2026-10-17). Of the open PRs, only #2724, which
relaxes the v1.0 catalog schema rules, touches the Python catalog package, and only
`_spec_shape.py`. Found writing the `add_catalog` tests for #3304.

---

## 16. A string prop naming a component reads as a child reference from v0.9 (Python core)

**Component:** `a2ui-core` 0.4.0, `python/a2ui_core/src/a2ui/core/state/component_model.py`,
`ComponentModel.get_child_references` (line 185) and its fallback to
`is_v0_8_heuristic_child_prop_key` (lines 220–227); the same lines stand on `upstream/main`
`409ded29` (lines 186–228). Reached from `analyze_topology`
(`python/a2ui_core/src/a2ui/core/state/validation_helpers.py`, line 167), and so from a
`MessageProcessor` given a `ValidationConfig` (without one it does not validate),
`a2ui-agent-sdk` 0.9.0's `validate_payload` and its Direct JSON parser.

**Severity:** functional bug — a valid v0.9 surface is refused as a cycle, or as holding a
reference that is not one, whenever a plain string prop happens to equal a component id.

**Reported:** `a2ui-project/a2ui` issue
[#3605](https://github.com/a2ui-project/a2ui/issues/3605), PR
[#3606](https://github.com/a2ui-project/a2ui/pull/3606) (in review).

### Issue

`get_child_references` reads a component's child references from its catalog's reference
spec when the spec declares any. When it declares none, it falls back to a heuristic its comment
calls "legacy v0.8 protocol support where catalog schemas don't define formal ComponentId/ChildList
refs": any prop not on a short list of names (`text`, `label`, `icon`, `variant`, …) whose string
value is the id of a component on the surface is a child reference.

The fallback runs on every surface, whatever its version, and for every component whose spec
declares no reference props — a leaf such as `Icon` or `Text` as much as a component the catalog
does not know. On a v0.9 catalog that declares every child with a `$ref`, an empty spec means the
component has no children. A leaf's string prop that equals an id — an icon's `name`, an enum
value — is read as an edge, so a valid surface fails topology: an `Icon` named `"mail"` inside the
row whose id is `mail` makes a cycle.

### Reproduction

```python
from a2ui.core.basic_catalog import BasicCatalog
from a2ui.utils import validate_payload

cat = BasicCatalog("0.9")
validate_payload([cat], [
    {"version": "v0.9", "createSurface": {"surfaceId": "s", "catalogId": cat.catalog_id}},
    {"version": "v0.9", "updateComponents": {"surfaceId": "s", "components": [
        {"id": "root", "component": "Row", "children": ["mail"]},
        {"id": "mail", "component": "Row", "children": ["mail-icon"]},
        {"id": "mail-icon", "component": "Icon", "name": "mail"},
    ]}},
])
# A2uiRecursionError: Circular reference detected involving component 'mail'
```

With the `Icon` named `"send"` the same surface passes.

### Fix

From v0.9, read a component the catalog declares by its reference spec alone: an empty spec yields
no child references. Keep the heuristic for v0.8 surfaces and for a component no spec covers.

#3606 does this and still reads typed `ComponentReference` values. One agent test's custom v1.0
catalog declared `CustomCard.child` as `{"type": "string"}` and reached its child only through the
heuristic; it now uses `ComponentId`, which the v0.9 and v1.0 protocol docs require of any property
holding a component id.

### Prior art

Closed issue [#2978](https://github.com/a2ui-project/a2ui/issues/2978) ("TS agent: remove name-based
child inference from the Direct JSON stream processor") removed the same inference from the
TypeScript agent, and notes that the Python agent applies `is_v0_8_heuristic_child_prop_key` "for any
component outside the reference map, whatever the version". The case here is a component inside the
reference map whose spec is empty, in the core rather than the agent; no issue or PR reports it.

---

## 17. A prop declared as a plain array of strings is typed as a child list (web_core generic binder)

**Component:** `@a2ui/web_core` 0.14.0, `src/resolution/generic-binder.d.ts` (`ResolveA2uiProp`,
line 118) and `src/types/common-types.d.ts` (`ChildList`, line 684).

**Severity:** typing versus runtime mismatch — a component casts its own declared prop back to the
type its schema gives it.

### Issue

`ResolveA2uiProp` resolves any prop whose type extends `ChildList` to `(string | ResolvedChildRef)[]`.
`ChildList` is `string[] | {componentId, path}`, so a prop declared as a plain `z.array(z.string())`
— a list of headings, a list of words — extends it and is typed as a child list. At runtime the
binder resolves children only for a prop marked with the `ChildList` reference, and the plain array
arrives as the strings it holds. A component reading it as declared needs a cast.

### Reproduction

A component whose schema declares `columns: z.array(z.string())`: in its render function
`props.columns` is typed `(string | ResolvedChildRef)[]`; painted with `columns: ['Name', 'Price']`,
it holds `['Name', 'Price']`.

### Fix

Type a prop as a child list only when its schema carries the `ChildList` reference marker, as the
binder's resolution decides; a plain string array resolves to `string[]`.

---

## 18. Every React component renders inside an element of its own (@a2ui/react)

**Component:** `@a2ui/react` 0.14.0, `dist/chunk-QAAGXJWH.js`: each component is hosted in a custom
element named `a2ui-react-<name>` (line 139), styled `display: contents` (line 103), with no class
and no way to render a component without it.

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
schema does not mark as a component id — a union of an id and text, an icon two levels down in an
array — draws an unresolved child reference. web_core resolves a marked field, a child list, an
array of ids, and a marked field one level into an array of objects.

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

## 19. Where a component cannot be drawn, the renderer draws developer text a host cannot replace (@a2ui/react)

**Component:** `@a2ui/react` 0.14.0, `dist/chunk-QAAGXJWH.js`: `LoadingPlaceholder` (line 224),
`UnresolvedChildReference` (line 244) and `ChildElement`'s unknown type (line 350); none is exported
or configurable.

**Severity:** developer text on the page — a surface shows the renderer's own messages to the person
using it.

### Issue

Three places draw text meant for a developer. A child not yet arrived draws `[Loading <id>...]` in
grey; a component type the catalog does not hold draws `Unknown component type: <type>` in red; a
child reference the renderer cannot resolve draws its error message in red, beside reporting it on
the surface. A streamed surface shows the first for every child still to come. No prop, context or
catalog entry lets a host draw its own.

### Reproduction

Render a surface whose root `Column` names children `a` and `b` while only `a` has been sent: the
page reads `[Loading b...]` until `b` arrives.

### Fix

A host-supplied stand-in for each of the three — a pending child, an unknown type, an unresolved
reference — through the surface's props or a context, defaulting to today's.

A2UIVerse carries a local patch on `@a2ui/react` 0.14.0 (`patches/@a2ui__react@0.14.0.patch`) that
draws a quiet stand-in in all three places, each marked with `data-a2ui-placeholder`; the error of an
unresolved reference is still reported on the surface.

---

## 20. A catalog written in zod over web_core's common types warns in the console at each prop built on them (web_core schema serializer)

**Component:** `@a2ui/web_core` 0.14.0, `src/catalog/schema_serializer.js`: `zodToUnbundledJson`
(line 227) converts a component schema with `zod-to-json-schema` under `$refStrategy: 'none'`
(line 233) and only then rewrites a `REF:`-marked schema to its `$ref` (`rewriteRefMarkers`, line
237); `src/catalog/types.js`: `linkCatalogs` (line 381) writes each catalog's document through
`referencesOtherCatalogs` (line 357) whenever a processor holds two or more.

**Severity:** console noise — a warning for every prop built on a dynamic type, about a part of the
schema the document never holds; a page holding several catalogs logs hundreds at each load.

### Issue

The dynamic types are recursive: a `FunctionCall`'s `args` hold `DynamicValue`s, which hold
`FunctionCall`s. Converting a component schema whose prop is one of them, `zod-to-json-schema`
walks into that recursion and, under `$refStrategy: 'none'`, prints `Recursive reference detected
at …! Defaulting to any`. The serializer then replaces the whole prop with its `$ref` into the
common types, so the document comes out right and the warning is about a subtree it drops.

The basic catalog does not warn: its generated components are wrapped in `spec()` and shaped by rule
(`src/catalog/spec_shape.js`). A component written in plain zod — every catalog a host or a vendor
writes — goes through `zodToUnbundledJson`. The warnings come the first time a `MessageProcessor`
holding it and any other catalog is built, `linkCatalogs` writing every catalog's document to look
for a reference into another.

### Reproduction

```ts
const Label = {name: 'Label', schema: z.object({text: DynamicStringSchema})};
const labels = new Catalog('https://example.com/labels/catalog.json', basicCatalog.protocolVersion, [Label]);
new MessageProcessor([basicCatalog, labels]);
// console.warn: Recursive reference detected at
//   #/properties/text/anyOf/2/properties/args/additionalProperties/anyOf/0/anyOf/5! Defaulting to any
labels.toJson().components.Label.properties.text;
// {"$ref": "common_types.json#/$defs/DynamicString", "description": "Represents a string"}
```

### Fix

Stop the conversion at a `REF:`-marked schema instead of rewriting after it: hand
`zod-to-json-schema` an `override` that returns the `$ref` for a schema whose description carries
the marker, so the recursion behind it is never walked. The document is unchanged.

A2UIVerse's client holds the shell catalog and the seven apps' catalogs, all written in zod; its
console holds about 680 of these warnings at each load. Nothing is done locally.

### Prior art

No issue or PR reports it. Open issue [#3155](https://github.com/a2ui-project/a2ui/issues/3155)
("Direct JSON prompt: list common types once instead of bundling them into every catalog schema")
is about the prompt, not the serializer.

---

## 21. Parts of the basic catalog's look no token reaches (web_core basic catalog)

**Component:** `@a2ui/web_core` 0.14.0, `src/universal/basic_catalog/components/Button.js` (its tokens,
lines 52–66; its styles, lines 68–110) and `Text.js` (the caption's `<em>`, line 55; its tokens,
lines 71–77; its styles, lines 79–136).

**Severity:** theming gap — a catalog themed on the basic catalog through its tokens cannot set four
parts of its look, and reaches them only through rules on the components' own classes.

### Issue

- **A button's text.** `.a2ui-button` sets a private `--_a2ui-text-color` to
  `--a2ui-color-on-secondary`, and the `Text` inside reads it; only the primary variant sets it
  again. The borderless variant sets `color` to `--a2ui-color-primary`, which reaches the button but
  not the `Text` it holds, so a borderless button's label draws in `--a2ui-color-on-secondary`. The
  token the docs give as "the color for the default variant", `--a2ui-color-secondary`, colours only
  its hover; its background reads `--a2ui-button-background`, then `--a2ui-color-surface`.
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
primary Button, each with a Text inside, rendered with `@a2ui/react` 0.14.0 in a page set in 18px
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
