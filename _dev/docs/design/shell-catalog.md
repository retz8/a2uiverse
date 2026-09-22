# Shell catalog — system design

`packages/shell-catalog`. The shell's paint vocabulary (SPEC §4.2): the A2UI basic catalog mapped
onto Radix Themes, plus the shell's own primitives — composition (`Slot`, `Attribution`),
synthesis (`DerivedValue`, `SortControl`) and the merged view's shapes (`Table`,
`TableRow`, `DataList`, `DataListItem`; task 5.7) — the shell's two actions (`openStore`,
`openAppLibrary`; task 6.2), and the relations a match claim is written in (`equal`, `contains`,
`judged`; task 7.5), as one catalog schema (`catalogs/v0.9.1/catalog.json`) and one React
implementation, versioned together. Radix Themes is its design system, brought by its Provider
under the one-provider-one-CSS-setup rule (SPEC §9.2). State as of task 7.16.

## Two faces of one catalog

```
catalog.json ──────────────────────────────┐
                                           ├─ catalog.parity.test · catalog.render-parity.test · keep-sets.test
@a2ui/web_core BASIC_COMPONENTS  ─┐        │
shell primitives' zod schemas    ─┼─ schema.ts   SCHEMA_CATALOG                   (React-free; a headless processor over the component APIs; shell actions bound to a handler that does nothing)
                                  └─ catalog.ts  createCatalog({onShellAction, onNavigate?, appDisplayName?})   (React; the client renders with it; shell actions and the capability tile bound to the host's handler, DerivedValue to its navigation and app names)
```

Both faces are built from the same component APIs — upstream's `TextApi` … `DateTimeInputApi`
from `@a2ui/web_core`, the primitives' own `*.schema.ts` — so they cannot disagree about a prop.
`catalog.ts` binds each API to its Radix implementation with `createComponentImplementation`;
`schema.ts` lists the APIs alone. Both carry the same functions — upstream's `BASIC_FUNCTIONS`,
the formula operators (`OPERATORS`), the relations (`RELATIONS`) and the shell actions
(`SHELL_ACTIONS`) — and both export the join's types and its mark rule, `cellJoin`. The package root also exports `cellState`, `relationFunctions` and the instant helpers (`parseInstant`, `formatInstant`, `INSTANT_LOCALE`, `INSTANT_TIME_ZONE`) the client's evaluator shares. The rendering
face is built per host: `createCatalog({onShellAction})` (task 6.2) closes the shell actions and
`Slot`'s capability tile over the host's `ShellActionHandler`; its optional `onNavigate` and
`appDisplayName` (task 7.5) close `DerivedValue` over the host's `NavigationHandler` and its
`AppDisplayName` lookup. `SCHEMA_CATALOG` closes the shell actions over `() => {}`.
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
| `SYNTHESIS_SURFACE_KEEP_SET` | `DerivedValue`, `SortControl`, `Table`, `TableRow`, `DataList`, `DataListItem`, `Text`, `Column`, `Row`, `Card`, `Divider` | `OPERATORS`, `RELATIONS` | the Synthesizer (`shell:synthesis`) |
| `LAYOUT_SURFACE_KEEP_SET` | `Slot`, `Row`, `Column`, `Card`, `Text`, `Divider`, `DataList`, `DataListItem`, `Table`, `TableRow`, `Button` | `SHELL_ACTIONS` | the Planner (`shell:main`) |

An author is shown `catalog.json` pruned to its keep-set (the sdk's `pruneCatalog`) and its output
is validated against the same pruned catalog. Beside the pruned catalog each author reads one
guidance doc from `docs/`: `synthesis-guidance.md` — how a merged view is built out of this
catalog: the derived-value rule, the components a merged view is made of, the join — when to
write `match`, fact or judgment, how the relations compare, naming, the join shown on the values —
and what never to paint — into the Synthesizer's prompt; `platform-ui-guidance.md` — how the shell draws UI about
A2UIVerse itself: what a platform answer is, the components that serve it, the literal data
model, the two shell actions as `Button`s, what never to paint — into the Planner's prompt.

## Components

One folder per component under `src/components/`, each a view (`*View`, pure React over resolved
props) and a catalog entry (`*Component`, the binder's wrapper over the API; `Slot`'s is the
factory `createSlotComponent(onShellAction)`, `DerivedValue`'s
`createDerivedValueComponent({onNavigate, appDisplayName})`). The basic components
carry no schema file of their own — their API is upstream's. Shared helpers live in
`components/shared/`; `weight` on `Slot` and `Attribution` goes through `shared/layout`'s
`weightStyle` — `flex: N; min-width: 0; min-height: 0` — as the basic layout components apply it.

| Basic component | Radix Themes | Translation |
| --- | --- | --- |
| `Text` | `Heading` for `h1`–`h4` (sizes 7→4); `h5` the merged view's label (task 7.16): a `Heading` as `h5` at 13px/20px, weight 600, in `--a2v-ink-2`, one line ending in an ellipsis with the whole title as its `title`; `Text` size 1 gray for `caption`, `Text` size 2 block for `body` | body goes through upstream's `MarkdownContext` when the host installs a renderer, plain otherwise (`shared/markdown`) |
| `Image` | — (plain `img` under the Theme's radius token) | `variant` sizes as upstream fixes them; `fit` is `object-fit` |
| `Icon` | — (Radix Icons via `icon/glyphs.ts`) | one glyph per schema name; a stated-nearest glyph where Radix has none; `{svgPath}` inline; an unknown bound name is a question mark carrying the name |
| `Video` · `AudioPlayer` | — (native players; `AudioPlayer` captions with `Text`) | |
| `Row` · `Column` | `Flex`, gap `var(--a2v-layout-gap, var(--space-3))` — space-3 unless the host spaces its own layout's regions (task 7.14) | `justify`/`align` per `shared/layout`: four values are Radix props, three are the CSS property on the same element |
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
| `Slot` | pending/failed fragment slots hold the space they reserved and draw nothing around it, their quiet `Text` line flush at the leading edge (task 7.9); shell content pending is the merged view reserved (task 7.15) — `aria-busy`, a 24px row with a 136×10 skeleton bar, then a `ghost` `Table.Root` with the planned `columns` as headings (none when the plan wrote none) over four `data-skeleton-row` rows of 8px bars at the design canvas's F2 widths, in `--a2v-skel`, in `Table`'s own cell geometry; failed shell content a quiet `Text` line; for a `gap`, the capability tile keeps its Radix panel, border and radius — SPEC §8 calls it a tile and it is shell UI with an action in it, not a placeholder for vendor pixels — one `Text` line, "No installed app can do this.", over a soft `Button` "Search the Store" (`data-slot-state="gap"`); `weight ?? 1` as the flex share, written before a filled fragment slot's reserved floor (`min-height: 4rem`) so the share's `min-height: 0` does not erase it; shell content keeps no floor | exactly one of `source` or `gap` (schema refine); a source's content from `SlotContentContext`, resolved by source, which the host fills; a gap resolves no content; the tile's button raises `openStore` with the gap as `query` and the slot's own id as `componentId`, through the handler `createSlotComponent` closes over |
| `Attribution` | `Text` size 1 gray, 16px line, with Radix's 12px info glyph 4px from the name; with a `child`, a `Flex` column (`data-attribution`) of marker over child, gap 2 (8px) carrying `weight ?? 1` as its flex share; without one, the bare marker | display name at rest, full detail on hover/focus, accessible name always; the wrapper of a vendor fragment's `Slot` (task 6.4): `child` the slot's id, `weight` the slot's, copied by the painter |
| `DerivedValue` | `Text` size 2; the detail in a Radix `Tooltip` mounted in the portal root, so showing it moves nothing on the page; contributor state and the join ride **one mark, the value's own contrast** (`data-marked`, one of `partial` · `absent` · `empty` · `guessed` · `broken`) — full strength when complete and held by facts, Radix `color="gray"` for partial, absent, empty and guessed, `color="amber"` plus a size-1 amber ⚠ when broken; a value matching one of the cell's `danger` words (task 7.16, compared as `equal` compares) carries `data-tone="danger"` and a 14px `CrossCircledIcon` before it whatever its mark, and is drawn in `--a2v-danger` (fallback `--red-11`) at weight 600 only when unmarked — certainty wins the color; a value that names an app (`names: 'app'`) drawn by the host's name for it; `data-state` and `data-join` beside `data-marked`; with a target under a host that navigates, `role="button"`, focusable, pointer cursor and a `--gray-a3` background while hovered or focused, raising the handler on click, Enter or Space; a cell that speaks without navigating is focusable with the `help` cursor; nothing in the tooltip navigates | the cell object the BindingEvaluator writes: value + contributor state, `names?: 'app'`, `join` `{mark, apps, evidence}` for a claimed object, and `target` `{app, surface, pointer}` whenever a ref resolves — none on an absent cell, the evaluator's rule (task-7.9 decision 2), so the view navigates whatever target it is handed; four states from `contributed`/`of` — `empty` (0 of 0), `absent` (0 of N), `partial`, `complete`; the tooltip appears only where the shell admitted something — a mark, or a contributor set short of complete — and carries the contributor detail when partial or absent, then "From {apps} · {relation names}", each relation with its two values when the mark is guessed or broken; a confirmed complete cell is silent and the tap is its audit; the accessible name always carries value, "needs attention" for a danger value, contributor detail, mark ("guessed match" · "broken match") and join detail, independent of pointer state; apps named through the host's lookup, the app id when it has none; `format` `number` · `currency` · `datetime` (any year-and-clock spelling rendered in one fixed form — `en-US`, `America/New_York` — through `shared/instant`, which the client's sort shares), and a `prefix` written before a present value, never before the dash (task 7.16); `danger`, a non-empty list of words fixed at authoring time, never bound |
| `SortControl` | `Select` + `IconButton` with Radix arrow icons, never shrinking, its "Sort by" on one line | the declaration at `/sorts/N`, written back whole |
| `Table` · `TableRow` | `Table.Root` size 1 `ghost`, drawn to the design canvas's F3 (task 7.15): no box; heading cells 32px, 12px medium in `--a2v-muted` over `--a2v-line`; body cells 40px over `--a2v-line-2`; 12px side padding, none on the first column's leading edge (`headingCellStyle` · `bodyCellStyle`, shared with the reserved `Slot`); `Table.Row` of `Table.Cell`s | headings from `columns`, one row per child; a row outside a table draws as a flex row (context) |
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

## Relations and the join

`functions/relations.ts` (task 7.5). `RELATIONS` is `['equal', 'contains', 'judged']`, exported
apart from `OPERATORS`; `relationKind` makes `equal` and `contains` facts and `judged` the
judgment. Each is a catalog function (`returnType: 'boolean'`) over `values` of exactly two, pure
like the operators — the evaluator resolves both refs and calls a relation absent when either does
not resolve. `judged` returns true. `equal` and `contains` compare:

| Values | `equal(a, b)` | `contains(a, b)` |
| --- | --- | --- |
| two instants (`shared/instant`'s reading) | the same moment, to the coarser of the two spellings' precision (`instantPrecision`: minute, second, or the fraction written) | by tokens |
| two numbers (`readNumber`: a JSON number, or text that is only a number — sign, one currency symbol, `,` `.` `'` `’` or space grouping; a spelling with more than one reading is not a number) | the same value | by tokens |
| other plain values | the same token sequence | b's tokens unbroken inside a's |
| two lists of plain values | every member of each among the other's | every member of b among a's |
| a list and a plain value | does not hold | b among a's members |
| an object, a list holding one, an empty list, a side with no token | does not hold | does not hold |

`tokens` normalizes NFKC, lowercases, and splits on anything not a letter, mark or digit; a
character of Han, Hiragana, Katakana, Thai, Lao, Khmer or Myanmar is a token of its own. Members
compare as `equal` compares plain values.

`components/derived-value/join.ts` holds the join's shapes — `EvaluatedRelation` `{name, kind, op,
state, sides}` (state `holds` · `fails` · `absent`; each side `{app, ref, value?}`), `CellJoin`,
`CellTarget`, `NavigationHandler`, `AppDisplayName` — and the mark rule `cellJoin(claim, apps,
absentApps)` the evaluator calls per cell. A relation that is absent keeps the link it made: facts
that hold or are absent tie apps (union–find); the unique largest group is the row's core, marked
`none`, and a tie for largest leaves no core. Outside the core, an app whose every relation is a
failing fact is `broken`, any other `guessed`; an app of the cell the claim does not mention is
`guessed`. The cell takes the worst mark among its apps not in `absentApps`; its evidence is every
relation touching any of its apps. An empty claim gives no join.

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
  the declared functions are exactly upstream's set plus `OPERATORS`, `RELATIONS` and
  `SHELL_ACTIONS`; every operator, relation and shell action is declared, implemented, and in the
  schema's `anyFunction` union.
- `functions/relations.test` — the relations apart from the operators and their kinds; text as
  token sequences across normalization, case, punctuation and spaceless scripts; numbers and
  instants by value, a two-way spelling staying text, instants to the coarser precision; lists as
  lists; objects never; `judged` always.
- `components/derived-value/join.test` — the mark rule over the pull-request roster: the core
  unmarked, judgment guessed, an unmentioned app guessed, a lone failing fact broken, two facts
  outlasting one failure, the two-app cases, no core on a tie, absent relations keeping their
  links, an absent app adding no mark, the worst of a cell's apps, the evidence.
- `catalog.render-parity.test` — render-level, generated from `catalog.json` through
  `fixture/matrix.ts`: every component in every value of every enum prop renders through the real
  renderer under the Provider with no validation error, no console error or warning, and an
  element on the page. The icon table is checked against the schema's enum.
- `schema.test` — the React-free face runs where there is no DOM, declares exactly the schema's
  components and every schema function, accepts a merged-view tree and rejects a bad prop; the two
  guidance docs ship beside the schema.
- `keep-sets.test` — the synthesis keep-set's functions are `OPERATORS` and `RELATIONS`, the layout
  keep-set carries no relation; each keep-set prunes `catalog.json` to exactly its components and functions;
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
  table, `Text` through a host markdown renderer; `DerivedValue` — the join marks, the detail with
  both values when in doubt, the detail in a tooltip and never inside the cell, partial and guessed at once as one
  statement, an absent value from a claimed object with no join mark, a value that names an app, app names with the id as fallback, the cell as the
  navigation button (click, Enter, nothing in the tooltip navigating, an absent cell), not interactive without a handler or a target, and `createCatalog`'s two options
  through the real renderer; `Slot` — exactly one of `source` or `gap` and a
  numeric `weight` in the schema, `weight` as the flex share, a gap tile resolving no content,
  shell content pending, failed and filled with no floor; `Attribution` — the wrapper's `weight`
  as its flex share, one share when unweighted, the marker before the child, the bare marker
  without a child.
- `fixture/` — the design-check page (`pnpm dev`, port 5174): the same matrix under Radix light,
  Radix dark and no host Theme; the task 5.11 timeline example (the fixture's own copy) evaluated
  and rendered as one merged view with a live sort; the `DerivedValue` join states — no claim,
  partial, confirmed, guessed, broken, partial and guessed, absent, the empty cell (0 of 0) — from hand-built cells; the
  Slot/Attribution states, the capability
  tile among them; and the scoping proof — two Providers under two host Themes in one document.
  Its catalog is `createCatalog` over handlers that log the shell action and the navigation, with
  display names for the pull-request roster.
