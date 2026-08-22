# Worked example — Text & Button build artifacts

The fuller worked-example code the `SKILL.md` steps excerpt from, grouped by surface. Each
entry names the **canonical repo file** — that file, not this doc, is the ground truth (the
validation walk reads the repo). Use this doc to see a complete surface's artifacts together;
open the cited file for the exact current source.

---

## Adapter surface

### Zod schema — `primer-a2ui-adapter/src/components/button/button.schema.ts`

```ts
export const ButtonApi = {
  name: 'Button',
  schema: z
    .object({
      child: CommonSchemas.ComponentId,
      action: CommonSchemas.Action,
      variant: z.enum(['default', 'primary', 'invisible', 'danger', 'link']).optional(),
      size: z.enum(['small', 'medium', 'large']).optional(),
      alignContent: z.enum(['start', 'center']).optional(),
      disabled: CommonSchemas.DynamicBoolean.optional(),
      loading: CommonSchemas.DynamicBoolean.optional(),
      inactive: CommonSchemas.DynamicBoolean.optional(),
      count: CommonSchemas.DynamicString.optional(),
      block: z.boolean().optional(),
      labelWrap: z.boolean().optional(),
      loadingAnnouncement: z.string().optional(),
      accessibility: CommonSchemas.AccessibilityAttributes.optional(),
    })
    .strict(),
} as const;

export type ButtonProps = z.infer<typeof ButtonApi.schema>;
```

Button's full carried surface: the `Action`/`ComponentId`/`AccessibilityAttributes` commons,
the `variant`/`size`/`alignContent` enums, the `disabled`/`loading`/`inactive` bound booleans,
`count` as a bound display value (`DynamicString`, from a `number | string` real type), and the
`block`/`labelWrap`/`loadingAnnouncement` fixed-config plains. Deferred (element-typed):
`icon`, `leadingVisual`, `trailingVisual`, `trailingAction`.

The Text schema — `primer-a2ui-adapter/src/components/text/text.schema.ts` — is the display-side
counterpart: the synthetic `text` (`DynamicString`), the polymorphic `as` carried as a curated
tag-name enum, and the `size`/`weight`/`whiteSpace` enums; it carries **no** `accessibility`
(a display primitive has no author-facing a11y channel).

```ts
export const TextApi = {
  name: 'Text',
  schema: z
    .object({
      text: CommonSchemas.DynamicString,
      as: z.enum(['span', 'p', 'div', 'label', 'strong', 'em', 'small']).optional(),
      size: z.enum(['small', 'medium', 'large']).optional(),
      weight: z.enum(['light', 'normal', 'medium', 'semibold']).optional(),
      whiteSpace: z.enum(['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line']).optional(),
    })
    .strict(),
} as const;
```

`ComponentApi` is props-only — never `component`/`id` (the framework owns those envelope
fields). `.strict()` forbids any prop outside the transcribed surface. `carry (required)` rows
have no `.optional()`; bare `carry` rows do. A `(default: X)` annotation does **not** become a
zod `.default(X)` — it surfaces only in `catalog.json`.

### Schema test — `primer-a2ui-adapter/src/components/button/button.schema.test.ts`

```ts
import {describe, it, expect} from 'vitest';
import {ButtonApi} from './button.schema';

const action = {event: {name: 'submit'}};

describe('ButtonApi.schema', () => {
  it('accepts a minimal valid Button (child + action)', () => {
    expect(ButtonApi.schema.safeParse({child: 'label-1', action}).success).toBe(true);
  });

  it('requires child', () => {
    expect(ButtonApi.schema.safeParse({action}).success).toBe(false);
  });

  it('rejects unknown props (strict)', () => {
    expect(ButtonApi.schema.safeParse({child: 'l', action, color: 'red'}).success).toBe(false);
  });

  it('rejects out-of-enum variant', () => {
    expect(ButtonApi.schema.safeParse({child: 'l', action, variant: 'ghost'}).success).toBe(false);
  });

  it('accepts a data-binding for disabled (DynamicBoolean)', () => {
    expect(
      ButtonApi.schema.safeParse({child: 'l', action, disabled: {path: '/canSubmit'}}).success,
    ).toBe(true);
  });
});
```

Cases derive mechanically from the table: minimal-valid parse (required rows only); full-surface
parse; one missing-required rejection per `carry (required)` row; one unknown-prop rejection
(`.strict()`); one out-of-enum rejection per enum row; one data-binding acceptance per `Dynamic*`
row.

### Render — `primer-a2ui-adapter/src/components/button/button.tsx`

```tsx
type ResolvedAccessibility = {label?: string; description?: string};

type ButtonViewProps = {
  variant?: 'default' | 'primary' | 'invisible' | 'danger' | 'link';
  disabled?: boolean;
  accessibility?: ResolvedAccessibility;
  onClick?: () => void;
  children?: ReactNode;
};

export function ButtonView({variant, disabled, accessibility, onClick, children}: ButtonViewProps) {
  return (
    <PrimerButton
      variant={variant}
      disabled={disabled}
      aria-label={accessibility?.label}
      aria-description={accessibility?.description}
      onClick={onClick}
    >
      {children}
    </PrimerButton>
  );
}

export const ButtonComponent = createComponentImplementation(ButtonApi, ({props, buildChild}) => (
  <ButtonView
    variant={props.variant}
    disabled={props.disabled}
    accessibility={props.accessibility as ResolvedAccessibility | undefined}
    onClick={props.action}
  >
    {buildChild(props.child)}
  </ButtonView>
));
```

The `View`'s prop types are the schema's types **after binder resolution**: `Action` →
`onClick: () => void`; `ComponentId` → dropped from the View's props, arrives as built
`children`; `AccessibilityAttributes` → a local `Resolved*` plain-string shape mapped onto
`aria-*`; `Dynamic*` → the resolved primitive; everything else passes through. Wiring notes:
pass resolved props **explicitly, never spread** (the resolved object carries extra setters);
cast `accessibility` to the resolved shape (static type still shows the unresolved shape); a
`ComponentId` row's wiring calls `buildChild(props.<name>)` as `children`.

The Text contrast — `primer-a2ui-adapter/src/components/text/text.tsx` — has no
`ComponentId`/`Action` row, so it skips `buildChild`/`onClick`:

```tsx
export const TextComponent = createComponentImplementation(TextApi, ({props}) => (
  <TextView text={props.text} as={props.as} />
));
```

### Render test — `primer-a2ui-adapter/src/components/button/button.test.tsx`

```tsx
import {describe, it, expect, vi, afterEach} from 'vitest';
import {render, screen, cleanup, fireEvent} from '@testing-library/react';
import {ButtonView} from './button';

afterEach(cleanup);

describe('ButtonView', () => {
  it('renders its child content as the label', () => {
    render(<ButtonView>Save</ButtonView>);
    expect(screen.getByRole('button', {name: 'Save'})).toBeInTheDocument();
  });

  it('fires onClick when clicked (the resolved action)', () => {
    const onClick = vi.fn();
    render(<ButtonView onClick={onClick}>Save</ButtonView>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('honors disabled', () => {
    render(<ButtonView disabled>Save</ButtonView>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

Renders the `View` directly with resolved plain props (never through the renderer/binder).
Asserts: content/label renders; the resolved `onClick` fires (when the table has an `Action`
row); representative prop passthrough. Rendering the primitive outside its theme context may log
a missing-`ThemeProvider` warning — tolerate it; it doesn't affect these assertions.

### Folder barrel — `primer-a2ui-adapter/src/components/button/index.ts`

```ts
export {ButtonComponent} from './button';
export {ButtonApi} from './button.schema';
export type {ButtonProps} from './button.schema';
```

`src/catalog.ts` imports the component from this barrel, not from the `.tsx`/`.schema.ts`
directly.

### `catalog.json` entry — `primer-a2ui-adapter/catalogs/v0.9.1/catalog.json`

```json
"Button": {
  "type": "object",
  "description": "An interactive button that triggers an action when clicked.",
  "properties": {
    "component": {"const": "Button"},
    "child": {
      "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentId",
      "description": "The ID of the component used as the button's label. Use a Text component; do not define it inline."
    },
    "variant": {
      "type": "string",
      "enum": ["default", "primary", "invisible", "danger", "link"],
      "default": "default",
      "description": "The visual style. 'primary' marks the main call-to-action; 'danger' a destructive action."
    }
  },
  "required": ["component", "child", "action"],
  "unevaluatedProperties": false
}
```

`properties` mirror the schema key-for-key, keyed the same way: `Action`/`ComponentId`/
`AccessibilityAttributes`/`Dynamic*` → `{"$ref": "<common_types base>#/$defs/<Type>"}`; an enum
→ `{"type": "string", "enum": [...]}`; a plain type → `{"type": "<string|boolean|number>"}`.
Every `"description"` (top-level and per-prop) is copied verbatim from the decision doc. A
`(default: X)` annotation adds `"default": X`. Add the `"component"` discriminator
(`{"const": "<Name>"}`), set `"required"` to the `carry (required)` rows plus `"component"`,
close with `"unevaluatedProperties": false`, and add `{"$ref": "#/components/<Name>"}` to
`$defs.anyComponent.oneOf`.

### Catalog registration — `primer-a2ui-adapter/src/catalog.ts`

```ts
export const CATALOG = new Catalog<ReactComponentImplementation>(
  CATALOG_ID,
  [TextComponent, ButtonComponent],
  [consoleLog],
);
```

### Registry — `catalog.registry.ts` (drives parity + smoke)

Add `<Name>Api` to the `COMPONENTS` registry map in `src/catalog.registry.ts`
(`export const COMPONENTS = {Text: TextApi, Button: ButtonApi} as const;`) — the single
registry touch-point. The parity test's `describe.each` loop and `anyComponent` coverage
check, and the smoke test's exact-set assertion, cover the new entry automatically:

```ts
it('registers exactly the registry components', () => {
  expect([...CATALOG.components.keys()].sort()).toEqual(Object.keys(COMPONENTS).sort());
});
```

### Local function — `primer-a2ui-adapter/src/functions/console-log.ts` (+ `.test.ts`)

```ts
export const consoleLog = createFunctionImplementation(
  {name: 'consoleLog', returnType: 'void', schema: z.object({message: z.string()})},
  ({message}) => {
    console.log('[A2UI]', message);
  },
);
```

The zod arg schema types the **resolved** value; the wire form in `catalog.json` types the same
arg as the corresponding `Dynamic*` (it may still be a literal or a binding when dispatched).

```ts
import {describe, it, expect, vi} from 'vitest';
import type {DataContext} from '@a2ui/web_core/v0_9';
import {consoleLog} from './console-log';

describe('consoleLog function', () => {
  it('declares its api', () => {
    expect(consoleLog.name).toBe('consoleLog');
    expect(consoleLog.returnType).toBe('void');
  });

  it('validates its args (message required)', () => {
    expect(consoleLog.schema.safeParse({message: 'hi'}).success).toBe(true);
    expect(consoleLog.schema.safeParse({}).success).toBe(false);
  });

  it('logs the message when executed', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleLog.execute({message: 'hello'}, {} as DataContext);
    expect(spy).toHaveBeenCalledWith('[A2UI]', 'hello');
    spy.mockRestore();
  });
});
```

The `catalog.json` function entry (`functions.consoleLog`, in the same catalog.json file):

```json
"consoleLog": {
  "type": "object",
  "description": "Logs a message to the browser console. A local client-side effect.",
  "properties": {
    "call": {"const": "consoleLog"},
    "args": {
      "type": "object",
      "properties": {
        "message": {
          "$ref": "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DynamicString",
          "description": "The message to log."
        }
      },
      "required": ["message"],
      "additionalProperties": false
    },
    "returnType": {"const": "void"}
  },
  "required": ["call", "args"],
  "unevaluatedProperties": false
}
```

`call` discriminator const, `args` typed with the wire `Dynamic*` per arg, `returnType` const,
`unevaluatedProperties: false`, and its `$ref` added to `$defs.anyFunction.oneOf`. Descriptions
copied verbatim from the decision doc's functions list. Register the function in the
`new Catalog(...)` functions array and add it to the `FUNCTIONS` registry map in
`src/catalog.registry.ts`.

---

## Client surface

### Fixtures — `client/src/fixtures/*.ts`

Literal content (`text.ts`):

```ts
export const textFixture: Fixture = {
  name: 'text',
  messages: [
    {version: 'v0.9', createSurface: {surfaceId: 'text', catalogId: CATALOG_ID}},
    {
      version: 'v0.9',
      updateComponents: {
        surfaceId: 'text',
        components: [{id: 'root', component: 'Text', text: 'Hello from Primer'}],
      },
    },
  ],
};
```

The bound counterpart (`text-bound.ts`) adds one message —
`{version: 'v0.9', updateDataModel: {surfaceId: 'text-bound', path: '/', value: {greeting: 'Bound hello'}}}`
— with the prop set to `{path: '/greeting'}`. `button-fn.ts`/`button-event.ts` follow the same
`createSurface`/`updateComponents` shape, differing in the `action` cell (`functionCall` vs
`event`). A gallery (`button-variants.ts`) factors the per-value surface into a helper and
flat-maps it over the enum:

```ts
const VARIANTS = ['default', 'primary', 'invisible', 'danger', 'link'] as const;

function variantSurface(variant: (typeof VARIANTS)[number]): A2uiMessage[] {
  const surfaceId = `variant-${variant}`;
  return [
    {version: 'v0.9', createSurface: {surfaceId, catalogId: CATALOG_ID}},
    {version: 'v0.9', updateComponents: {surfaceId, components: [/* … the variant's surface … */]}},
  ];
}

export const buttonVariantsFixture: Fixture = {
  name: 'button-variants',
  messages: VARIANTS.flatMap(variantSurface),
};
```

### Fixtures barrel — `client/src/fixtures/index.ts`

```ts
export {buttonVariantsFixture} from './button-variants';

export const FIXTURES: Fixture[] = [
  textFixture,
  textBoundFixture,
  buttonFnFixture,
  buttonEventFixture,
  buttonVariantsFixture,
];
```

### Render / action tests — `client/tests/render.test.tsx` / `actions.test.tsx`

Assertions run through the **full renderer** via `renderFixture` (`MessageProcessor` →
`A2uiSurface`), never against the `View` directly.

```tsx
// render — integration through the real renderer
it('renders a literal Text', () => {
  renderFixture(textFixture);
  expect(screen.getByText('Hello from Primer')).toBeInTheDocument();
});

// action path-1 — functionCall local, handler untouched
it('runs the registered consoleLog locally, not via the handler', () => {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const handler = vi.fn();
  renderFixture(buttonFnFixture, {actionHandler: handler});
  fireEvent.click(screen.getByRole('button', {name: 'Run local function'}));
  expect(logSpy).toHaveBeenCalledWith('[A2UI]', 'button-fn clicked');
  expect(handler).not.toHaveBeenCalled();
  logSpy.mockRestore();
});
```

Which assertion to add follows the fixture's coverage axis: content renders (every fixture); a
bound prop resolves (bound fixture); `functionCall` runs locally and the handler is not called
(functionCall fixture); `event` dispatches to the injected handler with
`{name, surfaceId, sourceComponentId}` (event fixture); a visually-distinct state is honoured
through the renderer (that state's fixture).

### Visual baselines — `client/e2e/visual.spec.ts`

Add each newly **baselined** fixture's name to the `FIXTURE_NAMES` list (explicit selection,
not barrel-derived). Snapshots live under `client/e2e/visual.spec.ts-snapshots/` — one PNG per
fixture; a gallery yields one `fullPage` PNG covering all its surfaces.

---

## Agent surface

### Response fixture — `agent/deterministic_agent/fixtures/submit.json`

```json
[
  { "version": "v0.9", "updateDataModel": { "path": "/submitted", "value": true } },
  { "version": "v0.9", "updateComponents": {
    "components": [ { "id": "label", "component": "Text", "text": "✅ Sent — server received submit" } ] } }
]
```

`surfaceId` is **omitted** — stamped at runtime by `_stamp_surface`. The response is a partial
update only, never a re-`createSurface`. Component `id`s and the data-model path must match the
paired client fixture exactly (`id: 'label'`, `/submitted`).

### Mapping — `agent/deterministic_agent/responses.py`

```python
_EVENT_FIXTURES = {"submit": "submit.json"}
```

### Coupling edit — `client/src/fixtures/button-event.ts`

Amend the existing client event fixture in place: the root `Button` gains
`disabled: {path: '/submitted'}`, and a trailing
`{version: 'v0.9', updateDataModel: {path: '/', value: {submitted: false}}}` initializes the
data model — so the server's `/submitted = true` write visibly disables the button.

### Response-content test — `agent/tests/test_responses.py`

```python
def test_submit_returns_data_model_then_components_with_surface_echoed():
    msgs = build_response({"name": "submit", "surfaceId": "button-event", "context": {}})
    assert msgs[0]["updateDataModel"] == {"surfaceId": "button-event", "path": "/submitted", "value": True}
    assert msgs[1]["updateComponents"]["components"][0]["text"] == "✅ Sent — server received submit"
```

Asserts `build_response(action)` returns the row's messages, in order, with the surfaceId echoed
onto every operation. Conformance (`test_conformance.py`) auto-covers the new event (parametrized
over `_EVENT_FIXTURES`); the executor test (`test_executor.py`) is component-agnostic and
untouched.
