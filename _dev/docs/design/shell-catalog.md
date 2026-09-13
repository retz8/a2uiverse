# Shell catalog — system design

`packages/shell-catalog`. The shell's paint vocabulary (SPEC §4.2): the A2UI basic catalog mapped
onto Radix Themes, plus the shell's own primitives — composition (`Slot`, `Attribution`),
synthesis (`DerivedValue`, `SortControl`) and the merged view's shapes (`Table`,
`TableRow`, `DataList`, `DataListItem`; task 5.7) — and the shell's two actions (`openStore`,
`openAppLibrary`; task 6.2), as one catalog schema (`catalogs/v0.9.1/catalog.json`) and one
React implementation, versioned together. Radix Themes is its design system, brought by its
Provider under the one-provider-one-CSS-setup rule (SPEC §9.2). State as of task 6.6.

## Two faces of one catalog

```
catalog.json ──────────────────────────────┐
                                           ├─ catalog.parity.test · catalog.render-parity.test · keep-sets.test
@a2ui/web_core BASIC_COMPONENTS  ─┐        │
shell primitives' zod schemas    ─┼─ schema.ts   SCHEMA_CATALOG                   (React-free; a headless processor over the component APIs; shell actions bound to a handler that does nothing)
                                  └─ catalog.ts  createCatalog({onShellAction})   (React; the client renders with it; shell actions and the capability tile bound to the host's handler)
```

Both faces are built from the same component APIs — upstream's `TextApi` … `DateTimeInputApi`
from `@a2ui/web_core`, the primitives' own `*.schema.ts` — so they cannot disagree about a prop.
`catalog.ts` binds each API to its Radix implementation with `createComponentImplementation`;
`schema.ts` lists the APIs alone. Both carry the same functions — upstream's `BASIC_FUNCTIONS`,
the formula operators (`OPERATORS`) and the shell actions (`SHELL_ACTIONS`). The rendering face is
built per host: `createCatalog({onShellAction})` (task 6.2) closes the shell actions and `Slot`'s
capability tile over the host's `ShellActionHandler`; `SCHEMA_CATALOG` closes them over `() => {}`.
The prop surface is the basic catalog's exactly: what the Synthesizer authors against, what the
orchestrator validates, and what the client renders are one vocabulary, and only the rendering
changed in 5.9.

Subpaths: `.` (React), `./schema`, `./id` (`CATALOG_ID`), `./operators`, `./catalog.json`,
`./synthesis-guidance.md`, `./platform-ui-guidance.md`.

### Keep-sets and guidance

`keep-sets.ts` (task 6.3) exports one `KeepSet` (sdk) per author, named by the surface it paints,
from both faces:

| Keep-set | Components | Functions | Author |
| --- | --- | --- | --- |
| `SYNTHESIS_SURFACE_KEEP_SET` | `DerivedValue`, `SortControl`, `Table`, `TableRow`, `DataList`, `DataListItem`, `Text`, `Column`, `Row`, `Card`, `Divider` | `OPERATORS` | the Synthesizer (`shell:synthesis`) |
| `LAYOUT_SURFACE_KEEP_SET` | `Slot`, `Row`, `Column`, `Card`, `Text`, `Divider`, `DataList`, `DataListItem`, `Table`, `TableRow`, `Button` | `SHELL_ACTIONS` | the Planner (`shell:main`) |

An author is shown `catalog.json` pruned to its keep-set (the sdk's `pruneCatalog`) and its output
is validated against the same pruned catalog. Beside the pruned catalog each author reads one
guidance doc from `docs/`: `synthesis-guidance.md` — how a merged view is built out of this
catalog: the derived-value rule, the components a merged view is made of, what never to paint —
into the Synthesizer's prompt; `platform-ui-guidance.md` — how the shell draws UI about
A2UIVerse itself: what a platform answer is, the components that serve it, the literal data
model, the two shell actions as `Button`s, what never to paint — into the Planner's prompt.

## Components

One folder per component under `src/components/`, each a view (`*View`, pure React over resolved
props) and a catalog entry (`*Component`, the binder's wrapper over the API; `Slot`'s is the
factory `createSlotComponent(onShellAction)`). The basic components
carry no schema file of their own — their API is upstream's. Shared helpers live in
`components/shared/`; `weight` on `Slot` and `Attribution` goes through `shared/layout`'s
`weightStyle` — `flex: N; min-width: 0; min-height: 0` — as the basic layout components apply it.

| Basic component | Radix Themes | Translation |
| --- | --- | --- |
| `Text` | `Heading` for `h1`–`h5` (sizes 7→3), `Text` size 1 gray for `caption`, `Text` size 2 block for `body` | body goes through upstream's `MarkdownContext` when the host installs a renderer, plain otherwise (`shared/markdown`) |
| `Image` | — (plain `img` under the Theme's radius token) | `variant` sizes as upstream fixes them; `fit` is `object-fit` |
| `Icon` | — (Radix Icons via `icon/glyphs.ts`) | one glyph per schema name; a stated-nearest glyph where Radix has none; `{svgPath}` inline; an unknown bound name is a question mark carrying the name |
| `Video` · `AudioPlayer` | — (native players; `AudioPlayer` captions with `Text`) | |
| `Row` · `Column` | `Flex`, gap 3 | `justify`/`align` per `shared/layout`: four values are Radix props, three are the CSS property on the same element |
| `List` | `Flex`, gap 2, overflow along the axis | |
| `Card` | `Card` size 2 `surface` | |
| `Tabs` | `Tabs` | tabs addressed by index; the first selected; only the selected panel mounts |
| `Modal` | `Dialog` | trigger wrapped for Radix's slot; content mounts into the bundle's portal root; hidden title; close button |
| `Divider` | `Separator` size 4 | vertical stretches to its row |
| `Button` | `Button` size 2 | `default`→`surface` gray · `primary`→`solid` · `borderless`→`ghost`; disabled while `isValid` is false |
| `TextField` | `TextField` / `TextArea` for `longText` | `shared/field`: label above, first check error below in red, the control red when a check fails |
| `CheckBox` | `Checkbox` inside a `Text` label | |
| `ChoicePicker` | `RadioGroup` · `CheckboxGroup` · `SegmentedControl` · toggle `Button`s | one-of × checkbox · many-of × checkbox · one-of × chips · many-of × chips; `filterable` adds a `TextField` |
| `Slider` | `Slider` | one thumb; label and value in a header row |
| `DateTimeInput` | — (native input through `TextField`) | `date` / `time` / `datetime-local` by `enableDate`/`enableTime`; nothing when neither |

| Shell primitive | Rendering | Contract |
| --- | --- | --- |
| `Slot` | pending/failed tile on Radix panel, border and radius tokens; quiet `Text` lines for shell content; for a `gap`, the capability tile on the same panel — one `Text` line, "No installed app can do this.", over a soft `Button` "Search the Store" (`data-slot-state="gap"`); `weight ?? 1` as the flex share, written before a filled fragment slot's panel floor (`min-height: 4rem`) so the share's `min-height: 0` does not erase it; shell content keeps no floor | exactly one of `source` or `gap` (schema refine); a source's content from `SlotContentContext`, resolved by source, which the host fills; a gap resolves no content; the tile's button raises `openStore` with the gap as `query` and the slot's own id as `componentId`, through the handler `createSlotComponent` closes over |
| `Attribution` | `Text` size 1 gray with Radix's info glyph; with a `child`, a `Flex` column (`data-attribution`) of marker over child carrying `weight ?? 1` as its flex share; without one, the bare marker | display name at rest, full detail on hover/focus, accessible name always; the wrapper of a vendor fragment's `Slot` (task 6.4): `child` the slot's id, `weight` the slot's, copied by the painter |
| `DerivedValue` | `Text` size 2, gray when absent, detail in size 1 | the cell object the BindingEvaluator writes: value + contributor state; `format` `number` · `currency` · `datetime` (any year-and-clock spelling rendered in one fixed form — `en-US`, `America/New_York` — through `shared/instant`, which the client's sort shares) |
| `SortControl` | `Select` + `IconButton` with Radix arrow icons | the declaration at `/sorts/N`, written back whole |
| `Table` · `TableRow` | `Table.Root` size 1 `surface`; `Table.Row` of `Table.Cell`s | headings from `columns`, one row per child; a row outside a table draws as a flex row (context) |
| `DataList` · `DataListItem` | `DataList.Root` size 2; `DataList.Item` with `Label` and `Value` | `label` a `DynamicString`, `child` the value; an item outside a list draws as a labelled row (context) |

## Shell actions

`functions/shell-actions.ts` (task 6.2). `SHELL_ACTIONS` is `['openStore', 'openAppLibrary']`;
`ShellActionName` is its union. Each is a catalog function (`createFunctionImplementation`,
`returnType: 'void'`) a button invokes through `functionCall`, run on the client like the basic
catalog's `openUrl`: `openStore` takes an optional `query` (`z.object({query: z.string().optional()})`),
`openAppLibrary` nothing (`z.object({})`). A function does nothing itself — it hands the host one
`ShellAction`:

- `{name: 'openStore', surfaceId, componentId?, query?}`
- `{name: 'openAppLibrary', surfaceId, componentId?}`

through the `ShellActionHandler` (`(action: ShellAction) => void`) that
`shellActionFunctions(onShellAction)` closes over. `surfaceId` is the surface the function ran in
(`context.surface.id`). `componentId` is present only when a component raises the action itself:
the capability tile names its own `Slot` (`context.componentModel.id`); a button's `functionCall`
runs with no component in scope and carries none. `query` is present only when given — a
button's `args.query`, the tile's `gap`. What opening the Store or the App Library looks like is
the host's.

## Provider

`Provider` is the bundle's one Provider and one CSS setup: a Radix `Theme` folded onto a single
`display: contents` wrapper (`.a2uiverse-shell-catalog`), the appearance read from the host
Theme and set explicitly, no background of its own, and a portal-root anchor after the content
(`PortalRootContext`) so floating content — `SortControl`'s options, `Modal`'s dialog — stays
inside the fragment boundary. Under a host Theme it inherits accent, gray, radius and scaling;
with none it fixes `indigo`/`slate`. It carries no token bindings: Radix Themes is the whole
design system.

The stylesheet is Radix Themes' own, rewritten by `scripts/scope-radix.mjs` before every build,
test and dev run so every `:root` declaration lands on the wrapper instead, and every custom
property Radix sets at runtime is reset there rather than borrowed from a neighbour.

## Verification

Tree-level tests render through `testing/render.tsx`: `MessageProcessor` → `A2uiSurface` under
the Provider over `createCatalog`, the test's `onShellAction` and `onAction` receiving what the
tree raises, the surface returned for reading its data model.

- `catalog.parity.test` — name-level: every schema component and function has an implementation;
  the declared functions are exactly upstream's set plus `OPERATORS` and `SHELL_ACTIONS`; every
  operator and every shell action is declared, implemented, and in the schema's `anyFunction`
  union.
- `catalog.render-parity.test` — render-level, generated from `catalog.json` through
  `fixture/matrix.ts`: every component in every value of every enum prop renders through the real
  renderer under the Provider with no validation error, no console error or warning, and an
  element on the page. The icon table is checked against the schema's enum.
- `schema.test` — the React-free face runs where there is no DOM, declares exactly the schema's
  components and every schema function, accepts a merged-view tree and rejects a bad prop; the two
  guidance docs ship beside the schema.
- `keep-sets.test` — each keep-set prunes `catalog.json` to exactly its components and functions;
  a merged view validates against the synthesis pruning while `Slot`, `Attribution`, `TextField`
  and `Button` do not; a layout of weighted slots, a `gap` and an `openStore` button validates
  against the layout pruning while `Attribution`, `DerivedValue`, `SortControl` and `openUrl` do
  not, and a `Slot` with both `source` and `gap` is refused.
- `functions/shell-actions.test` — through the real renderer: a button's `openStore` hands the
  host `{name, surfaceId, query}` and nothing reaches the server-action path; without `query` the
  action carries none; `openAppLibrary` hands `{name, surfaceId}`; the capability tile shows the
  fixed line and not the gap's words, and its button raises `openStore` with `componentId` and the
  gap as `query`.
- Per-component tests where behaviour is non-trivial: two-way binding on every input, `ChoicePicker`
  in all four shapes and across two pickers, `Modal` into the portal root, `Icon` over the whole
  table, `Text` through a host markdown renderer; `Slot` — exactly one of `source` or `gap` and a
  numeric `weight` in the schema, `weight` as the flex share, a gap tile resolving no content,
  shell content pending, failed and filled with no floor; `Attribution` — the wrapper's `weight`
  as its flex share, one share when unweighted, the marker before the child, the bare marker
  without a child.
- `fixture/` — the design-check page (`pnpm dev`, port 5174): the same matrix under Radix light,
  Radix dark and no host Theme; the task 5.11 timeline example (the fixture's own copy) evaluated
  and rendered as one merged view with a live sort; the Slot/Attribution states, the capability
  tile among them; and the scoping proof — two Providers under two host Themes in one document.
  Its catalog is `createCatalog` over a handler that logs the action.
