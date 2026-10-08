# Handoff — 12.13, integration + acceptance

Spec: `_dev/docs/spec/task-12.13-integration-acceptance.md` — 18 grill decisions, then the sitting's fixes as decisions 19–32. Read it first.

## Where it stands

- **Before the run — done.** Journal records for an escalation request and Not now, `pnpm sweep:secrets`, the regression pass before (`verify-before.log`, `e2e-before.log`, `e2e-live-before.log`).
- **Deterministic half — done.** The first pass of the ten cases (decision 25 counts it as the run), then decision 25's reruns on a fresh stack: all passed, the reader checking the waiting tile in a real tab and connecting Shop B with the demo key. The reader's points became decisions 26–32, each committed on `main` with `pnpm verify` green:
  - 26 — a sign-in window open is said until it ends: the waiting form stays (no focus rule), Open the sign-in again and Cancel on a row under the waiting line.
  - 27 — add-account is the shell's tile: the Planner places `Slot {addAccount: <app>}` only; the painter fills name, accounts, scopes; the `addAccount` shell action is gone.
  - 28, 29 — the token page's Connect: `Referrer-Policy: same-origin` (no-referrer posted `Origin: null`), and the orchestrator's local origin admitted (the dev tunnel rewrites `Origin` to `http://localhost:10001`).
  - 30 — a pasted key or token says Connect (authority cause `connect`).
  - 31 — the end page names the app, says connected for a key, counts down 5 s with Close now.
  - 32 — the merged view says "not connected" (slot state `connect`).
- **Sweep over the deterministic half:** clean — 16 secrets, none in 31 files.
- The deterministic stack is stopped. The agents' original sign-in stores still sit beside the live ones as `<app>/agent/.state/sign-in.json.pre-12.13` in `a2uiverse-apps`; put back at the end of the sitting (decision 7).
- `a2uiverse-apps` is even with origin. `a2uiverse` `main` is 6 commits ahead of origin (`d2a3b03`…`e024388`).

## Next — start here: the live half (decisions 12–16)

Stack, in this order (the tunnel doc's commands, with these choices):
1. A second fresh state folder holding only the model cache: `mkdir -p <scratch>/run/state-live && cp -R apps/orchestrator/.state/models <scratch>/run/state-live/`. Env as `~/a2uiverse-12.13-evidence/env-det2.sh` with `STATE_DIR=$RUN/state-live`, `LOGS=$RUN/logs-live` (repoint `RUN` to the new session's scratchpad).
2. Empty the agents' stores: `rm <app>/agent/.state/sign-in.json` for github, gmail, calendar, circleci, linear — never the `.pre-12.13` files.
3. Orchestrator (`pnpm --filter @a2uiverse/orchestrator dev`, `BASE_URL` the 10001 tunnel URL), then `A2UIVERSE_PUBLIC_URL='https://vnw20xbg-{port}.asse.devtunnels.ms' pnpm dev:agents --mode live` (add `A2UI_RECORD_DIR=<scratch dir>` for the recording case).
4. Client: the dev server's modules stall in the tunnel — `pnpm --filter @a2uiverse/client build`, then `pnpm exec vite preview --port 5173 --strictPort` in `apps/client`.
5. In the browser, pass each tunnel host's interstitial once (5173, 10001, 11001–11005).

Cases (decision 14), the reader signing in to every vendor — Claude types no password or key:
1. GitHub — first sign-in from the tile through GitHub; one read painted live.
2. "What needs my attention today?" — Gmail and Calendar signed in with the test Google account; Calendar's write escalation adding an event; the demo calendar re-seeded; Linear signed in (the agent registers itself at Linear); the question again, merged over live data.
3. CircleCI — sign-in on port 11004 with its return carried by hand (decision 2: the agent's sign-in page and CircleCI's return each reopened in the sign-in window on the agent's tunnel address); projects via CircleCI's API with the account's token; the work-item join over live data.
4. GitHub's write escalation — an issue opened in a private scratch repository created for the run and kept; record whether it came from a press in the fragment or an utterance (decision 15).
5. One live recording of GitHub's beats through the kit's beat driver, its loopback return delivered on the Mac; into a scratch folder, nothing committed (decision 16).
6. `pnpm sweep:secrets --state-dir $STATE_DIR --logs $LOGS` over the live half.

Then: the agents' original stores put back; the regression pass after (`pnpm verify`, the Playwright replay — decisions 26–32 change the waiting tile, add-account and key wording, so expect diffs and retake the baselines naming what changed — and 12.12's live sign-in test); the tunnel doc's line on carrying a return by hand (decision 2) and on the tunnel rewriting `Origin` (decision 29); the write-up (decision 18); `a2uiverse-apps` pushed if it moved.

## Open threads (for the write-up)

- After a page reload, the first question typed in the ask box was lost several times (text cleared, Enter did nothing); a second try worked. Not investigated.
- Tooling, not the app: the Chrome driver cannot move OS window focus (focus checks were scripted, the reader checked by hand); clicks into a background window sometimes don't register (chooser pressed by script); the tunnel stalls requests ~10 s (blank sign-in windows, slow polls).
- Decisions 26–32 amend task-12.3 decision 4, task-12.8 decisions 1, 5, 6 and phase-12 decision 20 — the amendments are 12.14's.

## Evidence

`~/a2uiverse-12.13-evidence/`: the first pass (`deterministic-dryrun/`), the reruns (`reruns/` — journal, every process log, `NOTES.md` per step and per fix), the regression logs before, `env-det.sh` / `env-det2.sh`, the throwaway basic-auth card (`basic-card/`).
