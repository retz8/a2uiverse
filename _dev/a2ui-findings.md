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

**Reported:** not yet.

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
[#2530](https://github.com/a2ui-project/a2ui/issues/2530).

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
