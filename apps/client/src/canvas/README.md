# The canvas

Where A2UIVerse answers. You ask in words at the palette, and the answer is painted as a full screen of UI, not a chat reply; interact with what was painted, and the next paint swaps in. This README covers how the canvas works; running the client is in [its README](../../README.md).

## The page

- **Question and progress line**: your question heads the canvas, and the line under it says where the turn stands, in the client's own words, with the canvas's error at its end when something fails.
- **Stage**: the current surface. For a composed answer it's the orchestrator's layout, whose slots the client fills with each app's fragment.
- **Palette**: the input, opened with `⌘K` / `Ctrl+K` and closed with `Escape`. Open by default on an empty canvas.
- **Overlay**: where a question the shell asks appears, above the stage.
- **Notices**: what each app says in words, one line per app, fading on its own.
- **Back and Trail**: in the sidebar. Trail opens the drawer of the session's canvases; a past canvas carries a band with "Ask this again now" and "Return to live".
- **Fragment boundary**: the one element an app's surface mounts inside. It carries which app painted it and keeps the app's styles in.

## Words used here

- **Canvas**: one question's answer, with a runtime of its own (store, processor, turn runner, merged-view session) kept for the session. The **trail** is the list of them.
- **Turn**: how every response enters, recorded or live: begin, apply batches, end. The turn runner is `turn/canvasTurn.ts`.
- **Paint**: a turn's surface landing, with its cause: the question, an action inside a fragment, or an answer to a question.
- **Composition**: the layout surface plus the fragments in its slots. The orchestrator owns it; the client keeps which fragment sits in which slot.

## Never a half-drawn screen

When the stage already shows something, a new paint is built off screen and checked, then swapped in whole at the end of the turn. If it fails, the stage keeps what it had. On an empty canvas the paint streams straight in, and updates to a surface already on screen apply as they arrive.

## Composition

- **The stamp decides.** Each event's stamp says whether it paints the layout or fills a slot. An unstamped stream is a layout paint.
- **The layout lands first.** A composed turn doesn't wait to swap: the layout streams in, and each slot fills in place as its app answers. A failing app changes its slot, not the screen.
- **A slot mounts** the fragment boundary, then the app catalog's Provider, then the surface. The attribution marker isn't in there: the orchestrator paints it beside the slot, out of the fragment's reach.
- **A fragment that can't be drawn** is reported to the orchestrator on the side, never as a turn. The orchestrator fails its slot, and its data leaves the merge.
- **Presses**, meaning Retry, Include and Try again, go to the orchestrator on streams beside the turn and never cancel it. A press shows the moment it's made; one that never arrives is said in place.
- **An app that answers in words** without painting has its slot collapse to its sentence.
- **A fragment asking a question** is raised in its slot with the rest dimmed. It never moves to the overlay, so an app can't block a canvas it shares.

## Canvases and the trail

- **Every question opens a canvas.** Asked from a past canvas, the new one is its child. The new canvas is live and on screen; the one you were on keeps running.
- **Only asking adds to the trail.** An entry is labelled by its question until the Planner's title arrives.
- **A past canvas is a tab.** Actions, presses and sorts on it land in it. Its band reads "Parked · asked at HH:MM" with "Ask this again now" and "Return to live". Back goes to the canvas this one was asked from.
- **The drawer** lists canvases newest first: "Live" on the newest, "Viewing" on the one on screen, a quiet mark on one still loading, "from HH:MM" on a branch. Hovering an entry previews its canvas; each has a close.
- **Closing a canvas** cancels whatever it still has in flight. Closing the one on screen returns to live.
- **In memory only.** A reload starts fresh.

## The way back inside a fragment

- **Each app's paints in a canvas are a stack.** Every new surface from the app is a step, counted the moment it arrives so the client and the orchestrator agree on its number. A new paint after a step back drops the steps ahead.
- **A step keeps the paint as last seen**, tree and data, and a step back rebuilds it the way a live paint is built.
- **The arrows** sit at the right of the attribution row, each named by the title of the paint it returns to, disabled while that app is busy.
- **The merged view follows.** If the combination of every app's step has been seen before, its wiring comes back at once with no model call. Otherwise the merge line works until the orchestrator answers.
- **The step goes to the orchestrator** with the canvas's data, so its copy of that app's data matches the screen. A step that fails is quiet: the screen stands.

## While a turn is running

- A new question opens a new canvas; nothing is cancelled.
- Actions inside a fragment that's still loading are blocked, with a cue.
- Answering a question, the palette and the trail always work.

## Beyond plain A2UI

Two additions ride the A2A messages, both handled in `src/a2a/messages.ts`:

- **`paintMeta`** (app → client): a data part ahead of the `createSurface` it names, carrying the paint's `title` and `kind`. The title names the step on the back and forward arrows and, on `shell:main`, the canvas's trail entry. `kind: "question"` is the only thing that sends a paint to the overlay; the canvas never guesses from a surface's shape.
- **The `a2uiverse` stamp** (orchestrator → client), on event metadata: `{source, role?, settled?}`, saying which app painted it, whether it's the layout or a fragment, and where the app's stream ends. The same key carries `{parent}` the other way, on the question that opens a child canvas.

## Replaying beats

`?beat=` replays a recorded or synthetic beat through this same turn runner; the list is in the [client README](../../README.md#working-without-a-model). Each question in a beat opens a canvas of its own, and its actions, presses, steps, views and closes name the canvas they act on. Presses are answered from the beat itself, by `replayTransport.ts`.

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
