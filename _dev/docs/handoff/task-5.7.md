# Handoff — task 5.7, Integration + acceptance

Not started. Picked for the next session; **no task spec yet, no code written**. Everything it waits on has landed: 5.4, 5.5, 5.6, 5.9, 5.10, 5.11 are `[x]` and committed on `main`; `pnpm verify` green; both repos clean.

## Where it stands

- Phase 5 is `[WIP]` with 5.7 and 5.8 open; 5.8 (design records + sdk README) waits on 5.7.
- 5.7 has no `task-5.7-*.md` spec. Phase 4's precedent (`task-4.8-integration-acceptance.md`) is the shape: a grill that pins the acceptance list into the phase spec, the run configuration, the utterances, where dead air lands, and how the run is written up. `phase-5-heterogeneous-shapes.md` has **no acceptance section yet** — 5.7's grill adds it, as 4.8's did for Phase 4.

## What 5.7 must achieve (TODO line + phase decisions 12, 13, 15, 17, 20)

1. Temporal merge end to end over the **real roster live** — the first time a live model-authored merged view is rendered on the canvas (5.4's live smoke stopped at the validated document; 5.5's proof is the synthetic beat).
2. Comparison over the mocks still works (the regression bed; its fixtures were re-recorded model-authored in 5.5).
3. Drill-down → absent, and an in-fragment reorder → **no** re-synthesis, under predicate refs (5.10: one key-based ref form; re-synthesis fires on absence only).
4. Re-synthesis handed its previous output (decision 13).
5. Decline (decision 17) — a plan that reserved the view and sources with nothing to join.
6. Quiescence with real latency spread over three live vendors (decision 12).
7. Dead air measured and appended to the backlog item (decision 15; 4.8's figures are there as the precedent format).
8. Live tunnel verification, never localhost.
9. Two inherited findings, already on the TODO line:
   - **A client-level test that a dropped key degrades gracefully end to end.** 5.10 removed the `INDEXED_*`/`REPOINTED_*` fixtures with the mechanism they exercised, so that case is covered at the evaluator only.
   - **The shared axis sorts as strings.** gmail paints `2026-09-05 01:24 UTC`, github `2026-09-05T00:03:52Z`; a same-day github entry orders after every gmail one whatever its time (found in 5.11). Visible today in the shell-catalog fixture's timeline section. Disposition is 5.7's — decision 19 (no new operators) was re-closed in 5.11, so an operator is not the default answer.

## What landed since the phase handoff was written

- **5.6** recorded the "today" turn per vendor in live mode; the deterministic bed now answers it from all three agents, so the vendor half runs without MCP or model quota (`--mode deterministic`); the Synthesizer still calls its model. The Planner reached for the merged view unprompted on the plain utterance **"What needs my attention today?"**. Details and the four verbatim requests: `_dev/docs/handoff/task-5.6.md`.
- **5.10** collapsed refs to one key-based form with compound keys (github needs `repository` **and** `number`), removed index refs from the contract (rejected by name), removed the generation baseline and the `stale` cell state; contract v0.4. Spec: `task-5.10-key-based-refs.md`.
- **5.11** rewrote `TODAY_TIMELINE` over the recorded shapes. Calendar's un-dated wall-clock time — 5.6's blocker — is **discharged**: a source that cannot share the axis gets its own region, its time shown as a label, one sort declaration over the ordered array only; the rule is in `packages/sdk/docs/composition.md` under Sorts. Spec: `task-5.11-worked-examples.md`.
- **5.9** (this session) mapped the shell catalog onto Radix Themes. What 5.7 sees on the canvas is new rendering: the merged view, `DerivedValue`, `SortControl`, `Slot` and `Attribution` all draw on Radix; `--a2ui-*` token bindings are gone from the shell and the client's boundary chrome reads Radix variables directly. Design record: `_dev/docs/design/shell-catalog.md`. The fixture (`pnpm --filter @a2uiverse/shell-catalog dev`, tunnel port 5174) shows the 5.11 timeline rendered as one merged view with a live sort — a preview of what the canvas should show.

## Things 5.9 leaves for 5.7 to check live

- **The Playwright e2e specs were not run in 5.9** (they are not in `pnpm verify`). `apps/client/e2e/composition.spec.ts` now asserts the dark-mode palette on `--color-panel-solid` instead of `--a2ui-color-surface`; run `pnpm --filter @a2uiverse/client test:e2e` before the browser pass and expect that spec to need a look if the palette read comes back empty.
- The phase handoff's open thread stands: **the e2e specs carry no synthesis case.** 5.7 is the place to add one if the run's shape settles.
- Body `Text` renders markdown only when the client installs a renderer in `@a2ui/react`'s `MarkdownContext`; the client installs none today, so `Text` is plain. Whether to install one is a client question left to 5.7 (task-5.9 decision 4).
- Rendering details that may show up on the canvas: `Divider axis=vertical` needs a `Row` to stretch in; Radix `Slider` cannot name its thumb, so the label sits beside it.

## Open threads carried from earlier handoffs

- Dead air is unmeasured under the text loop with the real roster; the one live discovery run in 5.6 recorded `deadAirMs` 14957 with one attempt. A retry doubles it.
- `Synthesizer` retries once on any checklist failure; the journal's `attempts` shows how often the real model needs it.
- 4.8 observed but did not reproduce: a canvas action reaching a vendor and being answered while the orchestrator never closed the turn. Watch for it in the live pass.
- Phase 9 carries "acting inside a parked composition forks a turn whose answer lands nowhere" — not 5.7's, but it is easy to trip over during the run.

## Run setup

- Live roster: `pnpm dev:all --agents-dir ../a2uiverse-apps --mode live`; deterministic bed: `--mode deterministic`; mock profile per `_dev/docs/tunnel-environment.md`.
- Browser through the tunnel: client `https://vnw20xbg-5173.asse.devtunnels.ms`, orchestrator advertised at `https://vnw20xbg-10001.asse.devtunnels.ms` (`BASE_URL`), client `.env.local` `VITE_ORCHESTRATOR_URL` set to it. Ports must be forwarded and Public at the start of the session.
- Port 5173 stuck ⇒ `lsof -nP -iTCP:5173 -sTCP:LISTEN`.
- The journal (`.state/`) is where `synthesis.deadAirMs`, `attempts`, the note and the plan's requests are read from.

## Suggested first step

`/pick-up-task 5.7` → grill (`grill-me` → `grill-to-spec`) to write `task-5.7-integration-acceptance.md` and the phase-5 acceptance section, pinning: the utterances, gate vs. live pass configuration (4.8 decision 1's shape), the disposition on the string-sorted axis, the dropped-key client test, and whether a synthesis e2e case is in scope.
