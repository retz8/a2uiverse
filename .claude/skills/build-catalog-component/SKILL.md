---
name: build-catalog-component
description: Use when materializing a new A2UI catalog component from a completed component decision doc, with no human input — the autonomous counterpart to design-catalog-component; what an autonomous run executes.
---

# Build Catalog Component

## Overview

A catalog component is one leaf spanning three surfaces — the **adapter** (schema + render),
the **client** (fixtures + tests), and the **deterministic agent** (canned event responses).
This **Build** skill mechanically materializes all three from the component's locked decision
doc; `design-catalog-component` produced that doc.

Build takes **no human input**: every judgment call — carry/drop/defer, synthetic props, A2UI
type selection, descriptions, response content, coupling — already happened in Design. This
step transcribes. That is what makes an autonomous run possible: the decision doc's
completeness is the only thing standing in for a human, so a run executes end-to-end from it.

The fuller worked-example artifacts for every step below live in
[`references/worked-example.md`](references/worked-example.md) (the shipped Text + Button,
grouped by surface, with pointers to the canonical repo files). Each step here keeps one minimal
mapping snippet and the rules; open the reference for a complete surface.

## Orchestration

A run materializes the three surfaces in order — **adapter → client → agent** — plus the
adapter's optional local-function sub-loop. A surface the decision doc doesn't reach produces no
artifacts (no agent-section rows → no agent artifacts). Run-wide invariants, stated once:

- **Consumes, never builds, infrastructure.** The test-space scaffold (`TestSpace`,
  `FixtureView`, `tests/helpers.tsx`, the `FIXTURES` barrel, `playwright.config.ts`), the A2A
  wire, and the agent-side machinery (`DeterministicAgentExecutor`, response-building,
  surfaceId-stamping, unknown-event fallback, the conformance validator, server wiring, the
  `run_executor` harness) are one-time infrastructure that already exists. This loop only
  consumes it. If any is missing, that is a scaffold/template concern outside this loop.
- **Registry/barrel-derived tests auto-cover — no per-component edit.** Several tests derive
  their assertions from a registry or barrel and pick up a new entry the moment it lands: the
  `COMPONENTS`/`FUNCTIONS` registry (`src/catalog.registry.ts`) driving both the parity test
  and the catalog smoke test's exact-set assertions, the `anyComponent`/`anyFunction` coverage
  checks, the client structural (`fixtures.test.ts`) and selector (`selector.test.tsx`) tests,
  and the agent conformance test (parametrized over `_EVENT_FIXTURES`). Where a step is one of
  these, it is a genuine no-op called out so the surface is provably complete.
- **Descriptions are copied verbatim.** Every `"description"` in `catalog.json` — component-
  level, per-prop, function-level, per-arg — is copied verbatim from the decision doc, never
  re-authored at build time.

## Adapter surface

Consumes the decision doc's adapter section (prop-surface table, functions list,
dropped/deferred list) and produces the artifacts below in order. Each carried table row drives
one schema line, one render field, one `catalog.json` property, and one or more test cases —
the same table, read four times. Dropped/deferred rows produce no artifact; they exist so the
surface is provably complete.

**1. Zod schema** — `src/components/<name>/<name>.schema.ts`. Translate each carried row to one
`.object()` line, keyed on its A2UI type:

- `Action` → `CommonSchemas.Action`; `ComponentId` → `CommonSchemas.ComponentId`;
  `AccessibilityAttributes` → `CommonSchemas.AccessibilityAttributes`; `Dynamic*` →
  `CommonSchemas.Dynamic*`
- an enum decision → a local `z.enum([...])` (there is no `DynamicEnum`)
- a plain fixed-configuration type → `z.boolean()` / `z.string()` / `z.number()`

`carry (required)` → no `.optional()`; bare `carry` → `.optional()`. A `(default: X)`
annotation does **not** produce `.default(X)` (it surfaces only in `catalog.json`, step 4).
`ComponentApi` is props-only (never `component`/`id`); the object ends `.strict()`. Export
`{name, schema} as const` plus the inferred `<Name>Props` type.

```ts
child: CommonSchemas.ComponentId,
action: CommonSchemas.Action,
variant: z.enum(['default', 'primary', 'invisible', 'danger', 'link']).optional(),
disabled: CommonSchemas.DynamicBoolean.optional(),
```

Pair with `<name>.schema.test.ts`, cases derived from the same table: minimal-valid parse
(required rows only); full-surface parse; one missing-required rejection per `carry (required)`
row; one unknown-prop rejection (`.strict()`); one out-of-enum rejection per enum row; one
data-binding acceptance per `Dynamic*` row.

**2. Render** — `src/components/<name>/<name>.tsx`. A plain-props `View` plus the
`createComponentImplementation` wiring. The `View`'s prop types are the schema's types **after
binder resolution**: `Action` → `onClick: () => void`; `ComponentId` → dropped from the View's
props, arrives as built `children`; `AccessibilityAttributes` → a local `Resolved*` plain-string
shape mapped onto `aria-*`; `Dynamic*` → the resolved primitive; everything else passes through.

Build notes (not optional style): pass resolved props **explicitly, never spread** (the resolved
object carries extra setters that leak as unknown props); cast `accessibility` to the resolved
shape (`props.accessibility as ResolvedAccessibility | undefined` — the static type still shows
the unresolved shape); a `ComponentId` row's wiring calls `buildChild(props.<name>)` as
`children`; tolerate the missing-`ThemeProvider` warning.

```tsx
export const ButtonComponent = createComponentImplementation(ButtonApi, ({props, buildChild}) => (
  <ButtonView onClick={props.action} disabled={props.disabled} variant={props.variant}>
    {buildChild(props.child)}
  </ButtonView>
));
```

A component with no `ComponentId`/`Action` row skips `buildChild`/`onClick` — the resolved value
passes straight through (see Text in the reference). Pair with `<name>.test.tsx`: render the
`View` directly with resolved plain props (never through the renderer), asserting the content/
label renders, the resolved `onClick` fires (when there's an `Action` row), and representative
prop passthrough.

**3. Folder barrel** — `src/components/<name>/index.ts`. Re-export the component implementation,
its `Api`, and the inferred props type. `src/catalog.ts` imports from this barrel.

**4. `catalog.json` entry** — `catalogs/<version>/catalog.json`. Add `components.<Name>` whose
`properties` mirror the schema key-for-key: `Action`/`ComponentId`/`AccessibilityAttributes`/
`Dynamic*` → `{"$ref": "<common_types base>#/$defs/<Type>"}`; an enum → `{"type": "string",
"enum": [...]}`; a plain type → `{"type": "<string|boolean|number>"}`. Every `"description"`
copied verbatim (see Orchestration); a `(default: X)` annotation adds `"default": X`. Add the
`"component"` discriminator (`{"const": "<Name>"}`), set `"required"` to the `carry (required)`
rows plus `"component"`, close with `"unevaluatedProperties": false`, and add
`{"$ref": "#/components/<Name>"}` to `$defs.anyComponent.oneOf`.

**5. Registry** — `src/catalog.registry.ts`. Add `<Name>Api` to the `COMPONENTS` map — the
single registry touch-point. Auto-covers (see Orchestration): the parity test's
`describe.each` and the catalog smoke test's exact-set assertion both derive from this map.

**6. Catalog registration** — `src/catalog.ts`. Import the component implementation and add it
to the `new Catalog(...)` components array.

**7. Catalog smoke test** — `src/catalog.test.ts`. Auto-covers (see Orchestration); no edit —
its exact-set assertion derives from the registry (step 5).

### Optional: local-function sub-loop

Run only when the decision doc's functions list is non-empty. Per entry (`name`, `args`,
`returnType`): (1) implement in `src/functions/<name>.ts` via `createFunctionImplementation` —
the zod arg schema types the **resolved** value, the `catalog.json` wire form types the same arg
as the corresponding `Dynamic*`; (2) pair a `<name>.test.ts` asserting the declared api, arg
validation, and the effect on `execute`; (3) register it in the `new Catalog(...)` functions
array; (4) add a `functions.<name>` entry to `catalog.json` (`call` const, `args` typed with the
wire `Dynamic*`, `returnType` const, `unevaluatedProperties: false`, `$ref` into
`$defs.anyFunction.oneOf`; descriptions verbatim); (5) add it to the `FUNCTIONS` map in
`src/catalog.registry.ts` (auto-covers — parity and smoke test). Full example in the
reference.

## Client surface

Consumes the decision doc's client section (fixture table + prop-coverage map, canned values
included) and produces fixtures, integration tests, and visual baselines. The mock boundary is
fixed by the consumed infra: `functionCall` runs locally against the catalog's registered
function; `event` goes to the injected handler (no real transport). Walk the fixture table once:

**1. Author fixtures** — `client/src/fixtures/<name>.ts`, one file per row, transcribing the
row's canned state into an `A2uiMessage[]`: a `createSurface` (`CATALOG_ID`, `version: 'v0.9'`)
then an `updateComponents` carrying a `root` component; a bound fixture adds an `updateDataModel`
resolving the path. A gallery row (a visually-distinct enum) becomes one file emitting one
surface per enum value.

**2. Register in the barrel** — `client/src/fixtures/index.ts`. Add each fixture to `FIXTURES`
and export it by name.

**3. Structural test** — `client/tests/fixtures.test.ts`. Auto-covers (see Orchestration); no
edit.

**4. Render / action tests** — `client/tests/render.test.tsx` / `actions.test.tsx`. Assertions
run through the **full renderer** via `renderFixture`, never against the `View`. Which assertion
follows the fixture's coverage axis: content renders (every fixture); a bound prop resolves
(bound fixture); `functionCall` runs locally and the handler is **not** called (functionCall
fixture); `event` dispatches to the handler with `{name, surfaceId, sourceComponentId}` (event
fixture); a visually-distinct state is honoured through the renderer (that state's fixture).

**5. Selector test** — `client/tests/selector.test.tsx`. Auto-covers (see Orchestration); no
edit.

**6. Claude-Chrome bless (bless-before-freeze)** — the agent drives the browser to
`/?fixture=<name>` (at the tunnel URL) for every new fixture and confirms the render against the
decision doc header's official documentation URL. This is the correctness gate before any
baseline is frozen. Skipping the bless means skipping step 7 — never freeze a baseline for a
render nobody, human or agent, has confirmed. (The Phase-5 nightly prompt owns skipping this
where Claude-Chrome is unavailable.)

**7. Playwright baselines** — `client/e2e/visual.spec.ts`. Add each **baselined** fixture's name
to the `FIXTURE_NAMES` list (an explicit selection, not barrel-derived — a fixture left off
silently gets no PNG). Run `yarn workspace client test:e2e --update-snapshots` (one PNG per
fixture under `visual.spec.ts-snapshots/`; a gallery yields one `fullPage` PNG), then re-run
`yarn workspace client test:e2e` to confirm the new baselines are clean.

## Agent surface

Consumes the decision doc's agent section (event-response table) and produces the agent fixture,
its mapping, the paired client fixture's coupling edit, and their tests. Walk the table once,
per event:

**1. Author the response fixture** — `agent/deterministic_agent/fixtures/<event>.json`.
Transcribe the row's ordered messages and canned values verbatim. `surfaceId` is **omitted**
(stamped at runtime). The response is a partial update (`updateComponents`/`updateDataModel`)
only, never a re-`createSurface`. Component `id`s and the data-model path must match the paired
client fixture exactly — both fixed at design time; transcribe them.

**2. Register the mapping** — `agent/deterministic_agent/responses.py`. Add one entry to
`_EVENT_FIXTURES`, keyed on the event name.

**3. Coupling edit** — amend the paired `client/src/fixtures/<name>.ts` in place (not a new
fixture): add the bound prop and an initial `updateDataModel`, so the server's write becomes
visible through the bound prop.

**Tests.** Author one response-content case in `agent/tests/test_responses.py` — assert
`build_response(action)` returns the row's messages, in order, with the surfaceId echoed onto
every operation. Conformance (`test_conformance.py`) auto-covers (see Orchestration); the
executor test (`test_executor.py`) is component-agnostic and untouched.

### Verification gate — the round-trip bless

With the deterministic server running (`uv run python -m deterministic_agent`), the agent drives
the browser at the tunnel URL, selects the paired fixture, triggers the event, and confirms the
post-event render matches the designed response (label flipped, button disabled) — the round-trip
analog of the client surface's static bless. Not tied to any committed artifact: the Phase-5
nightly prompt owns skipping it where Claude-Chrome is unavailable, deferring live confirmation
to `review-nightly`; the CI proofs (response content, conformance, the client bound-fixture
render test, the round-trip-render infra test) carry the autonomous PR in the meantime.
