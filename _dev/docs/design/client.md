# Client — system design

`apps/client`. The canvas shell (SPEC §4, §10–11): language in, full-screen generative UI out. It
talks only to the orchestrator. State as of Phase 2 (M1): a composed canvas — one shell surface
holding slots, each filled by a different vendor's fragment in that vendor's own design system.

Mechanics of the shell itself (hold-and-swap, timeline, interaction policy) live in
`apps/client/src/canvas/README.md`. This file records the composition-era design: the classes,
what each owns, and the flows between them.

## Runtime graph

```
canvas.tsx ── listCatalogs() ── resolveCatalogs() ── CanvasApp ── createCanvasWiring()
                  │                    │                              │
          orchestratorApi        catalogs/resolver          store · session · sender
          (catalog records)   (catalogId → catalog+Provider)  live MessageProcessor
                                                              turn runner
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

### The stamp is the routing input

The hub stamps every event it relays (`metadata.a2uiverse`, `@a2uiverse/sdk`). `sendAndApply`
extracts it and hands it to the turn handle alongside the batch.

- `role: 'shell'` — an ordinary stage paint.
- `role: 'fragment'` — registers in the placement map under the slot the stamp names; never
  contends for the stage or the timeline.
- **absent** — a stage paint. Composition is opt-in via the stamp, which is what keeps every
  pre-composition fixture and test valid.

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
teardown makes them unreachable, and captured unconditionally. A shell-only capture could not
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
carry a fallback.

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
