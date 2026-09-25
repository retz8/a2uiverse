# Handoff — task 9.9, integration + acceptance

`[WIP]`, mid-tour: cases 1–5 of 7 run, reviewed and closed; cases 6–7, the regression pass, the two live cases, the baselines and the write-up remain. Worked directly on `main`, no worktree; commits `30a4dd2` (spec) … `d23767b`, none pushed. Gate at the last commit: `pnpm verify` 15 of 15 (50 lint warnings, none new).

Spec, with decisions 13–23 and the found-and-fixed list already written in: `_dev/docs/spec/task-9.9-integration-acceptance.md`. Phase decisions 3, 7, 8, 13 and 16 and SPEC §4.3, §5.4, §6.4, §6.5 are amended to match.

## Cases run (deterministic roster, through the tunnel)

- **1 — a tab finishing in the background** (CircleCI delay 20 s, soft deadline 60 s). The entity join's merge released `settled` at 01:17:36 UTC, after the second question at 01:17:28; one automatic synthesis per canvas; the second canvas planned with the first as parent.
- **2 — an action and a press in a past canvas** (Gmail `fail`). The Calendar event and Gmail's Retry landed in the parked canvas, journaled on it (`walk`, `retry`), no new trail entry. Case 2 raised decisions 14–20.
- **3 — "Ask this again now" and a question asked from a view.** Both children of the first canvas (`faf8a503`): the ask-again at 03:11:14, "Only the calendar part" at 03:11:51 painting Calendar alone, no merge. Raised decisions 21, 22.
- **4 — add/drop and "compare these".** All three planned from the side-by-side canvas (`117945e3`): Gmail+Calendar+GitHub; Calendar alone; a merge over Gmail and Calendar (`settled`, one call). Side by side made no call.
- **5 — a step back with the wiring restored.** CircleCI's Back at 03:32:34: `seen: true, walk: silent`, no attempts. Raised decision 23; after it, the run showed at 2.3 s and the re-synthesis landed at 12.1 s (it had been 27 s for both).

## Next

1. **Case 6** — beat 24, no faults: the entity join; a CircleCI run opened, then a Linear issue opened; Back on CircleCI → a combination never merged (nothing covers it) → the walk and one call, the merge line working until the step's stream ends.
2. **Case 7** — beat 25: the temporal merge ("What needs my attention today?") with `A2UIVERSE_FAULTS='{"github":{"fault":"delay","seconds":30}}'`; close the canvas from the trail while GitHub loads; the journal line `closed`, GitHub's dispatch cancelled.
3. **Regression pass** (decision 6), no faults: the entity join, the temporal merge, a single-agent turn, the platform question, the mock storefronts composing (`--agents-dir ../a2uiverse-apps/mocks`); then a fast failure and Retry on the live canvas.
4. **Two live cases** (decision 1), vendors in live mode: the step back over a live CircleCI drill-down; closing a loading canvas with the vendor's log showing `tasks/cancel`.
5. **Baselines** (decision 8): `durable.spec.ts` has 9 local baselines written provisionally at the gate — retake them and every other spec once, after the design changes; each diff named. Expect diffs from decisions 14, 15, 18, 20 and 23 (colors, arrows, sidebar, no strip, the Ask pill lowered).
6. **Write-up** (decision 12): evidence per case into the spec, the per-canvas synthesis table (decision 5), findings not fixed; the TODO's 9.9 line rewritten to the scope; 9.10's line gains decisions 13–23 and the found-and-fixed items for the design records.

## Findings so far, not fixed

- The tunnel still loses a request now and then (8.7's finding): an action on case 2 never reached the orchestrator ("That action failed. The orchestrator did not answer."); actions have no resend, questions do.
- The browser automation loses the first question typed after a fresh page load (7.9's note on its input delivery); asking again works.
- The deterministic Calendar agent opens the same event whichever card is clicked — its fixture set; agents stay unmodified.
- While a drill-down loads, the progress line reads the action's raw words ("open event 10fs9gng… — generating…") — mentioned on case 2, not yet decided.
- "compare these" over an inbox and a calendar made two stacked tables — the user chose to leave it.

## Running the bed

`_dev/docs/tunnel-environment.md`. This session ran three processes instead of `dev:all`, so only the orchestrator restarts per case: `pnpm dev:agents --agents-dir ../a2uiverse-apps --mode deterministic`; `pnpm --filter @a2uiverse/client dev`; `A2UIVERSE_AGENTS_DIR=<abs path to a2uiverse-apps> A2UIVERSE_FAULTS='…' pnpm --filter @a2uiverse/orchestrator dev`. Each case's faults and deadlines are beats 19–25 in `apps/client/scripts/lib/beats.ts`. Ports 5173 and 10001 forwarded Public; a stale shell-catalog fixture once held 5174. The per-canvas table was a scratch script over `apps/orchestrator/.state/intent-journal.jsonl`: lines since a time, grouped by `clientContextId`, with `descriptor`, `plan.parent`, `synthesis.release.by`, the attempt count and `step`.
