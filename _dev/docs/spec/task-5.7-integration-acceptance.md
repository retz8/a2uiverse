# Task 5.7 — Integration + acceptance

Spec for sub-task 5.7 of Phase 5 (`_dev/docs/spec/phase-5-heterogeneous-shapes.md`): the phase's acceptance run — the temporal merge seen working end to end over the real roster, the first time a live model-authored merged view is rendered on the canvas. Phase decisions 12, 13, 15, 17 and 20; SPEC §3 (S1), §5.2–§5.4, §6.2–§6.3.

## Scope

- The acceptance item list for Phase 5 and where it lives.
- The beds the gate runs in and what each proves.
- The utterances the run uses.
- The disposition of the two inherited findings: the shared axis sorting as strings, and the dropped-key case covered only at the evaluator.
- A synthesis e2e case, and the temporal merge recorded as a client beat.
- Where the quiescence evidence and the dead-air figure land, and how the run is written up.

## Locked decisions

### 1. Both beds gate; live is the one that matters

The real roster in deterministic mode gates the item list: the merged view is knowable from the fixtures, so a failure points at the synthesis machinery. The real roster live gates S1 itself, quiescence and the dead-air figure — the items the deterministic bed cannot satisfy. The mock storefronts run in deterministic mode as the regression check for comparison, reorder and decline; nothing new is built for them.

### 2. The S1 utterance is pinned

**"What needs my attention today?"**, verbatim, for both the deterministic and the live pass — the utterance 5.6 recorded, on which the Planner reserved the merged view unprompted. If it stops producing a three-source plan with a reserved merged view, the fix is card wording or the Planner prompt, never a new utterance. The live pass may add free utterances on top. The mocks keep Phase 4's pinned utterances.

### 3. Decline gates over the mocks, with a free probe live

Decline is proven under the mock profile with Phase 4's pinned decline utterance. The live pass adds one free decline probe over the real roster, written up as a finding either way; it does not gate, since no utterance that reserves a merged view the real vendors cannot fill is known in advance.

### 4. The S1 item asserts the property, not the layout

The item passes when Gmail and GitHub entries are ordered on one axis by instant, Calendar's wall-clock times are shown as labels and never sorted into that axis, every derived cell is complete and names its source, and the sort criterion is displayed and user-changeable. How Calendar stands apart — a group, a column, a footer — is the model's; the note explains it. The gate fails on a false ordering, not on a layout choice the prose leaves open.

### 5. Drill-down gates on the real roster; reorder gates on the mocks

Opening a Gmail thread or a Calendar event from the merged screen, on the deterministic bed: that source's cells go absent at once with no round trip, then a re-synthesis lands handed the previous output, with the note saying what changed (phase decision 13, task 5.10 decision 4). Reorder → no model call is checked over the mocks' in-place sort, the only bed with a reorder instrument; no instrument is added to a vendor (phase decision 10).

### 6. Quiescence is read from the journal and the canvas

No new instrumentation. The live pass shows the three dispatch end times spread over real seconds, one synthesis outcome whose document holds refs into all three partitions, one attempt, and the pending marker held on the canvas until the merged view landed. The figures go into the write-up.

### 7. The runtime compares instants

The client's sort comparator orders two values by instant when both match a named date-time shape — ISO 8601, and the `YYYY-MM-DD HH:mm UTC` form Gmail paints. Any other pair keeps the existing rule. The shapes are named, not inferred from a lenient parser, and are tested over the recorded values. Amends task 4.5's sort-semantics decision, which is left as written there. Phase decision 19 stays closed: no operator is added and the model authors nothing new. Stated in the composition doc's sorts section and as a §14 register row.

**Amended during the run**, after Gmail painted a third spelling on a later live run: the runtime reads time. Any value carrying a year and a clock is an instant, whatever the vendor's spelling, a range its start; the parse is one shared function in the shell catalog, used by the evaluator's sort and by `DerivedValue`'s new `datetime` format, which renders every source's time in one human form. Vendors paint time as they like (decision 10 holds); the Synthesizer converts nothing and names the format; the Planner asks vendors in prose for the full date and time. A value the runtime cannot read stays text, sorted and shown as painted, so a miss is visible rather than invented.
Seen live once: the Synthesizer gave the `when` cells the `datetime` format unprompted, the Planner's requests asked each vendor for "its full date and time", and eleven Gmail and GitHub entries interleaved by instant, every time in the viewer's locale in one form; one attempt.

### 8. The comparator lives in the client only

The shell-catalog fixture keeps its own string sort. Only the client sorts, so there is no second judge to keep in agreement, and the fixture is a dev preview.

### 9. The dropped-key case is a canvas-level test

Beside the existing synthesis-turn tests, over the synthetic synthesis beat: a storefront repaint whose list no longer carries one keyed element leaves the row standing, renders that source's cells absent through the derived-value component with the contributor count narrowed, computes aggregates over the rest, holds the sort, and throws and marks nothing; a repaint that brings the key back reconnects it. Runs in the gate.

### 10. One synthesis e2e case

One Playwright spec over the synthetic synthesis beat: a visual baseline of the merged view rendered as shell content, no fragment boundary and no attribution, the sort control present and a change re-ordering, and the palette agreeing with the shell in dark mode. The baseline is taken from the synthetic camera comparison, independent of what the live run produces.

### 11. The temporal merge is recorded as beat 5

Recorded through the hub over the live roster: the three fragments and the synthesis payload as they arrived, the client's recorder extended to capture the synthesis metadata. Replayable as the client's real heterogeneous merged view; the README's beat table gains its row; the fixture privacy check covers the file; Gmail runs with its pseudonymizer armed during the recording. The e2e visual baseline stays on the synthetic beat; beat 5 gets a replay smoke assertion at most.

### 12. Dead air lands in the backlog item

The deterministic and live figures, with the utterance and roster they came from, are appended to the backlog entry on streaming the synthesis fragment, in 4.8's format. Measured, not judged (phase decision 15).

### 13. Markdown in shell text is out of scope

The client installs no markdown renderer. If the live run shows raw markdown syntax in shell text, it is recorded as a finding with the string that produced it, and the renderer decision is taken then.

### 14. Code first, then three passes

Before any browser pass: the comparator, the dropped-key test, the synthesis e2e spec and the recorder change land, with `pnpm verify` and the e2e suite green. Then, through the tunnel: the mocks deterministic for comparison, reorder and decline; the real roster deterministic for S1, drill-down and re-synthesis; the real roster live for S1, quiescence, the dead-air figure, the free decline probe and the beat 5 recording. Sittings as quota allows; written up once.

### 15. The acceptance list lives in the phase spec

A numbered acceptance section is added to the Phase 5 spec, following the Phase 4 precedent. Its final gate line names both tunnel passes, deterministic and live, since both gate.

### 16. The run is written up the way 4.8 was

Anything the run changes about a decision is amended into this spec and marked as added during the run. Defects the run finds are fixed in the same session and named in the commit message. Stills from the browser pass are not committed.

## Found and fixed during the run

Each surfaced by a tunnel pass before the item it blocked passed; fixed in the same session, with tests.

- **The launcher's agents dir never reached the orchestrator.** Turbo's strict env mode stripped `A2UIVERSE_AGENTS_DIR` from the `dev` task, so `pnpm dev:all --agents-dir …/mocks` booted the platform on the hardcoded roster with three unreachable agents. `turbo.json` passes `A2UIVERSE_*` through.
- **A merged list with no criterion.** The mocks' comparison merged under a Planner request that named no order, and the Synthesizer declared no sort: no control, nothing to change. The composition doc no longer allows an empty declaration list for a listed array — every array the tree lists declares its criterion, the one exception being the array no key can order (task 5.11 decision 5). Amends decision 4 of task 4.3 as far as the doc's wording goes; SPEC §5.4 and §16 already said it.
- **Calendar inside the sorted array under a key that could never resolve.** The first S1 document over the deterministic roster put Calendar's entries in the timeline with a ref-less `sortTime` formula — absent by construction, sorting last — and declared two sorts over one array, so two controls painted. Both are validator errors now, carried back to the model on the retry: one declaration per array, and every option key a formula with at least one ref in every element. The own-array rule of 5.11 is enforced where it can be.
- **No honest way to name an entry's source.** The Planner asked for each item's source and the same document wrote a ref-less `type` formula in every row: a column of absent cells. The shell catalog gains the `source` operator — the app id of the first resolving input, mapped by the evaluator the way `argmin`'s index is — and the composition doc says to use it. Amends phase decision 19 on the evidence it asked for.

*Added during the run.* **The merged view is a table.** The shell catalog gains `Table` and `TableRow` — headings from `columns`, one row per child, cells the row's children, columns aligned by construction — and `DataList` and `DataListItem` for the labelled values of one entry. The guidance doc's table idiom (a heading `Row` over a `Column` of `Row`s, which never aligned) is replaced by them; both worked examples are rewritten onto `Table`, the timeline example gaining its `source` column. Seen live once: thirteen entries in aligned columns, Calendar in its own table beneath, one attempt.

*Added during the run.* **The gate's S1 document.** After the fixes, the deterministic roster's document ordered Gmail and GitHub by instant on one axis, gave Calendar its own group with times as labels, filled the source column, declared one sort, and validated on the first attempt. The live roster's document did the same over ten live entries, Gmail and GitHub interleaved by instant across the two spellings.

## Evidence

- **Quiescence, live roster.** Dispatch settled at +14.1 s (Calendar), +25.9 s (Gmail), +32.5 s (GitHub) after send; the pending marker held through the first two arrivals and the merged view landed after the third; one attempt. The recorder's turn: +14.5 s, +27.8 s, +29.4 s, one attempt. The document referenced the Gmail and GitHub partitions; Calendar's data is discussed in the note.
- **Dead air.** Recorded in the backlog item.
- **Decline, live.** "Which of my meetings today are about my open pull requests?" reserved a merged view over Calendar and GitHub; the Synthesizer declined on one attempt, the reason spoken into the slot.
- **Beat 5.** 126 batches, 45 s, the synthesis payload on the last; fixture privacy check clean.

## Findings, not fixed

- **A vendor's time format is not stable across live runs.** Gmail painted `2026-09-05 01:24 UTC` on the recorded and first live runs and `Sep 6, 2026 · 00:20 UTC` on the last; the comparator's named shapes (decision 7) do not know the second, so that run's timeline sorted Gmail and GitHub as strings. Disposition open: widen the named shapes, or a bounded parse of any value carrying a four-digit year and a clock.
- **The live Synthesizer dropped Calendar rather than grouping it.** Over the live roster Calendar painted `10:00 AM`, `All day`, `Sep 7, 3:00 PM`; the document left it out with the note explaining, instead of the own-array group the doc asks for. *Added during the run:* the composition doc now says a source that answered with entries belongs in the view, in its own group when it cannot share the axis, never in the note alone. On the next live run Calendar had its table — and so did GitHub, which the model separated on a claim its data does not support (every `updatedAt` was ISO 8601). One shared axis carried Gmail alone. The judgment of which sources share a key varies run to run; the rule is stated, the model's reading of the data is not enforceable.
- **The hub logs its boundary.** *Added during the run:* one line per inbound request (kind, task, context, bytes), one per relay leaving for a vendor, one per relay settling (outcome, ms), one when the turn closes — so a turn that never closes leaves a trace. The failed-action finding below is what they are for.
- **The deterministic S1 document carried two of Gmail's threads.** The digest had more; the request asked for all; the note said nothing. Possibly the worked example's two-entries-per-source trim teaching a count.
- **A canvas action on the live composed screen failed.** Opening a Gmail thread from the merged screen reported "That action failed. Failed to fetch" after about seventy seconds; nothing reached the Gmail agent, nothing was journaled, the orchestrator answered its card through the tunnel throughout. 4.8's unreproduced observation, seen once more in a different shape.
- **The renderer stalled twice** for a screenshot over the tunnel after a merged view landed on the deterministic roster; the page recovered on its own and the console was clean.
- **Markdown** never showed raw in shell text; no renderer decision was needed (decision 13).
- **A re-synthesis re-authors rows.** Over the mocks, the drill-down's re-synthesis dropped the two rows whose Shop A refs went absent and the return re-added them. The view held its columns; the row set followed the data.

## Invariants

- **Live verification drives tunnel URLs, never localhost.**
- **No vendor or apps-repo code changes.** Vendors are never changed for a2uiverse (phase decision 10); the recording arms Gmail's pseudonymizer and nothing more.
- **The model names things; the runtime counts them.** Ordering is the runtime's; the comparator adds no vocabulary the model authors.

## Watch items

Not decisions; things the run is expected to trip over or observe.

- The plan check still breaks the turn when the Planner draws two slots for one agent (carried from 4.8).
- In 5.6's live run the Synthesizer bound Calendar's `note` to the merged view's Source column.
- 4.8 observed and did not reproduce a canvas action reaching a vendor while the orchestrator never closed the turn.
- Acting inside a parked composition forks a turn whose answer lands nowhere (Phase 9's); easy to trip during the run.
