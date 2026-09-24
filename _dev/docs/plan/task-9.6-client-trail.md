# Task 9.6 — Client, the trail and the past canvas as a tab: plan

Spec: `_dev/docs/spec/task-9.6-client-trail-and-tab.md`. Worked directly on `main`.

## Shape

- `a2a/messages.ts` — the fork context and its key go; `buildTextMessageParams` takes the parent canvas's context and writes it with the sdk's `canvasParentMetadata`.
- `canvas/canvasStore.ts` — the timeline, viewing, the ring cap, the parked marker, `superseded` and their writers go; `paintTitles` (each source's current paint title from its `paintMeta`) arrives.
- `canvas/turn/cause.ts` — `PaintCause` (kind and payload only), `titleOfCause`, `describeCause`, moved out of `timeline/`.
- `canvas/turn/canvasTurn.ts` — no timeline entries, no snapshot on retire, no fork jump; an utterance no longer cancels side streams or supersedes; `cancelAll()` for the close; the paint title recorded when a fragment claims its slot.
- `canvas/trail/trailStore.ts` — the trail store: entries `{id, contextId?, question, askedAt, title?, parent?, loading}`, `live`, `viewing`, `trustedPage`; `open`, `setContext`, `setTitle`, `setLoading`, `view`, `returnToLive`, `close`; readers `viewedEntry`, `liveEntry`, `backTarget`, `isBranch`.
- `canvas/canvasRuntime.ts` — one canvas: its A2A session, store, processor, runner, synthesis session, binding index and navigator; `dispatchUtterance`, `sendCausedAction`, `press`, the two side reports, `actionHandler`, `close`.
- `canvas/createCanvasWiring.ts` — the page: the trail store, the runtimes by id, the sender resolver and replay attach; `sendUtterance` opens a canvas with the viewed one as parent; `askAgain`, `view`, `returnToLive`, `closeCanvas`; the host relay's handlers resolve to the viewed runtime; each runtime's `running` mirrored into the entry's `loading`, `shell:main`'s title into the entry.
- `canvas/replayBeat.ts` — a `runtime` for one canvas, or `openCanvas(prompt)` for the page: each utterance turn opens a canvas, an action or press runs on the last opened; a turn's optional `askedFrom` views that earlier canvas first.
- `canvas/components/TrailChrome.tsx` — Back and Trail beside it; the rail as board F5 draws it; the band on a past canvas.
- `canvas/components/TrailPreview.tsx` — the scaled second mount with the caption.
- `canvas/components/CanvasView.tsx` — one runtime on stage: head, progress, stage, overlay, notices, strip.
- `canvas/CanvasApp.tsx` — page state only; `CanvasView` keyed by the viewed canvas.
- `beats/syntheticBeats.ts` — the `trail` beat.
- Removed: `canvas/timeline/`, `ParkedStage`, `HistoryChrome`.

## Order

1. Messages and store, with their tests.
2. The cause module and the runner, with its tests.
3. The trail store, with its tests.
4. The runtime and the wiring; the replay.
5. The components, the app, the CSS.
6. The `trail` beat; the Playwright chrome spec rewritten; navigation on a past canvas.
7. READMEs; `pnpm verify`; the live pass through the tunnel.
