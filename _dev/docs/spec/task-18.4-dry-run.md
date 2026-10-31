# 18.4 — The dry run

The whole sitting once from the state it starts from, driven through the tunnel by Claude in Chrome, before the recording. Sub-task 18.4 of Phase 18 (`_dev/docs/spec/phase-18-ecosystem-run.md`, decisions 2 to 8, 10, 13 and 14). After 18.1–18.3, before 18.5.

## Scope

- The Node restaurant finder claimed and published on the trusted page by a fresh publisher, from its card URL alone.
- The question asked with the finder not installed; Calendar's answer beside the Store's offer; the install from the offer, the slot filled beside Calendar; Book, the form, the submit, the confirmation.
- The question's words and the storyboard settled; the reset between passes; what breaks named.
- The recording's tooling rehearsed.
- Out: the recording and its files (18.6); any platform fix (18.5); any change to the sample.

## Locked decisions

### 1. The real marketplace, rolled back by hand

The finder is published on the marketplace the platform runs on, holding its seven apps, not on a copy. After a pass, the dry-run publisher's record is removed from the marketplace's ledger with the marketplace stopped, so the publisher name and the app id are owned by no one again.

### 2. All seven apps live, the registry untouched

The seven installed apps run live from one launcher that installs nothing, so each stays installed from the Store. Only Calendar is asked.

### 3. The question

"I want to book a table at a Chinese restaurant in New York for dinner tonight. Show me today's calendar too, so I can pick a time that fits."

If the Planner reserves a merge on it, the rephrase drops "so I can pick a time that fits".

### 4. Calendar's account and its seed

Calendar's signed-in account, `ekkicb71@gmail.com`, is the dedicated test account. Its demo calendar is re-seeded on the Mac before the run, and again whenever the day changes between passes.

### 5. The publisher name is `a2ui-samples-mirror`

The name claimed on Publish is `a2ui-samples-mirror`, on the dry run and on the recording day alike.

### 6. The storyboard

Three stages, as phase decision 8 names them: the publish — the claim, the token shown once, the publish from the card URL, the gate and the Store's check, the listing with its preview; the question — a fresh page load, the words, Calendar's fragment beside the Store's offer, Install through the consent card, the slot filled with the finder's list; the booking — Book, the form, the submit, the confirmation.

Inside the finder the stage runs forward only; the way back inside the fragment is not shown. The pictures are blank across the tunnel and stay so; the sitting log says why. Book is pressed on the first restaurant in the list; the form is filled for a party of two, tonight at 19:30, after the calendar's writing block, with no dietary requirements.

### 7. The reset, and a repeat is the whole sitting

The reset that returns the platform to phase decision 6's start state: the finder uninstalled from the App Library; unpublished on Publish; the publisher signed out on Publish; the marketplace stopped, the publisher's record removed from its ledger, the marketplace started again; Calendar re-seeded if the day has changed; the finder stopped and started again; a fresh page load.

After each 18.5 fix lands, the whole sitting runs again from the full reset. The reset runs after the last pass too. The Store's check running past its limit is a retake of the publish stage, not a finding.

### 8. Phase decision 14 amended: the publish retake claims the same name again

A publish-stage retake on the recording day resets as decision 7's marketplace steps do — unpublish, sign out, the publisher's record removed from the ledger, the marketplace restarted — and claims `a2ui-samples-mirror` again. The phase spec's decision 14 carries the amendment, dated.

### 9. The processes from the session, the ports by hand

Every process — the finder, the seven agents, the marketplace, the orchestrator, the client — is started from the Claude Code session as a background task, its log kept at hand, after Calendar's seed has run. The client's, the orchestrator's and the marketplace's ports are forwarded and set Public by hand. The finder's port stays unforwarded, and Calendar's sign-in port is not needed.

### 10. The record

The TODO line, when ticked, carries the run's facts as 18.3's does. The storyboard lives in this spec, decision 6, amended after the run with what the run changed, dated. A platform finding that must land before the sitting is an 18.5 line; a sample finding goes to `_dev/a2ui-findings.md`; what need not land before the sitting goes to the Backlog.

### 11. The rehearsal

Every stage is recorded with the GIF recorder as the recording will record it. The files are kept out of the repo and discarded; `docs/images/` is 18.6's.

## Invariants

- The sample is never changed; the run changes no code.
- The platform runs at Phase 17's defaults.
- Every run is live: Calendar against Google, the finder on its own model.
