# Handoff — task 7.9, integration + acceptance

`[WIP]`, held open: every acceptance item passes and the run is written up, but the user has more for this task before it closes. Worked directly on `main`, no worktree; commits `1c3d824` … the wrap-up commit, none pushed. Gates at the last run: `pnpm verify` 15 of 15, Playwright 38 of 38.

Spec, with the whole run written into it — decisions, what was found and fixed, evidence per acceptance item, findings not fixed: `_dev/docs/spec/task-7.9-integration-acceptance.md`.

## Where it stands

- **Three tunnel passes run**: the mocks deterministic, the real roster deterministic (three landings in a row), the real roster live (landed; four rows, the new Linear issue A2U-8 on pull request #8 and its failing run). Every item of phase decision 13 passes or rests on named tests; item 4, appear, holds live since the fix below, seen on a second authorized rerun.
- **Spec decisions changed by the grill**: an absent cell is not a button; the broken state and a list inside a row live on the synthetic `join` beat; vanish gains the home source; pull request #8 has a Linear issue (A2U-8, "Fixes A2U-8" in #8's description).
- **Fixed during the run**, each with tests:
  - the orchestrator's partitions keep one surface per source — a live drill-down fired no re-synthesis before;
  - a source the view reads nothing from fires a re-synthesis when it paints again (`repainted` in the change account; SPEC §6.3, §10) — what made item 4 hold live;
  - app names in the join's detail read off the mounted shell paint;
  - the client's first-event timeout, 10 s, with one retry under the same message id, and the orchestrator refusing an id it has taken in — for the requests the tunnel loses (A2U-7);
  - a source selector's value drawn by the app's name;
  - the Planner's rules doc says the home source is one agent — a live landing had made rows of pull requests with no issue;
  - the orchestrator's turn tests fake every hardcoded registry entry; 30 s test limit;
  - four visual baselines retaken after macOS 27.
- **Beat 9**, the entity-join turn, recorded over the live roster, with its replay smoke; dead air in the backlog's streaming item.
- **The ring**: the user looked; 1.5 s stays.

## Open threads

- **The user's further items for 7.9** — not yet stated; the next session starts there.
- The client's retry has not fired in a live sitting: no request hung after it landed. The tunnel's loss is traced to before the orchestrator; a hang in a later sitting shows as a `[A2UI:a2a] no answer …` warning and a second send.
- Not fixed, by the spec: the live GitHub pull request detail binds no data (the §4.4 fallback). The browser automation loses typed text into the palette on some loads — its own input delivery, 80 of 80 in a visible page; click the input before typing.
- Beat 9 was recorded before the last fixes; the vendor requests did not change, so it was not re-recorded. Its merged view has four rows under the then-brief.
- Live side effects left standing: A2U-8 in Linear, In Progress; #8's description edited; two real reruns on #8's CircleCI run, four `verify` attempts on it.

## For 7.10

The TODO's 7.10 line lists what the design records gain from this task: the absent cell, one surface per source, the repainted surface, the refused repeat message id, app names off the mounted shell paint, the first-event timeout and retry, the cell that names an app.

## Running the beds

`_dev/docs/tunnel-environment.md`. `pnpm dev:all --agents-dir ../a2uiverse-apps/mocks`, `… --agents-dir ../a2uiverse-apps --mode deterministic`, `A2UI_RECORD_DIR=<scratch> … --mode live`. Port 10001 must be forwarded Public. `pnpm dev:all` leaves its children running when its launcher is killed — free ports 5173, 5174, 10001 and 11001–11005 before the next bed.
