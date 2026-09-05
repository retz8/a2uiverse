# Shell catalog — system design

`packages/shell-catalog`. The shell's paint vocabulary (SPEC §4.2): the A2UI basic catalog mapped
onto Radix Themes, plus the shell's own primitives — composition (`Slot`, `Attribution`), layout
(`Frame`) and synthesis (`DerivedValue`, `SortControl`) — as one catalog schema
(`catalogs/v0.9.1/catalog.json`) and one React implementation, versioned together. Radix Themes
is its design system, brought by its Provider under the one-provider-one-CSS-setup rule (SPEC
§9.2). State as of task 5.9.

## Two faces of one catalog

```
catalog.json ──────────────────────────────┐
                                           ├─ catalog.parity.test · catalog.render-parity.test
@a2ui/web_core BASIC_COMPONENTS  ─┐        │
shell primitives' zod schemas    ─┼─ schema.ts   SCHEMA_CATALOG   (React-free; the orchestrator validates against it)
                                  └─ catalog.ts  CATALOG          (React; the client renders with it)
```

Both faces are built from the same component APIs — upstream's `TextApi` … `DateTimeInputApi`
from `@a2ui/web_core`, the primitives' own `*.schema.ts` — so they cannot disagree about a prop.
`catalog.ts` binds each API to its Radix implementation with `createComponentImplementation`;
`schema.ts` lists the APIs alone. The prop surface is the basic catalog's exactly: what the
Synthesizer authors against, what the orchestrator validates, and what the client renders are one
vocabulary, and only the rendering changed in 5.9.

## Components

One folder per component under `src/components/`, each a view (`*View`, pure React over resolved
props) and a catalog entry (`*Component`, the binder's wrapper over the API). The basic components
carry no schema file of their own — their API is upstream's. Shared helpers live in
`components/shared/`.

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
| `Slot` | pending/failed tile on Radix panel, border and radius tokens; quiet `Text` lines for shell content | content from `SlotContentContext`, which the host fills |
| `Attribution` | `Text` size 1 gray with Radix's info glyph | display name at rest, full detail on hover/focus, accessible name always |
| `Frame` | `Flex` gap 3 of `Box` items | equal shares along a row (`flex-basis: 0`), natural size down a column |
| `DerivedValue` | `Text` size 2, gray when absent, detail in size 1 | the cell object the BindingEvaluator writes: value + contributor state |
| `SortControl` | `Select` + `IconButton` with Radix arrow icons | the declaration at `/sorts/N`, written back whole |

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

- `catalog.parity.test` — name-level: every schema component and function has an implementation.
- `catalog.render-parity.test` — render-level, generated from `catalog.json` through
  `fixture/matrix.ts`: every component in every value of every enum prop renders through the real
  renderer under the Provider with no validation error, no console error or warning, and an
  element on the page. The icon table is checked against the schema's enum.
- Per-component tests where behaviour is non-trivial: two-way binding on every input, `ChoicePicker`
  in all four shapes and across two pickers, `Modal` into the portal root, `Icon` over the whole
  table, `Text` through a host markdown renderer.
- `fixture/` — the design-check page (`pnpm dev`, port 5174): the same matrix under Radix light,
  Radix dark and no host Theme; the task 5.11 timeline example evaluated and rendered as one merged
  view with a live sort; the Slot/Attribution states; and the scoping proof — two Providers under
  two host Themes in one document.
