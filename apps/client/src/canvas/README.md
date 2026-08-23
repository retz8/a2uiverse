# The canvas shell

The canvas-first generative-UI interface: the agent does not answer in a chat
transcript — it **paints** full-screen UI onto a stage, and natural language is
the control plane. Ask for something via the palette, the agent streams an A2UI
surface onto the canvas; interact with what it painted, and the next paint
swaps in.

This README covers the shell's mechanics; the canvas's place in the platform is
SPEC.md §4 and §10–11.

## Page anatomy

- **Stage** — the full-screen slot the current surface occupies.
- **Palette** — the summonable command input (`⌘K` / `Ctrl+K`; `Escape`
  closes). Open by default on an empty canvas.
- **Overlay slot** — where **question paints** land: a surface the agent sends
  to ask something (a confirmation dialog, a choice) renders above the stage
  instead of replacing it, and never enters the timeline.
- **Status strip** — the thin in-flight/status readout.
- **Ambient notices** — transient prose from the agent that carries no surface
  (for example, declining an action it cannot perform).
- **History chrome** — the top-edge timeline UI: back, the press-list of past
  paints, return-to-live.

## Vocabulary

- A **paint** is one turn's surface landing on the stage. Each paint records a
  typed **cause** — the utterance or surface action that produced it, the paint
  the user was looking at when they dispatched it (`parent`), and whether that
  view was parked (`forked`). Titles shown in the history are derived from the
  cause at render time; an agent-authored title, when present, sits on top.
- A **turn** is the unit every agent response (or replayed fixture) enters
  through: begin → apply batches → end. The turn runner (`turn/canvasTurn.ts`)
  owns the lifecycle.

## Hold-and-swap

The stage never shows a half-valid paint. The turn runner mechanises this as
validate-then-replay:

- **Staged mode** (stage occupied): messages for surfaces created this turn
  stream into a per-turn _staging_ processor — the validator — and are
  buffered. At turn end, a surviving surface replays into the live processor
  and swaps in atomically; a turn whose creations were cleaned up again (a
  failed paint the agent deleted) is discarded and the stage holds.
- **Progressive mode** (empty canvas): nothing to hold, so the paint streams
  straight onto the stage.
- Messages targeting an already-live surface apply directly, progressively.

## Timeline & time travel

- Landed paints append to a single append-only ring (capped at 50 entries).
  The newest is the **live head**; browsing back **parks** the view on an older
  paint, with a stale banner and return-to-live.
- Snapshots are captured by **serialize-on-swap**: a surface is materialized to
  plain frozen JSON only when it leaves the canvas — until then the timeline
  entry holds a null snapshot and the live processor is authoritative.
- A **parked view** renders its frozen snapshot by replaying the reconstructed
  wire messages through a sandbox `MessageProcessor` — the identical path a
  live paint takes, so bindings and local functions work while parked. The
  sandbox's interaction state is written back to the entry when the view
  unparks.
- A dispatch **from** a parked view is a **fork**: the paint records its parked
  parent as provenance, the turn reports the parked snapshot's data model (not
  the head's), and the parked view holds until the forked paint lands — landing
  is what returns the view to live.

## Interaction policy (while a paint is in flight)

- Palette utterances and Repaint are **last-intent-wins** — a new dispatch
  supersedes the in-flight one.
- Agent-bound surface actions — live or parked — are blocked with a status cue.
- Answering an overlay question and all shell chrome (history, palette summon)
  are always live.

## The live registry

The live `MessageProcessor` holds exactly the surfaces the agent may see —
stage plus overlay. Everything else lives as frozen snapshots in the timeline
or inside a parked sandbox the live registry holds no reference to. This is
what keeps a long session's data model from growing without bound.

## Wire additions for the canvas

The canvas layers two pieces of metadata on top of the A2UI protocol's A2A
binding (both defined in `src/a2a/messages.ts`; the standard
`a2uiClientDataModel` metadata key is the spec's own):

- **`paintMeta`** (agent → client): a dedicated DataPart,
  `{paintMeta: {surfaceId, title?, kind?}}`, emitted ahead of the
  `createSurface` it names. `title` is the agent-authored paint title the
  history shows (absent, the cause-derived fallback is used); `kind:
"question"` is the marker that routes a paint to the overlay slot instead of
  the stage.
- **`a2uiForkContext`** (client → agent): an A2A message-metadata key attached
  only when a turn is dispatched from a parked view —
  `{paintId, title, paintedAt, position}`, identifying which historical paint
  the user was acting on. Presence of the key _is_ the historical-view flag; a
  live dispatch never carries it.

## Beat replay — zero-LLM verification

`?beat=<name>[,<name>…]` on the canvas page replays beat fixtures through the
full turn lifecycle — the same hold-and-swap gate, paced by the recorded stream
offsets. `&instant` collapses the waits. This is how the shell is verified with
no LLM in the loop. The synthetic beats ship with the client
(`src/beats/syntheticBeats.ts`: `plain`, `plain-2`, `validation`, `question`);
recorded beats (`recordings/beats/*.json`, addressed by number) are re-recorded
through the orchestrator in task 1.4.

## Module map

```
CanvasApp.tsx           page layout + page-level affordances (palette summon, ?beat= replay)
createCanvasWiring.ts   the runtime graph, built once: store, A2A session/sender,
                        live processor, turn runner, dispatch handlers
canvasStore.ts          external store (useSyncExternalStore): stage/overlay occupancy,
                        in-flight status, the paint ring, head/viewing
replayBeat.ts           drives a recorded beat through the turn runner
components/             stage, palette, overlay, status strip, ambient notice,
                        history chrome, parked stage
turn/
  canvasTurn.ts         the turn runner — hold-and-swap lives here
  turnMessages.ts       pure message-shape inspection for the runner
timeline/
  paint.ts              the paint/cause vocabulary + title derivation
  snapshotSurface.ts    serialize-on-swap materialization
  parkedSession.ts      the parked-view sandbox + unpark write-back
  causeContext.ts       provenance builders for a dispatch
```
