# @a2uiverse/shell-catalog

The shell's own A2UI catalog: what the orchestrator paints with. It's the A2UI basic catalog drawn on Radix Themes, plus the components A2UIVerse needs to compose one screen from several apps and to show a merged view.

## What's in it

- **The basic catalog**: all eighteen components, each drawn with its Radix Themes counterpart (`Row` and `Column` as `Flex`, `Modal` as `Dialog`, `ChoicePicker` as a radio group, checkboxes or a segmented control, …). The props are exactly the basic catalog's.
- **Composition**:
  - **`Slot`**: a region of the layout, filled by one app's fragment. It draws the waiting state, the failure tile with Retry, and the capability tile for an app you don't have, with a button that searches the Store. The merged view's slot draws its placeholder while the view is made, one line when it isn't, and the Include and Try again presses.
  - **`Attribution`**: the marker naming the app that painted a fragment, with the fragment's back and forward arrows at the right of its row.
- **The merged view**:
  - **`DerivedValue`**: a cell computed from a formula. It shows how sure it is by its contrast, says where it came from on hover, and takes you to the value in its app's fragment when clicked.
  - **`SortControl`**: the sort in force, which the reader can change.
  - **`Table`** / **`TableRow`** and **`DataList`** / **`DataListItem`**: the shapes a merged view is laid out in.
- **Functions**: the formula operators (`value`, `min`, `max`, `sum`, `avg`, `count`, `argmin`, `argmax`, `source`), the relations a match claim is written in (`equal`, `contains`, `judged`), and two shell actions, `openStore` and `openAppLibrary`.

## Using it

```ts
import {createCatalog, Provider} from '@a2uiverse/shell-catalog';

const catalog = createCatalog({onShellAction, onPress, onNavigate, appDisplayName});
```

- **`onShellAction`** opens the Store or the App Library.
- **`onPress`** receives the reader's presses (Retry, Include, Try again, a step back or forward) as a composition operation. Without it, no press button is drawn.
- **`onNavigate`** takes a merged cell's click to the value it came from. Without it, cells aren't clickable.
- **`appDisplayName`** gives an app's name. Without it, the app's id is shown.

Wrap the rendered surfaces in **`Provider`**: a Radix Theme scoped to its own wrapper, never the page, that follows the host's light or dark and accent colour.

The host also fills four React contexts the components read:

| Context                  | What it tells the components                                           |
| ------------------------ | ---------------------------------------------------------------------- |
| `SlotContentContext`     | which fragment to mount in a source's slot                             |
| `SlotStateContext`       | each source's state, for a merged-view column reserved for that source |
| `FragmentHistoryContext` | where each fragment stands in its history, for `Attribution`'s arrows  |
| `PressStateContext`      | presses on their way, and whether a press can be made at all           |

## For the orchestrator

The orchestrator writes shell surfaces without rendering them, so the package also ships:

- **`@a2uiverse/shell-catalog/schema`**: the catalog without React (`SCHEMA_CATALOG`, `CATALOG_ID`, the operators and relations) and one keep-set per model: `LAYOUT_SURFACE_KEEP_SET` for the Planner and `SYNTHESIS_SURFACE_KEEP_SET` for the Synthesizer. Each model is shown `catalog.json` narrowed to its keep-set, and what it writes is validated against the same.
- **`@a2uiverse/shell-catalog/platform-ui-guidance.md`**: how to answer a question about A2UIVerse itself. Read into the Planner's prompt.
- **`@a2uiverse/shell-catalog/synthesis-guidance.md`**: how to build a merged view from this catalog. Read into the Synthesizer's prompt.

## Commands

```bash
pnpm --filter @a2uiverse/shell-catalog build | typecheck | test | lint
pnpm --filter @a2uiverse/shell-catalog dev    # the design-check page, on port 5174
```

`test` renders every component in every value of each of its enum props, under the Provider, beside a parity test that keeps `catalog.json` and the implementation in step.

The design-check page shows that same sweep in light, dark and with no host theme, a merged view, the states of `DerivedValue`, `Slot` and `Attribution`, and that the theme stays inside its wrapper.

The design record is [`docs/design/shell-catalog.md`](../../docs/design/shell-catalog.md).
