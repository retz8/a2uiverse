# Task 16.11 — handoff

Spec: `_dev/docs/spec/task-16.11-integration-acceptance.md` (decisions 1–24 from the grill; 25–29 added in the sitting).

## Where it stands

- **Regression pass before:** green, gates run uncached. Platform `pnpm verify` 22/22 (sdk 301, Stellify 112, shell catalog 520, client 884, orchestrator 683, marketplace 80, embedder 13, scripts 68); `a2uiverse-apps` 31/31 at `7a6d88d`; replay 134; live suite 7; Python: kit 351, GitHub 143, Gmail 130, Calendar 122, CircleCI 82, Linear 77, Shop A 98, Shop B 99.
- **Case 1, the temporal merge with Calendar's loop** — done, every agent `live`. Calendar offered, installed in its slot, signed in, taken into the timeline; stand-ins quiet; Gmail's scope escalation live. Points fixed: decision 25 (the way back brings back a merge the Synthesizer declined, orchestrator `7b78048`), decision 26 (GitHub's `PageLayout` by its fragment's width, GitHub catalog 0.2.1, `a2uiverse-apps` `ad7ea37`, republished, installed at the orchestrator's boot check), decision 28 (the way back restores the merged view's own tree, client `f12db77`, seen again).
- **Decision 27:** every case after case 1 on the deterministic roster — the Gemini key is one key across the orchestrator and all seven agents, and its prepaid credit ran out mid-case-1 (topped up since).
- **Case 2, the camera comparison with Shop B's loop** — done. Shop B installed, key connected, merge took it in; Store listing's live preview; shop presses. Chip check: decision 29 (two live tries painted no chip set; held by the client's renderer test).
- **Case 3, the entity join** — done on the deterministic set: join landed, a merged cell navigated, Linear's and CircleCI's presses and back arrows restored with no call.
- **Not seen again live:** point 1 (no walk declined; held by its orchestrator test), point 2 (no deterministic flow paints a GitHub pull request; seen by injecting the sheet on the live PR in case 1, and the shipped 0.2.1 build confirmed carrying the container query). The user accepted both.

## Next

The sitting resumes at decision 23's step 7, **the dark walk**, then Linear's newer build, Shop A's chain with the refused paint, CircleCI's chain, the old-interface pack, Shop B's no-update line, the forced retries, the stack down and state left, the regression pass after, the closing launch, the write-up. Brief each case first; the reader gives feedback after each.

## Running state

- Orchestrator state: `.state/sitting-16.11/orchestrator` (registry, vault with the made-up deterministic accounts, journal). `STATE_DIR` set in the sitting's shells only.
- Stack: marketplace and orchestrator each their own process; client as a built preview on 5173 (dev server stalls in the tunnel); five vendors under `pnpm dev:agents --tier default,mocks --mode deterministic --no-install` with `A2UIVERSE_PUBLIC_URL` and `MODEL_NAME=gemini-3.8-flash`; the two shops started by hand in `deterministic` (the launcher's reconcile uninstalls every roster app a launch leaves out, so single apps are restarted by hand). Processes may not survive the session; restart the same way.
- Publishing one app without the launcher's reconcile: a scratch script did Stellify pack → preview from a deterministic copy (sign-in apps) → publish against the running agent's card, reusing `scripts/launch-preview.mjs` and `scripts/launch-marketplace.mjs`. Recreate it for the chains.
- The old Shop B pack (decision 18) was made in a scratch checkout now removed: remake it from `a2uiverse-apps` `1f87a91` with the Stellify it pins.
- Every agent's local `agent/.env` pins `MODEL_NAME=gemini-3.7-flash`; the sitting overrides it in the launcher's shell.

## Findings so far (for the write-up)

- One Gemini key shared by the orchestrator and all seven agents; its prepaid credit ran out mid-sitting.
- The deterministic GitHub answers an open on its "My Open Pull Requests" list with no visible change; no deterministic flow paints a pull request detail.
- The deterministic shops open a camera by updating the same surface, so they have no way back by arrow (SPEC §6.5's fallback); their own "Back to the list" serves.
- Each tunnel port is its own site for Claude in Chrome, and a sign-in window stops until it is allowed.
