# Task 10.5 — Linear catalog

The Linear catalog becomes its own component vocabulary in Linear's design language, as GitHub's is Primer, and the Linear agent is repainted in it. `[apps]` sub-task: code in `../a2uiverse-apps/linear/`, worked on that repo's `main`; this plan and the reference notes on this repo's `main`.

## Decisions

1. **Design-system level.** General building blocks Linear's UI is built from, named by what they are, not components named after Linear's objects. Linear publishes no component library; the component list is read from Linear's public docs screenshots. Notes in `_dev/references/linear/*.md`, screenshots untracked.
2. **Palette generated in LCH by Linear's published method** — three inputs, base colour, accent colour and contrast ([How we redesigned the Linear UI, part II](https://linear.app/now/how-we-redesigned-the-linear-ui)). Base: the brand page's two published colours, Mercury White `#F4F5F8` (light) and Nordic Gray `#222326` (dark) ([linear.app/brand](https://linear.app/brand)). Accent: a desaturated blue of our choosing, after the brand page's "a subtle desaturated blue". Status hues ours, on the same LCH scale. Nothing sampled from screenshots.
3. **No product icons means the app icon only**, as Material Design uses "product icon". The status circle and the priority bars keep their shapes, redrawn as our own SVG in our palette.
4. **Scope: what Linear's issue views are built from** — the agent's pinned domain in `linear/agent/app/mcp.py`: lists, one issue's detail and comments, and the writes that create, update and comment, proposed then confirmed. Grows when that domain grows.
5. **Inter ships with the bundle.** Inter under the SIL Open Font License 1.1, with its display optical size for headings ([rsms.me/inter](https://rsms.me/inter/)), declared under a family name the catalog owns and applied only inside the Provider's wrapper.

## Vocabulary

| Component | What it is |
|---|---|
| `Panel` | A view's surface: a bordered, rounded panel holding one child |
| `Stack` | A flex container: direction, gap, align, justify, wrap |
| `Divider` | A hairline separating sections |
| `ViewHeader` | A view's header bar: an optional context, `›`, the title |
| `Section` | A titled block with an optional count: Links, Activity |
| `Text` | A run of plain text in one of the type registers: title, heading, body, secondary, caption |
| `Markdown` | Text written in Markdown, rendered without HTML, links or images |
| `Button` | A labelled button: primary, secondary or ghost, carrying an action |
| `List` | A dense list of rows with hairlines between them |
| `ListGroup` | A group inside a list, headed by a label, an optional visual and a count |
| `ListItem` | One row: leading visuals, its content taking the remaining width, trailing meta; the whole row its action |
| `Property` | A labelled property: a caption label and its value's parts |
| `Chip` | A rounded chip: a label with an optional colour dot |
| `Avatar` | A person's initials in a circle |
| `Icon` | A system glyph from a small set drawn for the catalog: arrow, branch, pull request, link |
| `StatusIcon` | A workflow state's glyph: the status circle, by state type |
| `PriorityIcon` | A priority's glyph: bars rising with priority, urgent's mark, none's dashes |

The basic catalog's functions stay, from `@a2ui/react`'s implementation; its components go. `Text` keeps a required `text`, which the agent kit's unhandled-event fallback paints. The catalog id is unchanged.

## Steps

1. **Reference notes** — `_dev/references/linear/ui.md`: each public screenshot's page and what it shows; the component list read from them; the type and palette sources.
2. **Palette** — a generator from base, accent and contrast to the light and dark tokens, as CSS `lch()` values; tests: both appearances define the same tokens, no token reads a variable.
3. **Font** — `inter-latin-opsz-normal.woff2` from `@fontsource-variable/inter` 5.3.0 vendored with its `OFL.txt`, copied to `dist` by the build; `@font-face` family `linear-catalog-inter`; `font-optical-sizing: auto`.
4. **Components** — one folder per component: zod schema, view, test. `catalogs/v0.9.1/catalog.json` hand-written with top-level properties; a zod ↔ JSON parity test; the runtime catalog and its registry. Class names prefixed `lc-`; every `var()` read carries a fallback.
5. **Provider and sheet** — tokens and font family on the wrapper, the Markdown renderer installed for `Markdown`; the sheet scoped to the wrapper class.
6. **Agent** — `catalog_kind="custom"`; `brand-guidance.md` rewritten for the vocabulary; the three knowledge examples rewritten; the authored decline fixture in `scripts/derive_corpus.py` in the vocabulary.
7. **Recording** — the beats re-recorded in `stub` mode, the model over the recorded Linear payloads with no workspace writes; the deterministic fixtures derived from them; the stub fixtures untouched; `test_corpus_is_publishable` green.
8. **Visual check** — the deterministic fixtures and the examples rendered through `@a2ui/react` inside the Provider on a scratch page, screenshotted light and dark in headless Chrome.
9. **Docs** — `linear-catalog/README.md`, the agent README and `linear/README.md` where they describe the catalog.
10. **Gates** — `linear-catalog` build, typecheck and test; eslint and prettier over the Linear paths; `uv run pytest` in `linear/agent`.

## Handed to 10.7

- The client's `linear-catalog` dependency bumped to the new commit (`pnpm-lock.yaml`).
- The client's recorded beats that hold Linear paints (`apps/client/recordings/beats/`) re-recorded: they carry `StatusIcon`, `PriorityIcon` and basic components under this catalog's id.
- The collision detector over a catalog `@font-face`: it tracks custom-property definitions, class and keyframe names and bare variable reads, so a uniquely named `@font-face` is outside its rules.
