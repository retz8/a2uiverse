# @a2uiverse/shell-catalog

The shell's own A2UI catalog: what the orchestrator paints with. It's the A2UI basic catalog drawn on Radix Themes, plus the components A2UIVerse needs to compose one screen from several apps and to show a merged view.

## What's in it

- **The basic catalog**: all eighteen components, each drawn with its Radix Themes counterpart (`Row` and `Column` as `Flex`, `Modal` as `Dialog`, `ChoicePicker` as a radio group, checkboxes or a segmented control, …). The props are exactly the basic catalog's, less `TextField`'s `obscured` variant: the shell never draws a password field.
- **Composition**:
  - **`Slot`**: a region of the layout, filled by one app's fragment. It draws the waiting state, the failure tile with Retry, and a refused paint's "Continue on" link to the app's own page. For a need no installed app can meet, it draws the **offer**: "None of your apps can do this. From the Store:" (or "From the Store:" alone, once an app is installed or the plan asks nothing), each app by name, publisher and description with Install, Installing, Installed with Loading… or Show it here, a refusal on its row in the Store's words, and More in the Store; or one quiet line with Search the Store, "Nothing in the Store can do this yet." or "Couldn't reach the Store."; and, once an app is installed with nothing asked of it, "Shop B is installed. Try asking “…”". For an app that can't paint in what it's installed with, it draws the **update tile**, one line: "Shop B needs an update to show this." with Update, "…and the Store is waiting on its publisher, Acme." with Check again, "…and the Store couldn't be reached." with Retry, "…and the Store has no update for it.", and once updated "Shop B is updated." with Show it here. It draws the authority tile, for an app you aren't signed in to, with Sign in, or one quiet line, "Not signed in · Sign in", after the first time; Connect and "Not connected" for an app that takes a pasted key or token; Allow and "Needs more access" for an account asked for more; Sign in again when a sign-in has run out; and "not supported here" with Manage apps. While a sign-in window is open, the tile or the line is the waiting form, with Open the sign-in again and Cancel. A slot holding `addAccount` is the add-account tile: the app's accounts already added, what a new one lets the app do, and Add account. A slot holding `chooseAccount` is the account choice: one press per account, by its label. The merged view's slot draws its placeholder while the view is made, one line when it isn't, and the Include and Try again presses; a column reserved for a source that asks to sign in reads "not signed in", "not connected" or "needs more access", and one on the update tile "needs an update", "waiting on its publisher", "couldn't check for updates" or "no update available".
  - **`Attribution`**: the marker naming the app that painted a fragment, and the account when the app has more than one, with the fragment's back and forward arrows at the right of its row, and a "Needs access" chip and its card with Allow and Not now when the app asks for more. Over a slot that still shows the offer its app was installed from (`fromOffer`), it waits for the app's first answer.
- **The merged view**:
  - **`DerivedValue`**: a cell computed from a formula. It shows how sure it is by its contrast, says where it came from on hover, and takes you to the value in its app's fragment when clicked.
  - **`SortControl`**: the sort in force, which the reader can change.
  - **`Table`** / **`TableRow`** and **`DataList`** / **`DataListItem`**: the shapes a merged view is laid out in.
- **Functions**: the formula operators (`value`, `min`, `max`, `sum`, `avg`, `difference`, `count`, `argmin`, `argmax`, `source`), the relations a match claim is written in (`equal`, `contains`, `judged`), and three shell actions: `openStore`, `openAppLibrary` (on one app, when it names one) and `openPublish`. Adding an account is not an action: it's a `Slot` holding `addAccount`.

## Using it

```ts
import {createCatalog, Provider} from '@a2uiverse/shell-catalog';

const catalog = createCatalog({onShellAction, onPress, onSignIn, onAppAct, onNavigate, sourceName});
```

- **`onShellAction`** opens the Store, the App Library or Publish; Manage apps opens the App Library on its app. An offer's More in the Store, Search the Store and an offered app's name open the Store from that slot, `openStore` naming the slot (`componentId`) and the app.
- **`onPress`** receives the reader's presses (Retry, Include, Try again, a step back or forward, Not now, an account chosen on the account choice) as a composition operation. Without it, no press button is drawn.
- **`onSignIn`** receives Sign in, Connect, Sign in again, Allow, Open the sign-in again, Add account and Cancel for one source, the bare app id for Add account, inside the click, so the host can open the sign-in window. Without it, none of them is drawn.
- **`onAppAct`** receives Install, Update and Show it here inside the click, as an `AppActRequest`: `{kind: install | update | show, appId, gap?, source?, surfaceId, componentId, anchor}`, the pressed button as `anchor` for a card to float from. Without it, none of the three is drawn.
- **`onNavigate`** takes a merged cell's click to the value it came from. Without it, cells aren't clickable.
- **`sourceName`** gives a source's name — the app's, with the account's label when the app has more than one. Without it, the source id is shown.

Wrap the rendered surfaces in **`Provider`**: a Radix Theme scoped to its own wrapper, never the page, that follows the host's light or dark and accent colour.

The host also fills seven React contexts the components read:

| Context                     | What it tells the components                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `SlotContentContext`        | which fragment to mount in a source's slot                                                                                        |
| `SlotStateContext`          | each source's state, for a merged-view column reserved for that source                                                            |
| `SynthesisStreamingContext` | whether the merged view is still being drawn as it is written, for `Table`'s skeleton row below its last and the slot's busy mark |
| `FragmentHistoryContext`    | where each fragment stands in its history, for `Attribution`'s arrows                                                             |
| `PressStateContext`         | presses on their way, and whether a press can be made at all                                                                      |
| `SignInContext`             | which sources have a sign-in window open, for the waiting form                                                                    |
| `AppActContext`             | each slot's install or update press, each app's installed version, and the apps a press holds (`AppActState`)                     |

`SignInWaiting`, the waiting form the tile draws while a sign-in window is open, is exported on its own for a host page that starts a sign-in with no slot: the App Library's add account and sign in again.

## For the orchestrator

The orchestrator writes shell surfaces without rendering them, so the package also ships:

- **`@a2uiverse/shell-catalog/schema`**: the catalog without React (`SCHEMA_CATALOG`, `CATALOG_ID`, the operators and relations, the slot's causes and facts, among them `OFFER_NONE_CAUSES` and `updateLineOf`, which picks an update tile's line from an update state) and one keep-set per model: `LAYOUT_SURFACE_KEEP_SET` for the Planner and `SYNTHESIS_SURFACE_KEEP_SET` for the Synthesizer. Each model is shown `catalog.json` narrowed to its keep-set, and what it writes is validated against the same.
- **`@a2uiverse/shell-catalog/platform-ui-guidance.md`**: how to answer a question about A2UIVerse itself. Read into the Planner's prompt.
- **`@a2uiverse/shell-catalog/synthesis-guidance.md`**: how to build a merged view from this catalog. Read into the Synthesizer's prompt.

## Commands

```bash
pnpm --filter @a2uiverse/shell-catalog build | typecheck | test | lint
pnpm --filter @a2uiverse/shell-catalog dev    # the design-check page, on port 5174
```

`test` renders every component in every value of each of its enum props, under the Provider, beside a parity test that keeps `catalog.json` and the implementation in step.

The design-check page shows that same sweep in light, dark and with no host theme, a merged view, the states of `DerivedValue`, `Slot` and `Attribution` — the offer and the update tile among them — and that the theme stays inside its wrapper.

The design record is [`docs/design/shell-catalog.md`](../../docs/design/shell-catalog.md); the story behind the authority components is [`docs/design/authority.md`](../../docs/design/authority.md), and behind the offer and the update tile, [`docs/design/store-loop.md`](../../docs/design/store-loop.md).
