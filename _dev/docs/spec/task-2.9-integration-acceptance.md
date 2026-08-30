# Task 2.9 — Integration + acceptance

Phase 2's closing integration sub-task: the `dev:agents` launcher and platform aliases, the
attributed prose channel, the composed fan-out beat recorded over live MCP, the visual specs,
and the phase's acceptance run. Parent: `_dev/TODO.md` 2.9; phase spec
`_dev/docs/spec/phase-2-layout-composition.md` (decisions 17 and 19).

## Scope

- Dev commands: `dev:agents` launcher over `../a2uiverse-apps/`, `dev:all`, and the
  `dev:client` / `dev:orch` / `dev:marketplace` filter aliases.
- The attributed prose channel — per-source buffering of agent text and a plural notice stack.
- The composed fan-out beat recorded live through the hub, and beats 1–3 re-recorded.
- Visual Playwright specs and the acceptance run for items 1–11, closing with the
  Claude-in-Chrome tunnel gate.
- `check-transparency.ts` brought forward to the composed relay.
- Not in scope: any change to the vendor agents. 2.9 is not `[apps]`-tagged.

## Locked decisions

### 1. Prose renders as a stack in the shell's ambient-notice region

Attributed prose stays in the shell's own notice region rather than being anchored to each
fragment's slot. A source can speak without painting — an agent that fails or declines has a
failed or collapsed slot and no place to put its words — and prose streams token by token, so
keeping it out of the slot keeps fragment geometry fixed for the turn.

### 2. Notices are keyed by source, and each line fades on its own clock

One buffer per `stamp.source`, with a reserved non-agent key for the shell's own cues and for
prose arriving with no stamp. A new turn clears the previous stack immediately. Each line fades
six seconds after its own last chunk, so a source still speaking never fades mid-sentence.

*Amended during the live acceptance run.* This was originally a single group fade timed from the
end of the turn, on the reasoning that the lines are one set of answers to one question and
should be read together. Live fan-out disproved the premise that sources finish near each other
— Calendar answered in ~16 s against Gmail's ~80 s — so a fast source's line sat pinned for over
a minute. What had made the group fade necessary was that the notice was the only trace of a
source that spoke but never painted; decision 16 removes that, leaving nothing to lose to an
early fade.

### 3. The stack renders in slot order, each entry clamped to two lines

Entries appear in the order the Planner gave the slots, fixed for the turn, each in its reserved
position as its source starts speaking — the stack never reorders under a reader. Each entry is
clamped rather than the stack being capped, so no source loses its voice for answering late, and
total height stays bounded by source count.

### 4. The source roster is derived from the shell paint

The client records the ordered `(appId, displayName, slotName)` roster by reading the
`Attribution` components of an applied shell-role paint, holding it beside the placement map.
The roster arrives with first paint, before any prose can. The composition stamp is not extended
to carry it — that would make the same fact travel twice on one event. The roster is per-turn and
re-derived on each shell repaint.

### 5. Lines name their source with an inline prefix, always

Fragment-role lines carry an inline source prefix whether or not other sources answered — the
same turn should not present differently depending on how many other agents happened to speak.
The reserved shell key renders unlabeled; the shell speaking as itself is not a source.

### 6. `dev:agents` CLI contract

`--mode deterministic | stub | live`, mirroring the agents' own vocabulary, defaulting to
`deterministic` so a bare `dev:all` is a zero-credential, zero-quota three-agent composed screen.
`--only` takes a comma list of app ids, defaulting to all three. Mode is uniform across the
launched set; running one agent in a different mode is done by hand in its own terminal. The
launcher lives at the repo root as plain Node ESM with no new dependency, resolves the sibling
repo relative to the repo root with an environment override, and fails with a named error when it
is absent.

### 7. `dev:all` sequences startup in the launcher, and starts degraded

The launcher starts the agents, waits for each agent card to answer, then starts the platform —
the orchestrator fetches cards once at boot and swallows failures, so an unsequenced start yields
a canvas where nothing is routable and nothing says why. The orchestrator is not given retries:
decision 11 chose startup-fetch deliberately and names retry-with-fallback as the M7 shape. After
the timeout the launcher names the agents that did not come up and starts the platform anyway, a
degraded composition being a legitimate thing to work against. The orchestrator logs its routable
and unroutable apps at boot, covering the three-terminal case the launcher cannot sequence.
Ctrl-C tears down the group; an agent dying mid-session is reported without killing its siblings.

### 8. One composed beat is recorded; the synthetic beats stay

A single recorded composed fan-out beat joins the tracked set; `syntheticBeats.ts` keeps
constructing the states that are unreliable to obtain live — a mid-turn failure, a question, a
write round-trip. The two families have different jobs: a recorded beat is evidence of real
three-agent output shape, a synthetic beat constructs a state deterministically. The recorder
drives utterances only, so item 10's replayable half stays synthetic and the real write is proven
in the tunnel gate.

### 9. The composed beat is recorded with all three agents on live MCP

All three agents run live, with arming Gmail's recorder — which is what arms its pseudonymizer —
a hard precondition of the procedure. GitHub and Calendar are clean by construction, reading
public repos and the seeded demo calendar. Before the fixture is committed it is checked for the
account address and real correspondent names, failing closed on a hit. Since 2.9 cannot touch the
agents, arming stays a precondition the recorder documents and the check verifies.

### 10. The composed beat is "What needs my attention this morning?", beat 4

The utterance names no source, so the Router has to earn the fan-out; a sources-named phrasing
would let a broken Router still look right. It joins the existing glob-and-sort sequence as beat
4 rather than starting a second fixture family — the stamps already say it is composed. One
utterance, one turn. A hub recording bakes in the Planner's model and effort as well as the
agent's, so both are captured in the fixture's metadata.

### 11. Beats 1–3 are re-recorded through the composing hub

There is no non-composing path: every utterance runs Router → Planner → shell paint → dispatch,
so a single-agent turn is a one-slot composed turn and the 1.4 fixtures record a wire shape the
hub no longer emits. Re-recording restores the recorder's stated job — capturing what the client
receives from the hub — and converts acceptance item 2 from synthetic to recorded evidence. Three
visual baselines are rebased. Re-recording is itself a live test of the degenerate case: a
one-agent utterance must come back as a one-slot plan. The client's unstamped rendering path is
kept as the graceful path but loses its replayed coverage, so it needs a unit test that owns it.

### 12. `check-transparency.ts` keeps its comparison, fixed for composition

The direct-vs-hub comparison stays, because "exactly three hub rewrites" is a negative claim and
only end-to-end comparison proves that no fourth rewrite happens elsewhere in the pipeline. It
runs against deterministic agents so the vendor side is stable between sends, reads each slot's
Planner-authored request out of the journal line so both sides ask the same question, and
compares after inverting the three rewrites and dropping hub-authored events. Item 7's and item
3's live assertions — the journal line on disk with a non-null embedding and a complete dispatch
list, and the partition each vendor actually received — fold into the same script.

### 13. The notice stack gets a visual baseline

Captured at replay-done. The synthetic replay lands every batch within milliseconds, so all
lines are fresh at that point and the capture is a plateau rather than a race — which holds
under decision 2's per-line fades as it did under the group fade it replaced. 2.9 rebases the
three spine baselines and adds two — the recorded composed beat, and the composed screen with
its notice stack.

### 14. The browser gate induces failure by killing an agent before the turn

Item 5's two halves reach the same destination — a slot in the failed state, painted by the
orchestrator — by different routes. The gate takes the reproducible one: the agent is killed
before the utterance, so its card is already fetched and it is still planned into a slot, and its
dispatch then fails and the slot flips via shell repaint. The literal "mid-turn" wording is a
stopwatch exercise, and the substitution is recorded rather than passed over silently. The
`VALIDATION_FAILED` half is proven in the automated suite instead of adding a dev-only
catalog-drop flag to production code to re-observe a state the gate already shows.

### 15. The gate accepts its write residue and records item 1 as a GIF

Item 10's live writes leave a permanent draft — the Gmail agent cannot delete anything, including
its own drafts — so drafts accumulate across gate runs and cleanup is manual. Item 1 is the only
acceptance item whose content is a sequence: first paint before any agent responds, then three
fragments filling independently. A still cannot distinguish that from a screen that painted at
once, so item 1 is captured as a GIF and items 4, 5, 8 and 10 as stills.

### 16. A collapsed slot rests on what its source said

*Added during the live acceptance run.* A source that answers in prose without painting has its
slot collapsed, and the slot rendered nothing while its attribution marker remained — a label
naming a region that no longer existed. The slot now rests on that source's words: `SlotView`
asks the host for content before collapsing, and the client answers for an unfilled slot with
the prose that source accumulated this turn. It is the shell quoting the source, so it carries
no fragment boundary and no vendor Provider, and a slot that painted is never overwritten by its
source's commentary.

This is why the store keeps prose separately from the notice stack: the stack is what is
currently *shown* and fades, while the prose is what the turn's sources *said* and lives until
the next turn. Without it the screen would keep no trace that a source was consulted at all once
the stack cleared.

A slot whose dispatch *failed* is unaffected — it keeps its failure panel and its attribution,
because a failure the user can see is provenance too.

## Invariants

- 2.9 changes nothing in `../a2uiverse-apps/`.
- The client holds only projections of the shell paint — placement map and roster — never
  composition state of its own.
- A beat is a pseudonymized recording and is never evidence for acceptance item 8; only the
  tunnel run is.
- `_dev/` edits land on `main` only.
