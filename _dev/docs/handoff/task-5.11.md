# Handoff — task 5.11, the Synthesizer's worked examples

Spec: `_dev/docs/spec/task-5.11-worked-examples.md`. Grilled and spec'd; **no code written**. Execute in a fresh session, directly on `main` — no worktree, no branch.

## Where it stands

- `5.11` is `[WIP]` in `_dev/TODO.md`. Nothing in the working tree; both repos clean.
- Everything it depends on has landed: **5.6** (the recorded shapes) and **5.10** (one key-based ref form) are `[x]` and committed.
- `5.9` is the only other open sub-task before `5.7`.

## What to do

Rewrite the S1 worked example in `packages/sdk/js/src/prompt/examples.ts` over the shapes task 5.6 actually recorded, and add the rule it illustrates to `packages/sdk/docs/composition.md` under `## Sorts`. The spec holds the seven locked decisions; the two that shape everything else:

- **Examples teach form; the doc teaches vocabulary and rules.** Anything that generalizes goes into prose, not into another example. Two examples total — do not add a third.
- **A source that cannot share the axis gets its own region**, its time shown as a label rather than a sort key, with one sort declaration over the ordered array only.

`CAMERA_COMPARISON` is not touched — shape or data. It is the client's synthesis fixture and the mocks' regression shape.

## The shapes to write against

From the committed corpora in `../a2uiverse-apps/*/agent/app/fixtures/deterministic/`:

| source | array | time | identifier |
|---|---|---|---|
| gmail | `threads` | `time: "2026-09-05 01:24 UTC"` | `id` (16 hex chars) |
| calendar | `waiting`, `clashes` | `when: "11:00"`, `"11:00 – 12:00"` | `id` (26 chars) |
| github | `prs` | `updatedAt: "2025-08-10T09:25:10Z"` | `number` + `repository`, no single id |

Calendar is the source that cannot join the axis. GitHub's identifier is why the example carries a compound key — its recorded model has no single id, so a compound predicate is the honest ref, not a contrivance.

The example's `request` is the real Planner request, recorded in `_dev/docs/handoff/task-5.6.md`, not an invented one.

## Blast radius

`packages/sdk/js/src/prompt/examples.ts` · `packages/sdk/docs/composition.md` · `packages/sdk/js/src/prompt/prompt.test.ts` (its assertions name `TODAY_TIMELINE`'s sort key and source count). The orchestrator's `test.each(SYNTHESIS_EXAMPLES)` validates the rewritten example against the shell catalog automatically — nothing to add there.

Gate: `pnpm verify` at the platform root.

## The thing the gate cannot tell you

`pnpm verify` proves the example validates. A bad example validates too. What it cannot check is whether the example teaches the form without inviting imitation — so keep the data at two entries per source, drop filler prose, and keep the tree near-minimal. The second region adds one group, not a demonstration of the catalog.

## Open thread

Whether the composition doc's vocabulary coverage is adequate more broadly is **not** this task's. The same instinct is recorded against the `packages/sdk` README rewrite on 5.8.
