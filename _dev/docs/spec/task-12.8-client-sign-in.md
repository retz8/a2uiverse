# Task 12.8 — The client's sign-in

The client's part of Phase 12 (`_dev/docs/spec/phase-12-authority-surfaces.md`, decisions 14–17, 20 and 21): the sign-in window, its waiting state and Cancel, the outcome learned over `orchestratorApi`, the resume, escalation's Allow and Not now, add-account, and the page-load session. It fills the sign-in seam of task 12.3 (`_dev/docs/spec/task-12.3-shell-catalog-authority.md`) against the AuthVault's routes of task 12.5 (`_dev/docs/spec/task-12.5-authvault.md`, decisions 5, 6 and 10). The surfaces are drawn on the design canvas *Authority surfaces — UI reference* (https://claude.ai/artifact/VsSwaLrgPWJyBiL4zjkJAX). SPEC §8.

## Scope

- The sign-in window opened from Sign in, Sign in again, the quiet line's Sign in, Allow and the add-account press, with `noopener,noreferrer`, on https only, localhost exempt.
- The attempt id minted by the client, the start route opened, the attempt polled.
- The waiting state, Cancel, and the window closed without signing in.
- The resume for the pressed slot; the other slots of the same app.
- Escalation's Allow and Not now.
- Add-account, and what the canvas shows after it; the orchestrator's start route and outcome changes it needs.
- The page-load session id named on every client message.
- The progress line's sign-in steps and the merged table's "not signed in" column (found in 12.8).
- Client tests and orchestrator tests.

## Locked decisions

### 1. The window closed without signing in

A window opened with `noopener` gives the client no handle, so it cannot see the window close. Phase decision 14's "closing the popup puts the tile back as it was" is met by focus: when the canvas window regains focus, the waiting tile goes back as it was. The attempt is still polled until it expires, so a sign-in finished afterwards in a window still open resumes the slot. Clicking back to the canvas with the window still open also puts the tile back; a second Sign in opens a second window on a new attempt, and whichever finishes resumes the slot.

*Amended by task 12.13 decision 26.* The canvas getting the focus back puts nothing back: a sign-in window can open as a tab hiding the canvas. The waiting form stays — on the authority tile, the quiet line, the request for more access and the add-account tile — until the sign-in ends, Cancel, or the attempt expires. Under its spinner line, Open the sign-in again opens a new window on a new attempt beside Cancel, and whichever finishes is the outcome, the other let go.

### 2. Cancel is the same as closing the window

Cancel puts the tile back at once and the attempt is still polled until it expires; a sign-in finished in the window after Cancel resumes the slot. No route to cancel an attempt is added.

*Amended by task 12.13 decision 26.* Closing the window is not seen; Cancel is what puts the tile back before the sign-in ends or the attempt expires.

### 3. A sign-in that ends without an account

A failed outcome puts the tile back as it was at once, with no new words; an expired one does the same, silently. The window's own page has already said the sign-in did not finish. The orchestrator's reason goes to the console only, never on screen.

### 4. The other slots of a signed-in app

The client remembers the sources signed in during this page load, from the outcomes it polled. Sign in on a remembered source sends `retry` and opens no window — phase decision 15's "loads at once with no popup". A tile the orchestrator paints for that source afterwards makes the client forget it, so the next press opens the window. A source signed in from another tab is not known and opens the window. A sign-in started for an account already signed in, with nothing missing, ends signed in at once: the window says "You're signed in", and the slot resumes.

*Amended by task 12.13 decision 31.* The window names the app — "You're signed in to Google Calendar", or for a pasted key or token "You're connected to Shop B" — says "This window closes in 5 seconds.", counts down beside Close now, then closes.

### 5. Add-account names the bare app

The add-account press opens the start route on the bare app id; the orchestrator resolves it to that app's next account when the window opens.

*Amended by task 12.13 decision 27.* The press is the add-account tile's Add account, on a `Slot` holding `addAccount` the Planner placed; it opens the start route on the bare app id as before.

### 6. After add-account

The add-account button stays as it is while the window is open. Once signed in, the progress line under the question shows one line naming the account by its label — "Added work@example.com to Gmail." — or, when the sign-in matched an account already held, "work@example.com was already added to Gmail." The poll's signed-in outcome carries the account's label, the app's name and whether the account was already held. A failed sign-in shows nothing (decision 3).

*Amended by task 12.13 decisions 21, 26 and 27.* While the window is open the add-account tile takes the waiting form of task-12.13 decision 26 in its place, until the sign-in ends, Cancel, or the attempt expires. Once signed in, the progress line says the account as before, and the tile's `retry` repaints it listing the account. The orchestrator names the app on every answer for the attempt.

### 7. The progress line and the reserved column read the sign-in state

The client keeps each slot's authority state from the orchestrator's paint. The progress line marks a source that needs sign-in with a lock and the reference canvas's words: "<App> not signed in", "<App> signing in" while its window is open, "<App> sign-in expired", "<App> not supported here", "<App> needs more access" for an escalation; the merge step names only what was merged. A merged table's column reserved for a source that needs sign-in reads "not signed in".

*Amended by task 12.13 decisions 30, 32, 37, 38 and 50.* A pasted key or token says "<App> not connected" and "<App> connecting"; an account held and asking only for more access says "<App> needs more access", as an escalation does. A source whose paint is declared a question "needs your answer", with a circled question mark, from the paint until a press inside it. While a press made inside a source's fragment runs, its step is the source working, its name alone; when the press ends, the step says what still waits on the reader — the request for more access, the question — or that it is done. A sign-in window open still says signing in. The reserved column reads "· not connected" for a pasted key or token and "· needs more access" for an account asking only for more access.

### 8. The resume goes to the pressed slot's own canvas

When the outcome is signed in, the `retry` goes to the canvas the Sign in was pressed on, whether or not it is on screen; the fragment paints in place there.

### 9. A blocked window is not detected

`window.open` with `noopener` returns nothing whether or not the window opened, so a blocked window leaves the waiting tile showing. Cancel and the browser's own blocked-popup indicator are the way out; the attempt expires after ten minutes. A known consequence.

### 10. Allow

Allow on the escalation card always opens the window — an escalation asks for scopes not yet held, so decision 4 does not apply. Signed in, the client sends `retry` for that source and the orchestrator sends the kept press again; decisions 1–3 and 8 hold for it as for the tile. Not now is the shell catalog's `dismiss`.

*Amended by task 12.13 decision 39.* A later press inside the same fragment drops the request — the chip and its card go, the press it held with them — and the journal records it as superseded, its scope keys named. A later press that needs more access itself asks again.

### 11. The proof

Client tests over a fake window opener and a fake poll: the window opened on the start route with `noopener,noreferrer` and the attempt, canvas and source; https only, localhost exempt; waiting, focus and Cancel; each outcome; the resume to the pressed slot's canvas; remembered sources and a fresh tile forgetting one; Allow and Not now; add-account and its line; the session id on every message; the progress line's sign-in steps and the reserved column. Orchestrator tests for the bare app id on the start route, the label, the app's name and the held account on the outcome, and a sign-in for an account already signed in ending at once. The live sign-in through the tunnel and the real popup in e2e are 12.12's and 12.13's.

## Invariants

- Every word the client draws is plain language, for anyone, not engineers.
- A credential never reaches the client.
