# Client — system design

`apps/client`. The canvas shell (SPEC §4, §10–11): language in, full-screen generative UI out. It
talks only to the orchestrator. State as of task 7.9: a composed canvas — one shell surface,
`shell:main`, a model-authored tree in the shell catalog holding slots, each filled by a different
vendor's fragment in that vendor's own design system — plus the shell's own content in the same
tree: the merged view as shell content in its reserved slot, whose data model the client computes
from the vendors' partitions; platform answers bound to a literal data model the hub sends; the
capability tile for a gap; the two shell actions, handled on the canvas and reported to the
hub; and navigation from a merged cell into the vendor fragment it names, handled on the canvas
alone. The synthesis mechanism end to end, both processes, is told in
[`synthesis.md`](synthesis.md); this file records the client's classes and flows.

Mechanics of the shell itself (hold-and-swap, timeline, interaction policy) live in
`apps/client/src/canvas/README.md`. This file records the composition-era design: the classes,
what each owns, and the flows between them.

## Runtime graph

```
canvas.tsx ── createHostRelay() ── listCatalogs() ── resolveCatalogs() ── CanvasApp ── createCanvasWiring()
                     │                     │                  │                │                  │
                hostRelay            orchestratorApi   catalogs/resolver   binds wiring.host  store · session · sender
                (the host the        (catalog records) (catalogId →        to the relay       live MessageProcessor
                shell catalog is                       catalog+Provider;   while mounted      turn runner · synthesis session
                built with)                            the shell catalog                      binding index · navigator
                                                       built with the                         host: onShellAction ·
                                                       relay's host; every                    onNavigate · appDisplayName
                                                       vendor catalog
                                                       decorated)
```

One `MessageProcessor` over every installed catalog. Per-surface catalog resolution is stock
library behaviour — a surface carries its own catalog — so a composed canvas needs no dispatch of
its own. The shell catalog is built rather than imported: `resolveCatalogs(records, host)` —
`host` a `Partial<CreateCatalogOptions>` — calls the package's `createCatalog` with the host's
shell-action handler, navigation handler and app-name lookup; with none given the two actions land
nowhere, cells are not interactive and app ids stand in for names — the catalog still validates
and renders, which is what a test or a replay needs. Every vendor catalog is rebuilt through
`decorateCatalog`, so its components register in the binding index (see Navigation).

## Composition

| Class | Owns | Collaborators |
| --- | --- | --- |
| `canvasStore` | Canvas state, including the **placement map** (a slot's source → `{surfaceId, source}`), the **promoted** set, by source, the **trusted page** open over the canvas (`trustedPage: {page, query?} \| null`), the **question** (`{text, askedAt} \| null`), each slot's **painted state** by source (`slotStates`), and the in-flight cause's kind | read by React through `useSyncExternalStore`; written by the turn runner and, for the trusted page, by the wiring's shell-action handler |
| `turn/canvasTurn` | Turn lifecycle and role routing: which surfaces are stage paints, which fill slots, which fragments are refused, when a composition is torn down and captured | `canvasStore`, the live processor, `applyMessages`, `composition/roster` |
| `composition/slotContent` | What a `Slot` renders: boundary → vendor Provider → surface for a vendor fragment; surface alone, in a bare `[data-shell-content]` element, for the `shell` source (task-5.5 decision 2); for a slot on the roster that is unfilled, its source's prose, if any, as `[data-slot-resting="prose"]` | `FragmentBoundary`, `catalogs/CatalogContext` |
| `composition/FragmentBoundary` | The one element a fragment mounts inside: provenance, isolation anchor, promotion treatment | — |
| `composition/slotCount` | How many `Slot` components the surface holds, gap slots included — adaptive weight's input | — |
| `composition/collisionDetector` | CSS collision rules over the installed catalogs | run from tests only |
| `composition/roster` | `shellPaintSlots`: reads a shell paint's slots — the roster, each `Attribution` paired to its `Slot` through `child`, and the vendor slots a whole-tree paint left with no attribution (`unattributed`); `slotStatesOf`: each `Slot`'s painted `state` by source, the synthesis slot under `shell`; `rosterOfSurface`: the roster of a mounted shell surface | `canvasStore` (`RosterEntry`); the wiring's `appDisplayName` |
| `hostRelay` | The host the shell catalog is built with, before any canvas exists — `ShellHost {onShellAction, onNavigate, appDisplayName}`: forwards a shell action or a navigation to the host the canvas bound, and warns and drops one raised with nothing bound; the lookup answers nothing when unbound, so the app id stands in | built in `canvas.tsx`; `CanvasApp` binds `wiring.host` while mounted |
| `components/TrustedPageOverlay` | The trusted-page layer over the canvas — the Store or the App Library — as `trustedPage` says: the page's title, the query when one was carried, "Back to the canvas" | `canvasStore` (`trustedPage`, `closeTrustedPage`) |
| `components/QuestionHeader` | The question heading the canvas: display size on one line, a fixed 4-line box (120px) past it, measured before paint; past 4 lines the 4th fades and "Show all +N lines" opens the whole question over the page (Esc closes); the header and "Edit and ask again" open the palette holding it | `CanvasApp` (keyed by the question, so a new one remeasures), `questionOnView` |
| `turnProgress` · `components/ProgressLine` | Pure: the turn's progress off the store — planning (an utterance in flight, nothing planned), a step per vendor source in roster order (done once placed or spoken, failed as painted, working until then), the join over the vendor names — and its line under the question, the working step carrying `canvas-pending` | `canvasStore` |
| `components/AmbientNotice` | The notice stack and its two fade clocks | `canvasStore` via `orderedNotices` |
| `synthesis/synthesisSession` | A composition's synthesis state: the payload, the data-model subscriptions that re-run the evaluator, the user's sort choices by array path, the last output written | fed by `turn/canvasTurn`; reads and writes the live processor's data models; reports an invalid payload through the fragment-failure channel |
| `synthesis/bindingEvaluator` | Pure: `evaluate({payload, models, choices, functions}) → EvaluatedModel` — the derived model mirrored with a cell object at every formula path, each cell's join and navigation target, every array a sort path reaches sorted in place, `/sorts/N` with the choice in force; ref resolution through the sdk kit, absent-skipping, operator and relation dispatch to the shell catalog, `argmin`/`argmax`/`source` mapped to an app id | the shell catalog's `functions` and `cellJoin`; the sdk's `reachSortPath`; `parseInstant` for the sort |
| `navigation/bindingIndex` | The reverse index: from a partition's data path to the vendor component rendering it, over what is mounted | fed by `navigation/decorateCatalog`; asked by the navigator |
| `navigation/landing` | `createNavigator(index)`: resolves a cell's target to an element and lands on it | the binding index; the sdk's `locatePointer` |
| `synthesis/intake` | The payload's shape by the sdk's `validateSynthesisPayload` (never a private mirror, phase-5 decision 23), then every operator against the shell catalog's list, in its place — a match claim's relations among the catalog's `RELATIONS`, no relation outside `match` (task-7.5 decision 5); the first failure is the `VALIDATION_FAILED` report | `@a2uiverse/sdk` |

### The stamp is the routing input

The hub stamps every event it relays (`metadata.a2uiverse`, `@a2uiverse/sdk`, composition
contract v0.6): `{source, role}`. `sendAndApply` extracts
it (`extractStampFromEvent`, over the sdk's `readStamp`) and hands it to the turn handle alongside
the batch. Placement is by `source`: the stamp names no slot, and the `Slot` a fragment fills is
the one whose `source` is the stamp's.

- `role: 'shell'` — an ordinary stage paint; the roster and the refused set are read off it.
- `role: 'fragment'` — registers in the placement map under the stamp's `source`; never contends
  for the stage or the timeline.
- **absent** — a stage paint. Composition is opt-in via the stamp, which is what keeps every
  pre-composition fixture and test valid.

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
while its key is still an option; `retireStage` retires the session with the composition, so a
new utterance turn starts from the declarations' own choices.

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
attribution, no region named after a source. Pending, it shows a quiet in-progress marker; declined,
it rests on the shell's words.

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

**Overlay.** `onShellAction` opens the page at once: `store.openTrustedPage({page: 'store',
query?})` or `({page: 'appLibrary'})`; a raise while a page is open retargets it, so the text
follows the latest query. `TrustedPageOverlay` renders from `state.trustedPage` as a fixed layer
over the canvas (`data-testid="trusted-page-overlay"`, `data-page`, `data-query`; `role="dialog"`,
`aria-modal="false"`) — the page's title, "Searching for “…”" when a query was carried, "Back to
the canvas" calling `closeTrustedPage`. The canvas is never unmounted beneath it. It is a layer of
its own beside `CanvasOverlay`, which mounts a pending question surface.

**Report.** `reportShellAction` sends the same raise to the hub as a standard A2UI action on the
shell surface that raised it: `{name, surfaceId, sourceComponentId, timestamp, context}` —
`sourceComponentId` the tile's component id or the `functionCall` sentinel
(`FUNCTION_CALL_SOURCE`), `context` `{query}` for an `openStore` carrying one, else `{}` — through
`buildActionMessageParams` with no data model and no fork context, on the **side channel** beside
`reportFragmentFailure`: no turn, no status strip, no history row. The hub answers with nothing;
messages it does return are applied straight into the live processor as the failure report's
repaint is. The page never waits on the report; a failed one is logged and nothing more. Every
raise is reported, an open page included.

### Navigation lands locally

A tap on a merged cell with a `target` calls the host's `onNavigate`; the navigator lands on the
element that target names in the vendor's fragment (SPEC §7, task 7.7). Nothing is sent and
nothing is journaled.

**The binding index** (`navigation/bindingIndex.ts`) is one per canvas and holds what is mounted —
the live stage or a parked composition, both under `BindingIndexContext`. `decorateCatalog` wraps
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

**App names.** `appDisplayName` answers from the roster of the mounted shell paint — a parked
composition's own, or the live stage's — through `rosterOfSurface`, then the store's roster. The
store's roster is the turn's, and an action turn carries no shell paint to refill it.

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
attribution and reads as the reserved `shell` source, named by its label. A `Slot` with `gap`
names no source and enters no roster. The roster orders the notice stack and names its lines —
including for a source that never paints — and decides which unfilled slots rest on prose.

A vendor-source `Slot` that is the `child` of no `Attribution` is `unattributed`, judged only on a
whole-tree paint — one carrying `root` — since a partial repaint may carry a slot without the
wrapper that still stands around it. The runner refuses that source's fragment (see Validation).

A shell repaint may legally carry only the components it changed, so a paint containing no
attribution leaves the roster standing rather than emptying it. The roster is cleared per turn,
never by a repaint.

### The question heads the canvas

An utterance sets the store's `question` at `runner.begin`; an action or an answer leaves it
standing, the next utterance replaces it. A parked view shows its own: `questionOnView` walks the
parked entry's causes back through its parents to the utterance that opened it. The head —
`QuestionHeader` over `ProgressLine` — sits above the stage, 24px from the top, in the page column
after a 56px gutter the Back button sits in. Every word of the progress line is computed; the join
is named by the apps' display names, since the join hypothesis's nouns never reach the client. The
status strip names the app and carries a sticky error only. The head, strip and Ask pill take
their values from `--a2v-*` tokens on `.canvas-app` (with dark values), drawn to the Final page of
the task 7.14 design canvas (https://claude.ai/artifact/W324EkZXFze2CxddzNve1o). The stage content
sets `--a2v-layout-gap: 32px` for the shell's own regions and unsets it inside each fragment and
the shell content; the notice stack sits above the Ask pill, the top edge being the question's.

### A composed turn abandons hold-and-swap

A composition's whole point is that the layout lands before its agents answer. So a *stamped
shell create* retires the outgoing composition and drops the turn into progressive mode; the
slots then fill in place. Only a create does this — a bare shell repaint (a slot flipping to
failed) targets the live surface and must not tear the canvas down.

Hold-and-swap survives untouched for unstamped streams. What it used to protect — never showing a
half-valid paint — is provided under composition by slot lifecycle instead: a fragment that fails
flips its slot, not the paint.

### Teardown

`retireStage` is the one place a composition leaves the canvas: it snapshots the shell *and* its
fragments, then deletes them all and clears placement and promotions. Without the cascade the
fragments would linger in the live registry and ride back out to their vendors through the hub's
per-dispatch partition filter as stale state.

### Timeline

`PaintEntry` carries `fragments` beside its own snapshot — captured at serialize-on-swap, before
teardown makes them unreachable, and captured unconditionally. The synthesis surface is one of
them with its last evaluated data model, and beside the fragments the entry carries the
synthesis it was projecting — `PaintSynthesis {surfaceId, payload}`, captured by
`SynthesisIntake.capture()` at the same moment. A parked visit re-sorts with it: the parked
session watches `/sorts` on the sandbox's synthesis surface and re-runs the evaluator over the
sandbox's own frozen partitions. Sort crosses no wire, so it works parked; nothing live is
subscribed, and the re-sort stays in the sandbox until commit. A shell-only capture could not
represent a filled slot at all, because `Slot.state` is orchestrator-painted and only ever
pending/failed/collapsed. `createParkedSession` rebuilds every surface through the same
three-message path and restores the placement, so a parked composition renders through the same
resolver the live stage uses.

### A request that gets no answer is sent once more

`sendAndApply` gives every request `FIRST_EVENT_TIMEOUT_MS` (10 s) to produce its first event —
utterances, actions, failure reports and shell-action reports alike. On silence it aborts the
attempt and sends the same message under the same id once more, with a `[A2UI:a2a]` warning; a
second silence throws "The orchestrator did not answer." The orchestrator refuses an id it has
already taken in, so a first send that was only slow never runs twice (task 7.9). A stream that has
answered may go quiet for as long as a model takes.

### Validation

Client-side, where the catalog schemas physically are. Validation errors ride the existing
deferred/settle path and are judged at turn end per fragment; a structural failure that can never
self-heal (an unknown `catalogId`) reports immediately. One report per fragment. A broken *shell*
surface reports nothing outward — that is the platform failing, not a vendor.

The report goes out on a **side channel**: no turn, so it cannot cancel the user's in-flight work,
put a row in the history, or light the status strip. The hub answers by repainting its shell with
that slot failed. A report whose composition has been superseded is dropped, because `shell:main`
is reused every turn.

**The refusal.** A vendor fragment never renders unattributed (task-6.5 decision 7). The runner
keeps a per-turn `refusedSources` set, filled from `shellPaintSlots(...).unattributed` on every
`shell`-stamped batch. A `fragment`-stamped batch whose source is refused enters the registry
not at all: each `createSurface` in it is reported the moment it arrives as `VALIDATION_FAILED`
at path `/`, message "the shell drew this slot with no attribution", with `refused: true` on the
`FragmentFailure`; the slot is demoted; the hub flips it to `failed`. `reportFragmentFailure`
skips its superseded-composition check for a refused report, since the fragment was never placed
and cannot be late.

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
list, 2 the PR detail, 3 the compose-and-confirm review chained after 2; 4 the side by side — the
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
template and a `functionCall` button into the App Library — and `gap`, one `Slot` with `gap`.
Their layouts are built on the painter's shape: each vendor slot the `child` of an `Attribution`
standing where the slot stood in the parent, the synthesis slot bare.

Playwright: `e2e/canvas-surface.spec.ts` holds the baselines for beats 1–4 (beat 4 at 1280×1600,
asserting the two vendor boundaries on one row by bounding box and no shell content) and replay
smokes for 5 (four slots, the merged view as shell content with its sort), 6 (rows bound over
`/apps`, no boundary, no attribution), 7 (the tile opens the Store with the gap as the query) and
8 (one slot, the reader's skill names, a slot resting on prose) and 9. `e2e/navigation.spec.ts`
lands a tap on the bound element with focus, the ring and no request, lands a field the storefront
does not render on its row, draws a judgment-only join guessed, and navigates a parked composition; `e2e/join.spec.ts` draws the broken values and the list inside every
row under the nested sort. `e2e/shell-surface.spec.ts`
proves the synthetic platform answer's rows, the tile into the Store overlay and back with the
tile still attached, and three visual baselines: the platform answer, the tile, the Store
overlay.

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
  fails. The retry has not yet fired in a live sitting.
- **A streamed component is validated before it is whole.** Under progressive apply a vendor's
  first `updateComponents` may carry a component without the prop its next batch completes; the
  partial fails the catalog schema and logs, the whole one passes and renders (task 6.6).
- **Equal weights on one `Row` squeeze a fragment.** Three weighted vendor slots at 868 px gave
  each a third; a fragment's minimum width is not known to the Planner (task 6.6).
