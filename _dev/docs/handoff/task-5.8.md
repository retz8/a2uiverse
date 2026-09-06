# Handoff — task 5.8, design records + sdk README

Not started. Picked for the next session; **no task spec yet, no edits made**. 5.7 is `[x]` and committed; `pnpm verify` green; the tree clean. Phase 5 has 5.8 as its last open sub-task — finishing it closes the phase.

## What 5.8 is (TODO line)

- `_dev/docs/design/synthesis.md` **rewritten** to the Phase 5 design — the synthesize data model as the Synthesizer authors it and the client evaluates it. It still describes the Phase 4 wiring in places.
- The **Synthesizer sections** of `_dev/docs/design/orchestrator.md` and `_dev/docs/design/client.md` rewritten to match.
- `packages/sdk/README.md` **rewritten**: what the sdk exposes, stated plainly, readable without prior knowledge of the synthesize data model. It still says contract v0.3 and reads as a changelog of halves. (5.11 left the thought that the composition doc's vocabulary coverage belongs here too.)
- `_dev/docs/design/shell-catalog.md` is current as of 5.7 (Table/DataList and `datetime` rows added during the run) — check, don't rewrite.

Precedent for a design record's shape: `_dev/docs/design/shell-catalog.md` (task 5.9) — each component as a class with responsibility, public surface, private state, collaborators, plus the flows. Concise; states what is; no history.

## Everything 5.7 changed that the records must reflect

Design, in the order the data flows:

1. **Planner** (`apps/orchestrator/src/planner/prompt.ts`): asks each vendor in prose for "the full date and time" of each entry when a merge is planned. Still asks for data, never a format.
2. **Composition contract** (`packages/sdk/contracts`, `packages/sdk/js/src/validate.ts`): two new validator rules — one sort declaration per array path; every option key a formula with at least one ref in every element (a ref-less key is absent by construction, so the element does not belong in a sorted array). Contract version unchanged (v0.4).
3. **Composition doc** (`packages/sdk/docs/composition.md`, embedded into the prompt): every array the tree lists declares its sort, the one undeclared array being the one no key can order; a source that answered with entries belongs in the view, in its own group when it cannot share the axis, never in the note alone; the runtime reads any year-and-clock value as an instant, so the model never converts a time and gives its cell the `datetime` format; the `source` operator names an entry's source.
4. **Shell catalog** (`packages/shell-catalog`):
   - `source` operator (`src/functions/operators.ts`, `catalog.json`): index 0 of the surviving inputs; the client's evaluator maps it to the app id like `argmin`.
   - `Table`/`TableRow` and `DataList`/`DataListItem` (`src/components/table`, `src/components/data-list`), on Radix `Table` and `DataList`; a row or item outside its parent draws as a flex row (React context). Guidance doc (`docs/guidance.md`) rebuilt around them; the old "header Row over a Column of Rows" idiom is gone.
   - `DerivedValue` `format: {kind: 'datetime'}` renders through `src/components/shared/instant.ts`: `parseInstant` (any value with a four-digit year and a clock; named shapes read directly; a vendor's prose spelling normalised; a range read as its start; a named IANA zone honoured; a zone-less wall time read in the display zone) and `formatInstant` (fixed `en-US`, `America/New_York`). Exported from the package index; the client's evaluator sorts by the same `parseInstant`.
5. **sdk worked examples** (`packages/sdk/js/src/prompt/examples.ts`): both on `Table`; `TODAY_TIMELINE` carries a `source` column and `datetime` on `when`.
6. **Client** (`apps/client`):
   - `bindingEvaluator.ts`: `compareValues` — numbers numerically, two instants by `parseInstant`, strings by locale, a mixed pair by string; `INDEX_OPERATORS` includes `source`.
   - `tests/canvas-synthesis.test.tsx`: the dropped-key case end to end. `e2e/synthesis.spec.ts`: the merged view as shell content. `e2e/canvas-surface.spec.ts`: beat 5 replay smoke.
   - `scripts/lib/batch.ts`: the recorder keeps the synthesis payload beside the stamp; beat 5 in `scripts/lib/beats.ts` and the README's beat table.
7. **Orchestrator** (`apps/orchestrator/src/log.ts`, `executor.ts`, `agentsPool/agentsPool.ts`): one log line per inbound request (kind, task, context, bytes), per relay start, per relay settle (outcome, ms), per turn close.
8. **Platform**: `turbo.json` passes `A2UIVERSE_*` through to the `dev` task (the launcher's agents dir never reached the orchestrator before).

SPEC: §14 rows "Time is read by the runtime" and the selectors named in the functions row; §5.4/§16 unchanged in wording and now honoured. Phase spec: decision 19 amended (the `source` operator on the evidence it asked for); decision 25 is the acceptance section. Task spec: decision 7 amended twice (named shapes → the runtime reads time; then the fixed form and zone rule).

## Findings 5.8 should not lose (all recorded in the 5.7 spec and the backlog)

- The Synthesizer's judgment of which sources share a key varies run to run (it once split GitHub off on a false claim); the rule is stated, the reading of data is not enforceable.
- The Planner reads its plan's `direction` as the slots' axis; the runtime lays groups along it. Backlog, Phase 6.
- A canvas action on the live composed screen once failed with "Failed to fetch", reaching nothing; the hub's log lines exist so the next one is diagnosable. Backlog.
- The renderer stalled for screenshots after several merged-view paints over the tunnel; the page always recovered.
- Dead-air figures are on the backlog item.

## Run notes

- The platform may still be running from the 5.7 session (`pnpm dev:all --agents-dir ../a2uiverse-apps --mode live`, with `A2UI_RECORD_DIR` set); `_dev/docs/tunnel-environment.md` has the commands for both beds. Nothing in 5.8 needs it.
- A fresh Vite dev page over the tunnel sometimes swallows the first typed utterance and sometimes shows blank for a minute after a catalog rebuild; a second visit loads.

## Suggested first step

`/pick-up-task 5.8` → a short grill (`grill-me` → `grill-to-spec`) for `task-5.8-design-records.md`: which records, at what depth, and what the sdk README's audience is — then write directly on `main`, no worktree.
