# Client — system design

`apps/client`. The canvas shell (SPEC §4, §10–11): language in, full-screen generative UI out. It
talks only to the orchestrator. State as of task 9.9: a trail of canvases, one per question, each a
runtime of its own kept for the session and running on whether or not it is on screen — a past
canvas a tab the reader acts in — and on each canvas a composition — one shell surface,
`shell:main`, a model-authored tree in the shell catalog holding slots, each filled by a different
vendor's fragment in that vendor's own design system — plus the shell's own content in the same
tree: the merged view as shell content in its reserved slot, whose data model the client computes
from the vendors' partitions; platform answers bound to a literal data model the hub sends; the
capability tile for a gap; the two shell actions, handled on the canvas and reported to the
hub; navigation from a merged cell into the vendor fragment it names, handled on the canvas
alone; the reader's presses — Retry, Include, Try again — sent on streams beside the turn; and each
agent's paints in the canvas a stack the fragment's arrows step through, the merged view's wiring
following with no call where it was seen. The synthesis mechanism end to end, both processes, is told in
[`synthesis.md`](synthesis.md); this file records the client's classes and flows.

Mechanics of the shell itself (hold-and-swap, the trail, interaction policy) live in
`apps/client/src/canvas/README.md`. This file records the composition-era design: the classes,
what each owns, and the flows between them.

## Runtime graph

```
canvas.tsx ── createHostRelay() ── listCatalogs() ── resolveCatalogs() ── CanvasApp ── createCanvasWiring()
                     │                     │                  │                │                  │
                hostRelay            orchestratorApi   catalogs/resolver   binds wiring.host  trail store · runtimes by id
                (the host the        (catalog records) (catalogId →        to the relay       sender resolver
                shell catalog is                       catalog+Provider;   while mounted      host: onShellAction · onNavigate ·
                built with)                            the shell catalog                      appDisplayName · onPress —
                                                       built with the                         each to the canvas on screen
                                                       relay's host; every                                │
                                                       vendor catalog                         createCanvasRuntime(), per canvas:
                                                       decorated)                             store · A2A session · live MessageProcessor ·
                                                                                              turn runner · synthesis session ·
                                                                                              fragment history · binding index · navigator
```

One `MessageProcessor` per canvas, over every installed catalog. Per-surface catalog resolution is stock
library behaviour — a surface carries its own catalog — so a composed canvas needs no dispatch of
its own. The shell catalog is built rather than imported: `resolveCatalogs(records, host)` —
`host` a `Partial<CreateCatalogOptions>` — calls the package's `createCatalog` with the host's
shell-action handler, navigation handler and app-name lookup; with none given the two actions land
nowhere, cells are not interactive and app ids stand in for names — the catalog still validates
and renders, which is what a test or a replay needs. Every vendor catalog is rebuilt through
`decorateCatalog`, so its components register in the binding index (see Navigation).

## Canvases and the trail

A canvas is one question's answer (SPEC §6.4, task 9.6). Each is a runtime of its own, created at
its opening utterance and kept for the session: the one on screen is mounted, the others run on
unmounted — their streams arrive, their synthesis evaluates, their presses finish. In memory: a
reload starts fresh.

| Class | Owns | Collaborators |
| --- | --- | --- |
| `createCanvasWiring` | The page's runtime graph, built once: the trail store, the runtimes by canvas id, the sender resolver, and the page-level handlers — `sendUtterance` (a new canvas, its question sent, the canvas on screen its parent), `askAgain`, `view`, `returnToLive`, `closeCanvas`, `onShellAction`, `press` (on the canvas on screen, or on the one a beat names), `openReplayCanvas`, `attachReplay` — and `host`, what the shell catalog takes from the page: shell actions, navigation, app names and presses, each landing in the canvas on screen, a line's Retry all sent as one Retry per source (task-8.7 decision 24) | `trail/trailStore`, `canvasRuntime`, the sender resolver |
| `canvasRuntime` | One canvas (task-9.6 decision 1): its client-minted `id`; its A2A session — the context the orchestrator minted, learned from the first event, `contextId()`; its store, live processor, turn runner, synthesis session, fragment history, binding index and navigator; `open(text, parent?)`, its opening utterance; `press(operation)`, the step among them; `reportShellAction`; the fragment-failure report; `appDisplayName`; `close()`. Every message it sends carries its context | `canvasStore`, `turn/canvasTurn`, `synthesis/synthesisSession`, `history/fragmentHistory`, the senders |
| `trail/trailStore` | The trail (task-9.6 decision 2): `entries` in the order asked — `TrailEntry {id, contextId?, question, askedAt, title?, parent?, loading}` — `live`, the newest question's canvas; `viewing`, the past canvas on screen, null for live; and the page-wide `trustedPage`. `open` · `setContext` · `setTitle` · `setLoading` · `view` · `returnToLive` · `close` · `openTrustedPage` · `closeTrustedPage`. Pure readers: `newestFirst`; `viewedCanvasId`, the viewed canvas else live; `entryLabel`, the title, the truncated question until it arrives; `backTarget`, the canvas the one on screen was asked from (task-9.9 decision 22); `isBranch`, an entry whose parent is not its chronological predecessor (task-9.6 decision 5) | written by the wiring; read by `CanvasApp` and `TrailChrome` |
| `trail/spine` | Pure: the rail's spine over one day's entries, newest first — `spineOf(entries) → {nodes, connectors, lanes}`: a node per entry in a lane, the lineage straight through in its parent's lane when that lane is clear between the two, a branch in the first lane free; a connector from each node down to its parent's, straight in one lane, curving into the parent's otherwise, off the bottom edge to a parent in an older group; 56px rows, lanes 16px apart from x = 14, as board F5 measures them | `TrailChrome` |
| `components/CanvasView` | One canvas on screen, keyed by the canvas: its question and progress line, the condensed bar, its stage with the slots resolved against its own processor, its overlay, notices and scrim; the host contexts filled from its store and history — `SlotStateContext`, `PressStateContext` (a press can always be made, on a past canvas too), `FragmentHistoryContext` | the runtime, `useStepHold` |
| `components/TrailChrome` | The trail chrome, board F5: the gutter with Back and Trail, the rail, the preview, and the band on a past canvas | `trail/trailStore`, `trail/spine`, `TrailPreview` |
| `components/TrailPreview` | The hover preview (task-9.6 decision 9): the entry's canvas's shell surface mounted a second time from its own runtime, under a binding index of its own so navigation never lands in the copy, in an inert box laid out at 1120px and scaled to 0.25, pointer events off, its buttons disabled and no arrows; beneath it the canvas's progress line, its sources' ticks alone, as caption and accessible name | the runtime's store and processor |

### A question opens a canvas

`sendUtterance` mints a canvas id, creates its runtime, and enters it in the trail as live and on
screen, the canvas that was on screen its `parent`; only the session's first question, asked on an
empty canvas, is a root. The runtime's `open` sends the question with no `contextId` — the
orchestrator mints one (task-9.2 decision 1) — naming the parent's context under the stamp key
(`canvasParentMetadata`). The runtime records the context from the first event, the entry takes it,
and every later message on the canvas carries it. The Planner's title arrives as the `paintMeta` for
`shell:main` and replaces the truncated question as the entry's label with a short crossfade; the
question stays the canvas's header. The entry's `loading` mirrors the canvas's store through
`running` — its opening turn, an action turn, or a press sent or running — so the mark and the
progress line's spinner never disagree. The canvas the user was looking at runs on: a new question
ends nothing (task-9.6 decision 13). A canvas whose question never reached the orchestrator stands
with its question and its error, and closes with nothing sent.

"Ask this again now" (`askAgain`) sends the viewed canvas's question verbatim as a new canvas asked
from it, which becomes live and on screen. "Edit and ask again" on the header opens the palette
holding the question, and Enter asks it from the canvas on screen; the live canvas has no refresh
press of its own (task-9.9 decision 21).

### The trail

- **The gutter** is a sidebar down the left edge, 56px on the page's background with no divider,
  Back and Trail in it; the page column, the live canvas's condensed bar and the band start past it
  (task-9.9 decision 18). Back goes to `backTarget`, up the branch — "Back to" and that entry's label on hover,
  disabled on the session's first question, no Forward. Trail, a branch icon, opens the rail; the
  gutter hides while the rail is open.
- **The rail** is a drawer over the page with a faint scrim beneath it, nothing beneath moving,
  272px and wider by the lanes its spine needs. Entries newest first under day headers — "Today",
  "Yesterday", then the date — each its label and time, "Live" on the newest, "Viewing" on the one
  on screen, a quiet mark while it is loading, and on a branch a glyph naming its parent on hover
  and for assistive technology ("Asked from …", "Asked from a canvas since closed"), lighting the
  parent's row while hovered. The spine beside them draws a node per entry — live filled with a
  halo, the viewed one filled, the rest rings — the viewed canvas's lineage in ink, the rest faint.
  Picking an entry views it and closes the rail; so do the rail's own icon, Trail, Escape and a
  click on the scrim, the rail sliding out over 240ms. A closed rail clears its preview, so an entry
  picked under the pointer leaves none behind.
- **The preview** shows on hover or focus of any entry but the one viewed, one at a time, beside the
  rail level with its row.
- **The close** on each entry, on hover and focus, is immediate: `closeCanvas` calls the runtime's
  `close` — the turn in flight and every stream beside it cancelled (`runner.cancelAll`), then
  `{kind: 'close'}` sent on its context, fire and forget, nothing sent for a canvas with no context —
  drops the runtime and takes the entry out of the trail. Closing the viewed canvas returns to live;
  closing live makes the newest remaining canvas live; the canvases asked from a closed one take its
  parent, so Back runs on through it; closing the last leaves the empty canvas.

### A past canvas is a tab

A past canvas draws as the live one does, in its colors (task-9.9 decision 14), and is actable: an
action, a press, a sort or a step lands in its own runtime and goes out on its own context, the
orchestrator answering against its composition. The band over it reads "Parked · asked at HH:MM" —
the question's time, the canvas's one time; a fragment carries none (task-9.9 decision 13) — beside
"Ask this again now" and "Return to live" naming the live question. Once the question has scrolled
away, `CompactHead` portals the condensed question and progress line into the band's middle, one
row of chrome rather than a bar beneath it. The Ask pill reads "Ask from this view".

## Composition

| Class | Owns | Collaborators |
| --- | --- | --- |
| `canvasStore` | One canvas's state, a store per canvas runtime (task-9.6 decision 2): the stage and the overlay, the **placement map** (a slot's source → `{surfaceId, source}`), the **promoted** set, by source, the **question** (`{text, askedAt} \| null`), the sticky `error`, and `inFlight` — the cause's kind and, for an action inside a fragment, the source whose repaint is in flight, `settled` once that source's stream has ended while the turn runs on (task-9.7 decision 6, task-9.9 decision 25); the composition's own state (task 8.5) — the roster, each slot's **painted state** by source (`slotStates`), the merged view's painted facts (`merge`: `merged`, `late`, `working`, `callFailed`, `retrying`, `declined`, `collapse`), the reader's **presses** (`{key, operation, status}`, status `sent` · `running` · `unreached` · `lost`), a step among them, `mergeFollowingStep` (the merge line working after a step to a combination the client has not seen, task-9.7 decision 4), and `mergeHeld` (the merged view held at its last values while a fragment it reads repainted, task-9.9 decision 23) — kept across the actions inside the composition, reset when it retires | read by React through `useSyncExternalStore`; written by its canvas's turn runner and runtime |
| `turn/canvasTurn` | One canvas's turn lifecycle and role routing: which surfaces are stage paints, which fill slots, which fragments are refused, when a composition is torn down; in staged mode a source's paint swapped into its slot at its settled marker (task-9.9 decision 23); **streams beside the turn** (`beginSideStream`) routed the same way; a vendor slot painted failed taking its fragment off the canvas, on any stream; every vendor create counted in the fragment's history at the wire, the paint on screen captured before a claim or a swap destroys it, a step's copy restored into its slot (`restore`); `cancelAll` at the canvas's close | `canvasStore`, the live processor, `applyMessages`, `composition/roster`, `history/fragmentHistory` |
| `composition/slotContent` | What a `Slot` renders: boundary → vendor Provider → surface for a vendor fragment; surface alone, in a bare `[data-shell-content]` element, for the `shell` source (task-5.5 decision 2); for a slot on the roster that is unfilled, its source's prose, if any, as `[data-slot-resting="prose"]` | `FragmentBoundary`, `catalogs/CatalogContext` |
| `composition/FragmentBoundary` | The one element a fragment mounts inside: provenance, isolation anchor, promotion treatment | — |
| `composition/slotCount` | How many `Slot` components the surface holds, gap slots included — adaptive weight's input | — |
| `composition/collisionDetector` | CSS collision rules over the installed catalogs | run from tests only |
| `composition/roster` | `shellPaintSlots`: reads a shell paint's slots — the roster, each `Attribution` paired to its `Slot` through `child`, and the vendor slots a whole-tree paint left with no attribution (`unattributed`); `slotStatesOf`: each `Slot`'s painted `state` by source, the synthesis slot under `shell`; `mergeFactsOf`: the merged view's painted facts, when the paint carries its slot; `rosterOfSurface`: the roster of a mounted shell surface | `canvasStore` (`RosterEntry`); the wiring's `appDisplayName` |
| `composition/columnState` | Pure: a reserved column's state by its source (task-8.5 decision 12), provided as the shell catalog's `SlotStateContext` — `filled` once in the merge, `failed` once painted failed, `pending` while loading, while its Retry is pressed or runs and while it is being included, `late` while it waits for Include, `collapsed` for a source that answered in words; `sourceBusy`, a source's repaint in flight — the canvas's opening turn, an action inside that fragment, or its Retry pressed or running — which draws its arrows disabled (task-9.7 decision 6) | `canvasStore` |
| `hostRelay` | The host the shell catalog is built with, before any canvas exists — `ShellHost {onShellAction, onNavigate, appDisplayName, onPress}`: forwards a shell action, a navigation or a press to the host the page bound, which lands it in the canvas on screen, and warns and drops one raised with nothing bound; the lookup answers nothing when unbound, so the app id stands in | built in `canvas.tsx`; `CanvasApp` binds `wiring.host` while mounted |
| `components/TrustedPageOverlay` | The trusted-page layer over the canvas — the Store or the App Library — as `trustedPage` says: the page's title, the query when one was carried, "Back to the canvas" | `trail/trailStore` (`trustedPage`, `closeTrustedPage`) — page-wide, not a canvas's |
| `components/QuestionHeader` | The question heading the canvas: display size on one line, a fixed 4-line box (120px) past it, measured before paint; past 4 lines the 4th fades and "Show all +N lines" opens the whole question over the page (Esc closes); the header and "Edit and ask again" open the palette holding it | `CanvasView` (keyed by the question, so a new one remeasures) |
| `components/CompactHead` | The header condensed: once the head has scrolled out of `.canvas-scroll`, a one-line bar over the page's top edge — the question, and the progress line's compact copy whenever the full header carries one, running or landed (task-8.7 decision 22); nothing while the head is in view; on a past canvas the same copy portaled into the band's middle (`BAND_MIDDLE_ID`), no bar of its own (task 9.6) | `CanvasView` (the scroller and head refs), `ProgressLine` |
| `turnProgress` · `components/ProgressLine` | Pure: the turn's progress off the store — planning (an utterance in flight with nothing planned), a step per vendor source in roster order (✓ once placed or spoken, ✕ as painted, the spinner while loading, while its own Retry is pressed or runs, and while an action inside its fragment runs, until its settled marker — an action names no action of its own, task-9.9 decision 25 — whether or not the turn is in flight), and the merge step in the client's words (task-8.5 decision 11, task-8.7 decision 20), the join phrased from the shell `RosterEntry`'s `join` — the home source's noun to the others' under an anchored join ("Linear issues to GitHub PRs and CircleCI runs"), the thing across the sources under a union ("cameras across Aperture & Co, Northlight and Fieldstone", task-8.7 decision 30), the apps listed with none: before the view lands, "Joining …" over the plan while nothing has arrived, "Waiting for X and Y, then joining" over the sources still awaited, a failed one not among them, until a merge is possible — two arrived, the home source among them under an anchored join — then "Joining …" over the arrived sources with a clause per source not yet in ("· CircleCI runs still loading", "· no CircleCI runs to join", "· without CircleCI" with no noun), since the hub paints nothing at the soft deadline's release; "Joined …" over the merge's own set with a clause per missing source after F6 (those, and "· Gmail not in this view yet", "· including …", "· couldn't include …"); "Found nothing to join across …" over the sources the decline was made over, a source that answered since in its own clause; the collapse causes shortened ("Can't join without Linear issues", "Only GitHub answered, nothing to join"); "Could not join …" for a merge that couldn't be made; "Joining …" working while `mergeFollowingStep` or `mergeHeld` says so — and its line under the question, the working step carrying `canvas-pending`; the canvas's sticky error closing the line in the danger tone, an alert on the full line, the condensed copy carrying it too (task-9.9 decision 20); with nothing to say — a platform answer, no source dispatched, no merge, no error — it draws nothing and takes no room (task-8.7 decision 28); `sourcesOnly` the ticks alone, the preview's caption; `running(state)`, an in-flight turn or a press sent or running, is the trail's loading mark | `canvasStore` |
| `components/AmbientNotice` | The notice stack and its two fade clocks | `canvasStore` via `orderedNotices` |
| `synthesis/synthesisSession` | A composition's synthesis state: the payload, the data-model subscriptions that re-run the evaluator, the user's sort choices by array path, the last output written; `accept` true when the payload was taken, false when it was refused and reported; `hold` and `release` — while held, a change waits and the last output stands, a payload accepted meanwhile still lands (task-9.9 decision 23) | fed by `turn/canvasTurn` and a step; reads and writes its canvas's processor's data models; reports an invalid payload through the fragment-failure channel |
| `synthesis/bindingEvaluator` | Pure: `evaluate({payload, models, choices, functions}) → EvaluatedModel` — the derived model mirrored with a cell object at every formula path, each cell's join and navigation target, every array a sort path reaches sorted in place, `/sorts/N` with the choice in force; ref resolution through the sdk kit, absent-skipping, operator and relation dispatch to the shell catalog, `argmin`/`argmax`/`source` mapped to an app id | the shell catalog's `functions` and `cellJoin`; the sdk's `reachSortPath`; `parseInstant` for the sort |
| `navigation/bindingIndex` | The reverse index: from a partition's data path to the vendor component rendering it, over what is mounted | fed by `navigation/decorateCatalog`; asked by the navigator |
| `navigation/landing` | `createNavigator(index)`: resolves a cell's target to an element and lands on it | the binding index; the sdk's `locatePointer` |
| `synthesis/intake` | The payload's shape by the sdk's `validateSynthesisPayload` (never a private mirror, phase-5 decision 23), then every operator against the shell catalog's list, in its place — a match claim's relations among the catalog's `RELATIONS`, no relation outside `match` (task-7.5 decision 5); the first failure is the `VALIDATION_FAILED` report | `@a2uiverse/sdk` |

### The stamp is the routing input

The hub stamps every event it relays (`metadata.a2uiverse`, `@a2uiverse/sdk`, composition
contract v0.8): `{source, role, settled?}`. `sendAndApply` extracts
it (`extractStampFromEvent`, over the sdk's `readStamp`) and hands it to the turn handle alongside
the batch — an event with no A2UI messages only when its stamp is `settled`. Placement is by `source`: the stamp names no slot, and the `Slot` a fragment fills is
the one whose `source` is the stamp's.

- `role: 'shell'` — an ordinary stage paint; the roster and the refused set are read off it.
- `role: 'fragment'` — registers in the placement map under the stamp's `source`; never contends
  for the stage.
- **absent** — a stage paint. Composition is opt-in via the stamp, which is what keeps every
  pre-composition fixture and test valid.
- `settled` — the one event the hub sends after a fragment source's last, carrying no A2UI parts
  (task-8.7 decision 25): nothing is applied, and the runner judges that source's fragments at once
  (`settleSource`), so a paint the canvas cannot draw is reported before the merge reads it.

### Synthesis: the paint carries the tree, the payload rides beside the stamp

The synthesis surface (`shell:synthesis`) arrives as a fragment of the `shell` source, in the
`Slot` holding it: the model-authored tree as ordinary A2UI, the payload — the derived model and the
sorts — beside the stamp on the same event (`extractSynthesisFromEvent`, over the sdk's
`readSynthesis`). `sendAndApply` hands both to the turn handle, and the runner hands the payload
to the session **once the synthesis surface is live** — at apply in progressive mode, at the swap
in staged mode, since an action turn's repaint streams into staging.

The session validates the payload (`intake`), subscribes to the root of every surface it refs and
to `/sorts` on the synthesis surface (the library data model notifies on any nested write, so one
mechanism covers vendor updates, two-way edits inside fragments, and a sort control's
write-back), evaluates, and writes the whole evaluated model to the synthesis surface in one root
write — before React renders. Subscription-driven runs coalesce to one microtask, so a vendor
batch of several data-model messages evaluates once; intake evaluates synchronously. Its own
write is guarded against re-triggering itself, and an unchanged output is not written. A surface
the payload refs that a vendor re-creates is watched again; one that is deleted goes absent and
re-evaluates. Refs select by key, so a repaint under a ref is not an event (task 5.10). The user's choice on each sorted array sticks across a re-synthesis
while its key is still an option; `retireStage` retires the session with the composition, and a
new question opens a canvas with a session of its own, starting from the declarations' own choices.

An invalid payload reports `VALIDATION_FAILED` for `shell:synthesis` through the same side
channel a fragment that will not render uses; the hub fails the synthesis slot. A ref into a surface
the client does not hold is absent at evaluation time, never a rejection.

**The join and the target.** A formula under an object carrying `match` is joined by that object's
claim; the nearest claim covers every plain object and array below it, down to the next object
with its own. `evaluateClaim` runs each relation now: `absent` when either side does not resolve,
else `holds` or `fails` by the shell catalog's relation function, each side `{app, ref, value?}`.
The shell catalog's `cellJoin` turns the claim, the cell's apps and its absent apps into the cell's
`join` — its mark and evidence. Nothing is written at `match`. A cell's `target` is its first ref
that resolves; a selector's is the winning ref, and its value, an app id, carries `names: 'app'`. A
cell none of whose refs resolves gets no target and is not a button (task-7.9 decision 2). A sort
path through `*` reorders every array it reaches, one choice per declaration (task 7.12).

The merged view renders as shell content (phase-5 decision 22): the `Slot` the hub paints for it
declares `content: "shell"`, and `renderSlotContent` mounts its surface in a bare
`[data-shell-content]` element with the error boundary but no `FragmentBoundary` — no tile, no
attribution, no region named after a source. Pending, the shell catalog's `Slot` reserves it as the
merged view — a label bar, the planned headers, four skeleton rows (task 7.15); filled, it takes the
view's own height; collapsed, it is the line the `Slot` draws from the painted decline or cause.
The merged view never rests on prose: a decline is said on the collapsed slot alone (task 8.5).

The recorder (`scripts/lib/batch.ts`) keeps the synthesis payload beside the stamp on the one
event that paints the merged view, so a recorded composition replays with the real document
evaluated over the real partitions; beat 5 is the temporal merge recorded that way (task 5.7,
re-recorded in 6.6).

### The shell's own content in `shell:main`

`shell:main` is the Planner's tree in the shell catalog, and the shell's words stand in it beside
the slots: framing `Text`, and platform answers — a `Table` or `DataList` bound through `{path}`
over a **literal data model** the hub sends as `updateDataModel` on `shell:main` ahead of the
tree. The client applies it as it applies any surface's data model, through `applyA2uiMessages`
into the live processor; nothing on the client guards or evaluates it (task-6.5 decision 8). The
tree's buttons raise the two shell actions through `functionCall` (`openStore` with an optional
`query`, `openAppLibrary`).

A `Slot` carrying `gap` is the **capability tile**, drawn by the catalog itself
(`[data-slot-state="gap"][data-slot-gap]`): a fixed line and a "Search the Store" button raising
`openStore` from that surface with the gap as `query` and the tile's component id as
`componentId`. It names no source, so it enters neither the roster nor the placement map; the
client resolves no content for it. `weight` on `Attribution` and on a bare `Slot` is the
catalog's to render; the client's only reading of layout is `slotCountOf`.

### Shell actions: relay · overlay · report

A `ShellAction` is `{name: 'openStore', surfaceId, componentId?, query?}` or
`{name: 'openAppLibrary', surfaceId, componentId?}` — `componentId` set only when a component
raised it directly (the tile); a `functionCall` runs with no component in scope.

**Relay.** The shell catalog is built at the entry, before any canvas exists, so its host is the
relay's: `createHostRelay()` in `canvas.tsx`, its `host` given to `resolveCatalogs`. `CanvasApp`
binds `wiring.host` in an effect and unbinds on unmount; a raise with nothing bound is warned and
dropped.

**Overlay.** `onShellAction` opens the page at once, page-wide: the trail store's
`openTrustedPage({page: 'store', query?})` or `({page: 'appLibrary'})`; a raise while a page is open
retargets it, so the text follows the latest query. `TrustedPageOverlay` renders from the trail's
`trustedPage` as a fixed layer
over the canvas (`data-testid="trusted-page-overlay"`, `data-page`, `data-query`; `role="dialog"`,
`aria-modal="false"`) — the page's title, "Searching for “…”" when a query was carried, "Back to
the canvas" calling `closeTrustedPage`. The canvas is never unmounted beneath it. It is a layer of
its own beside `CanvasOverlay`, which mounts a pending question surface.

**Report.** The canvas on screen's `reportShellAction` sends the same raise to the hub, on its
context, as a standard A2UI action on the shell surface that raised it: `{name, surfaceId, sourceComponentId, timestamp, context}` —
`sourceComponentId` the tile's component id or the `functionCall` sentinel
(`FUNCTION_CALL_SOURCE`), `context` `{query}` for an `openStore` carrying one, else `{}` — through
`buildActionMessageParams` with no data model, on the **side channel** beside
`reportFragmentFailure`: no turn, no trail entry. The hub answers with nothing;
messages it does return are routed as a stream beside the turn, as the failure report's
repaint is. The page never waits on the report; a failed one is logged and nothing more. Every
raise is reported, an open page included.

### Presses: a stream beside the turn

Retry, Include and Try again (task 8.5) reach the client through the shell catalog's one press
handler — `ShellHost.onPress`, bound through the relay — as the composition operation
`{kind, sources}`. `press` sends it on the canvas's context with `buildOperationMessageParams` — the operation as a
data part of its own (`operationData`, contract v0.8), the supported catalogs, no data model (a step
alone carries one, below) — and answers it
on a **stream beside the turn**: `runner.beginSideStream()`. A line's Retry naming several sources —
Retry all — is sent as one Retry per source, each on its own stream (task-8.7 decision 24). Not a turn: no trail entry, and
the turn in flight is never cancelled. The stream routes by the stamp
exactly as a turn's batches do — a shell repaint read for the roster, the slot states and the merged
view's facts; a fragment claiming its slot; a synthesis payload handed to the session — straight into
the live composition. Several can be open at once. The fragment-failure report's and the
shell-action report's answers are routed through the same kind of stream.

**The pressed state.** At the click the press is recorded `sent`; the shell catalog draws it from
`PressStateContext` before any answer — the tile gives way to the pending line, the row says
"Including …" — and the progress line and the columns read it too. The first shell repaint on its
stream makes it `running`: the paint has caught up. The stream's end removes it. A send that never
produced a first event (`sendAndApply`'s `onFirstEvent`) stands `unreached`; one that broke after it
answered stands `lost`; each stays until the next press of its kind, or the composition's
retirement, so the slot can say so in place. A refused press ends quietly: its words are the
orchestrator's, only logged, and the paint already shows what won.

**A press can always be made.** A past canvas takes one as the live canvas does (phase-9
decision 4); only the trail's preview draws its buttons disabled. A new question ends no stream on
any other canvas; a canvas's close ends all of its own (`cancelAll`).

**A failed source leaves the canvas.** Whatever stream carries it, a shell repaint painting a vendor
slot `failed` deletes that source's surfaces from the live processor and clears its placement: refs
into it go absent and its cells stop navigating, and a Retry shows the pending slot. A late message
for a surface taken off is dropped; a fresh `createSurface` for it — a Retry's answer — lands.

**The composition's states.** The roster, the slot states, the merged view's facts and the presses
belong to the composition, not the turn: an action inside a fragment keeps them; the stage retiring
resets them, and the canvas's close drops them with its runtime.

**In a replay.** `attachReplay(sender)` stands a sender in for the orchestrator on every stream
beside the turn — the press, the fragment-failure report, the shell-action report — until detached;
the turn's own paths are untouched (task 8.6).

### Navigation lands locally

A tap on a merged cell with a `target` calls the host's `onNavigate`; the navigator lands on the
element that target names in the vendor's fragment (SPEC §7, task 7.7). Nothing is sent and
nothing is journaled.

**The binding index** (`navigation/bindingIndex.ts`) is one per canvas runtime and holds what is
mounted of it, under `BindingIndexContext` while the canvas is on screen; the trail's preview mounts
under an index of its own, so a tap never lands in the scaled copy. `decorateCatalog` wraps
every vendor component so it registers its surface, component model and data context while
mounted; the shell catalog is not decorated. A component is bound to a path when a property binds
it exactly (a `{path}` inside a function call's arguments included), when it is the root of a
template instance whose base path it is, or when it owns a template child list over it — read when
asked, never kept. Which element a component put on the page is read only at a tap: the
candidates render a pair of hidden markers around their output for one synchronous read between
two `flushSync` renders, gone before the browser paints. `nearest(surface, path)` walks the path up
one segment at a time and takes the first bound element in document order.

**Landing** (`navigation/landing.ts`). The target's key-based pointer is located in the partition
now by the sdk's `locatePointer` — positions are where elements are at this moment — then:

1. the nearest bound element, the exact path or an ancestor;
2. else the fragment boundary for the surface;
3. else the source's slot;
4. else a warning and nothing.

The element is scrolled to the middle of the view — instantly under reduced motion — and focused
once the scroll ends (`scrollend`, or `SCROLL_SETTLE_MS` 700 ms), anything still out of view
brought in at once. Focus goes through a `tabindex="-1"` the element carries until it blurs, when
it had none. A ring drawn in the shell's own layer follows the element's box for `RING_MS`
1500 ms; the shell never styles inside a fragment.

**App names.** `appDisplayName` answers for the canvas on screen: the roster of its stage's shell
paint through `rosterOfSurface`, then its store's roster. The store's roster is the composition's,
and an action turn carries no shell paint to refill it.

### Prose composes through the same stamp

The stamp routes text as well as surfaces: `sendAndApply` hands it to `onAgentText` exactly as
it does to `apply`. `canvasStore` buffers a line per `source` rather than one string, so the
interleaved chunks of a fan-out concatenate only with their own source's. Prose with no
`fragment` stamp — the shell's own cues, and an uncomposed stream — shares one reserved line.

Prose stays in the shell's region rather than in the slot it describes: a source can answer
without painting, and its slot may be failed or collapsed by the time it speaks. The store keeps
what each source said for the whole turn (`prose`, by app id) beside the stack, and an unfilled
slot whose source is on the roster rests on it (`useSlotContent`), so a source that was consulted
stays visible after the stack fades.

Two lifetimes. The sources' lines belong to the turn — cleared when a new one opens, faded
together once it settles, so the stack reads as one set of answers and no line vanishes from
under a reader. The shell's line keeps its own clock, because a cue fires while a paint is in
flight and so has no turn to be scoped to.

### The roster is the second projection of the shell paint

`placement` says which fragment filled which slot, but only once one has, and in fill order. The
roster is the complement: the turn's sources in *slot* order with the display names the Registry
painted, read by `shellPaintSlots` from every `shell`-stamped batch. The tree is model-authored —
the ids are the Planner's, the nesting whatever it drew — and the painter wraps each vendor
`Slot` in an `Attribution` whose `child` names it (task 6.4), so a slot's attribution is found by
that link and never by where either sits in the list; a slot enters the roster only when its
attribution's `appId` is its own `source`. A `Slot` with `content: "shell"` pairs with no
attribution and reads as the reserved `shell` source, named by its label, carrying the `join` the
painter wrote on it — `{home, entity?, nouns}`, `home` null and `entity` the thing the rows are under
a union join (task-8.7 decision 30) — the `RosterEntry`'s one optional field (task 7.15). A `Slot` with `gap`
names no source and enters no roster. The roster orders the notice stack and names its lines —
including for a source that never paints — and decides which unfilled slots rest on prose.

A vendor-source `Slot` that is the `child` of no `Attribution` is `unattributed`, judged only on a
whole-tree paint — one carrying `root` — since a partial repaint may carry a slot without the
wrapper that still stands around it. The runner refuses that source's fragment (see Validation).

A shell repaint may legally carry only the components it changed, so a paint containing no
attribution leaves the roster standing rather than emptying it. The roster belongs to the
composition: kept across the actions inside it, cleared when it retires, never by a repaint.

### The question heads the canvas

An utterance sets its canvas's `question` at `runner.begin`; an action or an answer leaves it
standing, and each canvas keeps its own. The head — `QuestionHeader` over `ProgressLine` — sits
above the stage, 12px from the top, in the page column past the 56px sidebar Back and Trail sit in;
Back's row is also 12px from the top, so the question's first line and the button share one centre,
30px down. On a past canvas the band holds the top edge, 56px high past the sidebar, and the head
starts beneath it. Head and stage share one scroller, `.canvas-scroll`, so the head scrolls away with
the page it heads. `CompactHead` watches it leave (an `IntersectionObserver` rooted at the scroller)
and then hangs a 60px bar from a zero-height sticky anchor at the scroller's top, starting past the
sidebar, so showing it moves nothing: the question on one line at 14px semibold, opening the palette
holding it, and, whenever the full header carries one, `ProgressLine`'s compact copy beside it,
running or landed (task-8.7 decision 22), with no live region and no `canvas-pending` of its own
(task 7.16); on a past canvas the same copy folds into the band's middle instead. Every word of the
progress line is computed; the join is named from the nouns the plan painted on the merged view's
slot. There is no status strip (task-9.9 decision 20): the canvas's sticky error — a message of its
own that failed or never arrived, cleared by its next dispatch — closes the progress line in the
danger tone, an alert on the full line; with no canvas, a replay that could not start says so under
the empty page's hint. The head, the band and the Ask pill take their values from `--a2v-*` tokens
on `.canvas-app` (with dark values), drawn to the Final page and board F5 of the task 7.14 design
canvas (https://claude.ai/artifact/W324EkZXFze2CxddzNve1o). The stage content sets
`--a2v-layout-gap: 32px` for the shell's own regions and unsets it inside each fragment and the
shell content. The Ask pill sits 24px above the page's foot and the notice stack 80px, the top edge
being the question's. Every button the shell draws shows the pointer: `--cursor-button: pointer` on
the client's Radix Theme, as on the shell catalog's (task-9.9 decision 24).

### A composed turn abandons hold-and-swap

A composition's whole point is that the layout lands before its agents answer. So a *stamped
shell create* retires the outgoing composition and drops the turn into progressive mode; the
slots then fill in place. Only a create does this — a bare shell repaint (a slot flipping to
failed) targets the live surface and must not tear the canvas down.

Hold-and-swap survives untouched for unstamped streams. What it used to protect — never showing a
half-valid paint — is provided under composition by slot lifecycle instead: a fragment that fails
flips its slot, not the paint.

Inside a canvas an action's turn is staged, the stage being occupied, and its fragments are held
per source, not per turn (task-9.9 decision 23): a source's settled marker swaps in what survives of
its paint — the net-effect rule judged per source, a surface it created and cleaned up again
discarded — so a drill-down shows as the vendor answers. A vendor paint swapped in inside a live
composition holds the merged view at its last values (`synthesis.hold`, `mergeHeld`), its line
working, until the turn ends with the re-synthesis it waits on; a payload accepted meanwhile lands.
The synthesis repaint and any stage paint swap in at the turn's end.

### Teardown

`retireStage` is the one place a composition leaves its canvas: it deletes the shell *and* its
fragments from the canvas's processor, clears placement and promotions, retires the synthesis, the
composition's store state and the fragment history, and ends the streams beside the turn. Without
the cascade the fragments would linger in the live registry and ride back out to their vendors
through the hub's per-dispatch partition filter as stale state. A canvas's close ends its runtime
whole: `cancelAll`, then the runtime dropped.

### A request that gets no answer is sent once more

`sendAndApply` gives every request `FIRST_EVENT_TIMEOUT_MS` (10 s) to produce its first event —
utterances, actions, failure reports and shell-action reports alike. On silence it aborts the
attempt and sends the same message under the same id once more, with a `[A2UI:a2a]` warning; a
second silence throws "The orchestrator did not answer." The orchestrator refuses an id it has
already taken in, so a first send that was only slow never runs twice (task 7.9). A stream that has
answered may go quiet for as long as a model takes; the hub's heartbeat — an empty `working` event
after 30 s of silence, nothing to apply — keeps a proxy's idle timeout from cutting it. A turn that
answered and then lost its stream is said as the canvas's error, at the end of its progress line, in
the client's words, "Lost the connection to
A2UIVerse. Ask again to see where this stands." (`LOST_TURN_WORDS`), the sentence a press uses; one
that never reached the orchestrator, "That didn't reach A2UIVerse. Ask again."
(`UNREACHED_TURN_WORDS`); an action that failed, "That action failed." with the reason; the
browser's error goes to the console (task-8.7 decision 31).

### Validation

Client-side, where the catalog schemas physically are. Validation errors ride the deferred/settle
path: a fragment is judged when its source's stream ends — the stamp's `settled` — and at the turn's
end whatever was not, a fragment that never reached the canvas failing only there; a structural
failure that can never self-heal (an unknown `catalogId`) reports immediately. One report per
fragment. A fragment's failure is never the canvas's error — its tile says it; the error at the end
of the progress line speaks for a surface no slot carries (task-8.7 decision 26). A broken *shell*
surface reports nothing outward — that is the platform failing, not a vendor.

The report goes out on a **side channel**, on the canvas's context: no turn, so it cannot cancel
the user's in-flight work or set the canvas's error. The hub answers by repainting its shell with
that slot failed, on a stream beside the turn that takes the failed fragment off the canvas. A
report for a fragment no longer in its slot — displaced by a later paint — is dropped, because
`shell:main` is reused for the canvas's whole life.

**The refusal.** A vendor fragment never renders unattributed (task-6.5 decision 7). The runner
keeps a per-turn `refusedSources` set, filled from `shellPaintSlots(...).unattributed` on every
`shell`-stamped batch. A `fragment`-stamped batch whose source is refused enters the registry
not at all: each `createSurface` in it is reported the moment it arrives as `VALIDATION_FAILED`
at path `/`, message "the shell drew this slot with no attribution", with `refused: true` on the
`FragmentFailure`; the slot is demoted; the hub flips it to `failed`. `reportFragmentFailure`
skips its displaced-fragment check for a refused report, since the fragment was never placed and
cannot be late.

### Questions are declared, never inferred

`paintMeta.kind === "question"` is the whole contract. The canvas reads nothing from a surface's
shape: the structural fallback that recognised a `ConfirmationDialog` root is gone, because that
is a Primer component name — a vendor catalog's — sitting inside shell logic, and it could never
have fired for a catalog that names its dialog anything else. The GitHub agent already validates
the biconditional on its side (a declared question must have a dialog root, and a dialog root must
be declared), so nothing on a live wire relied on the inference. **Vendor agents must declare
their questions**; 2.6 and 2.7 inherit that requirement.

### Promotion

A fragment declaring a question does not get the modal overlay — that would re-parent it out of
its slot and let one vendor block a canvas it shares. The shell raises the slot and dims the
complement instead. Promotion is plural, so it is emphasis rather than a modal: no focus trap, no
`aria-modal`, and the count is announced through a live region. The question overlay stays for
shell-painted questions, which is what M8/M10 consent dialogs will want.

### Beats and specs

Recorded beats (`scripts/lib/beats.ts`, recorded by `scripts/record-beats.ts` through the hub,
bundled from `recordings/beats/` by `beats/beatFixtures.ts`), every one a composed turn: 1 the PR
list, 2 the PR detail, 3 the compose-and-confirm review chained after 2, asked from 2's canvas; 4 the side by side — the
layout-only fan-out, two vendor slots on one `Row`, no merged view (task 6.6); 5 the temporal
merge, the three-vendor fan-out with the synthesis payload beside the stamp; 6 the platform
answer, `shell:main` bound to its literal data model, no vendor dispatched; 7 the capability gap,
one gap slot; 8 the mixed utterance, the reader's words in the tree beside the one vendor slot,
which rests on Calendar's prose (task 6.6); 9 the entity join — Linear, GitHub and CircleCI on this
repository, the merged view with its match claims (task 7.9). Per beat the recorder prints the batch count, the
turn's duration, and two offsets from send: the layout, the first `createSurface` under a
`shell` stamp, and the first vendor fragment, the first `createSurface` under a `fragment` stamp
whose source is not `shell`.

Synthetic beats (`beats/syntheticBeats.ts`, by name through `?beat=`): `plain`, `plain-2`,
`validation`, `question`, `composed`, `composed-solo`, `composed-question`, `synthesis`,
`navigation` — two storefronts under a merged view whose cells name a rendered field, a field
neither renders, and a join held by judgment alone — `join` — a list inside every row under one
sort declaration, then a storefront repaint that changes a matched title, so the values it cut off
draw broken (`beats/joinFixture.ts`) — `platform-answer` — `shell:main` with its data model sent ahead of a tree bound through a `Table`
template and a `functionCall` button into the App Library — `gap`, one `Slot` with `gap` — and `merging` / `long-merging`, beat 9 and `long-question`
with every batch before the merged view's at once and the merged view held back ten minutes, so a
paced replay rests on the reserved slot (task 7.15) — and `trail`, four canvases: a root, a child
asked from live, a branch asked from a past canvas and one held loading, every mark of the rail at
once and the band on a past canvas, its root carrying one drill-down so that fragment's marker shows
Back (task-9.6 decision 14, task-9.7 decision 7).
Their layouts are built on the painter's shape: each vendor slot the `child` of an `Attribution`
standing where the slot stood in the parent, the synthesis slot bare but for its planned
`columns` and `join`.

Phase 8's cases (task 8.6). Recorded beats 10–18, each through an orchestrator the recorder starts
on `--fault-port` (`scripts/lib/orchestrator.ts`) with the case's fault map and deadlines over the
deterministic roster — beat 5's utterance among peers, beat 9's under Linear's join: 10 a fast
failure then Retry, 11 a late arrival then Include, 12 the home source straggling, 13 an answer held
past a 15 s cap drawn by Retry, 14 Retry racing a capped dispatch, 15 a broken stream, 16 a paint
the canvas reports and the report's answer failing its slot, 17 the home
source failing then Retry bringing the merge back, 18 fewer than two sources. A `FaultCase` names
what its recording must show; a take that does not is taken again. A fixture carries the
`deadlines` and `faults` it was recorded under. Synthetic (`beats/lateFailureBeats.ts`), over three
storefronts joined on the camera — Aperture & Co home, Northlight and Fieldstone attached, all in the
shell catalog: `fast-failure`, `late-include`, `home-straggling`, `held-retry`, `retry-race`,
`half-drawn`, `invalid-paint`, `failed-fold-in`, `include-after-decline`, `try-again`, `home-retry`,
`too-few`; each with a press also as `<name>-offered`, the beat ending before it, and
`home-straggling-waiting`, the home source's arrival and the merge held back ten minutes.

**Streams beside the turn in a beat.** A `BeatTurn` of kind `press` (its `operation`) or
`failure-report` belongs to the utterance or action before it; `atMs` is its send, from that turn's
start, and its batches' offsets run from its own send. `replayBeatOnCanvas` takes the wiring as
`sides` for a beat that carries one and refuses it otherwise. It runs each turn and its presses on
one clock — the turn's batches, its end, each press's send and batches, sorted by time — so instant
mode keeps the order they arrived in. A press fires through `sides.press`, the handler the buttons
call; `canvas/replayTransport` — attached through `attachReplay` for the beat — answers it on the
channel armed for it, each batch rebuilt into the hub's status-update event after a `task` event at
once, and a push settles when the handler has applied it. A failure report the canvas sends is
answered with the next recorded answer, paced from its own send; any other side send with a stream
that ends at once. A press the handler never sends leaves its channel abandoned. A turn and
everything beside it play out before the beat's next turn.

**A beat spanning canvases** (task-9.8 decision 2). On the page `replayBeatOnCanvas` takes the
wiring as `canvases` — `openReplayCanvas`, `view`, `closeCanvas` — and every utterance opens a
canvas of its own in the trail, as a question does; `askedFrom`, the ordinal among the beat's
questions of the canvas on screen when it was asked, views that canvas first, so the new one is its
child. An action, a press, a view or a close names its canvas by `canvas`, the same ordinal;
without one an action runs on the canvas last opened and a stream beside a turn on that turn's
canvas. An utterance with an `atMs` was asked while the turn before it still streamed and runs
beside it on its clock; `view` and `close` are the user viewing or closing a canvas beside the turn,
nothing streamed. A beat that spans canvases refuses a single runtime.

Phase 9's cases (task 9.8). Synthetic (`beats/durableBeats.ts`), over Phase 8's three storefronts,
a drill-down a new paint of that store: `background-tab`, `past-action`, `ask-again`, `add-drop`,
`step-seen`, `step-unseen`, `close-loading`, and two resting mid-way, `background-tab-running` and
`step-unseen-working`. Recorded beats 19–25, one per case, each a session of several canvases
through an orchestrator the recorder starts with the case's faults and deadlines over the
deterministic roster: 19 a tab finishing in the background, 20 an action and a press in a past
canvas, 21 "Ask this again now" and a question asked from a view, 22 add/drop and "compare these",
23 a step back with the wiring restored, 24 an unseen combination falling to the walk, 25 closing a
loading canvas. The recorder drives a session as the canvas does (`scripts/lib/session.ts`): each
question opens a canvas naming the canvas on screen as its parent; an action, a press, a step and a
close act on the canvas the script names; each canvas keeps what the client would hold of it
(`CanvasModel`) — every surface's tree and data model, and each source's paints as a stack counted
at the wire — so an action carries the canvas's data model and a step the paint it steps to. A take
is checked against the journal lines it wrote as well as its streams, and taken again when it does
not show its case (task-9.8 decision 5).

Playwright: `e2e/canvas-surface.spec.ts` holds the baselines for beats 1–4 (beat 4 at 1280×1600,
asserting the two vendor boundaries on one row by bounding box and no shell content) and replay
smokes for 5 (four slots, the merged view as shell content with its sort), 6 (rows bound over
`/apps`, no boundary, no attribution), 7 (the tile opens the Store with the gap as the query) and
8 (one slot, the reader's skill names, a slot resting on prose) and 9, and the trail beat's marker
row with Back (task-9.7 decision 7). `e2e/navigation.spec.ts`
lands a tap on the bound element with focus, the ring and no request, lands a field the storefront
does not render on its row, draws a judgment-only join guessed, and navigates on a past canvas; `e2e/join.spec.ts` draws the broken values and the list inside every
row under the nested sort. `e2e/shell-surface.spec.ts`
proves the synthetic platform answer's rows, the tile into the Store overlay and back with the
tile still attached, and three visual baselines: the platform answer, the tile, the Store
overlay. `e2e/late-failure.spec.ts` names the state each Phase 8 synthetic beat lands on at
1440×900 — the failure tile in each cause, the late row with Include, a failed fold-in, the merge
waiting on its home source, each collapse's line, the decline with Include beneath it, and the view
Retry made whole — each with its screenshot. `tests/canvas-late-failure.test.tsx` replays every
Phase 8 beat on the page, synthetic and recorded, and asserts where it ends with nothing sent;
`tests/canvas-beats.test.tsx` replays every recorded beat through the wiring, a failed source's
surfaces taken off what stands. `e2e/canvas-chrome.spec.ts` takes board F5's chrome off the trail
beat — the gutter over the live stage, the band over a past canvas, the open rail with every mark —
the stage and the clocks masked. `e2e/durable.spec.ts` names where each of beats 19–25 ends and the
two resting states, at 1440×900 with the clocks masked. `tests/canvas-durable.test.tsx` replays
every Phase 9 beat, synthetic and recorded, through the wiring: the trail's entries and their
parents, the parent standing, the canvas viewed and the one live, the background canvas's progress
line, the action and the press landing in the past canvas with no new entry, the step back's paint
and merged view restored with no synthesis on its stream, the unseen step's merge line working
until its stream ends, the closed canvas gone and its turn cancelled.

## The way back inside a fragment

Each agent's paints in a canvas are a linear back/forward stack (SPEC §6.5, task 9.7), the client's
half of what the orchestrator's `History` holds (`orchestrator.md`). The stacks, the remembered
wiring and the step press live on the canvas runtime, so a step in a past canvas works as on live.

| Class | Owns | Collaborators |
| --- | --- | --- |
| `history/fragmentHistory` | `createFragmentHistory({capture})`: per source a stack of steps — `at`, the index reported to the orchestrator; `shown`, the step whose paint fills the slot, behind `at` between a create's arrival and its landing; each step its title, whether it holds a paint to return to, and the copy taken when the stack moved off it — and the wiring remembered per combination, `RememberedWiring {target, payload}`, keyed as the orchestrator keys it. `paint(source)` · `landed(source, {title, question})` · `leaving(source)` · `dropped(source)` · `stepTo(source, index) → RestorableStep {paint, title?}` · `neighbours(source) → {back?, forward?}` · `stackOf` · `combination` · `remember` · `recall` · `recallCovering` · `retire` · `version` and `subscribe` | the runtime supplies `capture`; fed by `turn/canvasTurn`; read by `CanvasView` and the step |
| `history/paintCopy` | `capturePaint(processor, surfaceId) → PaintCopy {surfaceId, catalogId, sendDataModel, tree, dataModel}`: a live surface as plain JSON, its tree and data model as they stand; `rebuildMessages(copy)`: the create, the whole tree, the whole data model — the path a live paint takes through the processor | the canvas's processor |
| `components/useStepHold` | The pressed fragment holds its place (task-9.9 decision 19): a click on a `[data-way]` arrow records its attribution row's top, and from then every change inside the scroller is absorbed by scrolling — a `MutationObserver` and a `ResizeObserver`, the browser's `overflow-anchor` off — until the step ends, the reader scrolls (wheel, touch, a scrolling key), or 1 s passes with no step begun | `CanvasView` (the scroller, and whether a step press is in the store) |

**The count runs at the wire** (task-9.7 decision 2). Every vendor `createSurface` a canvas receives
is a step of its source the moment it arrives — on the turn or a stream beside it, before refusal,
admission or staging decide what becomes of it — one per create op, whatever the surface id or the
paint's kind, so the index the client reports names the paint the orchestrator counted. A create
that never reached the stage, one the client could not draw and a question paint each hold their
index as a placeholder with nothing to return to. A create after a step back drops the forward
steps and purges every wiring entry filed with the source at a dropped index.

**A step holds the paint as last seen** (decision 1). The current step is the live surface itself;
the runner calls `leaving` just before a claim or a swap destroys it, and only then is it copied —
its tree, its data model with every update the vendor pushed into it, its title. A claim marks the
new step landed with the title its `paintMeta` led with; a failed slot drops the step's paint.

**The arrows.** `CanvasView` fills `FragmentHistoryContext` from the stacks: per source the nearest
earlier and later step holding a paint, each its index and title, and `busy` from `sourceBusy` —
the opening turn, an action inside that fragment, or its Retry in flight — which draws them disabled
(task-9.7 decision 6).

**The step press** (decisions 3–5). An arrow raises `{kind: 'step', sources: [source], step}`. The
runtime moves the stack — a step to the paint on screen, or to a placeholder, does nothing — and
restores the copy into the slot at once (`runner.restore`: the surface there retired and later
messages for it dropped, the copy rebuilt through the processor and placed); then the
merged view: the wiring remembered over the new combination, or one filed over fewer sources that
covers it (task-9.9 decision 16), re-accepted with no call; with neither, `mergeFollowingStep` holds
the merge line working. The step is recorded as a press and sent on a stream beside the turn with
the whole canvas's data model, the restored paint among it. A synthesis paint on that stream lands
as any does; a silent end files the current wiring under the combination, so the two memories
converge. Only the latest step owns the merge line: a later step ends the working an earlier one
left (task-9.9 decision 17). A step that fails — refused, unreached or lost — is quiet: the
restored screen stands, the reason goes to the console, the press is removed, and the next action
heals the orchestrator's partition. Every payload the runner accepts is filed under the current
combination (`acceptSynthesis`).

## Isolation

Every fragment mounts inside a `FragmentBoundary` — a real element (not a React fragment, not
`display: contents`) carrying `data-a2ui-fragment`, since `@scope` and a portal root need
something to anchor to. The vendor's Provider sits inside it.

Nothing is drawn around it (task 7.9): no border, edge, background or hover state, however many
fragments share the canvas; a rectangle made the graft read as tiling and boxed a vendor's own
cards inside a second box. It is `display: flow-root`, so a vendor's top margin stays inside it
rather than collapsing through — its box is what navigation lands on and what adjacent slots align
by. Promotion is the one treatment it gets: an accent ring and raised panel.

The trusted page is shell chrome, not a fragment concern: a fixed layer rendered beside the
question overlay, outside every boundary, with nothing of a vendor under it.

The collision detector runs in three layers, split by what each medium can see: a static scan of
the stylesheets each catalog brings onto the page, a jsdom mount of every installed catalog
together, and a Playwright spec for the real cascade. Rules are prefix-agnostic — sharing a name
is fine, writing one where it escapes is not — and reads must be satisfied inside the boundary or
carry a fallback. A catalog ships only the classes in a selector's leading compound: styling an
upstream hook under the catalog's own scope class introduces nothing onto the page.

## Known gaps

- **Visual containment is not DOM containment.** A vendor component that is `position: fixed`
  paints over the whole canvas while remaining inside its boundary in the DOM — Primer's
  `ConfirmationDialog` does exactly this. The detector checks DOM ownership; nothing yet checks
  painted bounds. Containing this needs decision 4's isolation escalation, not layout.
- **A vendor component can still declare `aria-modal`.** The shell puts up no modal for a
  promoted fragment, but a vendor's own dialog can hide the rest of the canvas from assistive
  technology from inside its fragment.
- **`supportedCatalogIds` is broadcast whole.** The hub passes `a2uiClientCapabilities` to every
  vendor verbatim, so each learns the full installed roster and the platform's own catalog id.
  Filtering it per dispatch is hub-side work.
- **`setupTests.ts` and the Vite config are shaped around Primer** — jsdom shims and
  `lightningcss.errorRecovery` exist because `github-catalog` is the one installed vendor. Neither
  is a shell dependency; both dilute as basic-catalog vendors land.
- **Two renderer patches** (`patches/@a2ui__react@0.10.2.patch`) — see the client README.
- **`shell:synthesis` round-trips** in the returned client data model; the orchestrator ignores a
  derived surface harmlessly.
- **A request can be lost in the tunnel before it reaches the orchestrator** (task 6.6, traced in
  7.9). The first-event timeout and one retry under the same id cover it; a request lost twice
  fails. The retry fired in task 8.7's sittings: three utterances whose first send was lost landed
  on the resend. In task 9.9's an action and a Linear open were lost twice and failed ("That action
  failed. The orchestrator did not answer.").
- **A streamed component is validated before it is whole.** Under progressive apply a vendor's
  first `updateComponents` may carry a component without the prop its next batch completes; the
  partial fails the catalog schema and logs, the whole one passes and renders (task 6.6).
- **Equal weights on one `Row` squeeze a fragment.** Three weighted vendor slots at 868 px gave
  each a third; a fragment's minimum width is not known to the Planner (task 6.6).
