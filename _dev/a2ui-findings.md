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
[#3306](https://github.com/a2ui-project/a2ui/pull/3306).

**Resolved:** #3306 merged 2026-10-28.

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
raises on none of the paths above: `validation_schema` records `{}`, and `to_json` writes its `args`
as `{"type": "object"}`, which `from_json` reads as taking no args, since a catalog document closes
`args` unless it says otherwise. Or reject a missing schema at construction, as web_core and Dart do
by type, which breaks the eight test functions above and any caller that omits it.

#3306 takes the first. `validation_schema` and `resolved_function_schema` give `{}` for a function
without an argument schema, as for one given `schema={}`, and `to_json` writes the `args` of either
as `{"type": "object", "additionalProperties": true}`, so `from_json` reads it back as taking any
args. `FunctionApi.schema` still defaults to `None`, which its docstring now says means the function
takes any args. Strict validation and renderer function calls accept any args for such a function
before and after the change.

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
[#3606](https://github.com/a2ui-project/a2ui/pull/3606).

**Resolved:** #3606 merged 2026-10-29.

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

---

## 22. The comment on `A2uiStateError` names missing surfaces, which the processor throws as integrity failures (web_core)

**Component:** `@a2ui/web_core` 0.14.0, `src/errors.js`: `A2uiStateError` (line 95), its comment "Error thrown
for structural issues in the UI tree (missing surfaces, duplicate components)", and `A2uiIntegrityError`
(line 125), a subclass of `A2uiValidationError`; `src/processing/message-processor.js`: a surface created
twice (line 537) and an operation naming no surface (lines 777 and 802), each thrown as
`A2uiIntegrityError`.

**Severity:** documentation — a host reading the error classes catches the wrong one for a missing or a
doubled surface.

### Issue

The `MessageProcessor` throws `A2uiIntegrityError` for a `createSurface` naming a surface that exists, for
an `updateComponents` or `updateDataModel` naming one that doesn't, and for a component id given twice in
one `updateComponents`. Upstream's conformance suite pins that choice:
`conformance/core/message_processor_v0_9.yaml` expects `IntegrityError` for "Surface s1 already exists" and
for "Surface not found for message". `A2uiStateError` is thrown for none of them: its throw sites are a
component added twice to a surface's model (`state/surface-components-model.js`, line 114), a component
context for a component the model doesn't hold (`resolution/component-context.js`, line 36) and a resolver
handed another catalog (`resolution/node-resolver.js`, line 59). A host that catches `A2uiStateError` for a
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
