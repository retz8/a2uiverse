# Client — system design

`apps/client`. The canvas shell (SPEC §4, §10–11): language in, full-screen generative UI out. It
talks only to the orchestrator. State as of Phase 4 (M2): a composed canvas — one shell surface
holding slots, each filled by a different vendor's fragment in that vendor's own design system —
plus the merged view: a shell fragment whose data model the client computes from the vendors'
partitions. The synthesis mechanism end to end, both processes, is told in
[`synthesis.md`](synthesis.md); this file records the client's classes and flows.

Mechanics of the shell itself (hold-and-swap, timeline, interaction policy) live in
`apps/client/src/canvas/README.md`. This file records the composition-era design: the classes,
what each owns, and the flows between them.

## Runtime graph

```
canvas.tsx ── listCatalogs() ── resolveCatalogs() ── CanvasApp ── createCanvasWiring()
                  │                    │                              │
          orchestratorApi        catalogs/resolver          store · session · sender
          (catalog records)   (catalogId → catalog+Provider)  live MessageProcessor
                                                              turn runner · synthesis session
```

One `MessageProcessor` over every installed catalog. Per-surface catalog resolution is stock
library behaviour — a surface carries its own catalog — so a composed canvas needs no dispatch of
its own.

## Composition

| Class | Owns | Collaborators |
| --- | --- | --- |
| `canvasStore` | Canvas state, including the **placement map** (slot → `{surfaceId, source}`) and the **promoted** slot set | read by React through `useSyncExternalStore`; written by the turn runner |
| `turn/canvasTurn` | Turn lifecycle and role routing: which surfaces are stage paints, which fill slots, when a composition is torn down and captured | `canvasStore`, the live processor, `applyMessages` |
| `composition/slotContent` | What a `Slot` renders: boundary → vendor Provider → surface | `FragmentBoundary`, `catalogs/CatalogContext` |
| `composition/FragmentBoundary` | The one element a fragment mounts inside: provenance, isolation anchor, promotion treatment | — |
| `composition/slotCount` | How many slots the plan laid out — adaptive weight's input | — |
| `composition/collisionDetector` | CSS collision rules over the installed catalogs | run from tests only |
| `composition/roster` | Reads the turn's sources and their display names off the shell paint | `canvasStore` |
| `components/AmbientNotice` | The notice stack and its two fade clocks | `canvasStore` via `orderedNotices` |
| `synthesis/synthesisSession` | A composition's synthesis state: the wiring, the data-model subscriptions that re-run the evaluator, the latest generation seen per surface, the user's sort, the last output | fed by `turn/canvasTurn`; reads and writes the live processor's data models; reports an invalid wiring through the fragment-failure channel |
| `synthesis/bindingEvaluator` | Pure: `evaluate({wiring, models, generations, sort, functions}) → {entities, sort}` — ref resolution, absent-skipping, operator dispatch to the shell catalog, `argmin`/`argmax` mapped to an app id, stale marking, ordering | the shell catalog's `functions` |
| `synthesis/wiringSchema` | The zod mirror of the sdk's wiring schema, type-pinned both ways, plus the structural checks (known operator, declared sort field, one cell per field) | — |

### The stamp is the routing input

The hub stamps every event it relays (`metadata.a2uiverse`, `@a2uiverse/sdk`). `sendAndApply`
extracts it and hands it to the turn handle alongside the batch.

- `role: 'shell'` — an ordinary stage paint.
- `role: 'fragment'` — registers in the placement map under the slot the stamp names; never
  contends for the stage or the timeline.
- **absent** — a stage paint. Composition is opt-in via the stamp, which is what keeps every
  pre-composition fixture and test valid.

### Synthesis: the stamp carries generations, the paint carries the wiring

The synthesis surface (`shell:synthesis`) arrives as a fragment of the `shell` source in
`slot-shell`, with the wiring beside the stamp on the same event (`readWiring`). `sendAndApply`
hands both to the turn handle. The runner feeds the session in a fixed order: the stamp's
`generations` **before** the event's messages apply, so a bump marks derived cells stale ahead of
the data behind it; the wiring **once the synthesis surface is live** — at apply in progressive
mode, at the swap in staged mode, since an action turn's repaint streams into staging.

The session validates the wiring, subscribes to the root of every surface it refs and to `/sort`
on the synthesis surface (the library data model notifies on any nested write, so one mechanism
covers vendor updates, two-way edits inside fragments, and the sort control's write-back),
evaluates, and writes `{entities, sort}` to the synthesis surface in one root write — before
React renders. Subscription-driven runs coalesce to one microtask, so a vendor batch of several
data-model messages evaluates once; intake and a generation note run synchronously. Its own write
is guarded against re-triggering itself, and an unchanged output is not written. Stale is compared on every run (`latest seen ≠ computedAgainst`), never reset. The
user's sort sticks across a re-synthesis while its field exists; `retireStage` retires the session
with the composition, so a new utterance turn starts from the wiring's sort.

An invalid wiring reports `VALIDATION_FAILED` for `shell:synthesis` through the same side channel
a fragment that will not render uses; the hub fails `slot-shell`. A ref into a surface the client
does not hold is absent at evaluation time, never a rejection.

### Prose composes through the same stamp

The stamp routes text as well as surfaces: `sendAndApply` hands it to `onAgentText` exactly as
it does to `apply`. `canvasStore` buffers a line per `source` rather than one string, so the
interleaved chunks of a fan-out concatenate only with their own source's. Prose with no
`fragment` stamp — the shell's own cues, and an uncomposed stream — shares one reserved line.

Prose stays in the shell's region rather than in the slot it describes: a source can answer
without painting, and its slot may be failed or collapsed by the time it speaks.

Two lifetimes. The sources' lines belong to the turn — cleared when a new one opens, faded
together once it settles, so the stack reads as one set of answers and no line vanishes from
under a reader. The shell's line keeps its own clock, because a cue fires while a paint is in
flight and so has no turn to be scoped to.

### The roster is the second projection of the shell paint

`placement` says which fragment filled which slot, but only once one has, and in fill order. The
roster is the complement: the turn's sources in *slot* order with the display names the Registry
painted, read from the shell surface's `Attribution` components at first paint. It orders the
notice stack and names its lines — including for a source that never paints.

A shell repaint may legally carry only the components it changed, so a paint containing no
attribution leaves the roster standing rather than emptying it. The roster is cleared per turn,
never by a repaint.

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
synthesis it was projecting — `PaintSynthesis {surfaceId, wiring, generations}`, captured by
`SynthesisIntake.capture()` at the same moment. A parked visit re-sorts with it: the parked
session watches `/sort` on the sandbox's synthesis surface and re-runs the evaluator over the
sandbox's own frozen partitions, with the captured generations so nothing reads as stale. Sort
crosses no wire, so it works parked; nothing live is subscribed, and the re-sort stays in the
sandbox until commit. A shell-only capture could not
represent a filled slot at all, because `Slot.state` is orchestrator-painted and only ever
pending/failed/collapsed. `createParkedSession` rebuilds every surface through the same
three-message path and restores the placement, so a parked composition renders through the same
resolver the live stage uses.

### Validation

Client-side, where the catalog schemas physically are. Validation errors ride the existing
deferred/settle path and are judged at turn end per fragment; a structural failure that can never
self-heal (an unknown `catalogId`) reports immediately. One report per fragment. A broken *shell*
surface reports nothing outward — that is the platform failing, not a vendor.

The report goes out on a **side channel**: no turn, so it cannot cancel the user's in-flight work,
put a row in the history, or light the status strip. The hub answers by repainting its shell with
that slot failed. A report whose composition has been superseded is dropped, because `shell:main`
is reused every turn.

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
`aria-modal`, and the count is announced through a live region. The overlay stays for
shell-painted questions, which is what M8/M10 consent dialogs will want.

## Isolation

Every fragment mounts inside a `FragmentBoundary` — a real element (not a React fragment, not
`display: contents`) carrying `data-a2ui-fragment`, since `@scope` and a portal root need
something to anchor to. The vendor's Provider sits inside it.

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
