# Handoff — 12.13, integration + acceptance

Spec: `_dev/docs/spec/task-12.13-integration-acceptance.md` — 18 grill decisions, then the sitting's fixes as decisions 19–25. Read it first.

## Where it stands

- **Before the run — done.** The journal's `escalationRequested` / `notNow` sign-in records (`09595f0`); `pnpm sweep:secrets` and its test (`aa42a66`); the regression pass before: `pnpm verify` green, Playwright replay 74/74 no diff, the live sign-in test 1/1.
- **Deterministic half — first pass done** (decision 25: it counts as the run). Ten cases driven in the reader's Chrome through the tunnel; fixes 19–24 landed and committed (both repos), `pnpm verify` green after them; the secret sweep clean (0 of 11 secrets in 12 files).
- **Agents' original sign-in stores** sit beside each live one as `<app>/agent/.state/sign-in.json.pre-12.13` in `a2uiverse-apps` (github, gmail, calendar, circleci, linear). Put them back at the end of the sitting (decision 7), after the live half.
- `a2uiverse-apps` is 2 commits ahead of origin (`2f84b19`, `f607931`); pushed once at the end (decision 4).

## Next — start here: decision 25's reruns on a fresh stack

Stack: a fresh `STATE_DIR` holding only the embedding model cache (copy `apps/orchestrator/.state/models`), agent stores emptied (`rm <app>/agent/.state/sign-in.json`, never the `.pre-12.13` files), `A2UIVERSE_PUBLIC_URL='https://vnw20xbg-{port}.asse.devtunnels.ms'`, `BASE_URL=https://vnw20xbg-10001…`; orchestrator first, then `pnpm dev:agents --mode deterministic`, client dev on 5173. The old env file is at `~/a2uiverse-12.13-evidence/env-det.sh` (its paths point at the last session's scratchpad — repoint them).

Reruns, the reader driving or watching:
1. Case 2's focus: Sign in on a tile, click back to the canvas with the window open → the tile goes back.
2. Decisions 19/20: open a thread in Gmail → chip and card, the fragment not moving; Not now → the chip goes.
3. Decision 21: "Add another Gmail account" → press → "Gmail signing in" at once → "Added … to Gmail."
4. Decisions 22/23 with the shops: `pnpm dev:agents --tier mocks --mode deterministic --no-install`, pack each shop (`node ../../../a2uiverse/packages/stellify/dist/cli.js pack` in `mocks/<shop>/<shop>-catalog`), `registry install shop-a|shop-b …` by hand (the default launch uninstalls them — install after it). "Compare camera prices across both shops" → Shop B's key page: spacing, "Open Shop B's help page"; the reader pastes the demo key (`mocks/shop-b/agent/README.md`) — Claude may not type it on a tunnel page.
5. Decision 23's fallback: orchestrator restarted with `A2UIVERSE_FAULTS='{"github":{"fault":"credential","every":true}}'` → GitHub's tile with "Continue on GitHub"; restart without the fault after. Start the orchestrator only once every agent answers — a card unreachable at boot leaves its app unroutable for the run.
6. Decision 24 + refresh: kill the launcher's Linear (port 11005), `rm linear/agent/.state/sign-in.json`, run it by hand: `.venv/bin/python3 -m app --mode deterministic --host localhost --port 11005 --public-url https://vnw20xbg-11005.asse.devtunnels.ms --access-token-lifetime 90`; a Linear question → "Your Linear sign-in has run out" → Sign in again → chooser → "Signed in to Linear as me@example.com."; >30 s later another Linear question → journal `refreshed`, nothing on screen.
7. `pnpm sweep:secrets --state-dir $STATE_DIR --logs $LOGS` over the half.

Then the live half (spec decisions 12–16, Q2's hand-carried localhost returns, CircleCI on port 11004), then the regression pass after, the tunnel-doc line, the write-up (decision 18), the stores put back, `a2uiverse-apps` pushed.

## Evidence of the first pass

Copied to `~/a2uiverse-12.13-evidence/`: the dry run's `intent-journal.jsonl` and every process log, the throwaway `http` basic card server (`basic-card/server.mjs`, decision 10), the regression logs before (`verify-before.log`, `e2e-before.log`, `e2e-live-before.log`) and `verify-mid.log`. Per case:
- 1 — three full tiles, journal `dispatch: []`, synthesis `{outcome: home, collapse: home}`.
- 2 — waiting tile, Cancel; sign-in finished in the window left open after Cancel resumed the slot; Linear signed in → merge back, column "CI · not signed in".
- 3 — Gmail and Calendar full tiles; the third question: both quiet lines; Calendar from the quiet line; back on canvas 2 its tile loaded with no window; after reload CircleCI's full tile.
- 4 — chip "Read your email"; Not now (journal `notNow`); Allow → window closed itself (bound to the account) → the thread opened; journal `escalationRequested` valid, `signedIn` purpose escalation.
- 5 — add-account → `personal`, "Added you.personal@example.net to Gmail."; both accounts labelled and merged (Account column); "my personal email" → that account alone; a command → the account choice → the slot became `personal`'s; `you` again → "already added".
- 6 — plan's dispatch: refused ("painted a credential input: TextField, matching \"obscured\""), repaired; every dispatch: the fallback tile (then without "Continue on GitHub" — fixed by 23).
- 7 — `refreshFailed`, "Sign in again" dead end (fixed by 24), then `signedIn` again `rebound: true`, `refreshed`.
- 8 — install-over kept both Gmail accounts; uninstall → `revoked` ×2, agent `POST /oauth/revoke` ×2; reinstall → full tile.
- 9 — Shop B's tile without scopes, the key page (no help link then — fixed by 23); key not entered.
- 10 — "Signing in to Harbor Tides isn't supported here.", Manage apps → App Library placeholder, the agent never called, the app stayed installed.

## Findings so far (for the write-up)

- The tunnel left a sign-in window's first request unanswered twice (blank window); closing it and pressing again worked.
- Claude-in-Chrome clicks into a background window sometimes did not register; the chooser was pressed by script. Tooling, not the app.
- Reference differences left for the reader: the home-collapse line's wording ("The merged view needs Linear issues…" vs the frame's), no lock icon on the reserved column's header, the Planner-written add-account button without the "opens … in a new window" note.
- Merged-table times render in the browser's zone (8:41 AM vs the fragment's 12:41 UTC) — not Phase 12.
