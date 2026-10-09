# src/canvas

The canvas's code. What the canvas does for the user is in the [client README](../../README.md); how it's built, in detail, is in the design record [`docs/design/client.md`](../../../../docs/design/client.md).

## Rules worth knowing before you change it

- **Every response enters through the turn runner** (`turn/canvasTurn.ts`): begin, apply batches, end. On an empty stage a paint streams straight in; over an occupied one it's built and checked off screen, then swapped in whole. Don't apply A2UI to a live processor around it.
- **One runtime per answer** (`canvasRuntime.ts`), with its own A2A session, store and processor. Every message sent from an answer carries its own A2A context, and `createCanvasWiring.ts` picks the runtime a click or press belongs to.
- **Only `kind: "question"` in a paint's `paintMeta` marks a paint that asks the reader something**, and it's said only on the progress line: the paint lands in its slot or on the stage like any other. Nothing is inferred from a surface's shape.
- **Every sign-in window is opened by `signIn.ts`**, synchronously inside the click, with `noopener,noreferrer` and only to https, localhost exempt. The window hands nothing back: the outcome is learned by polling the attempt over `orchestratorApi`.
- **An app's history is counted at the wire.** Every `createSurface` from an app is a step the moment it arrives, before anything is drawn, so the step the client reports is the one the orchestrator counted.

## Module map

```
CanvasApp.tsx           the page: palette, ?beat= replay, the trail chrome
createCanvasWiring.ts   the page's runtime, built once: the trail, the answers, asking, viewing, closing
canvasRuntime.ts        one answer: its A2A session, store, processor, turn runner, merged view, close
canvasStore.ts          one answer's state: the stage, the question, the composition's facts, the slots
                        asking a question, the sign-in windows open
hostRelay.ts            the shell catalog's handlers, forwarded to the answer on screen
signIn.ts               the page's one sign-in: the window, the poll, the resume, Cancel, add-account
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
components/             the view, stage, palette, header, progress line, notices, the trusted
                        page's placeholder, trail chrome and preview
```
