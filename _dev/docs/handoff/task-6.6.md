# Handoff — task 6.6, integration + acceptance

Done on `main` (`b50e97f` code, `247c14e` and `5116675` the two Planner-rule fixes, the rest write-up), `pnpm verify` green, all Playwright specs green. Spec and the run's record: `_dev/docs/spec/task-6.6-integration-acceptance.md` — "Found and fixed during the run", "Evidence", "Findings, not fixed", "Streaming decision". Run live on 2026-09-13 through the tunnel and the recorder.

## For 6.7 (design records)

- Orchestrator record: `PlanRecord.planMs` on the journal (utterance received to the tree accepted, the shortlist included) and the executor's per-turn `plan … ms` log line; the Planner's rules doc now carries the no-heading-over-slots rule and the reader-you-called-is-a-reader-you-write-from rule, and the fan-out worked example has no heading.
- Client record: the recorder's layout and first-fragment offsets in `record-beats.ts`; beats 4 (side by side), 5 (re-recorded, no heading) and 8 (mixed utterance) and their replay specs in `canvas-surface.spec.ts`.
- Nothing in the shell-catalog record changed in 6.6.

## Open, in the backlog

- Streaming the Planner's output, with 6.6's numbers.
- The Synthesizer's effort, low today; the view that thinking would pay there.
- The shell-action report through the tunnel: delayed or lost on three of four presses; appended to the "Failed to fetch" item.
