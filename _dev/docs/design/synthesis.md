# Synthesis — how the merged view works

Synthesis is the mechanism that turns several vendors' fragments into one merged view without
any vendor knowing it happened (SPEC §5, §6, §10). It is the platform's own, and it spans three
packages and two processes: the **sdk** holds the contract and the tools both sides compute with,
the **orchestrator** asks a model to *author* the view and checks what comes back, the **client**
*evaluates* it and keeps it live. This doc is the narrative end to end. The per-class records stay
in [`orchestrator.md`](orchestrator.md), [`client.md`](client.md) and
[`shell-catalog.md`](shell-catalog.md); the sdk's front page is `packages/sdk/README.md`. State
as of task 5.7.

## The idea in one paragraph

Every vendor paints its own surface with its own data model — its **partition**. Nothing ever
copies data out of a partition. Instead, once every vendor has answered, a second model call (the
**Synthesizer**) writes the **synthesize data model**: a component tree in the shell's own
catalog, a free-form JSON model whose every leaf is a **formula** — one operator over **refs**
into the partitions — a sort declaration for each list the tree shows, and a note for the log.
The orchestrator validates it, paints the tree into the slot the Planner reserved, and sends the
model and sorts to the client beside the paint. The client's **BindingEvaluator** resolves every
ref against the partitions it already holds, runs the operators, and writes the result into that
surface's data model as ordinary values. The renderer sees plain values on plain paths. The
merged view is a live query over partitions that stay isolated: the moment a partition changes,
the client re-evaluates, and only when a ref stops resolving altogether does the orchestrator ask
the model again.

```
                          orchestrator                                        client
                          ────────────                                        ──────
vendor A ─paints─▶ partition A ─┐
vendor B ─paints─▶ partition B ─┼─▶ Synthesizer ──text──▶ validate ─▶ paint shell:synthesis ──▶ tree rendered
vendor C ─paints─▶ partition C ─┘   (model call)          + check     + payload on metadata          │
                                                                                                    ▼
                                                                    BindingEvaluator: refs → partitions → operators
                                                                                                    │
                                                                            writes cells · sorted arrays · /sorts/N
                                                                                                    │
                                                                                                    ▼
                                                                    DerivedValue · SortControl · Table (shell catalog)
```

The words to hold on to:

- The **shell** is the platform's own canvas. On the wire it is also a source: the orchestrator
  (the **hub**) stamps its own paints with the reserved source id `shell`.
- A **composition** is one screen: the Planner's plan, its **slots** — the regions of the layout
  the shell paints first, one per agent, each a `Slot` component of the shell catalog whose state
  (pending · failed · collapsed) the hub repaints; a collapsed slot folds away — and the
  partitions behind them. An **utterance turn** is the user asking; an **action turn** is the
  user acting inside a fragment, dispatched to that fragment's owner alone.
- A **ref** is a surface id plus a pointer into that surface's data model. Elements of an array
  are selected by key (`/threads[id="…"]`), never by position.
- A **formula** is `{op, args}`: one operator the shell catalog declares over zero or more refs.
- The **derived data model** is a JSON shape of the Synthesizer's choosing whose every leaf is a
  formula. "Wiring, never values" holds at the leaves.
- The **synthesis tree** is an ordinary A2UI components list in the shell catalog, bound to
  paths in that model.
- A **sort declaration** names an array of the model, the keys it may be ordered by, and the
  initial choice. The runtime sorts; the user changes it.
- A **cell** is what the evaluator writes at a formula path: the value plus its contributor
  state.

Client words used below without ceremony, all from `client.md` and the client README: the
**stage** is the live surface on the canvas; a paint may be **staged** and **swapped** in when
complete; the canvas **timeline** is its history of paints, a **parked** entry one the user has
navigated back to, rendered in a **sandbox**. A **two-way edit** is an input inside a fragment
writing to its own data model. A **beat** is a recorded stream the canvas can replay; the
**roster** is the set of installed agents; **S1** is SPEC §3's first scenario.

## The cast

| Who | Where | Does |
| --- | --- | --- |
| Planner | orchestrator `planner/` | reserves the synthesis slot with a prose brief, and asks each vendor in prose for the data a merge needs |
| Partitions | orchestrator `composition/partitions.ts` | the server-side copy of every surface's data model; resolves refs through the sdk kit |
| Synthesizer | orchestrator `synthesizer/` | prompts the model, extracts and validates its text, retries once |
| the payload validator | sdk `validate.ts` | the contract's own checks over the derived model and sorts, run by both processes |
| the A2UI validator | sdk `a2ui/` | a tree against a catalog, following upstream's `A2uiValidator`; beside it, catalog pruning by keep-set |
| the Synthesizer's validator | orchestrator `synthesizer/validate.ts` | the one validator over the model's document: output schema, the payload validator, the tree through the A2UI validator against the Synthesizer's pruned catalog, derived-value rule, operators, refs resolve now |
| the painter | orchestrator `composition/synthesisPainter.ts` | paints the tree verbatim, the payload beside the stamp |
| IntegrityChecker | orchestrator `composition/integrity.ts` | after an action, asks whether every ref still resolves; accounts for what broke |
| intake + session | client `canvas/synthesis/` | validates the payload, subscribes to the partitions, re-runs the evaluator |
| BindingEvaluator | client `canvas/synthesis/bindingEvaluator.ts` | pure: payload + partitions → the surface's data model |
| DerivedValue · SortControl · Table · DataList | shell catalog | what a merged view is made of; the operators live in the same catalog |

## A turn, step by step

Take the utterance *"What needs my attention today?"* over Calendar, Gmail and GitHub — the S1
scenario, recorded as beat 5.

1. **The Planner reserves the slot and asks for the merge's data.** The plan gains a slot whose
   `appId` is the reserved `shell` source; its `request` is the Planner's prose brief to the
   Synthesizer — what the merged view shows, what it orders by, what matters to the user. Whether
   the screen gets one, and where it sits, is the Planner's judgment. When it does, each vendor's
   request also asks, in plain words, for the fields a merge depends on: identifiers, and the full
   date and time of each entry. It asks for data, never a format, and says nothing about the
   merge, the shell or the other agents (phase decision 9). The plan reaches the client as the
   shell's layout paint: a surface of `Slot`s, every one pending — the synthesis slot as bare
   shell content, with a quiet in-progress marker and no attribution — before any vendor has
   answered.

2. **Vendors fill their slots.** Each vendor's events are relayed as fragments; the stamp on
   names its source, and the layout's `Slot` holding that source is where the surface belongs. As
   each event passes through, the orchestrator **materializes the partition**: it applies the
   vendor's A2UI messages to a server-side copy of that surface's data model, keyed by the
   namespaced surface id, so it always knows what the client holds (the client also sends its
   data models back on every request, so two-way edits reach the copy). A source that completes
   having painted counts as **arrived**; the moment the last dispatch settles is
   `lastSettledAt`, where the dead-air clock starts.

3. **All sources settle → the Synthesizer is prompted.** Fewer than two arrived means no call at
   all. Otherwise the model receives a system prompt assembled once at boot in the orchestrator:
   the role, the **rules doc** (`apps/orchestrator/src/synthesizer/synthesis.md` — partitions,
   refs and predicates, formula leaves, sorts, the tree, the note, decline, re-synthesis, in
   a2uiverse words), the shell catalog's **guidance doc** (which components a merged view is made
   of, and the derived-value rule), the shell catalog pruned to the synthesis surface's keep-set,
   the output schema, and two worked examples. The turn carries the utterance, the brief, and every arrived partition's live
   data model with its app's display name. Never a vendor's component tree: Planner and
   Synthesizer know only the shell catalog (phase decision 7). The only tree the Synthesizer ever
   sees is its own previous one, on a retry or a re-synthesis.

4. **The model writes the synthesize data model, as text.** One JSON document inside a
   `<synthesize-data-model>` block (phase decision 16). For the S1 shapes the Synthesizer's own worked
   example shows the form: a `Column` holding a heading, a `SortControl`, a `Table` templated over
   `/timeline`, and a second `Table` for Calendar, whose times of day carry no date and cannot
   join the axis; a `dataModel` with `timeline` (Gmail threads and GitHub PRs, selected by id or
   by repository-and-number) and `calendar` arrays; one sort over `/timeline` by `/when`; and a
   note explaining why Calendar stands apart.

5. **The orchestrator accepts, or hands it back once.** The block is extracted by the
   orchestrator's shared tagged-block extractor, parsed, and run through the Synthesizer's one
   validator: the output schema; the derived model and sorts through the sdk's payload validator
   (every leaf a formula, every pointer parses, one sort per array, every option key a formula with
   at least one ref in every element, the initial key an option); the tree through the sdk's A2UI
   validator against the Synthesizer's pruned catalog (known components and props, one `root`,
   unique ids, no dangling child, no cycle, no orphan — `Slot`, `Attribution` and `Button` are not in
   that catalog); then, over a structurally sound model, the derived-value rule, every operator
   one the pruned catalog declares and in its place — relations only inside `match`, only
   relations there — every ref into a held partition and resolving *now*. Any finding goes back to the model as one line
   per error with the failed document; a second failure is `malformed`. Within one synthesis the
   retry is the only second call; a re-synthesis later in the composition's life is a new
   synthesis with its own retry.

6. **The synthesis surface is painted.** `shell:synthesis`, against the shell catalog, into the
   `Slot` holding the `shell` source: a `createSurface` plus an `updateComponents` carrying the
   model's components exactly as written. The event's metadata carries the stamp `{source: shell,
   role: fragment}` and, beside it under `a2uiverseSynthesis`, the **payload**: the derived model
   and the sorts. The tree rides as A2UI; the note stays in the journal. The orchestrator keeps
   the accepted document and the payload as the composition's live synthesis, which the
   IntegrityChecker guards from now on.

7. **The client evaluates before it renders.** The turn runner hands the payload to the
   **synthesis session** the moment the surface is live. Intake validates it with the same sdk
   validator and checks every operator against the shell catalog, in its place; the session subscribes to the
   root of every partition the payload refs and to `/sorts` on the synthesis surface; the
   evaluator resolves every ref, runs every formula, sorts every declared array, and writes the
   whole model to the synthesis surface in one root write. Only then does React render, so the
   first paint of the merged view already carries values.

8. **The screen.** The merged view is the shell writing on its own page (phase decision 22): no
   fragment boundary, no attribution tile, no source badge. Provenance is in the cells — each
   `DerivedValue` shows its value and, when not every source contributed, a marker with the
   detail on hover. The Gmail and GitHub entries sit on one axis ordered by instant, each row's
   `Source` cell naming its app through the `source` operator; the `SortControl` above the table
   shows the criterion and lets the user change it. Calendar's entries stand in their own table
   with their times shown as labels. (A view of one thing's labelled fields — a summary, a detail
   — is a `DataList` of `DataListItem`s instead of a `Table`; the guidance doc says which shape
   serves which view.)

9. **The turn closes.** The journal records the whole conversation — every attempt's text and
   errors, the accepted document, its note — and the **dead air**: the interval from the last
   source settling to the synthesis outcome (`deadAirMs`). Dead air is measured, not mitigated
   (phase decision 15).

## What rides the wire

**The stamp** (every relayed event, `metadata.a2uiverse`):

```json
{"source": "gmail", "role": "fragment"}
```

**The synthesis paint** (one event): the A2UI parts carry the tree; the metadata carries the
stamp and the payload. A trimmed payload for the timeline:

```json
{
  "dataModel": {
    "timeline": [
      {
        "source": {"op": "source", "args": [{"surface": "gmail:inbox", "pointer": "/threads[id=\"1a06f2abedf045ce\"]"}]},
        "when":   {"op": "value",  "args": [{"surface": "gmail:inbox", "pointer": "/threads[id=\"1a06f2abedf045ce\"]/time"}]},
        "what":   {"op": "value",  "args": [{"surface": "gmail:inbox", "pointer": "/threads[id=\"1a06f2abedf045ce\"]/subject"}]}
      },
      {
        "source": {"op": "source", "args": [{"surface": "github:prs", "pointer": "/prs[repository=\"a2ui-project/a2ui\",number=2531]"}]},
        "when":   {"op": "value",  "args": [{"surface": "github:prs", "pointer": "/prs[repository=\"a2ui-project/a2ui\",number=2531]/updatedAt"}]},
        "what":   {"op": "value",  "args": [{"surface": "github:prs", "pointer": "/prs[repository=\"a2ui-project/a2ui\",number=2531]/title"}]}
      }
    ],
    "calendar": ["… one object per event, selected by id …"]
  },
  "sorts": [
    {"path": "/timeline", "options": [{"key": "/when", "label": "Time"}], "key": "/when", "direction": "desc"}
  ]
}
```

And the tree that binds to it, as the painter sends it (the components list of an
`updateComponents`, in the shell catalog):

```json
[
  {"id": "root", "component": "Column", "children": ["heading", "sort", "timeline", "calendar-heading", "calendar"]},
  {"id": "heading", "component": "Text", "variant": "h3", "text": "Needs attention today"},
  {"id": "sort", "component": "SortControl", "sort": {"path": "/sorts/0"}},
  {"id": "timeline", "component": "Table", "columns": ["Source", "When", "What"],
   "children": {"path": "/timeline", "componentId": "item"}},
  {"id": "item", "component": "TableRow", "children": ["i-source", "i-when", "i-what"]},
  {"id": "i-source", "component": "DerivedValue", "cell": {"path": "source"}},
  {"id": "i-when", "component": "DerivedValue", "cell": {"path": "when"}, "format": {"kind": "datetime"}},
  {"id": "i-what", "component": "DerivedValue", "cell": {"path": "what"}},
  "…"
]
```

The contract is one file, `packages/sdk/contracts/composition.v0.6.json`, in two halves: the
stamp, and the synthesize data model. The JS projection is `packages/sdk/js/src/synthesis.ts`.

## The synthesize data model, piece by piece

**Refs.** `{surface, pointer}`. The surface is the namespaced id exactly as the client keys its
data models; the pointer is RFC 6901 with one extension: a segment may carry a **predicate**,
`items[id="x100"]`, selecting the element of `items` whose field equals the JSON literal, and
several tests may be conjoined, `prs[repository="a/b",number=11]`, for elements no single field
names. Exactly one element must match. A positional segment into an array is not a ref: the sdk's
resolver answers `positional`, and the orchestrator's checklist tells the model to use a
predicate rather than sending it hunting for missing data (task 5.10). Resolution has four
absent answers — `missing`, `ambiguous`, `null`, `positional` — and every one of them is absent
to a formula. There is no index ref, no generation baseline and no stale state (phase decision 6
as amended by task 5.10).

**Formulas.** `{op, args}`, recognised by shape: an object with exactly those two keys. `op` is
one of the functions the shell catalog declares as operators — `value`, `min`, `max`, `sum`,
`avg`, `count`, `argmin`, `argmax`, `source` — and the contract does not enumerate them; each
process reads the list from the catalog. A plain vendor value is the one-argument `value`
pass-through, so there is one shape and one evaluator path. A formula with no refs is the honest
cell for a column a source does not carry: it evaluates to absent, 0 of 0. `source` is the
degenerate selector — index 0 of the surviving inputs — so a merged row can name the app its
entry came from without copying anything (phase decision 19 as amended by task 5.7). Formulas do
not nest. The catalog's relations — `equal`, `contains`, `judged` (task 7.5) — are declared
beside the operators and written only inside `match`.

**The derived data model.** Any JSON shape, object or array at every branch, formula at every
leaf; a scalar anywhere is a contract violation. A list of like things is an array of like
objects, one per thing, and the tree templates over it. Putting two sources' refs into one object
is the Synthesizer's assertion that they are about the same thing — the entity-resolution claim,
made only when the data supports it. The root key `sorts` is reserved.

**The match claim.** Where the Synthesizer judges entries from different apps to be one thing, the
object that joins them carries its evidence under the reserved key `match`, the root included:
named relations, each key the Synthesizer's own words for what matched and each value a relation
formula over exactly two refs in two different apps — `"branch": {"op": "equal", "args":
[github…/branch, circleci…/branch]}`. At least one relation, flat. No object is required to carry
one. A relation is a formula like any other leaf, so its refs are the model's refs. The sdk's
validator checks the shape and that each relation's refs name two different apps. The consumers —
the orchestrator's validator and the client's intake — check that each relation's operator is one
of the shell catalog's relations and that no relation stands outside `match` (task-7.5 decision 5).

**Sorts.** For each ordered array: its `path` in the model, the `options` a user may sort by (each
a `key` pointer inside an element to a formula leaf, with a `label`), and the initial `key` and
`direction`. A path's steps are object keys and `*`, at any depth: `/rows/*/runs` is the list
`runs` inside every element of `rows`, one declaration and one user choice ordering it in every row,
and every element the path passes through carries the list, `[]` when it has none (task 7.12). The
sdk's `reachSortPath` is the one expansion of a path into the arrays it reaches. One declaration per
array, and every option key must be a formula with at least one
ref in every element — a key with no refs can never take a place on the axis, so such an element
belongs in its own array (the validator's rules from task 5.7). The rules doc asks for a
declaration on every array the tree lists, the one exception being the array no key can order.

**The tree.** The components list an agent would put in an `updateComponents`, in the shell
catalog, one of them `root`. It binds to the model with `{"path": …}`, absolute or relative
inside a template. **The derived-value rule** (phase decision 18): a path whose leaf is a formula
renders only through `DerivedValue`, and `DerivedValue` binds nothing else; `SortControl` binds
`/sorts/N`. Literal props — headings, column labels — are presentation and the model's to write;
a literal that restates a source's value is a copied value and is wrong there too. `Slot`,
`Attribution` is the shell's own and never part of a merged view.

**The note.** What was delivered and why it differs from the brief, when it differs; on a
re-synthesis, what changed. Journaled, never painted — the user never saw the brief (phase
decision 8).

**Decline.** `{declined: true, reason}` when the sources give nothing to merge. The reason is
written for the user and spoken into the slot as the shell's own words (phase decision 17).

## What the client writes

The evaluator's output is the synthesis surface's whole data model. It mirrors the derived model
— branches keep their shape, each declared array is reordered in place — with a **cell object** at
every formula path and the reserved `sorts` array at the root:

```json
{
  "timeline": [
    {
      "source": {"value": "gmail", "contributed": 1, "of": 1, "absent": []},
      "when":   {"value": "2026-09-05 01:24 UTC", "contributed": 1, "of": 1, "absent": []},
      "what":   {"value": "Estimate review: status before Friday", "contributed": 1, "of": 1, "absent": []}
    },
    {
      "source": {"value": "gmail", "contributed": 1, "of": 1, "absent": []},
      "when":   {"value": "2026-09-05 00:20 UTC", "contributed": 1, "of": 1, "absent": []},
      "what":   {"value": "Draft agenda for the budget sync", "contributed": 1, "of": 1, "absent": []}
    },
    {
      "source": {"value": "github", "contributed": 1, "of": 1, "absent": []},
      "when":   {"value": "2026-09-05T00:03:52Z", "contributed": 1, "of": 1, "absent": []},
      "what":   {"value": "Retry a fragment subtree on validation failure", "contributed": 1, "of": 1, "absent": []}
    },
    {"…": "then the PR updated at 22:41 the day before — latest first, across two spellings of time"}
  ],
  "calendar": ["…"],
  "sorts": [
    {"path": "/timeline", "options": [{"key": "/when", "label": "Time"}], "key": "/when", "direction": "desc"}
  ]
}
```

A cell is `{value, contributed, of, absent}` and never a scalar. `DerivedValue` binds to it by
one path and owns the interpretation, so a partial value can never render like a complete one —
by construction rather than by review. `absent` lists the namespaced surfaces whose refs did not
resolve; the component shows the app id. `SortControl` binds `/sorts/N` and writes the whole
declaration back to the same path when the user changes key or direction.

Evaluation of one cell: resolve each ref through the sdk's resolver against its partition's root
(any not-found answer, and a `null`, is absent), drop the absents, call the catalog function over
the survivors' values, record `contributed` and `of`. `argmin`, `argmax` and `source` return an
index over the survivors; the evaluator maps it back to the winning ref's surface and writes the
**app id** as the value.

A cell has three states:

| State | Meaning | At rest |
| --- | --- | --- |
| complete | every declared input resolved | the bare value |
| partial | some inputs resolved | value + half-filled circle; detail names the missing sources |
| absent | no input resolved | a dash + dashed ring |

## Reading time

Vendors paint time however their own model chose — `2026-09-05T00:03:52Z`, `2026-09-05 01:24
UTC`, `Sep 6, 2026 · 00:20 UTC`, `11:30 – 12:15` — and nothing on the wire asks them for a
format. So the runtime reads it (SPEC §14, task 5.7): `parseInstant` in the shell catalog's
`components/shared/instant.ts` treats any value carrying a four-digit year and a clock as an
instant, reads a range as its start, honours a named IANA zone in the value, and reads a
zone-less wall time in the display zone — `America/New_York`, fixed in code, not the viewer's
machine and not configurable. Everything else — a time of
day without a date, a bare date, a label — stays text. The same function serves two places, so
what sorts together renders together: the evaluator's comparator orders numbers numerically, two
instants by `parseInstant`, strings by locale, and a mixed pair by string; `DerivedValue`'s
`format: {kind: "datetime"}` renders any readable spelling through `formatInstant` in one fixed
form, `en-US` in `America/New_York`. The Synthesizer converts nothing: it puts the ref on the
axis and gives the cell the `datetime` format. No time-normalising operator exists (task 5.11's
closure stands).

## Absent, and when the Synthesizer runs again

Because a ref names an element by key, only one thing can happen to it after the document is
written: it stops resolving. **Absent is not invalid** (SPEC §6.2). A Gmail thread opened into its
detail view takes the list away; every cell with a ref into it goes partial or absent at once, on
the client, with no round trip — the session's subscription on that partition fires, the
evaluator recomputes over what still resolves, and the cells show the narrowed source set. A
reorder inside a fragment re-points nothing: the same key still names the same element, so the
cells do not move and no model is called.

What *does* bring the Synthesizer back is absence seen from the orchestrator (SPEC §6.3, task
5.10 decision 4). A user's in-fragment interaction is an action turn: owner-only dispatch, then a
final. Under synthesis that turn gains a tail. After the vendor's pump settles and its partition is
updated, the **IntegrityChecker** walks every ref of the live payload through
`Partitions.resolve`; if any fails, it builds the **change account** — the refs that no longer
resolve, each once — and the Synthesizer is called again with the previous document beside the
fresh partitions and told the user is looking at it: re-point what broke, keep the tree and the
shape unless the data no longer supports them, say what changed in the note (phase decision 13).
The repaint of `shell:synthesis` lands before the turn's final. A two-way edit or a scalar
change that leaves every key resolving costs no model call.

```
action turn
  vendor answers ─▶ partitions.apply ─▶ checkSynthesisPayload(payload, partitions)
                                              │ every ref resolves      │ some ref does not
                                              ▼                         ▼
                                         nothing moves      changeAccount → Synthesizer(previous, changes)
                                                                        → accept → repaint shell:synthesis
```

On the client the repaint is a repeat `createSurface`, which the apply path expands to delete +
create. In an action turn the stage is occupied, so the repaint streams into staging and lands at
the swap; the session accepts the new payload the moment the surface is live again and
re-subscribes. The **user's sort survives** a re-synthesis while its key is still one of the
options; a new utterance turn starts from the declaration's own choice, because the composition —
and the session's state with it — is replaced.

The residual hazard is a vendor that reuses an identifier for a different entity across a
repaint: the key resolves, to the wrong thing. It is accepted, not solved (SPEC §6.2).

## Sort is free

`SortControl` writes its declaration back at `/sorts/N`. The session's subscription on `/sorts`
fires, records the user's choice by array path, and re-evaluates: the array is re-ordered and
written back in the same root write. That write lands on `/sorts` too, but the session marks its
own writes and ignores the notification they raise, and an unchanged output is not written at
all. No round trip, no model call. Absent cells sort last in both directions; ties keep model
order, so nothing moves when nothing differs.

## When nothing is joinable

- **Decline.** The Synthesizer answers `declined: true` with a reason. The orchestrator publishes
  the reason as the shell's own words in the synthesis slot — a text part stamped as the synthesis
  fragment, no payload beside it — then collapses the slot through the ordinary slot-state
  repaint; the collapsed slot rests on those words and the fragments stand side by side. Journaled
  `declined`. Only a decline speaks: it is the model's judgment in its own words. The other
  collapses are the runtime's and stay silent.
- **Malformed.** Both attempts failed the validator or the checklist. Journaled `malformed` with
  the last attempt's errors. Never a broken turn — the fragments have already painted correctly.
- **Fewer than two sources arrived.** No model call; the slot collapses; journaled `skipped`.
- **The model call failed** (no key, a provider error). Journaled `failed`; the slot collapses.
- **The client rejects the payload.** Contract drift, in practice: the sdk validator or the
  operator check fails at intake. The client reports `VALIDATION_FAILED` for `shell:synthesis` on
  the **side channel** — the request it sends outside any turn to say a fragment cannot render —
  and the orchestrator resolves `shell` to `slot-shell` and repaints it failed. A ref into a
  surface the client does not hold is *not* a rejection — that is absent at evaluation time. The
  two judgments differ on purpose: the orchestrator's checklist asks whether every ref resolves in
  *its* partitions at the moment of authoring, so the model is never allowed to point at nothing;
  the client asks again at every evaluation, when a surface may since have been torn down or
  drilled into, and answers with a state, not an error.

## Lifetimes

- **The composition.** The session's payload, subscriptions and sort choices belong to the
  composition. `retireStage` — the one place a composition leaves the canvas — retires the session
  with it. A vendor surface re-created by a repaint is watched again; a deleted one simply goes
  absent.
- **The canvas timeline** (the canvas's history, not the `/timeline` array above). A parked
  composition carries the synthesis surface frozen with its last evaluated data model, and
  beside it the payload and surface id it was projecting. A parked
  visit re-sorts over its own frozen partitions: sort crosses no wire, so the controls keep
  working in the sandbox; nothing live is subscribed.
- **The round trip.** `shell:synthesis` rides back to the orchestrator in the client data model
  like every surface; the orchestrator ignores a derived surface harmlessly.

## Seeing it without a model

- The Synthesizer's two worked examples — the storefront comparison and the S1 timeline — pass
  its whole validator in the orchestrator's tests.
- The client's synthesis fixture is its own copy of the storefront example; `?beat=synthesis` replays
  it, and the canvas tests drive the dropped-key case end to end.
- Beat 5 (`apps/client/recordings/beats/beat-5-temporal-merge.json`) is the temporal merge
  recorded through the hub over the live roster. The recorder keeps the synthesis payload beside
  the stamp on the one event that paints the merged view, so a replay evaluates the real
  document over the real partitions.
- The orchestrator's integration tests run the loop with a `FakeSynthesizer` in place of the
  **text seam** — the one-method interface the model call sits behind, text in, text out; the
  live smoke behind `A2UIVERSE_SYNTHESIZER_LIVE=1` runs the real model once.

## What is deliberately not here

- **Dead air** between the last fragment and the synthesis paint is measured in the journal and
  not mitigated; streaming the synthesis fragment is a backlog item decided on that evidence.
- **Navigation** from a merged cell to the originating vendor subtree is Phase 7 (phase decision
  14).
- **Per-source deadlines.** A vendor that never answers holds synthesis open (phase decision 12);
  Phase 8.
- **The Synthesizer's judgment** of which sources share a key is stated as a rule and taught by
  example; it is not enforceable, and it varies run to run (task 5.7's findings).
- **Display names** in a partial cell's detail, rather than app ids, are a nicety for later.

## Where the code is

| Concern | sdk | Orchestrator | Client | Shell catalog |
| --- | --- | --- | --- | --- |
| Contract, types | `contracts/composition.v0.6.json` · `js/src/synthesis.ts` | `synthesizer/document.ts` | — | — |
| Pointers, predicates, the walk | `js/src/pointer.ts` · `js/src/walk.ts` | `composition/partitions.ts` (`resolve`) | `canvas/synthesis/bindingEvaluator.ts` | — |
| Validation | `js/src/validate.ts` · `js/src/a2ui/` | `synthesizer/validate.ts` | `canvas/synthesis/intake.ts` | `src/keep-sets.ts` |
| The prompt | — | `synthesizer/prompt.ts` · `synthesizer/synthesis.md` · `synthesizer/examples.ts` · `authoring/taggedBlock.ts` · `planner/prompt.ts` | — | `docs/synthesis-guidance.md` · `catalogs/v0.9.1/catalog.json` |
| The model call | — | `synthesizer/synthesizer.ts` | — | — |
| Integrity, re-synthesis | — | `composition/integrity.ts` · `executor.ts` | — | — |
| The paint | — | `composition/synthesisPainter.ts` · `composition/state.ts` | `canvas/turn/canvasTurn.ts` · `a2a/messages.ts` | — |
| Evaluation, session | — | — | `canvas/synthesis/synthesisSession.ts` · `canvas/synthesis/bindingEvaluator.ts` | `src/functions/operators.ts` |
| Rendering | — | — | `canvas/composition/slotContent.tsx` | `src/components/derived-value` · `sort-control` · `table` · `data-list` · `shared/instant.ts` |
| Journal, logs | — | `journal/types.ts` · `log.ts` | — | — |
| Proof without a model | `js/src/*.test.ts` | `test/orchestrator.test.ts` | `src/beats/synthesisFixture.ts` · `tests/canvas-synthesis.test.tsx` · `e2e/synthesis.spec.ts` · beat 5 | — |
