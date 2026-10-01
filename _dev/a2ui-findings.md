# A2UI upstream findings

Issues found in the A2UI specification and reference implementations, recorded for
upstream contribution (`a2ui-project/a2ui`). Each finding is self-contained and
reproducible against upstream artifacts only.

---

## 1. `ChoicePicker` radio groups collide across surfaces (React renderer)

**Component:** `@a2ui/react` 0.10.2, `v0_9` build (`v0_9/index.js`, `ChoicePicker`
implementation, ~line 773).

**Severity:** functional bug — silent cross-surface interference, no error raised.

**Reported:** `a2ui-project/a2ui` issue
[#2447](https://github.com/a2ui-project/a2ui/issues/2447), PR
[#2449](https://github.com/a2ui-project/a2ui/pull/2449) (React and Angular).

**Resolved:** #2449 merged 2026-09-01.

### Issue

The React renderer names `ChoicePicker`'s radio inputs with a value derived only
from the component id:

```jsx
name={`choice-${context.componentModel.id}`}
```

HTML radio-group `name`s are **document-scoped**: every `<input type="radio">`
in the document sharing a `name` forms one mutually-exclusive group, regardless
of where each input sits in the DOM or which React root rendered it.

A2UI component ids, however, are **surface-scoped**. `common_types.json`
(`$defs/ComponentId`) defines the id as unique _"within the same surface"_, and
the protocol requires every surface's component list to contain exactly one
component with `id: "root"` — so id reuse across surfaces is not an edge case
but the spec's own guarantee. Multiple concurrent surfaces are first-class:
`client_data_model.json` models client state as a map of surface ids to data
models.

Consequently, when two live surfaces each contain a `ChoicePicker` whose
component ids are equal — e.g. both generated with `id: "picker"`, which is a
typical LLM-emitted id — their radio inputs join a single document-wide group:

- selecting an option in surface A **deselects** the current option in surface B;
- arrow-key navigation inside one picker walks focus into the other surface's
  radios;
- the emitted change events fire on the surface the browser toggled, which the
  user never interacted with.

No error is thrown and nothing in either surface's state indicates the cause;
the two surfaces simply appear to fight each other.

### Reproduction

1. One `MessageProcessor` (or two — the collision is document-level either way).
2. `createSurface` for `s1` and `s2` (any catalog including basic).
3. In each surface, `updateComponents` with a `ChoicePicker` of the same
   component id (e.g. `picker`) and at least two options each.
4. Render both surfaces into the same document.
5. Select an option in `s1`'s picker, then one in `s2`'s: `s1`'s selection is
   cleared by the browser.

### Fix

The radio `name` needs to be unique **per rendered `ChoicePicker` instance**,
not per component id. All radios within one picker must still share it.

Cleanest fix — use React's `useId()`, which is already the pattern used
elsewhere in the same file for label/input associations (e.g. lines ~621, ~652,
~786, ~866):

```jsx
const groupName = React.useId();
// ...
<input type="radio" name={groupName} ... />
```

`useId()` is stable per component instance and unique across all React roots in
a document, so it also covers the two-renderer-instances case.

An alternative fix with equivalent correctness for the single-processor case is
to include the surface id in the name (`choice-${surface.id}-${id}`), since ids
are unique within a surface — but `useId()` is simpler and covers more.

### Broader note

Any renderer feature that projects an A2UI component id into a document-global
HTML namespace (radio `name`, element `id`, `<form>` ids, anchor targets) has
this same hazard, because the protocol scopes ids per surface while the DOM does
not. Worth a one-line renderer-guide caveat: _never use a component id directly
in a document-global namespace; always qualify with the surface or an
instance-unique id._

---

## 2. Unsatisfiable `catalogId` requirement in `server_to_client.json` prose

**Component:** specification `v0_9_1/json/server_to_client.json` (also present
in `v0_9`).

**Severity:** documentation/schema-prose bug — the constraint as written cannot
be satisfied.

**Reported:** `a2ui-project/a2ui` issue
[#2445](https://github.com/a2ui-project/a2ui/issues/2445), PR
[#2446](https://github.com/a2ui-project/a2ui/pull/2446).

**Resolved:** #2446 merged 2026-09-01.

### Issue

The `description` fields of `UpdateComponentsMessage`, `UpdateDataModelMessage`,
and `DeleteSurfaceMessage` each state:

> "The createSurface message MUST have been previously sent with the
> 'catalogId' that is in this message."

But none of these three message bodies has a `catalogId` property, and all three
are declared `additionalProperties: false` — so a sender cannot include one, and
the clause is unsatisfiable as written. Correlation between these messages and
their surface's catalog is in fact by `surfaceId` alone.

### Fix

Reword the three descriptions to state the actual constraint, e.g.:

> "A createSurface message MUST have been previously sent for the `surfaceId`
> in this message; the surface's catalog is the one fixed by that
> createSurface."

No schema shape change needed — prose only.

---

## 3. Basic catalog's CSS-module class maps are dead code (React renderer)

**Component:** `@a2ui/react` 0.10.2, `v0_9` build (`v0_9/index.js`; `v0_9/index.css`).

**Severity:** functional/visual bug — the basic catalog's entire component
styling layer never reaches the page; no error raised.

**Reported:** comment on `a2ui-project/a2ui` issue
[#1307](https://github.com/a2ui-project/a2ui/issues/1307) (filed by another user), PR
[#2639](https://github.com/a2ui-project/a2ui/pull/2639) (in review).

### Issue

In the shipped `v0_9` bundle, every CSS-module import compiled to an empty
object:

```js
var Text_default = {};
var Button_default = {};
var TextField_default = {};
var ChoicePicker_default = {};
```

Every `styles.x` lookup is therefore `undefined`, and `v0_9/index.css` — which
holds the real rules (`.button`, `.borderless`, `.primary`, `.a2uiText`,
`.a2uiCaption`, …) — is not exported from `package.json` and is imported
nowhere. The two halves never meet. Observable consequences:

- `Button` renders a bare `<button>` with no class: the UA border and
  `text-align: center` apply, and the `variant: "borderless"` / `"primary"`
  branches produce **no DOM difference** (`classes.push(Button_default.borderless)`
  pushes `undefined`). The intended `.borderless` neutralization
  (`background: none; border: none; padding: 0`) never runs.
- `Text variant: "caption"` renders `<span><em>…</em></span>` with no class; the
  `<em>` picks up UA italic, and the dead `.a2uiCaption` rule
  (`text-align: left`, muted color) never applies.
- Template-literal class joins leak the literal string `undefined` into class
  attributes (`class="undefined chip …"` on ChoicePicker chips).
- Every `--a2ui-button-*` / `--a2ui-text-*` token read lives only in the dead
  stylesheet, so Button and Text have no working token surface at all.

Only components whose class names are string literals in the JS (`a2ui-card`,
`a2ui-icon`, `a2ui-modal-*`, `a2ui-tabs-*`, the `h1`–`h5`/`body` Text wrappers)
carry classes at runtime.

### Fix

Restore the class maps in the build (or inline literal class names), and export

- import `v0_9/index.css` so the rules ship. Until then, downstream catalogs can
  only style the basic components through element and structural selectors.

---

## 4. The generated setter for a binding-only prop is uncallable (web_core generic binder)

**Component:** `@a2ui/web_core` 0.10.7, `src/v0_9/rendering/generic-binder.ts` —
`ResolveA2uiProp` (~line 171) and `GenerateSetters` (~line 183).

**Severity:** typing only — no runtime effect. The generated setter cannot be called at all.

**Reported:** `a2ui-project/a2ui` issue
[#2528](https://github.com/a2ui-project/a2ui/issues/2528), PR
[#2529](https://github.com/a2ui-project/a2ui/pull/2529).

**Resolved:** #2529 merged 2026-09-29.

### Issue

Both types resolve a dynamic prop by subtraction: `Exclude<T, DataBinding | FunctionCall>`,
the declared union minus its binding shapes.

`ResolveA2uiProp` guards the case where the subtraction leaves nothing:

```ts
: Exclude<T, DynamicTypes> extends never
  ? any
  : Exclude<T, DynamicTypes>;
```

`GenerateSetters` has no such guard:

```ts
value: Exclude<NonNullable<T[K]>, DynamicTypes>,
```

For a prop declared as a binding with no literal branch (`DataBinding | FunctionCall`) the
subtraction leaves nothing. The getter falls back to `any`; the setter's parameter resolves to
`never`, which no value inhabits, so the setter is uncallable without a cast. The asymmetry is
the whole defect: the read path has a fallback, the write path was never given one.

### Reproduction

Verified against `main` @ `65aca464` with `tsc --noEmit`:

```ts
const BindingOnly = z.object({sort: z.union([DataBindingSchema, FunctionCallSchema])});
declare const props: ResolveA2uiProps<z.infer<typeof BindingOnly>>;
props.sort;    // any                     — the getter fallback applies
props.setSort; // (value: never) => void  — uncallable
```

### Fix

Give the setter the fallback the getter already has:

```ts
value: [Exclude<NonNullable<T[K]>, DynamicTypes>] extends [never]
  ? unknown
  : Exclude<NonNullable<T[K]>, DynamicTypes>,
```

Non-breaking: `(value: never) => void` admits no argument today, so widening the parameter can
only permit calls that previously failed to compile.

### Scope

No component in the repo's basic catalog declares a binding-only prop. `DataBinding` is absent
from `COMMON_TYPE_SCHEMAS` in `src/v0_9/catalog/schema_loader.ts`, so JSON-defined catalogs
cannot declare one either; the case is reachable from hand-written Zod component schemas.

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

The declared types then hold, and the per-component guards above can be deleted (`Text.tsx:77`,
`ChoicePicker.tsx:35`; `DateTimeInput.tsx:112-113` is finding 6's territory — `min`/`max` never
reach the DYNAMIC path until that classification fix lands).

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

## 6. Nested dynamic unions scrape as `STATIC` — `DateTimeInput.min`/`max` bindings are dead (web_core generic binder)

**Component:** `@a2ui/web_core` 0.10.7, `src/v0_9/rendering/generic-binder.ts`
(`getFieldBehavior`); surfaces in the basic catalog's `DateTimeInput` (`basic_components.ts`
`min`/`max`, the only in-repo props with this shape).

**Severity:** functional bug — a `min`/`max` data binding is silently ignored; no error raised.

**Reported:** `a2ui-project/a2ui` issue
[#2530](https://github.com/a2ui-project/a2ui/issues/2530), PR
[#2531](https://github.com/a2ui-project/a2ui/pull/2531).

**Resolved:** #2530 and #2531 closed 2026-09-29 — no longer reproduces on `upstream/main` after
the `web_core` move to `typescript/web_core`: `DateTimeInput`'s `min`/`max` are plain
`DynamicStringSchema`, and the rewritten `isDynamicOption` recognizes `Dynamic*` options by their
`REF:` description. The symptom remains in `Catalog.fromSchema`: the JSON catalogs declare
`min`/`max` as `allOf: [{$ref: DynamicString}, {if/then format check}]`, which the loader turns into
a bare `z.unknown()` that scrapes as `STATIC`. Left to
[#2822](https://github.com/a2ui-project/a2ui/issues/2822), which replaces `Dynamic*` types with
plain JSON Schema types.

### Issue

`getFieldBehavior` classifies a prop as `DYNAMIC` two ways: a `REF:` marker in the schema
description (`#/$defs/Dynamic*`), or a structural check that scans a `ZodUnion`'s options for
the `DataBindingSchema` object shape (`{path}`). Both look one level deep.

`DateTimeInput.min` and `max` are declared as

```ts
z.union([DynamicStringSchema, z.string().date(), z.string().time(), z.string().datetime()])
  .describe('The minimum allowed date/time in ISO 8601 format.')
```

The `.describe()` replaces the description, so the outer union carries no `REF:` marker, and
`DynamicStringSchema` is itself a `ZodUnion`, not a `ZodObject`, so the structural scan never
sees the `{path}` branch nested inside it. Both props scrape as `{type: 'STATIC'}` — while the
sibling `value`, a bare `DynamicStringSchema`, scrapes as `DYNAMIC`.

A `STATIC` prop passes through the binder untouched (`resolveAndBind`, `case 'STATIC': return
value`). A bound `min` therefore reaches the component as the raw `{path: '...'}` object: no
resolution, no subscription, no updates. The React component's guard
`typeof props.min === 'string' ? props.min : undefined` (`DateTimeInput.tsx:112-113`) swallows
the object, so the constraint is dropped silently instead of erroring.

### Reproduction

```ts
scrapeSchemaBehavior(DateTimeInputApi.schema).shape.min;   // {type: 'STATIC'}
scrapeSchemaBehavior(DateTimeInputApi.schema).shape.value; // {type: 'DYNAMIC'}
```

At runtime: `updateComponents` with a `DateTimeInput` whose `min` is
`{"path": "/limits/min"}`; the rendered input has no min constraint regardless of the value in
the data model.

### Fix

Recurse into nested unions in `getFieldBehavior`'s structural check: a union any of whose
branches is itself dynamic is dynamic. Third-party catalogs composing `Dynamic*` schemas into
wider unions hit the same misclassification, so the fix belongs in the scraper, not in the
`DateTimeInput` schema.

---

## 7. Unprefixed class names in the React basic catalog markup

**Component:** `@a2ui/react`, `src/v0_9/catalog/basic/components/ChoicePicker.tsx` and `Text.tsx`.

**Severity:** cosmetic to moderate. No broken rendering; the risk is collision with an application's
own CSS, and one class that styles nothing.

**Predates the CSS-module fix (finding 3).** Both classes are emitted identically on `main`
(`ChoicePicker.tsx:78`, `Text.tsx:87` and `:91`) and after that fix. They are only worth raising
now because the package's rules actually apply once finding 3 lands.

### Issue

Two components put unprefixed class names into the light DOM alongside their `a2ui-*` classes.

`ChoicePicker` renders a bare `chip` next to `a2ui-chip`:

```jsx
className={`a2ui-chip chip${isSelected ? ' selected' : ''}`}
```

Nothing in the React package styles `.chip`. The Lit catalog does carry a `.chip, .a2ui-chip`
selector, but those rules are shadow-scoped to the Lit elements and never reach React's DOM, so
in this package the class is inert.

`Text` puts the raw variant name on the wrapper:

```jsx
const className = ['a2ui-text', isCaption ? 'a2ui-caption' : variant].join(' ');
const className = ['a2ui-text', variant || 'body'].join(' ');
```

A `Text` therefore renders `class="a2ui-text h1"` or `class="a2ui-text body"`. This one is not
inert, and it is not React-specific: the Angular catalog emits the same shape from
`text.component.ts` (`[class]="'a2ui-text ' + variant()"`) and `button.component.ts`
(`[class]="'a2ui-button ' + variant()"`). The unprefixed variant name is the cross-renderer
convention, and it is a usable hook telling a consumer which variant rendered.

The concern is only the name. `h1` through `h5` and `body` are generic enough to collide with
application CSS, and Bootstrap defines `.h1` through `.h6` as real typography classes. The
package's own rules target the descendant element (`.a2ui-text h1`), not the wrapper class
(`.a2ui-text.h1`), so any collision is with the consumer's stylesheet rather than with anything
here. Because Angular shares the convention, prefixing it is a cross-renderer decision rather
than a React cleanup.

The compound-only classes elsewhere in the catalog (`primary`, `borderless` on `a2ui-button`,
`selected` on `a2ui-chip`, `invalid` on `a2ui-field-input`) share the unprefixed naming but are
lower risk, since they are only meaningful combined with an `a2ui-*` class.

### Fix

Drop the inert `chip` from the React `ChoicePicker`; it is the one piece that is genuinely
React-only and styles nothing.

Prefixing the variant hook (`a2ui-h1` ... `a2ui-h5`, `a2ui-body`) would namespace the rest, but
it has to change React and Angular together to keep the contract aligned, which makes it a
larger cross-renderer change rather than a cleanup.

Both change rendered markup, so neither belongs in a bug-fix PR.


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

## 10. The v0.9 streaming parser's placeholder is the basic catalog's `Row` (Kotlin agent SDK)

**Component:** `kotlin/agent_sdk_legacy/src/main/kotlin/com/google/a2ui/parser/StreamingParserV09.kt`,
`placeholderComponent`, and `StreamingParser.kt`, `addPlaceholderComponent` and the child-reference
traversal that calls it (`upstream/main` `cc9526b6`).

**Severity:** low — `Row` reaches the renderer only from a parser built without a catalog; with a
catalog that has no `Row`, every update carrying a placeholder is dropped instead.

**Reported:** `a2ui-project/a2ui` issue
[#2924](https://github.com/a2ui-project/a2ui/issues/2924), PR
[#2925](https://github.com/a2ui-project/a2ui/pull/2925) (in review).

### Issue

While a surface streams, the parser stands a placeholder in for each child a parent names before
the child itself has arrived — `loading_<child id>`, and `loading_children_<parent id>` for a list
still opening. The placeholder's component is fixed:

```kotlin
override val placeholderComponent: JsonObject
  get() {
    return JsonObject(
      mapOf("component" to JsonPrimitive("Row"), "children" to JsonArray(emptyList()))
    )
  }
```

and `addPlaceholderComponent` adds it without consulting the catalog. What follows depends on
whether the parser has one:

- **No catalog.** `StreamingParserV09`'s `catalog` parameter is nullable and defaults to `null`.
  Without a catalog there is no validator, so every intermediate update carries `Row` components,
  whatever catalog the surface's `createSurface` names. On a surface whose catalog has no `Row`,
  the React renderer draws `Unknown component type: Row` for each one until the children land.
- **A catalog without `Row`.** The validator rejects each update that carries a placeholder, and
  `yieldMessages`'s non-strict fallback drops it because `Row` is not among the catalog's
  components. Nothing reaches the renderer until the tree is complete.

The Python SDK checks before building a placeholder: `_can_use_placeholders()`
(`python/a2ui_agent/src/a2ui/inference_formats/direct_json/streaming.py`) emits one only when the
catalog declares the placeholder's type, and otherwise holds the tree back until it is complete.

### Reproduction

Stream a v0.9 surface — a parent naming three `Text` children that arrive one per chunk — through
`StreamingParserV09(null)`: each intermediate update carries
`{"id": "loading_<child>", "component": "Row", "children": []}` for the children not yet seen.
Through `StreamingParserV09(catalog)`, with a catalog that has no `Row` (the basic catalog with
`Row` renamed to `Stack`), the three intermediate updates are dropped and only the final one is
emitted.

### Fix

Port the Python check: emit placeholders only when the parser has a catalog that declares the
placeholder's type, and otherwise hold the tree back until it is complete, so no update is built
only to be dropped. Keeping the references to children that have not arrived, as finding 13
proposes, removes the placeholder altogether.

---

## 11. `componentTree` lets a component's own `type` prop replace its type (web_core, Python core)

**Component:** `@a2ui/web_core` 0.10.6, `src/v0_9/state/component-model.ts`, `ComponentModel`
`get componentTree()`; the same lines stand on `upstream/main` `102ec1a0`
(`typescript/web_core/src/state/component-model.ts`, lines 71–77), and the Python core port
repeats them in `ComponentModel.component_tree`
(`python/a2ui_core/src/a2ui/core/state/component_model.py`, lines 154–159).

**Severity:** functional bug for any catalog with a component whose props include `type` — a
consumer that reads the tree back gets the prop's value where the component's name belongs, and
loses the prop. In-repo, only the getters' own unit tests read the tree; the renderers read `type`
and `properties` apart.

**Reported:** `a2ui-project/a2ui` issue
[#2929](https://github.com/a2ui-project/a2ui/issues/2929), PR
[#2930](https://github.com/a2ui-project/a2ui/pull/2930) (in review).

### Issue

```ts
get componentTree(): any {
  return {
    id: this.id,
    type: this.type,
    ...this._properties,
  };
}
```

The properties are spread after the type, so a property named `type` overwrites it. `type` is an
ordinary prop name for a catalog — a status icon's state type, an input's kind — and nothing in the
spec reserves it. The wire shape names the component `component`, not `type`, so the collision is
the tree's own. Upstream's own sample catalogs declare such a prop: rizzcharts' `Chart` (`type`,
`doughnut` or `pie`) and gemini_enterprise's `MaterialInput` (`type`, `text`, `number`, `email`,
`tel` or `date`).

The Python core port builds the same dict the same way:

```python
tree = {"id": self.id, "type": self.type}
tree.update(self._properties)
```

The Dart core port's `ComponentModel.toJson` writes the name under `component`, as the wire does,
and is not affected.

### Reproduction

`new ComponentModel('s', 'StatusIcon', {status: {path: 'status'}, type: {path: 'statusType'}})
.componentTree` is `{id: 's', type: {path: 'statusType'}, status: {path: 'status'}}`: the
component's name is gone and the `type` prop reads as the name. In the Python port,
`ComponentModel('s', 'StatusIcon', properties={'status': ..., 'type': ...}).component_tree` is the
same dict.

### Fix

Spread the properties first and write `id` and `type` after them, or name the type `component` as
the wire does and keep properties from overwriting it — either way a component's own props cannot
replace its identity. The Python port's `component_tree` takes the same change.

### Prior art

No issue or PR reports this. Open PR [#2859](https://github.com/a2ui-project/a2ui/pull/2859)
(v1.0 basic catalog custom elements) adds a `metadata` key to the same getter and keeps the
properties spread last, so a prop named `metadata` would replace it the same way.

---

## 12. The A2UI extension's card `params` are keyed by version in the schema and written flat by the guide and the Python SDK

**Component:** `specification/v0_9_1/json/server_capabilities.json`,
`specification/v0_9_1/docs/a2ui_extension_specification.md` ("Agent Card"), and
`agent_sdks/python/a2ui_agent/src/a2ui/a2a/extension.py` (`upstream/main` `52c641a3`).

**Severity:** interoperability — a client that validates a card's declaration against the schema
refuses every card the SDK writes, and one that reads the guide's shape misses every card written to
the schema.

### Issue

The guide says the extension entry's `params` object "corresponds directly to the Server
Capabilities Schema". That schema's root has one required key, `v0.9`, with `supportedCatalogIds`
and `acceptsInlineCatalogs` under it:

```json
{"v0.9": {"supportedCatalogIds": ["…"], "acceptsInlineCatalogs": true}}
```

The same guide's example card, and the Python SDK's `extension.py`, write the two fields at the top
of `params`, with no version key:

```json
{"supportedCatalogIds": ["…"], "acceptsInlineCatalogs": true}
```

The client side has no such split: `client_capabilities.json` requires `v0.9` and every client
writes it. So the two directions of the same negotiation are keyed differently in practice.

### Reproduction

Validate the guide's own example `params` against `server_capabilities.json`: it fails on the
missing required `v0.9`. Build a card with the Python SDK's helper and validate its
`capabilities.extensions[].params` the same way: the same failure.

### Fix

Pick one. Either the guide's example and the SDK write `params` under `v0.9` as the schema requires,
or the schema drops the version key on the server side — the extension URI already carries the
version. A2UIVerse reads both shapes, each against the schema's matching part (`readSupportedCatalogIds`
in `@a2uiverse/sdk`).

---

## 13. Streaming is all-or-nothing on any catalog without `Row` (agent SDK streaming parsers)

**Component:** the Direct JSON streaming parsers — Python
`python/a2ui_agent/src/a2ui/inference_formats/direct_json/streaming.py` (`_can_use_placeholders`,
`yield_reachable`) and Kotlin `kotlin/agent_sdk_legacy/src/main/kotlin/com/google/a2ui/parser/StreamingParser.kt`
(`yieldMessages`) on `upstream/main` `cc9526b6`; TypeScript
`typescript/a2ui_agent/src/inference_formats/direct_json/streaming.ts` (`canUsePlaceholders`) in the
open PR #2916, "feat(ts_agent): stream Direct JSON responses".

**Severity:** missing capability. Nothing breaks; a surface on any catalog that does not declare
`Row` shows nothing until its whole component tree has arrived, then appears at once.

### Issue

The spec gives missing children to the renderer: an `updateComponents` component "may reference
children or data bindings that do not yet exist; clients should handle this gracefully by rendering
placeholders (progressive rendering)" (`a2ui_protocol.md`, v0.9 and v0.9.1; v1.0 says the same of
renderers). The renderers do this: web_core resolves a child whose definition has not arrived to a
`pending` node, replaced in place when the definition lands, and React draws it as
`LoadingPlaceholder` (`renderers/react/src/v0_9/A2uiSurface.tsx`).

The streaming parsers never send such a reference. A child not yet seen is swapped for a placeholder
component of the parser's own — the basic catalog's `Row` — and when the catalog has no `Row`,
nothing is sent until the tree is complete:

- **Python:** with `_can_use_placeholders()` false, `yield_reachable` yields only once the whole
  subtree under the root is complete (`_is_complete_subtree(root)`). Children that are already
  complete wait with the rest.
- **Kotlin:** the placeholders are built anyway, and each update carrying one fails validation and
  is dropped (finding 10).
- **TypeScript** (#2916): `canUsePlaceholders()` and the same whole-subtree hold-back as Python.

Progressive rendering therefore exists only on catalogs that declare a `Row`. On a design system's
catalog or a product's own without one, a long surface stays blank for the whole generation.

### Reproduction

Stream a v0.9 surface whose catalog has no `Row` (the basic catalog with `Row` renamed to `Stack`)
— a `Stack` naming three `Text` children that arrive one per chunk — through the Python parser: the
first three chunks yield no `updateComponents`; the last yields all four components. The same stream
on the basic catalog, with a `Row` parent, yields an update per chunk. The Kotlin parser, given the
catalog, behaves the same.

### Fix

Send what is complete and keep the references to children that have not arrived: the parent goes
out with `children` naming ids the renderer does not have yet, and the renderer draws its own
placeholder, as the spec assigns. This works on every catalog and needs no placeholder component.
The Python parser already sends intermediate updates under `RELAXED_VALIDATION` and runs its
topology check with `allow_dangling_references=True`, both of which permit references to ids not yet
sent. Where an SDK keeps agent-side placeholders, let the caller supply the placeholder component —
an empty container the catalog declares — instead of assuming `Row`.
