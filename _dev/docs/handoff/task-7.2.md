# Handoff — task 7.2, the CircleCI app

Done. Apps `be69407` (the app), platform `dcc5c6f` (the wiring), `6b59996` (the pipeline on `a2uiverse`), spec `1932783`; `pnpm verify` green in both repos. Task spec: `_dev/docs/spec/task-7.2-circleci-app.md`.

## The canvas pass

Run live on 2026-09-18 through the tunnel with Claude-in-Chrome, `pnpm dev:all --agents-dir ../a2uiverse-apps --only circleci --mode live`.

- **"How are my CircleCI builds doing?"** — routed to CircleCI, 38 s. One card, "Recent pipelines" on `a2uiverse`: each run its status pill, branch, time, commit's first line, short hash and author, its workflow nested under it with its own pill.
- **The failed run on `ci/failing-format-demo`** — 23 s. `verify` Failed; `lint-format` Failed 41 s, `build-typecheck-test` Success 2 m 13 s; Rerun from failed and Rerun from start.
- **The failed `lint-format` job** — 14 s. The "Format check" step, exited with code 1, the log's last lines (`prettier --check .` warning on `scripts/ci-format-demo.mjs`).
- **Rerun from failed** — 18 s. The proposal names project, branch, workflow and "only the failed jobs and what depends on them"; no write tool called until the confirm.
- **Confirmed** — 29 s. `rerun_workflow` with `from_failed: true`; the run repainted with a new `verify` attempt, Running, above the earlier Failed attempt, inside the same run (task spec decision 4).

Not run: the same pass in `--mode deterministic` — the orchestrator's Gemini prepaid credits ran out.

## Findings, not fixed

- A failed utterance leaves the canvas idle with no word: the palette closes and nothing paints; the failure is in the orchestrator's log alone.
- The status line on the confirm reads the raw workflow id: "confirm rerun 131ad9a2-a72b-4f40-abe4-81e080cf16f7 — generating…".
- In the run detail, job names are centred while workflow names sit left.

## Open threads

- The failed run on `ci/failing-format-demo` now carries a second `verify` attempt, this pass's rerun. The branch is deleted; re-recording the failed-job beat needs a fresh failing push.
