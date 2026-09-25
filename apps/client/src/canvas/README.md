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
- **Overlay slot** — where **question paints** land: a surface the agent _declares_ a question
  renders above the stage instead of replacing it. Only a shell-role paint takes it; a fragment
  that asks is promoted in its slot instead.
- **Status strip** — the thin in-flight/status readout.
- **Ambient notices** — the sources' prose, one attributed line each, transient
  (for example, declining an action it cannot perform).
- **Trail chrome** — Back and Trail in the gutter; the rail of the session's canvases; the band
  over a past canvas ("Parked · asked at", "Ask this again now", "Return to live"). See
  Canvases and the trail.
- **Fragment boundary** — the one element a vendor's surface mounts inside, carrying its
  provenance and its style isolation. Every fragment on the canvas is inside one.
- **Scrim** — dims the slots that are not asking, when the shell grants a fragment promotion.

## Vocabulary

- A **canvas** is one question's answer: a runtime of its own — store, live processor, turn
  runner, synthesis session, binding index — kept for the session (task 9.6). The **trail** is
  the list of them, one entry per question.
- A **paint** is one turn's surface landing on a canvas's stage. Each paint records a typed
  **cause** — the utterance that opened the canvas, a surface action inside one of its fragments,
  or the answer to an overlay question. The in-flight label is derived from the cause at render
  time; an agent-authored title, when present, sits on top.
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
  registers in the placement map and never contends for the stage. **An unstamped
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
  flight — and the hub answers by repainting its shell with that slot failed, which takes the
  fragment off the canvas: a failed source's data shows nowhere.
- **Presses** — Retry, Include and Try again go to the hub as the composition contract's
  operation, each answered on a stream beside the turn that routes by the stamp as a turn's
  batches do and never cancels it; a new utterance ends them all. A press is drawn at the click
  and held until the paint catches up; one that never arrived, or lost its stream, is said in place.
- **Prose is attributed too.** The stamp routes text as well as surfaces, so each source's
  chunks accumulate into their own notice line rather than interleaving into one string. Lines
  render in slot order — the stack echoes the layout below it — and each fades on its own clock
  once its source stops speaking. Prose stays in the shell's region and never enters a slot: a
  fragment's geometry is fixed for the turn.
- **The roster** is the client's second projection of the shell paint, beside the placement map:
  the composition's sources in slot order with the display names the orchestrator painted, read
  off the shell surface's `Attribution` components at first paint and kept, with the slot states
  and the merged view's facts, across the actions inside the composition. `placement` cannot serve — it is only
  written when a fragment actually lands, and iterates in fill order.
- **A collapsed slot rests on what its source said.** An agent that answers in prose without
  painting has its slot collapsed; rendering nothing there would leave its attribution marker
  naming a region that no longer exists, and the notice carrying its words fades. So the slot
  keeps that source's sentence as its resting state. A slot whose dispatch _failed_ is
  untouched — a visible failure is provenance too.
- **Promotion**: a fragment declaring a question does not get the overlay. The shell raises its
  slot and dims the rest instead, so the fragment is never re-parented and no vendor can block a
  canvas it shares. Promotion is plural, so it is emphasis rather than a modal: the count is
  announced, focus is not trapped. The overlay stays for shell-painted questions.

## Canvases and the trail

Phase 9's durable composition (task 9.6), drawn to board F5 of the task 7.14 design canvas.

- **A question opens a canvas of its own.** Asking mints a canvas id on the client, creates the
  canvas's runtime, and sends the question with no `contextId` — the orchestrator mints one, the
  runtime learns it from the first event — naming the canvas that was on screen as `parent`
  under the stamp key. Only the session's first question is a root. The new canvas is live and
  on screen; the one the user was looking at runs on.
- **Only asking makes a trail entry.** An action inside a fragment, a press, a sort, a re-synthesis
  are that canvas's own life. The entry is labelled by the truncated question until the Planner's
  title arrives as the `paintMeta` on `shell:main`, then by the title, with a short crossfade; the
  question stays the canvas's header verbatim.
- **A past canvas is a tab.** Back goes to the canvas asked just before the one on screen;
  "Return to live" to the newest question's. A past canvas draws as the live one does and is
  actable — actions, presses, sort — its answers landing in it, on its own context. The band over
  it reads "Parked · asked at HH:MM" with "Ask this again now" (its question sent again as a
  child of it) and "Return to live"; once the question has scrolled away its condensed copy and the
  progress line fold into the band's middle, one row of chrome rather than two; the Ask pill
  reads "Ask from this view", and a question
  asked there is a child of that canvas.
- **A canvas keeps running after the user leaves it.** Its streams arrive, its synthesis
  evaluates, its presses finish, in the background; its entry carries a quiet loading mark
  whenever its progress line would show a spinner. Nothing ends a canvas but its close.
- **The rail** opens from Trail beside Back as a drawer over the page, 272px and wider as the
  spine's lanes need, nothing beneath it moving: entries newest first
  under a day header, each its label, its time, "Live" on the newest, "Viewing" on the one on
  screen, the loading mark, "from HH:MM" on a branch — a canvas asked from one that is not its
  chronological predecessor — with the parent's title on hover and a way to it while it stands,
  and a close on hover. Picking an entry views it and closes the drawer, which covers what the pick brought on screen; Escape, Trail, the rail's own icon and a click on the faint scrim over the page close it. Hover or focus on an entry shows its preview: the canvas's shell
  surface mounted a second time, inert and scaled, with one line per source naming its current
  paint's title.
- **The close** sends `{kind: "close"}` on the canvas's context, ends its turn and every stream
  beside it, drops its runtime and its entry: the viewed canvas closed returns to live, live
  closed makes the newest remaining canvas live, the last closed leaves the empty canvas. A canvas
  whose question never reached the orchestrator closes with nothing sent.
- **In memory for the session.** A reload starts fresh.

## The way back inside a fragment

Phase 9's per-agent history (task 9.7; SPEC §6.5), the client's half of what the orchestrator
holds per composition.

- **Each source's paints in a canvas are a stack**, counted at the wire: every vendor
  `createSurface` the canvas receives is a step the moment it arrives, before any apply or
  staging decision, so the index the client reports names the paint the orchestrator counted. A
  create that never reached the stage, one the client could not draw, and a question paint each
  occupy their index as a placeholder the arrows skip. A create after a step back drops the
  forward steps.
- **A step holds the paint as last seen.** The current step is the live surface; a copy — tree,
  data model with every update the vendor pushed, title — is taken only when the stack moves off
  it, just before a claim or a swap destroys the surface. A step back rebuilds the copy through
  the processor as a live paint would, in the slot, and leaving it again captures it afresh.
- **The arrows** on the attribution row read the canvas's history through the shell catalog's
  `FragmentHistoryContext`: Back to the nearest earlier paint, Forward to the nearest later one,
  each named by that paint's title; drawn disabled while the source is busy — the opening turn,
  an action inside that fragment, or its Retry in flight.
- **The merged view follows.** The accepted wiring is filed under the combination of every
  painted source's current index, as the orchestrator files it. A step back to a combination
  the client has seen re-accepts the remembered wiring at once, no call. One it has not seen
  restores the paint and holds the merge line working until the step's stream ends: a synthesis
  paint on that stream lands as any does; a silent end keeps the current wiring and files it, so
  the two memories converge.
- **The step press** goes to the orchestrator as `{kind: "step"}` with the whole canvas's data
  model, so its partition is written from what is on screen. A step that fails — refused,
  unreached, lost — is quiet: the restored screen stands, the reason goes to the console, the
  next action heals the partition. A step in a past canvas works as on live.

## Interaction policy (while a paint is in flight)

- A palette utterance opens a new canvas; nothing in flight is cancelled by it.
- Agent-bound surface actions inside the canvas in flight are blocked with a status cue.
- Answering an overlay question and all shell chrome (the trail, palette summon) are always live.

## The live registry

Each canvas's `MessageProcessor` holds exactly the surfaces the agent may see of that canvas —
its stage plus its overlay, and the fragments filling its slots. A message on a canvas reports
that processor's data models and no other's.

## Wire additions for the canvas

The canvas layers two pieces of metadata on top of the A2UI protocol's A2A
binding (both defined in `src/a2a/messages.ts`; the standard
`a2uiClientDataModel` metadata key is the spec's own):

- **`paintMeta`** (agent → client): a dedicated DataPart,
  `{paintMeta: {surfaceId, title?, kind?}}`, emitted ahead of the
  `createSurface` it names. `title` is the agent-authored paint title the
  history shows (absent, the cause-derived fallback is used); `kind: "question"` is the marker
  that routes a paint to the overlay slot instead of the stage, and the **only** thing that does
  — the canvas infers nothing from a surface's shape. It used to fall back to recognising a
  `ConfirmationDialog` root, which put a vendor catalog's component name inside shell logic and
  silently did nothing for any other design system. An agent that asks must say so.
- **`a2uiverse`** (hub → client): the composition stamp, on A2A _event_ metadata rather than in
  the parts — `{source, slot?, role}`, defined by `@a2uiverse/sdk`'s composition extension. It is
  what tells the canvas whether a batch paints the shell or fills a slot. Recorded beats carry it
  per batch, because which slot a fragment fills is not recoverable from the A2UI it carries.
- **`a2uiverse: {parent}`** (client → hub): the same stamp key inbound, on the opening
  utterance of a child canvas — the context of the canvas the question was asked from
  (`@a2uiverse/sdk`'s `canvasParentMetadata`). Absent on a root canvas.

## Beat replay — zero-LLM verification

`?beat=<name>[,<name>…]` on the canvas page replays beat fixtures through the
full turn lifecycle — the same hold-and-swap gate, paced by the recorded stream
offsets. `&instant` collapses the waits. This is how the shell is verified with
no LLM in the loop. Every utterance of a beat opens a canvas of its own in the trail, as a real
question does; an action or press runs on the canvas last opened; a turn's `askedFrom` views that
earlier canvas first, so the new one is its child (task 9.6). The synthetic beats ship with the client
(`src/beats/syntheticBeats.ts`: `plain`, `plain-2`, `validation`, `question`, the composed
trio `composed`, `composed-solo`, `composed-question`, `synthesis` — two storefronts merged
by the sdk's example, then an in-place reorder its keyed refs survive — and `trail`, four
canvases with every mark of the rail at once). Recorded beats
(`recordings/beats/*.json`, addressed by number) are captured through the composing hub over
live MCP: `1`–`3` are one-slot compositions of a single vendor, `4` is the three-source fan-out.

A beat's presses replay as streams beside the turn, on the turn's own clock: each fires at its
recorded time through the wiring's press handler — the one the buttons call — and is answered from
the beat by `replayTransport.ts`, attached through `attachReplay`, as is the hub's answer to a failure
report the canvas sends (task 8.6). Phase 8's late-arrival and failure cases are synthetic beats in
`src/beats/lateFailureBeats.ts`, and recorded beats `10`–`18` over the deterministic roster through
the AgentsPool's fault map.

The two families do different jobs. A recording is evidence of what real agents produce; a
synthetic beat constructs a state — a mid-turn failure, a promoted question — that is unreliable
to catch live and would make a tracked fixture depend on a race.

## Module map

```
CanvasApp.tsx           page layout + page-level affordances (palette summon, ?beat= replay,
                        the trail chrome)
createCanvasWiring.ts   the page's runtime graph, built once: the trail store, the canvases'
                        runtimes, the A2A sender, asking / viewing / closing
canvasRuntime.ts        one canvas: its A2A session, store, live processor, turn runner,
                        synthesis session, binding index, dispatch handlers, close
canvasStore.ts          external store (useSyncExternalStore), one per canvas: stage/overlay
                        occupancy, in-flight status, the question, the composition's facts
trail/
  trailStore.ts         the trail: the canvases of the session, live and viewed, the page's
                        trusted page
replayBeat.ts           drives a recorded beat through the turn runner, its presses beside it
replayTransport.ts      answers a replayed beat's streams beside the turn from the beat
synthesis/
  synthesisSession.ts   a composition's synthesis state: payload, subscriptions, the user's
                        sort choices by path; writes the evaluated model into
                        shell:synthesis
  bindingEvaluator.ts   pure: payload + partitions + choices → the derived model
                        with a cell at every formula path, sorted arrays, /sorts/N
  intake.ts             the sdk's payload validator + the client's operator check
components/             the canvas view, stage, palette, overlay, status strip, ambient notice,
                        the trail chrome and the preview
turn/
  canvasTurn.ts         the turn runner — hold-and-swap lives here
  cause.ts              the cause vocabulary + the in-flight label's derivation
  turnMessages.ts       pure message-shape inspection for the runner
composition/
  slotContent.tsx       what a Slot renders: boundary → vendor Provider → surface
  FragmentBoundary.tsx  the one element a fragment mounts inside (provenance + isolation)
  slotCount.ts          how many slots the plan laid out — adaptive weight's input
  collisionDetector.ts  the CSS collision rules, run over the installed catalogs
```
