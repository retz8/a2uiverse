---
name: design-catalog-component
description: Use when adding a new component to the A2UI catalog and its design decisions need a human in the loop — the interactive, human-gated counterpart to build-catalog-component.
---

# Design Catalog Component

## Overview

A catalog component is one leaf spanning three surfaces — the **adapter** (schema +
render), the **client** (fixtures + tests), and the **deterministic agent** (canned event
responses). Authoring it is split into two coupled skills at the human-input boundary:
this **Design** skill makes the decisions that need human judgment; `build-catalog-component`
mechanically materializes them.

Design's output is a per-component **decision doc** at the project's component-decision
location — for this project, `_dev/docs/new-components/<component-name>.md`. The doc must be
complete and unambiguous enough that `build-catalog-component` runs from it with no human in
the loop; that completeness bar is the whole contract between the two skills.

## Orchestration

A run walks the three surface design calls in a fixed order — **adapter → client → agent** —
forced by data dependency: the client fixture set derives from the *locked* adapter
prop-surface table, and the agent responses derive from that table's `event`-shaped `Action`
rows. A surface with nothing to produce gets no section — a component with no `event`-shaped
action gets no agent section at all (the analog of "Text carries no accessibility").

**The human gate.** Every surface design call runs in the same three stages — never as one
table dump:

1. **Present the derived surface** — the ground truth this surface's decisions are made
   against, before any A2UI judgment (for the adapter, the real prop list; for the client,
   the fixture scenarios the prop-walk yields; for the agent, the events the component
   emits).
2. **Propose the A2UI table** — the surface's checklist applied to every row. Where a rule
   decides cleanly, state the decision. Mark every row whose decision is *not* clear-cut as
   **`not sure`**.
3. **Resolve the `not sure` rows one by one with the human** — for each, state the semantics,
   the plausible options, and the tradeoff; the human decides and the row is filled. Never
   batch them.

Only after every row is decided does the human lock that section.

**One shared doc; surfaces append.** There is one decision doc per component. Each surface
appends its own section; a later surface never restructures or rewrites a section already
there. The doc carries a component-level header — name, official documentation URL, a
reference to where the real prop surface was resolved, and a de-branded component-level
description (which becomes the `catalog.json` entry's `description`).

**Handoff.** A run produces the complete doc — every applicable surface section — and the
human locks it as a whole. That locked doc is the single handoff to `build-catalog-component`:
all of Design, one review, then all of Build.

## Adapter surface

Produces the decision doc's **adapter section**.

### Inputs

1. **The component's official documentation URL** — human-provided. Source of the documented
   prop surface and the prose semantics that become the `catalog.json` descriptions.
2. **The component's real prop surface** — agent-resolved from its installed type
   declarations.

### Real-prop resolution method

Locate the component's type in the installed package's type declarations and follow
intersections and spreads to enumerate every real prop. Then reconcile that surface against
the official doc: the doc gives the documented surface and its meaning; the types give the
exhaustive surface, including anything the doc omits that must still be carried or explicitly
dropped.

### Prop-surface decision checklist

Walk every real prop (plus any synthetic prop introduced below) and make one decision each:

- **Carry / drop / defer.**
  - **Conservative-drop rule — CARRY IS THE DEFAULT; A DROP MUST BE POSITIVELY JUSTIFIED.**
    The catalog is a faithful one-to-one **translation** of the documented component library —
    never a redesign, and never a curated subset of it. **We translate; we do not reinvent.**
    Every prop the official documentation lists is **carried** unless you can name a concrete
    reason it genuinely *cannot* be represented: it has no A2UI representation at all (the
    categorical drops below), or the doc is stale against the installed code (e.g. a deprecated
    alias). "Seems minor", "hard to motivate for a generating agent", "no current flow needs
    it", "adds a surface", or "keeps the leaf simpler" are **never** grounds to drop — deciding
    which of a component's documented capabilities an agent deserves is exactly the redesign
    this rule forbids. **The burden of proof is on the drop, not the carry.** When in doubt,
    carry (or mark `not sure` and ask) — never drop by default.
  - **A handler/callback is NOT unrepresentable — it maps to `Action`.** An interaction
    callback (`onClick`, `onToggle`, `onClickOutside`, `onDismiss`, …) has a protocol
    representation: `Action` — or, when the callback is the component's state write-back, the
    two-way binding on the bound value prop (as Checkbox folds `onChange` into `checked`). So
    "it's just a callback nothing needs" is never a valid drop reason. Carry it as an `Action`
    (or as the write-back) unless it is genuinely unrepresentable.
  - When a doc-listed prop's type doesn't map cleanly, prefer carrying a curated projection of
    it (e.g. a `z.enum` over its meaningful values) over dropping it.
  - **Drop** props with no A2UI representation. In particular, the non-`aria-*` slice of an
    inherited HTML-attribute spread (`type`, `name`, `tabIndex`, `data-*`, and similar) has no
    protocol representation and is dropped. Named styling passthroughs (`className`, `style`) are
    dropped on the same basis.
  - **Defer** props that are not JSON-serializable — most commonly element-typed props (a prop
    typed to accept a rendered element/node) — recording a reason for each.
  - **Polymorphic element-type selectors** (a prop like `as` typed as `React.ElementType` — an
    element *type*, not a rendered node) fit neither rule above. Decide per component: **carry**
    it as a curated `z.enum` of the semantically-meaningful tag names when it selects among
    display-equivalent elements (a display primitive — e.g. Text's `as` →
    `z.enum(['span','p','div','label','strong','em','small'])`); **drop** it when it switches the
    component's behavior or identity (e.g. a button rendering as a link, expressed through a
    variant instead). Mark `not sure` when the intent is unclear.
  - Otherwise **carry** the prop into the schema. Record required-ness in the decision cell:
    `carry (required)` when required, bare `carry` when optional. Heuristic: the synthetic
    content channel and the primary interaction prop are required; a real prop's required-ness
    otherwise follows its installed type unless the design deliberately tightens it.
  - When a carried prop has a default, record it as an annotation in that row's `A2UI type`
    cell, e.g. `z.enum([...]) (default: "span")`. The default is the one the **installed
    implementation** applies — the code is the authority; the official doc corroborates it but
    may be stale, and on conflict the code wins.

- **Synthetic-content-prop rule.** When a component takes its content through `children` as
  raw content (text, not references to other components), introduce a synthetic value prop to
  carry it — the component stays a true leaf, and the synthetic prop is the A2UI-idiomatic
  content channel (example: `text` on Text). When the content is itself a nested component
  reference rather than raw content, the synthetic prop is typed as a `ComponentId` instead
  (example: `child` on Button). A synthetic value prop still gets its A2UI type from the rule
  below (typically `DynamicString`).

- **A2UI type selection**, per carried prop:
  - **Bound runtime state** (drives at render time from data or an async operation) → the
    matching `CommonSchemas.Dynamic*` wrapper (`DynamicBoolean`, `DynamicString`, etc.).
  - **Fixed authoring-time configuration** (set once, never data-driven) → a plain
    `z.boolean()` / `z.string()` / `z.number()`.
  - **Enums** → a local `z.enum` (there is no `DynamicEnum`), whether or not the value is
    otherwise bound or fixed.
  - **Interaction** (a click/press/etc. handler) → `Action`.
  - **A reference to another component as content** → `ComponentId`.
  - **Accessibility** → `AccessibilityAttributes`.
  - **Union-typed value** (e.g. `number | string`) → pick the `Dynamic*` matching how the value
    is used; a display value is `DynamicString` even when it is usually numeric (example:
    Button's `count`).

- **Per-component fidelity.** Carry a protocol common only where it is a meaningful
  author-facing capability of *this* component — never as a uniform base, and never merely
  because the installed type incidentally inherits it. Most components inherit an `aria-*`
  surface either way (Button through its `ButtonHTMLAttributes` spread, a polymorphic component
  like Text through its host-element spread), so "the type exposes aria" does not by itself
  justify carrying `accessibility`. Carry it where the component has genuine author-facing
  accessibility needs — typically interactive components: Button carries `accessibility`, a plain
  display primitive like Text carries none. When unclear, mark it `not sure`.

- **De-branded description.** Author each prop's semantic description in domain terms — what
  the prop does. Never name the design system or renderer; the description is read by the
  generating agent, which has no use for that detail.

Only **spec-navigation** — reading the upstream protocol spec itself — points out to the
`a2ui-sdk-design` skill. The conventions above are self-contained here.

### Design call

Run the human gate (see Orchestration). The `not sure` residue here is moderate — typical
cases: bound-state-vs-config borderlines, tightening an optional prop to required,
defer-vs-carry edges, a questionable synthetic prop.

### Adapter-section format

- A **prop-surface table**: `prop | decision | synthetic? | A2UI type | description`, where
  `decision` is carry/drop/defer. Required-ness and defaults stay in-cell (`carry (required)`;
  `(default: "span")` in the `A2UI type` cell) — no extra columns.
- A **functions list** — name, args, returnType, a de-branded function-level description, and
  a de-branded description per arg — for each local function the component needs (e.g. an
  effect invoked from an `Action`).
- A **dropped/deferred props list** — prop, reason — for every prop dropped or deferred. A
  categorical drop (e.g. the non-`aria-*` HTML-attribute spread) may be one grouped row.

#### Example (modelled on Button; teaching-sized)

Component-level description: An interactive button that triggers an action when clicked.

| prop | decision | synthetic? | A2UI type | description |
|---|---|---|---|---|
| `child` | carry (required) | yes | `ComponentId` | The component used as the button's label. |
| `action` | carry (required) | no | `Action` | The action performed when the button is clicked. |
| `variant` | carry | no | `z.enum(['default','primary','invisible','danger','link']) (default: "default")` | The visual style; `primary` marks the main call-to-action. |
| `disabled` | carry | no | `DynamicBoolean` | Whether the button is disabled and cannot be clicked. |
| `accessibility` | carry | no | `AccessibilityAttributes` | Accessibility label/description for assistive technologies. |
| `icon` | defer | — | — | — |

Functions:

| name | args | returnType | description |
|---|---|---|---|
| `consoleLog` | `message: string` (The message to log.) | `void` | Logs a message to the browser console. A local client-side effect. |

Dropped/deferred props:

| prop | reason |
|---|---|
| `icon` | Element-typed; not JSON-serializable. Carry as a `ComponentId` child once an Icon component exists. |
| `type`, `name`, `tabIndex`, `data-*`, and the rest of the non-`aria-*` `ButtonHTMLAttributes` spread | Dropped: no A2UI representation. |

## Client surface

Produces the decision doc's **client section**. Its fixture set is derived from the locked
adapter prop-surface table, so the client design call cannot start until that table is locked.

### The prop-walk

Walk the locked adapter table prop-by-prop; for each **carried** prop, accumulate the
scenario(s) it introduces into the fixture set:

| Prop kind (from the adapter table) | Scenario(s) it introduces |
|---|---|
| content-bearing `Dynamic*` (a synthetic value prop) | a **literal** fixture + a **bound** fixture (proves path binding) |
| `Action` | one fixture **per action shape** it accepts (`functionCall`, `event`) |
| a **visually-distinct** enum | a **gallery** fixture — one surface per enum value |
| a **visually-distinct** `Dynamic*`/config prop (e.g. `disabled`, `loading`, `block`, `count`) | a fixture with that state **set** |
| a **child/slot** `ComponentId` prop (e.g. Button's `child`) | **no fixture of its own** — exercised as the content of every fixture of its parent |
| a **non-visual** prop (e.g. `accessibility`, `loadingAnnouncement`) | **no fixture** — a render-test assertion instead |

**Single-axis by default:** each fixture isolates one prop's scenario, all other props at
defaults; combine props into one fixture only when semantically coupled (e.g. `loading` +
`loadingAnnouncement`).

**Exhaustiveness:** the deduped union of these scenarios is the fixture set. Every carried
prop must appear in the coverage map — a visual prop via a baselined fixture, a non-visual
prop via a render-test assertion.

### Design call

Run the human gate (see Orchestration); the fixture-set brainstorm from the prop-walk is the
core of the proposal stage. The `not sure` residue here is thin — mainly the
**visual-vs-non-visual** classification of a prop and **semantic-coupling** calls.

### Client-section format

- A **fixture table**: `fixture | exercises (coverage axis) | component state / canned values | baselined?`.
  Canned values live in-cell: literal strings; bound fixtures as `{path}` plus the data-model
  value that resolves it; events as `{name, context}`; enum values spelled out. A gallery is
  one row noting "one surface per enum value."
- A **prop-coverage map**: `adapter prop | covered by` — every carried adapter-table prop maps
  to the fixture(s) that exercise it, or to `render-test assertion` for a non-visual prop. A
  missing row means the fixture set is incomplete.

#### Example (modelled on Button + Text; teaching-sized)

Fixture table (Button):

| fixture | exercises | component state / canned values | baselined? |
|---|---|---|---|
| `button-fn` | interaction — functionCall path | `child`→`label` ("Run local function"); `variant: primary`; `action: functionCall consoleLog {message: "button-fn clicked"}` | yes |
| `button-event` | interaction — event path | `child`→`label` ("Send event"); `variant: primary`; `action: event {name: "submit", context: {}}` | yes |
| `button-variants` | visual enum — `variant` | one surface per `['default','primary','invisible','danger','link']`; each `child`→`label` (the variant name); `action: functionCall consoleLog {message: <variant>}` | yes (one PNG) |
| `button-disabled` | visually-distinct state — `disabled` | `child`→`label` ("Disabled"); `disabled: true`; `action: event {name: "noop", context: {}}` | yes |

Prop-coverage map (Button):

| adapter prop | covered by |
|---|---|
| `child` | every button fixture (the label) |
| `action` | `button-fn` (functionCall) + `button-event` (event) |
| `variant` | `button-variants` |
| `disabled` | `button-disabled` |
| `accessibility` | render-test assertion (non-visual) |

Text's content axis, in the same format: `text` (literal, `text: "Hello from Primer"`) and
`text-bound` (bound, `text: {path: "/greeting"}` + data model `{greeting: "Bound hello"}`) —
demonstrating the content-channel rule (literal + bound).

## Agent surface

Produces the decision doc's **agent section**, derived from the adapter table's `event`-shaped
`Action` rows, in the order they appear. The `functionCall` action shape runs locally
client-side and never reaches the agent, so it produces no agent fixture; a component with no
event-shaped action gets no agent section (see Orchestration's skip rule).

### The design call

Walk each `event`-shaped `Action` the component emits; for each event name, design the canned
A2UI response the deterministic agent returns. The response is an **invented** design artifact
— "what would a plausible server do in reaction to this event?" — not a derivation from
anything upstream. The doc-header official documentation URL is the plausibility reference: it
grounds what a real reaction would sensibly look like without dictating one.

Run the human gate (see Orchestration). Uniquely for this surface the `not sure` residue is
**thick**: because the response is invented rather than derived, the proposal itself is the
judgment — which data-model path to write, what confirmation content, which prop to couple — so
the human's review is substantive co-design, not a rubber-stamp.

### Output is response + coupling, one unit

The design call's output per event is the response messages, with concrete canned values,
together with the visibility coupling that renders them.

**The visibility principle.** A response should drive both update mechanisms where the
component supports them — `updateComponents` (a component swap, self-visible) and
`updateDataModel` (a path write, visible only when a rendered prop binds that path) — and every
data-model write must bind to a rendered prop in the paired client event fixture, else the
write is invisible and untestable. Realizing the coupling edits the paired client event fixture
in place (the bound prop + an initial data-model value).

### Agent-section format

One **event-response table**, one row per event the component emits:
`event | response messages (ordered, with canned values) | visibility coupling (client fixture · bound prop ← path · initial value)`.
Response and coupling live in one table because they are one design unit per event. The
unknown-event fallback is infra behavior, not authored per component, so it gets no row.

#### Example (modelled on Button; teaching-sized)

| event | response messages | visibility coupling |
|---|---|---|
| `submit` | 1. `updateDataModel {path: '/submitted', value: true}` · 2. `updateComponents [{id: 'label', component: 'Text', text: '✅ Sent — server received submit'}]` (surfaceId echoed — stamped at runtime, not authored) | `button-event` · `disabled ← /submitted` · initial `/submitted = false` |

The response exercises both mechanisms: the label swap is self-visible; the `/submitted` write
is visible only through the `disabled ← /submitted` coupling, which is the half that proves
two-way data binding on the component itself.
