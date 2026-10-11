# Task 14.3 — Orchestrator, the App Library's side

Sub-task 14.3 of Phase 14 (`_dev/docs/spec/phase-14-shell-trusted-pages.md`, decisions 8, 13–19 and 21): the orchestrator's side of the App Library — browser writes without the token, the accounts read, sign-out and rename, sign-in from the page with no canvas, the reads the page draws from, and the journal.

## Scope

- Browser writes allowed by origin, without the write token.
- The accounts read; sign-out and rename of one account.
- Sign-in started from the App Library, with no canvas.
- The page's reads: the installed list, the update check, the accounts read.
- Uninstall's answer.
- The journal lines for the page's acts.
- Out: the update state as last computed and when, for the Planner's reader (task 14.5); the Store's reads and the publisher's calls (task 14.4).

## Locked decisions

### 1. The allowed origins are the orchestrator's own

A write from a browser origin needs no token when the origin is localhost or 127.0.0.1 on any port, or a host of the orchestrator's own dev tunnel on any port — the tunnel and its region read from the orchestrator's base URL. One list serves CORS and the write check. A write with no Origin header takes the token. Amends phase decision 8 and SPEC §10's browser-write sentence, which name the origins CORS admits.

### 2. Every write is JSON

Every write, with the token or without, carries the `application/json` content type and is refused otherwise, before any other check. A form-style post with a localhost origin is refused, and so is a JSON post from an origin outside the list; tests prove both.

### 3. A rename sticks

The vault keeps that the label is the person's choice. No later sign-in on that account replaces it, a rebound one included. Only a new account takes its label from the identity.

### 4. A name is trimmed, non-empty and unique within the app

A new label is trimmed and must not be empty or match another of the app's accounts' labels, ignoring case; a refusal carries a reason the page can show. No length cap. Renaming to the label already held changes nothing; a change of case is a change.

### 5. A signed-out account's slot signs it back in

A slot on an open canvas bound to an account signed out from the App Library paints the sign-in tile, and signing in there brings that account's number back, under whatever identity signs in, its label fresh from that identity. Only a slot that holds the number can. An identity that is already another of the app's accounts is refused, as today.

### 6. The page signs in to add an account or sign in again

With no canvas, a sign-in starts only for add account — the app's next account — or for sign in again on a lapsed account; anything else is refused. An account short of access the card now asks reads as signed in; the canvas asks for more when a question needs it.

### 7. An identity already held is the existing outcome

Add account returning an identity the app already holds ends in the poll's existing outcome, which the page words as the canvas's add account does.

### 8. The page's reads

The installed list and the update check as they stand, and one accounts read over every app, read when the App Library opens and after each sign-in, sign-out or rename.

### 9. What the accounts read carries

Each account: its label; its permissions in the card's own words only, never a scope's name — a key account connected with a key, an app that gives no words an empty list; whether it lapsed. Each app: whether it asks no sign-in, signs in, or asks a sign-in the vault cannot run.

### 10. The update state as last computed is task 14.5's

The update result as last computed and when the check ran, which the Planner's reader reads, is held by task 14.5. This task leaves the update check as Phase 13 built it.

### 11. Sign-out answers with what became of the access

Cancelled, nowhere to cancel, or failed to cancel; the account is dropped in every case. A sign in again still open for the account fails on its return, saying the account was signed out.

### 12. Uninstall answers the same

Uninstall answers with each of the app's accounts' outcome, as sign-out does.

### 13. The journal

Sign-out and rename are each a sign-in line: sign-out with its outcome, rename with the old label and the new. Every write's line names who made it: the page, or a caller with the token.

### 14. Docs

Phase decision 8 and SPEC §10's browser-write sentence (decisions 1 and 2); phase decision 16 (decisions 5 and 11); Phase 14's 14.3 and 14.5 lines in `_dev/TODO.md` (decision 10).

## Open items

- A real database behind the page's reads, later.
