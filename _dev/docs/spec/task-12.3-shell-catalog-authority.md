# Task 12.3 — The shell catalog draws the authority surfaces

The drawing part of Phase 12 (`_dev/docs/spec/phase-12-authority-surfaces.md`, decisions 9, 13–18, 21–24) over the schema 12.2 wrote (`_dev/docs/spec/task-12.2-authority-contract.md`): the `Slot`'s authority state, the `credential` cause, `Attribution`'s account and escalation, drawn in the shell catalog as the design canvas *Authority surfaces — UI reference* (https://claude.ai/artifact/VsSwaLrgPWJyBiL4zjkJAX) shows them. SPEC §4.3, §4.5, §8.

## Scope

- The authority tile: the full tile, the quiet line, "sign in again", "not supported here" with Manage apps; the waiting state with Cancel.
- The escalation chip on the `Attribution` row and its floating card with Allow and Not now.
- The account label on `Attribution`.
- The refused paint's fallback tile with "Continue on <App>".
- Inside the merge: a reserved column for a source that needs sign-in, and the collapse lines when a source the merge waits on needs sign-in.
- The seam the client (12.8) fills: the sign-in handler and the waiting state.
- `obscured` dropped from `TextField`.
- The design-check page gains every new state; the catalog schema's descriptions, the design record and the README follow.

## Locked decisions

### 1. The merge's sign-in pieces are 12.3's

A column reserved for a source that needs sign-in, and the collapse lines for a source the merge waits on that needs sign-in, are drawn in 12.3 beside the tiles.

### 2. Sign-in has its own seam

Sign in, Sign in again, Allow and Cancel raise a sign-in handler of their own on the catalog's options — start or cancel, naming the source — called synchronously inside the click, so the client can open the popup unblocked. A `SignInContext` the host fills says which sources are waiting on a sign-in window. Neither carries scopes. The shell's closed action set is unchanged: sign-in is drawn by the runtime, never painted by an author. Not now raises `dismiss` through the existing press handler; Manage apps raises `openAppLibrary` through the existing shell-action handler; Continue on <App> is a plain link to `continueUrl`, opened in a new tab.

*Amended by task 12.13 decisions 26, 27 and 30.* Connect, Open the sign-in again and Open the page again start a sign-in through the same handler, as Sign in does. The add-account tile's Add account raises it too, an `addAccount` start naming the bare app id; while that window is open the tile takes the waiting form.

### 3. Waiting draws in place, in each surface's own form

While a sign-in window is open for a source:

- the full tile and the "sign in again" tile take the canvas's waiting form — "Finish signing in to <App> in the window that opened.", a spinner, "Waiting for you to finish signing in", Cancel;
- the quiet line stays one line — the spinner, "Waiting for you to finish signing in", Cancel — and nothing moves;
- the escalation card stays open with its scopes; Allow and Not now give way to the spinner line and Cancel.

Cancel, or the popup closing, puts back what was there.

*Amended by task 12.13 decision 26.* The waiting form stays — on the authority tile, the quiet line, the request for more access and the add-account tile — until the sign-in ends, Cancel, or the attempt expires; the popup closing is not seen. The full waiting form is the statement, the spinner line, and under it Open the sign-in again and Cancel; the quiet line's stays one line, the spinner, its words, Open the sign-in again and Cancel; the escalation card's keeps its scopes. Open the sign-in again opens a new window on a new attempt, and whichever finishes is the outcome, the other let go.

### 4. One wording for every sign-in

The tile says sign in for every scheme, `http` bearer and `apiKey` included: "Sign in to <App> to show it here.", Sign in, and waiting "…finish signing in…". With no scopes, the "<App> will be able to" list is left out. "Connecting" is the orchestrator's token page's word, not the tile's.

*Amended by task 12.13 decisions 30 and 50.* The wording follows the cause. A first sign-in, `signIn`, says "Sign in to <App> to show it here.", Sign in. An app whose sign-in is a pasted key or token — `apiKey` or `http` bearer — is the cause `connect`: "Connect Shop B to show it here.", Connect, and "Opens a page to paste your Shop B key"; waiting, "Finish connecting Shop B in the window that opened.", "Waiting for you to finish connecting", Open the page again and Cancel. An account held and asking only for more access is the cause `more`: "Gmail needs more access to show it here.", "Gmail will be able to" over the missing scopes, Allow, and "Opens Gmail's sign-in in a new window"; its waiting form keeps the sign-in's words.

### 5. The escalation card opens on arrival; the chip folds it

The card opens when `escalation` is painted. The chip, Escape or a press outside folds it without answering; the chip stays on the row and reopens it. Allow and Not now are the only answers. Focus does not move into the card on arrival; the chip announces the request.

### 6. The account label at rest

When `account` is painted, the marker reads "<App> · <label>" at rest, in its quiet caption register, a long label truncated, the whole of it on hover and in the accessible name. When `account` is painted stays the orchestrator's: null for an app with one account.

### 7. The refused-paint tile

One fixed statement, the field's kind left out: "This app asked for a password, code or card number here. A2UIVerse never asks for those on this screen." With `continueUrl`, a Continue on <App> button and "Opens <App>'s website in a new tab"; without it, the statement alone. No Retry.

### 8. The merge reads sign-in from the slot state

No collapse cause is added. The slot states the host provides gain `authority`.

- The home-source collapse line reads the home source's state; when it needs sign-in, the line says "The merged view needs <noun>, and <App> isn't signed in. Signing in to <App> brings it back." with no press.
- The fewer-than-two line's Retry leaves out the sources that need sign-in.
- A reserved column for a source that needs sign-in reads "· not signed in" in its heading over the empty dash, as a failed one does.

*Amended by task 12.13 decisions 32 and 50.* The slot states the host provides gain `connect` and `more` beside `authority`. A source needing a pasted key or token: its reserved column reads "· not connected", and a home source's collapse line "…and Shop B isn't connected. Connecting Shop B brings it back." An account held and asking only for more access: its reserved column reads "· needs more access", and a home source's collapse line "…and Gmail needs more access. Allowing Gmail more access brings it back."

### 9. The way-back arrows stay live during an escalation

A waiting escalation is not busy. A step leaves the request standing; Allow's answer lands as SPEC §6.5 places a new paint arriving away from the end of the visits.

### 10. Resume reads like any Retry

After sign-in completes and the client sends `retry`, a tile or quiet line with that press sent draws the slot's pending placeholder; a press that never reached the orchestrator, or whose stream broke, brings the tile or line back with the failure tile's words for it. An escalation whose source has a `retry` sent hides its chip and card at once.

### 11. The quiet line names no app

"Not signed in · Sign in", under the marker that already names the app; its accessible name says "<App>, not signed in". Phase 12 decision 17's wording is amended to match.

*Amended by task 12.13 decisions 30 and 50.* For a pasted key or token the line is "Not connected · Connect", its accessible name "<App>, not connected"; for an account held and asking only for more access, "Needs more access · Allow", its accessible name "<App>, needs more access".

## Invariants

- Words on the screen are for customers: no protocol or developer term, no address or host.
- Nothing moves: a waiting state, an escalation and a resume change words in place.
