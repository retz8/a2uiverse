# Task 15.5 — Orchestrator, the update on the canvas

Sub-task 15.5 of Phase 15 (`_dev/docs/spec/phase-15-store-loop.md`, decisions 11, 12 and 15): the orchestrator's half of the update on the canvas — the update check before dispatch, the catch after the call, the update tile's lines from what the Store holds, access judged on the card as installed, Update from the slot and the resend, the journal. This spec fixes how.

## Scope

- The update check before dispatch: what it judges, which dispatches it covers, its order beside the sign-in.
- The catch after the call.
- What the Store holds, and the line it chooses.
- The consent for an update that asks for more.
- What the update-tile slot carries.
- Update from the slot, and the update tile in the merge.
- The report to the marketplace.
- The journal.
- The SPEC edits and the notes for later sub-tasks.

## Locked decisions

### 1. The update check covers every dispatch

The update check joins the check before dispatch on every dispatch: the plan's slots at first paint, Retry, `useApp`, `useAccount`, the sign-in's resume and every press inside a fragment. A dispatch it stops does not call the agent; a press inside a fragment it stops is kept on the slot, as a failed press is.

### 2. The catalog case comes before the sign-in

A slot whose app's live card, as held for this run, names no catalog id in the app's entitlement takes the update tile before any sign-in is judged. Once the update lands, the slot's sign-in follows as a second step.

### 3. The new-permission case: the installed card, then the live card

A slot's account is judged against the card as installed, taking the sign-in tile or the needs-more-access tile when it falls short. When it meets it, the same account is judged against the live card's requirement: where the live card's fails and the installed card's passes, the slot takes the update tile. No other difference on the live card stops a dispatch. Access is no longer judged against the live card.

### 4. The catch after the call

A paint refused outside the entitlement has the app's live card fetched again, given five seconds. A fetched card naming a catalog id beyond the entitlement takes the update tile. A fetched card naming none, or a fetch that does not answer, leaves today's tile — "This app sent something that can't be shown here." — with no Retry. A fetched card replaces the live card held for the run.

*Amended by task 15.11 decision 5.* A call that ends with no surface also has the app's live card fetched again, given five seconds, and a fetched card naming a catalog id beyond the entitlement and none in it takes the update tile, as a paint refused outside the entitlement does. A card naming neither, or a fetch that does not answer, leaves the call completed.

### 5. What the Store holds is read fresh

The tile's line is chosen from the app's Store entry read at the check, within the orchestrator's limit for each request to the Store, the slot pending until it answers; first paint never waits on it. The check before the call and the catch after it share this path.

### 6. The line follows the update state

The read runs the update check's own state computation for that one app, over the fresh entry and the live card held for the run, and the result becomes the app's held update state. The line follows the state:

- the installed line retired, a major update, a card update: "Shop B needs an update to show this.", with Update;
- ahead of the Store, up to date, a newer build: "Shop B has changed, and the Store is waiting on its publisher, Acme.", with no press;
- unknown, the Store unreached: "Shop B has changed, and the Store couldn't be reached.", with Retry;
- no longer published, or installed from your computer: "Shop B has changed, and the Store has no update for it.", with no press.

*Amended by task 15.11 decisions 39 and 40.* The waiting line carries Check again, the slot's Retry: the app is judged afresh, its Store entry read again — "Shop B needs an update to show this." with Update once the Store has the update, the same line if not. Once the page holds the app past the version a line was drawn from, the tile reads "Shop B is updated." with Show it here, and Loading… while its request goes again.

*Amended by task 16.11 decision 31.* A Retry from the tile, Check again or Update's, first fetches the app's live card again, within five seconds: the app is judged on its live card as it is now, its Store entry read again — an app back on what the Store holds is called and paints; "Shop B needs an update to show this." with Update once the Store has the update; the same line if neither.

### 7. An update that asks for more

Every updatable state — the installed line retired, a major update, a card update — carries the new card's new permissions, and any of them naming one asks for more: its Update passes the consent card, in the slot, the App Library and the Store alike.

### 8. What the slot carries

The update-tile slot carries the update state its line was computed from — the state, the installed version, the published version, the new permissions — and the publisher's name. The client draws the line from it; Update opens the consent card, when the update asks for more, from it and the app's entry read again at the press; a slot whose installed version no longer matches the app's in the client's installed apps reads "Show it here".

*Amended by task 15.11 decision 40.* That slot reads "Shop B is updated." with Show it here.

### 9. Update ends in the slot's Retry

Update is the orchestrator's existing install by app id, then the slot's Retry: the check before dispatch runs again and the slot sends again what failed — the press kept from inside the fragment, otherwise the plan's request. "Show it here" on a slot waiting on the same update is the same Retry. A Retry while the app still cannot paint lands on the update tile again.

*Amended by task 15.11 decision 41.* A press kept on a slot, made on a surface drawn in a catalog the app no longer holds after its update, is not sent again: Update's resend, Show it here and the slot's Retry send the plan's request, and the app paints afresh in what it now holds. A press on a surface the update kept is sent again as before.

### 10. The update tile in the merge

An update-tile slot behaves as a slot waiting on sign-in: it resolves at once; its first answer after the update is included in the merge on arrival, Update its Retry; an anchored home source on the update tile collapses the merge slot to a line with no press, the slot's Update bringing the merge back; a column reserved for it reads "needs an update", or "waiting on its publisher".

### 11. The report to the marketplace

Each run of the tile's state computation reports to the marketplace by the update check's rule: an app ahead of the Store, and an app the Store flags while its live card shows no drift.

### 12. The journal

No new entry kind. A dispatch the update check stops is a dispatch record, failed, the agent not called, carrying the update finding: the case — the catalogs or a new permission — the update state and the line. The catch after the call keeps its catalog record, gaining the outcome of the card fetched again: changed, with the update finding; unchanged; unanswered. The Update is the registry line any install writes, the resend the Retry's operation entry; the report stays a log line.

*Amended by task 15.11 decision 5.* A call that ends with no surface carries the outcome of the card fetched again on its dispatch record too: changed, with the update finding, the dispatch failed; otherwise the call stays completed.

### 13. SPEC edits

Made in this task's implementation session: SPEC §10's update tile — a paint refused outside the entitlement taking it only on a card fetched again that names the change, the lines with no Store answer, the catalog case before the sign-in, the consent over every updatable state; §14's update tile row, what the slot carries and its four lines; §7's row for Update, the slot's Retry once the update lands; §5.3 and §8, Update standing as the update tile's Retry in the merge.

### 14. Notes for later sub-tasks

The shell catalog's slot states (15.8) and the design records (15.12) each carry a "(found in 15.5)" note in `_dev/TODO.md`: 15.8, the two lines with no Store answer and their reserved column's words; 15.12, the orchestrator record's update check.

## Open items

- The reserved column's words for the two lines with no Store answer: the shell catalog's slot states (15.8).
