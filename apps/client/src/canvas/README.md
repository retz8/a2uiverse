# src/canvas

The canvas's code. What the canvas does for the user is in the [client README](../../README.md); how it's built, in detail, is in the design record [`docs/design/client.md`](../../../../docs/design/client.md).

## Rules worth knowing before you change it

- **Every response enters through the turn runner** (`turn/canvasTurn.ts`): begin, apply batches, end. On an empty stage a paint streams straight in; over an occupied one it's built and checked off screen, then swapped in whole. Don't apply A2UI to a live processor around it.
- **One runtime per canvas** (`canvasRuntime.ts`), with its own A2A session, store and processor. Every message a canvas sends carries its own A2A context, and `createCanvasWiring.ts` picks the runtime a click or press belongs to.
- **Only `kind: "question"` in a paint's `paintMeta` sends it to the overlay.** Nothing is inferred from a surface's shape.
- **An app's history is counted at the wire.** Every `createSurface` from an app is a step the moment it arrives, before anything is drawn, so the step the client reports is the one the orchestrator counted.

## Module map

```
CanvasApp.tsx           the page: palette, ?beat= replay, the trail chrome
createCanvasWiring.ts   the page's runtime, built once: the trail, the canvases, asking, viewing, closing
canvasRuntime.ts        one canvas: its A2A session, store, processor, turn runner, merged view, close
canvasStore.ts          one canvas's state: stage and overlay, the question, the composition's facts
hostRelay.ts            the shell catalog's handlers, forwarded to the canvas on screen
turnProgress.ts         what the progress line says
replayBeat.ts           drives a beat through the turn runner
replayTransport.ts      answers a replayed beat's presses from the beat
turn/                   the turn runner, a paint's cause, message inspection
trail/                  the trail's store, and the branch lines the drawer draws
history/                each app's paint stack, and a paint's copy
synthesis/              the merged view: its session, the binding evaluator, the payload check
navigation/             from a merged cell to the element it came from
composition/            what a slot renders, the fragment boundary, the roster, reserved columns,
                        the CSS collision rules
components/             the view, stage, palette, header, progress line, overlay, notices,
                        trail chrome and preview
```
