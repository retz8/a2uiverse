# Task 12.13 — Integration + acceptance

Spec for sub-task 12.13 of Phase 12 (`_dev/docs/spec/phase-12-authority-surfaces.md`): the phase's acceptance run — the sign-in surfaces, the AuthVault, the credential bar and multi-account on the deterministic roster through the tunnel; real sign-in with each vendor and real write escalations in live mode; CircleCI's live sign-in and a live recording through the kit's beat driver, moved from 12.12; a regression pass before and after. SPEC §3, §8, §9.5, §10.

## Scope

- The two checks: the regression pass, and a live run through the tunnel — the deterministic half, then the live half.
- How the reader's feedback during the run is handled, and where the code is worked.
- The journal's sign-in records for an escalation request and for Not now.
- A sweep for the secrets a sitting created.
- The deterministic half: its starting state and its ten cases.
- The live half: its starting state, its accounts and its cases.
- CircleCI's live sign-in and a live recording through the kit's beat driver, their localhost return carried by hand.
- The screens against the UI reference canvas.
- The sitting's order and the record.

## Locked decisions

### 1. Two checks

`pnpm verify`, the client's Playwright replay suite against the baselines on disk, and 12.12's live sign-in test through the real popup are the regression pass. It runs before the live run — every failure and diff named, anything unexplained fixed before going on — and after it, the baselines retaken and what changed named. One live run through the tunnel, with the reader watching the screen: the deterministic half, then the live half.

### 2. The work at the Mac is done from the unit

CircleCI's live sign-in and the live recording through the kit's beat driver run from the reader's browser through the tunnel; each localhost return address that browser cannot reach is carried by hand. For CircleCI through the vault, the agent's sign-in page and CircleCI's return to the agent are each opened again in the sign-in window on the agent's tunnel address. For the beat driver, the return it waits for on a loopback address is delivered on the Mac. `_dev/docs/tunnel-environment.md` gains one line on carrying a return by hand.

### 3. Nothing is deferred

Every point the reader raises during the run is fixed on the spot, one at a time, agent-side included, seen on reload, and added to this spec as a numbered decision with what it replaced. A point asking for something a later phase builds — the App Library's sign-out per account, renaming, the permissions view, its "Add account"; the Store; the marketplace — is recorded as a finding for that phase.

### 4. Worked directly on `main`

The platform's code is worked on `main`, the agents' and the kit's on `a2uiverse-apps`' `main`; no worktree. Each fix is committed as it lands; `a2uiverse-apps` is pushed at the end.

### 5. The journal records an escalation request and Not now

Before the run, the journal gains a sign-in record for an escalation request — the source, the missing scope keys, valid or invalid — and one for Not now, as task-12.5 decision 11 lists them. That decision's "cancelled" outcome is dropped: task-12.8 decision 2 keeps Cancel in the client, so the orchestrator never learns of it.

### 6. A secret sweep

A committed, tested dev script collects every secret a sitting created — the vault file's tokens and keys, each agent's sign-in store, shop-b's demo key — and searches the journal and every process's captured output, reporting counts per file and never a secret. It runs after each half. What reaches the browser is not searched; that rests on the vault's own test.

### 7. The deterministic half's starting state

A fresh orchestrator state folder holding only the embedding model's cache, and each agent's sign-in store moved aside, so the vault and the agents start empty. The launcher installs the five apps in deterministic mode, their sign-in pages on tunnel addresses. The stores moved aside are put back at the end of the sitting; the existing orchestrator state folder is left as it is.

### 8. The deterministic half's cases

In this order:

1. **First paint, nobody signed in.** "What's the status of what I'm working on?" — Linear, GitHub and CircleCI each take the full tile and none is dispatched; the progress line names each as not signed in; the merge collapses to a line with no press, its home source needing sign-in.
2. **Sign in and resume.** GitHub: the waiting tile, Cancel, the tile back when the canvas regains focus, then signed in through the kit's account chooser on its tunnel address and painted in place. Linear signed in: the merge comes back, CircleCI's column reading "not signed in". CircleCI is left.
3. **The full tile once, then the quiet line.** "What needs my attention today?" — Gmail and Calendar take the full tile, GitHub and Linear paint; Gmail is signed in, Calendar left. A third question touching Calendar and CircleCI: both are the quiet line, and Calendar is signed in from it. Back on the second canvas, Calendar's tile loads on its press with no window. After a reload, CircleCI takes the full tile again.
4. **Escalation.** A thread opened in Gmail's fragment: the chip and its card asking "Read your email". Not now drops the press and the fragment stays; then Allow opens the window and the thread opens.
5. **Two Gmail accounts.** An utterance asking to add a Gmail account: the add-account press, the window, `personal` chosen, the progress line naming the account added. A question about mail: both accounts' fragments, each labelled, merged. An utterance naming the personal mail: that account alone. A command naming no account: the account choice. `you` added again: already added.
6. **The credential bar.** The orchestrator restarted with the credential fault on GitHub: on the plan's dispatch, the paint refused and repaired; on every dispatch, the fallback tile with Continue on GitHub.
7. **Refresh.** Decision 9.
8. **Install-over and uninstall.** Gmail installed over keeps both accounts; Gmail uninstalled, its accounts leave the vault and each is revoked at the agent; installed again, it takes the full tile.
9. **The token page.** The mock stores launched beside the roster and installed by hand; the camera comparison: Shop B's tile opens the orchestrator's token page, the demo key is entered, Shop B paints and merges with Shop A.
10. **Not supported here.** Decision 10.

### 9. Refresh by one restart of Linear

Linear's agent is restarted by hand on its port with its store emptied and a 90-second access token. Its next dispatch fails the vault's refresh and the slot asks to sign in again. Signed in again, a Linear question more than 30 seconds later is refreshed silently: the journal's refresh record, nothing on screen.

### 10. "Not supported here" from a throwaway card

A card served from the scratchpad and never committed, declaring `http` basic as its required sign-in, is installed by hand from its card URL. A question naming it takes the tile saying sign-in isn't supported here; Manage apps opens the App Library; the app stays installed. Then it is uninstalled.

### 11. The screens against the UI reference

Each case's screen is set beside its frame on the design canvas *Authority surfaces — UI reference* (https://claude.ai/artifact/VsSwaLrgPWJyBiL4zjkJAX). A difference is a point under decision 3; where a sub-task spec settled it otherwise, the spec stands and the difference is recorded.

### 12. The live half's starting state

A second fresh orchestrator state folder, the agents' stores emptied again, the agents in live mode. Every live sign-in is a first sign-in from the tile.

### 13. The live half's accounts

The dedicated test Google account for Gmail and Calendar; the reader's own GitHub and Linear; the test CircleCI account that follows the demo project. If the test account's inbox is too thin to merge, a few messages are sent to it during the run.

### 14. The live half's cases

In this order:

1. **GitHub.** Its first sign-in through the tile and GitHub's own sign-in; one read painted live.
2. **The attention merge.** "What needs my attention today?" — Gmail and Calendar each signed in to Google; Calendar's write escalation adding an event; the demo calendar re-seeded; Linear signed in, its agent registering itself at Linear; the question asked again over the seeded calendar, the merge over live data.
3. **CircleCI and the work-item join.** CircleCI signed in with its return carried by hand (decision 2), its projects found through CircleCI's API with the account's token; the join over live data.
4. **GitHub's write escalation.** Decision 15.
5. **The live recording.** Decision 16.
6. **The secret sweep** over the live half.

### 15. The live write escalations

Calendar's escalation, made to re-seed the demo calendar, is the vendor-side scope expansion at Google. GitHub's write is an issue opened through the canvas in a private scratch repository created for the run and kept: from a press in GitHub's fragment where the agent paints one, otherwise from an utterance; which path appeared is recorded.

### 16. One live recording, nothing derived

GitHub's beats are recorded live through the kit's beat driver, signed in through the browser with the loopback return carried by hand, into a scratch folder. Nothing is derived or committed.

### 17. The sitting's order

The journal records of decision 5 and the sweep of decision 6; the regression pass before; the deterministic half's start and its cases; its sweep; the live half's start and its cases; the agents' original stores put back; the regression pass after; the tunnel line of decision 2; the write-up.

### 18. The record

This spec is the record. Each on-the-spot fix is added as a numbered decision as it lands, with what it replaced. The write-up — before the run, the deterministic half, the live half — carries each case's evidence: the screen, the journal's lines, the reference frame compared; the sweeps' counts; the regression runs before and after; the findings for later phases. Every amendment to the phase spec, SPEC.md and earlier sub-task specs that 12.13 calls for is made by 12.14.

## Invariants

- A credential never reaches the client, the models, a partition, the journal or the logs.

### 19. Not now takes the chip away

Not now on Gmail's request for more access left the chip and its card on the row: the orchestrator dropped the request and repainted, but `Attribution` read the binder's resolved props, which upstream merges over the last repaint (`_dev/a2ui-findings.md` §9), so the dropped `escalation` stood once the press settled. `Attribution` reads its literal props from its own component model, as `Slot` does. Replaced: a request that stayed on the row after Not now or Allow.

### 20. The chip moves nothing

The chip, a button taller than the attribution marker's line, grew the row on arrival and moved the fragment down 8 px. Its overhang reaches into the gap above and below, so the row keeps its height when the request arrives. Replaced: a row that grew by the chip's height.

### 21. An add-account window is said at once

After the add-account press the canvas showed nothing until the sign-in ended and its line came — "Added … to Gmail." or "… was already added to Gmail." — so a reader could take the wait for a fault. While the window is open, the progress line shows a working step at once, in the waiting tile's words, "Gmail signing in" — "Signing in" until the orchestrator has answered for the attempt, which now names the app on every answer — replaced by the account's line when the sign-in ends. The canvas getting the focus back, or a sign-in ending without an account, takes the step away, as for the tile. The button stays as it is. Replaced: task-12.8 decision 6's button left as it is with nothing said until the outcome.

### 22. The key page spaces its field and its button

On the token page, "Paste your key" sat flush against Connect: the card spaces its own children, but the field and the button live in its form, which had no layout of its own. The form takes the card's grid and gap. Replaced: a form whose field and button touched.

### 23. The cards name where a person finishes

The credential fallback drew no "Continue on GitHub" and Shop B's key page no help link: no card on the roster declared `provider` or `documentationUrl`. The kit's app config takes both and writes them on the card. Each vendor agent names as its provider the vendor whose service it fronts, at the vendor's own site — GitHub, Google's Gmail and Calendar, Linear, CircleCI — and the mock stores a storefront of their own; each names its README in `a2uiverse-apps` as its help page. Replaced: cards naming neither, the fallback with no way out.

### 24. Signing in again to an agent that lost the account

Linear restarted with its store emptied had forgotten the account; its sign-in page refused the vault's `login_hint` ("login_hint names no account here"), and Sign in again ended without an account every time, the tile put back silently — a dead end. A hint naming no account binds nothing: the agent lets the person choose. On signing in again only, an account that comes back as another identity is re-bound to it — its tokens, its `sub` and its label replaced, the journal's sign-in record marked re-bound — and the client says it on the progress line of the slot's canvas, "Signed in to Linear as …"; one the app already holds as another account is refused, "that account is already added". A request for more access stays bound to its account; an agent that still knows the account binds to it as before. Replaced: an unknown hint refused, and a different identity on signing in again failed.
