# @a2uiverse/shell-catalog

The shell's paint vocabulary (SPEC §4.2): the A2UI basic catalog plus the composition primitives — as schema (`catalogs/v0.9.1/catalog.json`) + React implementation, versioned together. Radix Themes is its design system: every component renders on it, brought by the package's own Provider under the one-provider-one-CSS-setup rule (SPEC §9.2).

- **Basic catalog** — each of the eighteen components implemented on its Radix Themes counterpart, the way `primer-a2ui-adapter` maps the basic catalog onto Primer: `Text`→`Heading`/`Text`, `Row`/`Column`/`List`→`Flex`, `Card`, `Tabs`, `Modal`→`Dialog`, `Divider`→`Separator`, `Button`, `TextField`/`TextArea`, `CheckBox`→`Checkbox`, `ChoicePicker`→`RadioGroup`/`CheckboxGroup`/`SegmentedControl`, `Slider`. The five with no Radix counterpart (`Image`, `Video`, `AudioPlayer`, `DateTimeInput`, and `Icon`, which renders Radix Icons) are plain elements under the Theme's tokens. The prop surface is the basic catalog's exactly — the schema, its descriptions and the guidance doc are untouched by the mapping.
- **`Slot`** — a named region whose content the host mounts through `SlotContentContext`. It renders its own `pending` and `failed` states; `collapsed` asks the host for content first and renders nothing only if there is none, so a source that answered without painting is not left with an attribution marker naming an empty region.
- **`Attribution`** — the quiet provenance marker (SPEC §4.3): display name + info glyph, full detail on hover/focus, accessible name always.
- **`Frame`** — the composed screen's layout frame: equal shares along a row, natural size down a column.
- **`DerivedValue`** and **`SortControl`** — the synthesis primitives: a formula-bound cell with its contributor state, and the sort criterion over a declaration at `/sorts/N`.
- **`Provider`** — a Radix `Theme` scoped to its own wrapper (never `:root`), carrying Radix Themes' stylesheet as a scoped copy and anchoring a portal root for floating content. It follows the host Theme's appearance and accent; with no host it is light, indigo on slate.

Beside the rendering catalog the package ships two things for the process that authors a merged view without rendering one:

- **`@a2uiverse/shell-catalog/schema`** — the catalog's React-free face: `SCHEMA_CATALOG`, the same component APIs (upstream's from `@a2ui/web_core`, the primitives' own zod schemas) as a `Catalog` of APIs, plus `OPERATORS` and `CATALOG_ID`. What the orchestrator feeds a headless `MessageProcessor` to validate a model-authored tree against.
- **`@a2uiverse/shell-catalog/guidance.md`** — `docs/guidance.md`, how to build a merged view out of this catalog: the derived-value rule, which components a merged view is made of, what never to paint. Read into the Synthesizer's prompt beside `catalog.json`.

The schema is generated from the upstream basic `catalog.json` (`v0_9_1`, `upstream/main` of the sibling `A2UI` fork) plus the primitive defs. The design record is `_dev/docs/design/shell-catalog.md`.

## Commands

```
pnpm --filter @a2uiverse/shell-catalog build | typecheck | test | lint
pnpm --filter @a2uiverse/shell-catalog dev    # design-check fixture on :5174
```

`test` includes the render-parity sweep: every component in every value of every enum prop, generated from `catalog.json`, rendered through the real renderer under the Provider. The fixture shows the same sweep under Radix light · dark · no host Theme, the task 5.11 timeline example as one merged view, the Slot/Attribution states, and the scoping proof. In the tunnel environment open it at `https://vnw20xbg-5174.asse.devtunnels.ms`.
