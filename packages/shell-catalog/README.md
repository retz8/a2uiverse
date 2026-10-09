# @a2uiverse/shell-catalog

The shell's own A2UI catalog: what the orchestrator paints with. It's the A2UI basic catalog drawn on Radix Themes, plus the components A2UIVerse needs to compose one screen from several apps and to show a merged view.

## What's in it

- **The basic catalog**: all eighteen components, each drawn with its Radix Themes counterpart (`Row` and `Column` as `Flex`, `Modal` as `Dialog`, `ChoicePicker` as a radio group, checkboxes or a segmented control, …). The props are exactly the basic catalog's, less `TextField`'s `obscured` variant: the shell never draws a password field.
- **Composition**:
  - **`Slot`**: a region of the layout, filled by one app's fragment. It draws the waiting state, the failure tile with Retry, a refused paint's "Continue on" link to the app's own page, and the capability tile for an app you don't have, with a button that searches the Store. It draws the authority tile, for an app you aren't signed in to, with Sign in, or one quiet line, "Not signed in · Sign in", after the first time; Connect and "Not connected" for an app that takes a pasted key or token; Allow and "Needs more access" for an account asked for more; Sign in again when a sign-in has run out; and "not supported here" with Manage apps. While a sign-in window is open, the tile or the line is the waiting form, with Open the sign-in again and Cancel. A slot holding `addAccount` is the add-account tile: the app's accounts already added, what a new one lets the app do, and Add account. A slot holding `chooseAccount` is the account choice: one press per account, by its label. The merged view's slot draws its placeholder while the view is made, one line when it isn't, and the Include and Try again presses; a column reserved for a source that asks to sign in reads "not signed in", "not connected" or "needs more access".
  - **`Attribution`**: the marker naming the app that painted a fragment, and the account when the app has more than one, with the fragment's back and forward arrows at the right of its row, and a "Needs access" chip and its card with Allow and Not now when the app asks for more.
- **The merged view**:
  - **`DerivedValue`**: a cell computed from a formula. It shows how sure it is by its contrast, says where it came from on hover, and takes you to the value in its app's fragment when clicked.
  - **`SortControl`**: the sort in force, which the reader can change.
  - **`Table`** / **`TableRow`** and **`DataList`** / **`DataListItem`**: the shapes a merged view is laid out in.
- **Functions**: the formula operators (`value`, `min`, `max`, `sum`, `avg`, `count`, `argmin`, `argmax`, `source`), the relations a match claim is written in (`equal`, `contains`, `judged`), and two shell actions, `openStore` and `openAppLibrary`. Adding an account is not an action: it's a `Slot` holding `addAccount`.

## Using it

```ts
import {createCatalog, Provider} from '@a2uiverse/shell-catalog';

const catalog = createCatalog({onShellAction, onPress, onSignIn, onNavigate, sourceName});
```

- **`onShellAction`** opens the Store or the App Library, Manage apps among them.
- **`onPress`** receives the reader's presses (Retry, Include, Try again, a step back or forward, Not now, an account chosen on the account choice) as a composition operation. Without it, no press button is drawn.
- **`onSignIn`** receives Sign in, Connect, Sign in again, Allow, Open the sign-in again, Add account and Cancel for one source, the bare app id for Add account, inside the click, so the host can open the sign-in window. Without it, none of them is drawn.
- **`onNavigate`** takes a merged cell's click to the value it came from. Without it, cells aren't clickable.
- **`sourceName`** gives a source's name — the app's, with the account's label when the app has more than one. Without it, the source id is shown.

Wrap the rendered surfaces in **`Provider`**: a Radix Theme scoped to its own wrapper, never the page, that follows the host's light or dark and accent colour.

The host also fills five React contexts the components read:

| Context                  | What it tells the components                                           |
| ------------------------ | ---------------------------------------------------------------------- |
| `SlotContentContext`     | which fragment to mount in a source's slot                             |
| `SlotStateContext`       | each source's state, for a merged-view column reserved for that source |
| `FragmentHistoryContext` | where each fragment stands in its history, for `Attribution`'s arrows  |
| `PressStateContext`      | presses on their way, and whether a press can be made at all           |
| `SignInContext`          | which sources have a sign-in window open, for the waiting form         |

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

The design record is [`docs/design/shell-catalog.md`](../../docs/design/shell-catalog.md); the story behind the authority components is [`docs/design/authority.md`](../../docs/design/authority.md).
