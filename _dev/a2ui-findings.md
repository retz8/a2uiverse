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
(`$defs/ComponentId`) defines the id as unique *"within the same surface"*, and
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
not. Worth a one-line renderer-guide caveat: *never use a component id directly
in a document-global namespace; always qualify with the surface or an
instance-unique id.*

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
+ import `v0_9/index.css` so the rules ship. Until then, downstream catalogs can
only style the basic components through element and structural selectors.
