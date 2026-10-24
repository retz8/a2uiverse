# A2UI upstream findings

Issues found in the A2UI specification and reference implementations, recorded for
upstream contribution (`a2ui-project/a2ui`). Each finding is self-contained and
reproducible against upstream artifacts only.

---

## 5. Dynamic prop types are unenforced claims (web_core generic binder / DataContext)

**Component:** `@a2ui/web_core` 0.10.7, `src/v0_9/rendering/generic-binder.ts`
(`ResolveA2uiProp`), `DataContext.resolveDynamicValue`.

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

| site (`renderers/react`, `main` @ `65aca464`) | declared type | written guard |
| --- | --- | --- |
| `Text.tsx:77` | `string` | `typeof props.text === 'string' ? props.text : String(props.text ?? '')` |
| `ChoicePicker.tsx:35` | `string[]` | `Array.isArray(props.value) ? props.value : []` |
| `DateTimeInput.tsx:112-113` | `string` | `typeof props.min === 'string' ? props.min : undefined` |

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

## 8. No way for a web consumer to validate an agent's output against the v0.9.1 spec

**Component:** `@a2ui/web_core` (`renderers/web_core`, 0.10.7 on `main`), `src/v0_9/index.ts` and
the `copy-spec` script in `package.json`.

**Severity:** missing capability. Nothing breaks; a TypeScript application that consumes
model-authored A2UI has no upstream way to reject a non-conforming message before it renders.

### Issue

The spec ships complete JSON Schemas for v0.9.1 (`specification/v0_9_1/json/server_to_client.json`,
`common_types.json`) and the basic catalog's `catalog.json`. Validating a message properly takes
all three: `common_types.json` defines `FunctionCall` as `oneOf` a reference to the catalog's
`$defs/anyFunction`, which is what ties a `functionCall`'s `call` to the functions a catalog
actually declares.

`web_core` exposes none of that for v0.9.1:

- **The only exported raw schema is v0.9's message schema.** `src/v0_9/index.ts` exports
  `Schemas = {A2uiMessageSchemaRaw}`, imported from `./schemas/server_to_client.json`, whose `$id`
  is `…/v0_9/server_to_client.json` and whose `version` is `const: "v0.9"`. `common_types.json` is
  copied into the package but not exported, so the message schema's references into it cannot be
  resolved by a consumer.
- **v0.9.1 is not copied at all.** The `copy-spec` script's inputs are
  `specification/v0_8/json`, `v0_9/json`, `v0_9/catalogs`, `v1_0/json` and `v1_0/catalogs`;
  `v0_9_1` is absent.
- **There is no validator.** The only validation on the web path is `MessageProcessor`'s intake:
  each component's props are parsed against its catalog's zod schema, throwing
  `A2uiValidationError`. That is a renderer's check. It accepts any string as a `functionCall`'s
  `call` (`FunctionCallSchema.call` is `z.string()`), so an undeclared function surfaces only when
  a user triggers it ("Function not found in catalog"), and it does not check dangling child
  references, a missing root or cycles. Reproduced with `@a2ui/web_core` 0.10.6: a
  `MessageProcessor` over a `Catalog` of `BASIC_COMPONENTS` and `BASIC_FUNCTIONS` accepts, without
  error, an `updateComponents` whose `Card` names an undeclared child, one with no `root`, one where
  two `Card`s name each other, and a `Button` whose action calls `noSuchFunction`.

The Python agent SDK has the full check — `A2uiValidator` in `a2ui/validation/validator.py`
validates messages with `jsonschema` against the version's `server_to_client.json`,
`common_types.json` and the catalog, then runs component integrity validation (dangling
references, missing root) — and `conformance/core/validator.yaml` pins its behaviour, with Dart
and Kotlin ports. There is no TypeScript equivalent, so a web consumer either calls Python or
copies the spec files out of the repository and re-implements the integrity checks.

### Fix

Two parts, either useful alone:

1. **Ship and export the v0.9.1 schemas.** Add `specification/v0_9_1/json/*.json` and
   `v0_9_1/catalogs/**/*.json` to `copy-spec`, and export the raw `server_to_client.json` and
   `common_types.json` together, so a consumer can compile them with any JSON Schema validator.
2. **Export a TypeScript validator** equivalent to the Python `A2uiValidator` — schema validation
   against a given catalog plus the integrity checks — tested against `conformance/core/validator.yaml`
   so the two implementations cannot drift.

---

## 9. A prop removed by `updateComponents` keeps its last value (web_core generic binder)

**Component:** `@a2ui/web_core` 0.10.6, `src/v0_9/rendering/generic-binder.ts`
(`rebuildAllBindings`, `resolveInitialProps`); the same lines stand on `upstream/main`.

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
`specification/v0_9_1/docs/a2ui_extension_specification.md`, lines 44 and 129; the Python agent
SDK's `resolve_catalogs` (`python/a2ui_agent/src/a2ui/utils/catalog_resolver.py`, `_CAPABILITIES_ENTRIES`,
lines 37–44); web_core's `MessageProcessor.getRendererCapabilities`
(`typescript/web_core/src/processing/message-processor.ts`) (`upstream/main` `ce03d005`).

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

**Component:** `MessageProcessor` in web_core `typescript/core/web_core/src/processing/message-processor.ts`,
Python core `python/a2ui_core/src/a2ui/core/processing/message_processor.py` and Dart core
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

**Component:** Python core `python/a2ui_core/src/a2ui/core/catalog/catalog.py` on `upstream/main`
`45633b97` — `Catalog._derive_model_entries` (line 2462, `unbundled(assembled_functions.get(name, {}))`)
and `_function_document` (line 737, `document = dict(schema)`); reached from `Catalog.to_json`, from
`Catalog._has_cross_document_refs` (line 1364) and so from `link_catalogs` (line 2889), which the
`MessageProcessor` constructor calls (`python/a2ui_core/src/a2ui/core/processing/message_processor.py`),
and from the agent SDK's `schema_to_prompt`
(`python/a2ui_agent/src/a2ui/inference_formats/direct_json/schema_prompt.py`) and `validate_payload`
(`python/a2ui_agent/src/a2ui/utils/validation.py`).

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
(`python/a2ui_core/src/a2ui/core/state/validation_helpers.py`, line 167), and so from
`MessageProcessor`, `a2ui-agent-sdk` 0.9.0's `validate_payload` and its Direct JSON parser.

**Severity:** functional bug — a valid v0.9 surface is refused as a cycle, or as holding a
reference that is not one, whenever a plain string prop happens to equal a component id.

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

### Prior art

Closed issue [#2978](https://github.com/a2ui-project/a2ui/issues/2978) ("TS agent: remove name-based
child inference from the Direct JSON stream processor") removed the same inference from the
TypeScript agent, and notes that the Python agent applies `is_v0_8_heuristic_child_prop_key` "for any
component outside the reference map, whatever the version". The case here is a component inside the
reference map whose spec is empty, in the core rather than the agent; no issue or PR reports it.
