# The canvas shell

The canvas-first generative-UI interface: the agent does not answer in a chat
transcript — it **paints** full-screen UI onto a stage, and natural language is
the control plane. Ask for something via the palette, the agent streams an A2UI
surface onto the canvas; interact with what it painted, and the next paint
swaps in.

This README covers the shell's mechanics; the canvas's place in the platform is
SPEC.md §4 and §10–11.

## Page anatomy

- **Stage** — the full-screen slot the current surface occupies. Under composition the surface
  it holds is the orchestrator's **shell surface**, whose `Slot` components the client fills.
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
- **Fragment boundary** — the one element a vendor's surface mounts inside, carrying its
  provenance and its style isolation. Every fragment on the canvas is inside one.
- **Scrim** — dims the slots that are not asking, when the shell grants a fragment promotion.

## Vocabulary

- A **paint** is one turn's surface landing on the stage. Each paint records a
  typed **cause** — the utterance or surface action that produced it, the paint
  the user was looking at when they dispatched it (`parent`), and whether that
  view was parked (`forked`). Titles shown in the history are derived from the
  cause at render time; an agent-authored title, when present, sits on top.
- A **turn** is the unit every agent response (or replayed fixture) enters
  through: begin → apply batches → end. The turn runner (`turn/canvasTurn.ts`)
  owns the lifecycle.
- A **composition** is one shell surface plus the **fragments** filling its slots — one paint
  made of several agents' surfaces. The orchestrator is canonical for it; the client holds only
  the **placement map** (slot → fragment), and the shell surface is the composition's rendered
  projection.

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

## Composition

Every utterance turn is composed: the orchestrator paints a shell surface with one `Slot` per
dispatched agent, then relays each agent's fragment stamped with the slot it belongs to.

- **Roles come from the stamp.** `role: 'shell'` is an ordinary stage paint; `role: 'fragment'`
  registers in the placement map and never contends for the stage or the timeline. **An unstamped
  stream is a shell paint**, which is what keeps every pre-composition fixture valid — composition
  is opt-in via the stamp.
- **A composed turn does not hold-and-swap.** Its whole point is that the layout lands before its
  agents answer, so a shell paint that opens a composition retires the outgoing one and streams
  progressively; the slots then fill in place. A fragment that fails flips its slot, not the paint.
- **Slot mounting**: a `Slot` asks the client for its content and gets the whole stack —
  fragment boundary, then the vendor catalog's own Provider, then the surface. Attribution is
  _not_ in there: the orchestrator paints it into its own surface beside the slot, where the
  fragment cannot address it.
- **Adaptive weight**: structure is constant, prominence is not. `data-slots` on the stage says
  how many slots the plan laid out; one is full-bleed and owns the canvas as a Phase 1 paint did,
  several gain separation.
- **Validation**: a fragment that will not validate or mount is reported to the hub as
  `VALIDATION_FAILED` on a side channel — never a turn, so it cannot cancel what the user has in
  flight — and the hub answers by repainting its shell with that slot failed.
- **Promotion**: a fragment declaring a question does not get the overlay. The shell raises its
  slot and dims the rest instead, so the fragment is never re-parented and no vendor can block a
  canvas it shares. Promotion is plural, so it is emphasis rather than a modal: the count is
  announced, focus is not trapped. The overlay stays for shell-painted questions.

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
- A composed paint is captured **whole**: the shell's snapshot plus every fragment filling a slot.
  A shell-only capture could not even represent a filled slot — `Slot.state` is orchestrator-painted
  and only ever pending/failed/collapsed — so parking one would have shown every slot loading
  forever. The parked session rebuilds all of them and restores the placement.
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
- **`a2uiverse`** (hub → client): the composition stamp, on A2A _event_ metadata rather than in
  the parts — `{source, slot?, role}`, defined by `@a2uiverse/sdk`'s composition extension. It is
  what tells the canvas whether a batch paints the shell or fills a slot. Recorded beats carry it
  per batch, because which slot a fragment fills is not recoverable from the A2UI it carries.
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
(`src/beats/syntheticBeats.ts`: `plain`, `plain-2`, `validation`, `question`, and the composed
trio `composed`, `composed-solo`, `composed-question`);
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
composition/
  slotContent.tsx       what a Slot renders: boundary → vendor Provider → surface
  FragmentBoundary.tsx  the one element a fragment mounts inside (provenance + isolation)
  slotCount.ts          how many slots the plan laid out — adaptive weight's input
  collisionDetector.ts  the CSS collision rules, run over the installed catalogs
timeline/
  paint.ts              the paint/cause vocabulary + title derivation
  snapshotSurface.ts    serialize-on-swap materialization
  parkedSession.ts      the parked-view sandbox + unpark write-back
  causeContext.ts       provenance builders for a dispatch
```
