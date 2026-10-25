# Task 15.11 — Integration + acceptance

Spec for sub-task 15.11 of Phase 15 (`_dev/docs/spec/phase-15-store-loop.md`, decision 19): the phase's acceptance run through the tunnel, on the deterministic roster and the two shops, with the marketplace running and the Planner on `gemini-3.8-flash`. It covers phase decision 19's nine items. Shop A's breaking catalog change is made for the run through the kit's old line, in place of task 13.8's temporary patch, and the run is set up on the launcher's option that publishes apps and leaves them uninstalled. It also covers the fault found while grilling: a call that ends with no surface.

## Scope

- The fault found while grilling, fixed before the sitting.
- The two checks: the regression pass, and one sitting by hand through the tunnel.
- How the sitting is driven, how points found in it are handled, and where the code is worked.
- The starting state, and the state the sitting leaves.
- The loop on Shop B, the sign-in app on Calendar, "More in the Store" with the uninstalled slot, the install ask, and nothing to offer.
- Shop A's chain: the kit's two catalog ids and the forced update.
- CircleCI's chain: the new-permission variant.
- The update tile's two lines with no Store answer.
- Linear's newer build: per-paint builds.
- The install refused.
- The journal after each case.
- The dark walk over the replay.
- What stays with the automated tests.
- The sitting's order and the record.
- Out: the amendments the sitting calls for (task 15.12).

## Locked decisions

### 1. Two checks

The regression pass:
- `pnpm verify` in both repos;
- the client's replay suite against the baselines on disk;
- task 15.10's live suite, whole, run while the sitting's stack is down;
- each Python agent's tests, run apart.

It runs before the sitting, every failure and diff named and anything unexplained fixed before going on. It runs again after the sitting, the baselines retaken on disk and what changed named. It is phase decision 19's ninth item. Then there is one sitting by hand through the tunnel.

### 2. The sitting is driven case by case

Before each case Claude gives a brief of what it tests. On the reader's go, Claude drives the page in the reader's browser through Claude in Chrome on the tunnel's addresses, and runs every terminal command on the Mac. After each case the reader gives UX and design feedback, fixed on the spot before the next case.

### 3. Nothing is deferred

Every point the reader raises or the sitting finds is handled the same way:
- fixed on the spot, one at a time, agent side included;
- seen again;
- added to this spec as a numbered decision with what it replaced.

A point asking for something a later phase builds is recorded as a finding for that phase.

### 4. Worked directly on `main`

The platform's code goes on `main`. The agents', the kit's and the catalogs' code goes on `a2uiverse-apps`' `main`. There is no worktree. Each fix is committed as it lands. The edits made for the run are never committed and are reverted by the end of the sitting.

### 5. A call that ends with no surface is caught after the call

Found while grilling. The orchestrator holds each app's live card from boot or install, and fetches it again only on the App Library's check, a refused paint, an install or an update, and a restart. A kit app offered no catalog id it still holds paints nothing and answers "Shop A has changed and can't show this here." An app that changed while the orchestrator runs therefore passes the check before dispatch on the card held, its call ends with no surface, and the slot rests on that sentence with no press.

The catch after the call widens. A call that ends with no surface also has the app's live card fetched again, given five seconds. A fetched card naming no catalog id in the entitlement takes the update tile, as a paint refused outside the entitlement does. This amends phase decision 11 and task 15.5's decision 4. It is fixed with its tests and committed before the regression pass before.

### 6. The starting state

- The marketplace's state is wiped, its embedding model kept.
- The orchestrator runs on a fresh state folder holding only the embedding model's cache. The existing orchestrator state folder is left as it is.
- The tunnel's addresses are set for the agents' sign-in pages for the whole sitting.
- The launcher runs the deterministic roster and the two shops under its publish. The dev publisher publishes all seven apps. Each is installed from the marketplace by id, except Shop B and Calendar, which are published and left uninstalled through task 15.10's option.
- Every account is signed in from its tile the first time its app composes.
- The Planner and the Synthesizer run on `gemini-3.8-flash`.

### 7. The loop on Shop B

Phase decision 19's first item. "Compare camera prices at Shop A and Shop B.", asked with Shop A installed and Shop B not:
- the merge reserved over Shop A, and Shop B offered in its slot;
- Install through the consent card in the slot;
- Shop B's key connected as the second step;
- the slot filling, and the merge taking Shop B in.

Then "What's on this canvas?": the this-canvas reader names Shop B as a source like Shop A. The progress line reads Shop B as any source (phase decision 10).

### 8. The sign-in app on Calendar

Phase decision 19's second item. A question gathering from Gmail and GitHub that also needs a calendar:
- Calendar offered in its slot beside the merge reserved over them;
- Install through the consent card in the slot;
- Calendar's sign-in tile, and its sign-in window through the tunnel;
- the slot filling, and the merge taking Calendar in.

### 9. "More in the Store" on Shop B, with the uninstalled slot

Phase decision 19's third item.
- Shop B is uninstalled from the App Library. On decision 7's canvas, still showing Shop B's filled slot, a press inside Shop B's fragment gives "This app isn't installed anymore." with Retry and no reinstall (phase decision 15).
- Canvas 1 asks "Compare camera prices at Shop A and Shop B." and canvas 2 asks "Which cameras can I buy, and where?". Each offers Shop B.
- On canvas 2, Shop B's name opens its view in the Store, and Back closes it.
- Then canvas 2's "More in the Store" opens the Store page on the search words. Shop B is installed there through the consent card and its key connected. The page says "Shop B is installed. It's answering on your canvas." with "Back to your canvas", and canvas 2's slot has filled beneath it.
- On canvas 1, Shop B's row reads "Show it here" with "Installed" beside it. Pressed, the slot fills with no second consent.

### 10. The install ask

Phase decision 19's fifth item. Shop B is uninstalled from the App Library before each half.
- "Install Shop B.": Shop B offered, Install through the consent card, the installed line.
- "Install Shop B and show me its cameras.": asked on a new canvas, the reader switching away and back, and Shop B installed from that past canvas's offer (phase decision 10). Its key is connected and the slot fills with Shop B's cameras.
- Then "Install Shop A.", asked with Shop A installed.

### 11. Nothing to offer

Phase decision 19's fourth item.
- "Book me a flight to Tokyo next Friday." gives "Nothing in the Store can do this yet.", and "Search the Store" opens the Store page on the words.
- The marketplace is stopped and the same question asked on a new canvas: "Couldn't reach the Store.". Its "Search the Store" is pressed with the Store down.
- The marketplace is restarted on the same state folder and the page reloaded.

Before the sitting, Claude checks that the launch keeps the client and the orchestrator up when the marketplace alone is stopped. If it does not, the marketplace runs in its own terminal for the sitting.

### 12. Shop A's chain

Phase decision 19's seventh item, and from its sixth: the Store having the update and the repaint, ahead of the Store, the forced update, and the catch after the call.

Made for the run: Shop A's current catalog moved to the kit's old line as published, and a new line holding a copy of its catalog under a new catalog id, with Video removed and one visible theme change.

1. **Suggested, not forced.** Shop A goes to 0.2.0 with both lines, restarted and published. The App Library reads a major update. The camera comparison composes, Shop A painting in the old id, with no tile. The App Library's Update is not pressed.
2. **Ahead of the Store.** The old line is deleted and Shop A goes to 0.3.0, restarted and not published. A Retry reaches the agent, the call ends with no surface, and the card is fetched again (decision 5): "Shop A has changed, and the Store is waiting on its publisher, a2uiverse-apps.". A second Retry is stopped before the call, on the card fetched.
3. **The forced update and the repaint.** 0.3.0 is published, retiring the old line. A Retry gives "Shop A needs an update to show this.", and Update goes straight through. The slot sends its request again, and Shop A repaints in the new id with the new look while the other surfaces on screen keep the old. An older canvas's Shop A slot waiting on the same update turns to "Show it here".

### 13. CircleCI's chain

From phase decision 19's sixth item: the new-permission variant (phase decisions 12 and 15).

1. CircleCI, signed in with read access, answers "How are my builds doing?".
2. CircleCI's card goes to 0.2.0, requiring `pipelines.write` beside read access, restarted and not published. The App Library is opened, its check fetching the live card again, and closed. A Retry then gives "CircleCI has changed, and the Store is waiting on its publisher, a2uiverse-apps.", with no press, not the needs-more-access tile.
3. 0.2.0 is published, a card update. A Retry gives "CircleCI needs an update to show this.". Update opens the consent card in the slot, asking for more in the card's words, and is allowed.
4. The slot sends again. The account lacks the new permission, so the slot takes the needs-more-access tile. The account is signed in again through the window, granting it, and the slot fills.

### 14. The update tile's two lines with no Store answer

- "…and the Store couldn't be reached." with Retry: within CircleCI's chain, the marketplace is stopped between step 2's App Library and its Retry. Once the marketplace is restarted, a second Retry moves the slot on to the waiting line.
- "…and the Store has no update for it.": the sitting's last case. Shop B's catalog moves to a new id with no old line, Shop B is restarted, and the dev publisher unpublishes it. The camera comparison's Shop B slot shows the line.

### 15. Linear's newer build

Phase decision 19's eighth item (phase decision 13).
- A canvas has Linear's surfaces on screen. A second canvas showing Linear is left as a past canvas.
- A visible change to Linear's catalog is published at the same card. The App Library, opened over the canvas, has its check install the newer build.
- On the open canvas, a press inside Linear's fragment painting a new surface is drawn in the new build. The surfaces on screen keep the old look, and the fragment's back arrow returns to a paint keeping the old look.
- On the past canvas, an action pressed is answered in the new build.

### 16. The install refused

Phase decision 10. Calendar is uninstalled from the App Library and offered on a canvas. The dev publisher unpublishes Calendar, and Install is pressed: the refusal is said on its row, in the Store's words. Calendar is then published again.

### 17. The journal after each case

After each case, Claude reads the case's journal entries on the Mac and says whether everything the case did is there. A missing or wrong entry is a point like any other.

### 18. The dark walk over the replay

After the live cases, with the stack down, the built client is served through the tunnel and the reader switches the browser to dark. Each store-loop beat is opened with its presses left to the reader's hand: beats 31 to 34 and beat 7, and the update tile's synthetic beats. Points are fixed like any other, before the regression pass after.

### 19. Left to the automated tests

Not produced live, each named in the write-up:
- the catch after the call's refused paint, made by the orchestrator's tests' fake agent;
- the no-update line for an app installed from your computer;
- an update refused.

### 20. The state the sitting leaves, and the closing launch

- Every temporary edit is reverted, `a2uiverse-apps` holding only the committed fixes.
- The marketplace's state is wiped again, its embedding model kept.
- The sitting's orchestrator state folder is removed.

Then a closing launch runs under the publish with all seven apps, published and installed by id, none left uninstalled.

### 21. The sitting's order

1. Decision 5's fix.
2. The regression pass before.
3. The starting state.
4. The loop on Shop B.
5. The sign-in app on Calendar.
6. "More in the Store", with the uninstalled slot.
7. The install ask.
8. Nothing to offer.
9. Shop A's chain.
10. CircleCI's chain.
11. Linear's newer build.
12. The install refused.
13. The no-update line.
14. The stack down, then the dark walk.
15. The regression pass after.
16. The state left, and the closing launch.

### 22. The record

This spec is the record. Each on-the-spot fix is added as a numbered decision as it lands, with what it replaced.

The write-up has four parts: before the sitting, the sitting case by case, after it, and the findings. Findings for later phases go into their phase's notes in `_dev/TODO.md` at the write-up. Every amendment to the phase spec, SPEC.md and earlier sub-task specs that 15.11 calls for is made by 15.12. Decision 5's are among them: phase decision 11, task 15.5's decision 4, SPEC §10's update tile, and §14's update tile row.

### 23. The consent card keeps its press in place

While the consent card over a slot is open, the press it floats from stays where it is on screen: a paint that moves it, the merged view landing above, is scrolled back by the same distance, so the card's presses stay under the reader's pointer. Replaced: the card following its slot down the canvas as the merged view landed, a press on Install landing on empty space.

### 24. Calendar's agenda answer lists each event once, with its whole time

Calendar's agenda answer lists each event once, under its most pressing section, its other reasons in its note ("Unanswered invitation • Overlaps Budget sync"). Each event's data carries its start and end as full date-times beside the time the row shows, and no event's id is shown. The deterministic answer sits on 2026-09-19, the day of the roster's other deterministic apps; the live example and Calendar's brand guidance say the same. Replaced: the design review listed under both "Unanswered invitations" and "Double-booked today", bare times of day the merge kept in a section of their own, and "ID: …" leading each note.

### 25. The collapsed merge's line in plain words

"Only Shop A answered, so there's nothing to combine.", and "No app answered, so there's nothing to combine."; a home source unnamed is "an app", never "the home source". Replaced: "The merged view needs at least two sources, and only Shop A answered." (task-8.7 decision 24).

### 26. The apps' Store texts speak to the person

Calendar's, GitHub's, Gmail's, Linear's and CircleCI's descriptions and skill texts say "your" and "you": "Reads and acts on your Google Calendar…", "…once you confirm". Replaced: "the user's", "for them", "on their behalf", read on the offer, the consent card and the Store page.

### 27. A sign-in at first paint is journaled

A slot that takes its sign-in at first paint is journaled as a dispatch failed needing sign-in, its agent not called and the authority it asks beside it, as the pool journals a dispatch it stops. Replaced: no record of the slot at all.

### 28. A request that got no answer says so

An install or update whose request got no answer, and that reading back finds not done, says "That didn't go through, so nothing was installed." with Try again. Replaced: "The Store can't be reached right now, so nothing was installed." for a request the tunnel dropped (task-14.11 decision 40's read-back).

### 29. The canvas a question was asked from, in the person's words

The this-canvas and recent-turns readers speak the person's words: what was asked, each app and how its answer stands ("answered", "waiting for you to sign in", "couldn't answer"), an account by its name only when it isn't the app's, the merged view showing or not shown and why ("only Shop A answered"). The Planner writes a reader's facts so, never a field's name or the platform's terms, and names the canvas a reader describes by what was asked on it, its title and heading too, its answer opening a canvas of its own; a worked example shows it. Replaced: "Current canvas", "Utterance", "Active sources: Shop A (arrived) and Shop B (Shop B · arrived)", "Merged view: Live".

### 30. An answer about a canvas says what its screen doesn't

The this-canvas reader carries what each app was asked for, what to do about an answer that isn't there ("Sign in to Linear from its slot", "Update Shop B from its slot"), and what the merged view puts together, its planned columns and the order it was made in. The Planner's guidance and worked example say where each part comes from, how the merged view was made, what isn't right and what to do, and what could be asked next, never listing what the screen already shows: when everything answered, one line says so. Replaced: an answer of statuses restating the screen — "Shop A: Answered", "Shop B: Answered", "Merged view: Showing" (decision 29's first form).

### 31. A failed press says so on its slot alone

A press that fails ends with no words of the shell's: its slot says what happened ("This app isn't installed anymore." with Retry), and the journal keeps the outcome. Replaced: "dispatch failed" at the foot of the canvas, the orchestrator's own words on every failed press since task 2.4.

### 32. An offer whose app is installed opens with "From the Store:"

Once an app the offer offered is installed, here or elsewhere, the offer's line reads "From the Store:" alone above its rows. Replaced: "None of your apps can do this. From the Store:" above a row reading "Installed" with "Show it here" (task-15.3 decision 2's line, the same every time).

### 33. A whole amount of money is written without cents

A value the merged view formats as money is written without cents when it is a whole amount, in the browser's language: "US$1,449" in a Korean browser, "$1,449" in an American one; an amount with cents keeps them. Replaced: "US$1,449.00".

### 34. A merge too few names who answered now

An app that answered leaves the merge's answers, its slot failed, waiting on sign-in or needing an update, under a merge already collapsed because too few answered: the line is written afresh, no longer naming it, and its Retry covers it. Replaced: "Only Shop A answered, so there's nothing to combine." beside Shop A's slot reading "This app isn't installed anymore.".

### 35. The App Library keeps the newest read

The App Library drops a read of the installed apps, or of the accounts, that a newer read of the same overtook: a read asked before an uninstall and answered after it never brings the app back. Replaced: "Shop B is uninstalled." above a list still holding Shop B, the update check's read of the list, asked as the App Library opened, answering after the uninstall's own.

### 36. An offer asking nothing of its apps opens with "From the Store:"

An offer whose plan asks nothing of the apps it offers — an install asked for and nothing else — is marked so when the runtime paints it, and opens with "From the Store:" alone. An install asked for with a request keeps the full line. Replaced: "None of your apps can do this. From the Store:" over "Install Shop B." (task-15.3 decision 2's line).

### 37. An install of an app already installed says so in one line

An install asked for of an app already installed is answered in one line in the shell's words, as the line an install leaves: "Shop A is already installed. Try asking "What cameras do you have?"", one of its skills' example questions, with "Manage Shop A" into the App Library. The installed-apps reader carries each skill's example questions, and a worked example shows the answer. "Palette" is gone from the Planner's prompt, the hub's card and the installed-apps example. Replaced: "Shop A is already installed" over "Shop A (Aperture & Co) is already installed. You can ask it about camera stock or shipping directly from the palette, or manage it in the App Library.".

### 38. The Store's results are the closest, not the best

The Store page heads a search's results "Closest matches". Replaced: "Best matches · 3" over Google Calendar, Shop B and Shop A for "flight booking", the canvas having said "Nothing in the Store can do this yet.".

### 39. The waiting line's Check again

"Shop A has changed, and the Store is waiting on its publisher, a2uiverse-apps." carries Check again, the slot's Retry: the app is judged afresh, its Store entry read again — "Shop A needs an update to show this." with Update once the Store has the update, the same line if not. Replaced: the line with no press (task-15.5 decision 6), standing on two canvases after 0.3.0 was published, until the update landed elsewhere.

*Amended by task 16.11 decision 31.* A Retry from the tile, Check again or Update's, first fetches the app's live card again, within five seconds: the app is judged on its live card as it is now, its Store entry read again — an app back on what the Store holds is called and paints; "Shop A needs an update to show this." with Update once the Store has the update; the same line if neither.

### 40. An update tile whose app was updated says so

Once the page holds the app past the version its line was drawn from, the tile reads "Shop A is updated." with Show it here, and Loading… while its request goes again; the progress line reads "Shop A updated". Replaced: "Shop A has changed, and the Store is waiting on its publisher, a2uiverse-apps." beside "Updated" and Show it here, the progress line "Shop A waiting on its publisher".

### 41. A kept press whose look an update dropped is not sent again

A press kept on a slot, made on a surface drawn in a catalog the app no longer holds after its update, is not sent again: the slot's Retry, Show it here and Update's resend send the plan's request, and the app paints afresh in what it now holds. A press on a surface the update kept is sent again as before. Replaced: Show it here sending the kept press, Shop A updating its list in place in the line 0.3.0 retired, its brown "Back to the list" beside Shop B's own look (task-11.8 decision 23, task-15.5 decision 9).

### 42. An app's words leave the notices once its slot takes the update tile

What an app says in words, while or after its slot takes the update tile, is not shown at the foot of the canvas: the tile says why in the shell's words. Replaced: "Shop A has changed and can't show this here." at the foot of the canvas for some seconds, beside the slot's waiting line.

### 43. An app's step spins while its resend runs

While an app's resend runs — a Retry, or the resend after a sign-in or an update — its step on the progress line spins, even while the answer it showed before is still on the canvas under its tile. Replaced: "✓ CircleCI" beside "CircleCI is updated. · Loading…", the step done because CircleCI's earlier answer was still placed.

### 44. An app no longer in the Store is refused as such

An install of an app its publisher took out of the Store says "Google Calendar isn't in the Store anymore, so nothing was installed.", with nothing to press, on a slot's offer row, the Store page and the App Library alike; an update says "…so nothing changed.". Replaced: "The Store can't be reached right now, so nothing was installed." with Try again, the canvas's Install reading the missing entry, and the orchestrator's install by id, as the Store unreached.

### 45. Try again asks on the consent card when its press never did

A slot's Try again goes with no second card only after a press that passed the consent card, or needed none; a press refused before its card opened — the Store's entry read at the press — asks on the card. Replaced: Try again installing Google Calendar with no consent card ever shown, its first press refused at the entry read (task-15.9's Try again with no second card).

### 46. The offer is at most as wide as the Store page's column

A slot's offer — its line, its rows and More in the Store — is at most 880px wide, the Store page's column, at the slot's leading edge. Replaced: an offer across the whole canvas, Install at its far edge.

### 47. The consent card's access box shows in dark

The box over what an app will ask, on the consent card and the account's permissions, sits one step up the gray scale in dark, gray-3 on the panel's gray-2, as gray-2 sits on white in light. Replaced: in dark, the box the card's own gray-2, "This version asks for more…" and its list loose in the card.

### 48. An install answer the page cannot read says it didn't go through

An install or update whose answer names no cause the page knows — an error page on the way, a route not there — says "That didn't go through, so nothing changed.", with Try again. Replaced: "Shop B can't be updated. Its files didn't pass the checks on this computer, so nothing changed.", for a 404 with no cause.

### 49. The snapshot's second Shop A build draws apart in dark

The registry snapshot's second build of Shop A's catalog changes its dark accent beside its light one, `#77aabe`, the light `#2b6a8a` shifted by the steps Shop A's own pair takes from `#8a5a2b` to `#d69a5f`; the per-paint test holds both appearances. Replaced: the dark accent unchanged, both builds drawing `#d69a5f` in dark.

### 50. The waiting line's replay answers Check again

The update tile's waiting-line replay answers Check again as the orchestrator does: the slot pending with its line kept, then the same line, the Store still waiting; its test presses it. Replaced: a replay with no answer for the press, its test asserting no press on the line.

### 51. The live search test reads the cards as published

The Store's captures are recorded again from the closing launch, the cards in the second person, and the live search test scores them: CircleCI, at the floor for "continuous integration" — 0.145 to 0.164 across runs — is the model's known miss there, and the cut may show 19 apps it should not, as it does on these cards. The cut itself is unchanged. Replaced: captures older than decision 26's descriptions, and 16 allowed, the count when the cut was fitted (task-14.11 decision 27).

## Write-up

### Before the sitting

**Decision 5's fix** (`b5f5b8e`). A call that ends with no UI has the app's live card fetched again, given five seconds; a card naming nothing the app is installed with takes the update tile, the outcome on the dispatch record with no cause. A card still naming something installed, unchanged or unanswered, leaves the call completed as before, the outcome on the record. A call that paints fetches nothing. Four tests, each failing without the fix: two over the agents pool, two over the canvas — the agent moved and answering with no UI taking the waiting line, a Retry then stopped before the call; an app that has not changed resting on its words.

**The regression pass before**, all green:
- The platform's `pnpm verify`: 22 of 22 tasks and 68 script tests. The suites: shell catalog 510, client 857, orchestrator 674, marketplace 80, Stellify 111, sdk 281, embedder 13.
- `a2uiverse-apps`' `pnpm verify`, at `0cf9ada`: 31 of 31.
- The replay suite: 133 passed.
- The live suite: 7 passed — accounts, publish, sign-in, the loop on Calendar, More in the Store, store, update.
- The Python suites: the kit 350, GitHub 144, Gmail 131, Calendar 123, CircleCI 82, Linear 77, Shop A 98, Shop B 99.

**The marketplace stopped alone** (decision 11). Under the platform's `pnpm dev`, the marketplace's process stopped took the client and the orchestrator down with it, turbo ending the run on the marketplace's exit. The marketplace runs in its own terminal for the sitting.

### The sitting, case by case

**The starting state.** The marketplace's state wiped, its embedding model kept; the orchestrator on a fresh state folder, `.state/sitting-15.11/orchestrator`, holding the embedding model's cache; the marketplace in its own terminal; the launch publishing all seven apps as `a2uiverse-apps` and installing them by id but Shop B and Calendar. An orchestrator started by hand on port 10001 was stopped first. The client's dev server stalled in the tunnel, its module requests five to ten seconds each, so the client ran as a built preview on 5173, the agents and the orchestrator restarted with `--no-install`.

**Case 1, the loop on Shop B, stopped at the key.** "Compare camera prices at Shop A and Shop B." planned in 28 s, its Store search for "Shop B" and the gap offering Shop B with a request; the merge collapsed over Shop A alone; Shop B offered with Install and "More in the Store"; the consent card over the slot. The first install's request was dropped in the tunnel, the row reading "The Store can't be reached right now, so nothing was installed." after 60 s (decision 28); Try again installed Shop B in 2 s with no second card, and the slot took the key connect. The key is the reader's to paste.

**Case 2, the sign-in app on Calendar.** "What's on my calendar today, and what needs my attention in Gmail and GitHub?" planned in 33 s, its Store search for "calendar" and the gap offering Calendar; Gmail and GitHub signed in from their tiles through their windows; the merged view a Timeline over them. Install through the consent card, the merged view landing above it as it opened (decision 23); Calendar's sign-in tile and its window; the slot filling; "Joined Google Calendar, Gmail and GitHub", Calendar in a section of its own (decision 24). The journal: the search, the gap and its request, the install by the page, the dispatch stopped for sign-in naming "See your calendar", the sign-in, the resend and the merge taking Calendar in; the first paint's sign-ins unrecorded (decision 27). Fixed on the spot: decisions 23 to 28.

**The state reset, and Case 2 again.** With decisions 23 to 28 committed, the marketplace's state wiped again, the orchestrator's state folder emptied but its model cache, the client rebuilt, and the launch run again; Calendar's published card read in the second person. Case 2 again: the collapse line "No app answered, so there's nothing to combine." (decision 25); the offer and the consent card in the second person (decision 26); Install pressed while the merged view was being made, the view landing above the open card and the card's Install moving 4 px (decision 23); Calendar's slot listing each event once with no id (decision 24); the merged view one list, "Today's timeline & items needing attention", Calendar's events among Gmail's and GitHub's by time (decision 24); the journal's first paint naming Gmail and GitHub stopped for sign-in with their access (decision 27). Decision 28 is the unit tests' until a request is dropped again.

**Case 1, the loop on Shop B.** "Compare camera prices at Shop A and Shop B." planned with its Store search; "Only Shop A answered, so there's nothing to combine." (decision 25); Install through the consent card, installed on the first press this time; the key connected by the reader on Shop B's key page, its window blank for some seconds in the tunnel and opened twice; Shop B's slot filling and the merge coming back on its arrival, "Camera prices" over Camera, Shop A, Shop B and Lowest price. "What's on this canvas?" answered on a canvas of its own as "Current canvas", "Utterance", "Active sources" and "arrived" (decision 29); seen again after the fix: "Where you asked "Compare camera prices at Shop A and Shop B."", "Shop A and Shop B both answered, and the merged view is showing.", You asked, Shop A, Shop B, Merged view. The journal: the search, the gap and its request, the install by the page, the dispatch stopped for the key, two sign-in starts and the sign-in, the resend and the merge made. The answer on a canvas of its own leaves "what is on the canvas I'm looking at" undesigned: to the Backlog.

**Decision 30, seen.** On the camera canvas: "Both Shop A and Shop B answered, and the merged view is showing cameras joined across both shops, ordered by lowest price ascending.", each shop with what it was asked for, the merged view with its columns; each app's line still ends "— answered". On a canvas of Linear and CircleCI not signed in: "Both Linear and CircleCI are waiting for you to sign in. Once you sign in to both from their slots, the merged view can join Linear issues to CircleCI builds.", each app with what it was asked for and "sign in to … from its slot", the merged view not shown with what it was planned to join and its columns.

**Case 3, "More in the Store" on Shop B, with the uninstalled slot.** Shop B uninstalled from the App Library, its key signed out; on the camera canvas a press on a row of Shop B's answer gave "This app isn't installed anymore." with Retry and no reinstall, the merged view collapsing to "Only Shop A answered, so there's nothing to combine." with "Retry Shop B", and "dispatch failed" at the foot of the canvas (decision 31). "Compare camera prices at Shop A and Shop B." planned in 28 s and "Which cameras can I buy, and where?" in 41 s, each offering Shop B with Install and More in the Store. On canvas 2 Shop B's name opened its view in the Store, and Back closed it; More in the Store opened the Store on "camera shop", Shop B to install and Shop A installed. The reader installed Shop B there through the consent card and connected its key; canvas 2's slot filled, "Cameras" over Shop A, Shop B and Lowest price, its prices "US$1,449.00" (decision 33). On canvas 1 Shop B's row read "Installed" with "Show it here" under "None of your apps can do this." (decision 32); pressed, the slot filled in 2 s with no consent and "Camera comparison" came back. The journal: the uninstall by the page and the key revoked, the press failed `uninstalled`, the two questions, the Store opened on Shop B and on "camera shop", the install by the page, canvas 2's slot taking Shop B and stopping for the key, the key connected and its Retry, canvas 1's Show it here completing. Seen again after the fixes: a merged view's prices "US$1,449" (decision 33); a press on a row of Shop A's answer after Shop A was uninstalled, its slot "This app isn't installed anymore." with nothing at the foot of the canvas (decision 31), the line left "Only Shop A answered" (decision 34); Shop B installed from the Store with an offer of it open, the offer's line "From the Store:" (decision 32); after the fix, the same press under a merge already too few, the line "No app answered, so there's nothing to combine." with "Retry Shop A" (decision 34). Shop A installed again; Shop B left installed with no key.

**Case 4, the install ask.** Shop B uninstalled from the App Library before each half. "Install Shop B." offered Shop B under "None of your apps can do this." (decision 36); Install through the consent card, the row "From the Store:" and "Installed" with "Loading…" for 11 s, then "Shop B is installed. Try asking "What cameras do you have?"", nothing sent to Shop B. The second uninstall said "Shop B is uninstalled." above a list still holding Shop B (decision 35). "Install Shop B and show me its cameras." offered Shop B; "What's on my calendar today?" asked on a canvas of its own, then the first canvas opened from the trail, parked, and Install pressed on its offer through the consent card. The request was dropped in the tunnel: after 60 s the row read "That didn't go through, so nothing was installed." with Try again (decision 28, seen); Try again installed Shop B in 2 s with no second card, the slot took the key connect, the reader connected the key, and the slot filled with Shop B's cameras. "Install Shop A.", asked with Shop A installed, answered within 25 s: "Shop A is already installed", then "…directly from the palette…" (decision 37), and "Manage Shop A" opening Shop A's view in the App Library. The journal: the uninstall by the page, "Install Shop B." and its install by the page, the gap's `useApp` with nothing dispatched; the second uninstall; the two questions; the install by the page after Try again, the gap's `useApp` stopped for the key, the key connected, the resend completing; "Install Shop A." with nothing dispatched, its plan calling the installed-apps reader; "Manage Shop A" opening the App Library. The dropped request never reached the orchestrator and is not journaled. Seen again after the fixes: "Install Shop A." answered "Shop A is already installed. Try asking "What cameras do you have?"" with "Manage Shop A", in 32 s (decision 37); Shop B uninstalled, the list at once without it; "Install Shop B." under "From the Store:" alone (decision 36), and Shop B installed from it to the installed line, left with no key. Decision 35 is the unit tests' until the race is met again.

**Case 5, nothing to offer.** "Book me a flight to Tokyo next Friday." gave "Nothing in the Store can do this yet." with "Search the Store"; pressed, the Store page opened on "flight booking" with "Best matches · 3", Google Calendar, Shop B and Shop A, all installed (decision 38). The marketplace stopped, the client and the orchestrator stayed up; the same question on a canvas of its own gave "Couldn't reach the Store.", and its "Search the Store" opened the Store page on "The Store can't be reached right now. Your installed apps still work. Try again in a moment." with Try again. The marketplace restarted on the same state folder with all seven apps, and the page reloaded on the Store's search. With Shop A uninstalled, the same question planned in 66 s: three searches — "flight booking" and "travel" returning Shop A, "flight" nothing — and no app offered, "Nothing in the Store can do this yet."; Shop A installed again. The journal: the searches, the gap with no offer, each question's plan. Seen again after the fix: the Store page on "flight booking" headed "Closest matches · 3" (decision 38).

**Case 6, Shop A's chain.** Shop B's key connected again by the reader first. Made for the run in `a2uiverse-apps`: Shop A's catalog copied to a new id, `catalogs/v2`, with Video removed and its accent turned from brown to purple; the agent holding both lines at 0.2.0, then the new alone at 0.3.0. Step 1: 0.2.0 published with both lines; the App Library read "A new version is available"; "Compare camera prices at Shop A and Shop B." composed with Shop A in its old look and no tile. Step 2: the old line deleted, 0.3.0 restarted and not published. The spec's Retry has nothing to retry on a slot that painted, so a press on a row of Shop A's answer stood in: it reached the agent, which painted nothing, and the card fetched again gave "Shop A has changed, and the Store is waiting on its publisher, a2uiverse-apps.", with "Shop A has changed and can't show this here." at the foot of the canvas (decision 42). The waiting line has no Retry, so "Which cameras can I buy, and where?" on a canvas of its own stood in for the second: the same line, stopped before the call, Shop A's log holding the press's one call. Step 3: 0.3.0 published, retiring the old line; the App Library read "Needs an update to keep working", both canvases still on the waiting line with nothing to press (decision 39). The comparison asked again gave "Shop A needs an update to show this." with Update, straight through: Shop A repainted in purple beside Shop B's own look, and the merged view came back. Both older canvases turned to "Updated" with Show it here beside the waiting sentence, the progress line "Shop A waiting on its publisher" (decision 40). Show it here on the first canvas sent the kept press again: Shop A updated its list in place, in the old look (decision 41); on the second, the plan's request, Shop A painting afresh in purple. The journal: the comparison, the key connected and its resend, the press failed with the card fetched again changed and the waiting line, the second question stopped before the call with the same line, the third with the needs-an-update line, the install-over by the page, and the three resends completing.

**The state restored.** A `pnpm dev:all` started between Case 6 and its fixes ran the launcher against the sitting's state folder, named in the orchestrator's `.env`: its reconcile installed the five vendor apps from this computer and uninstalled Shop A and Shop B, Shop B's key going with it. The sitting's processes were started again and all seven apps installed from the Store by id, Shop A at 0.3.0.

**Decisions 39 to 42, seen.** Made for the run: a third copy of Shop A's catalog, `catalogs/v3`, its accent crimson, the agent holding it alone at 0.4.0. "Compare camera prices at Shop A and Shop B." with Shop A in purple, Shop B not connected; Shop A moved to 0.4.0, not published. A press on a row of Shop A's answer reached the agent and gave the waiting line with Check again, nothing at the foot of the canvas (decisions 39, 42); Check again judged it afresh in 4 ms, the agent not called, the same line. The comparison asked again on a canvas of its own took the same line before the call. 0.4.0 published, retiring the purple line: Check again there gave "Shop A needs an update to show this." with Update (decision 39); Update gave "Shop A is updated." with Loading… for about 15 s while the new look loaded through the tunnel, then Shop A in crimson. Back on the first canvas: "Shop A is updated." with Show it here, the progress line "Shop A updated" (decision 40); Show it here painted Shop A's list afresh in crimson, the journal's resend creating `shop-a:list` (decision 41). The journal: the comparison, the press failed with the card fetched again changed and the waiting line, Check again stopped before the call, the second question stopped before the call, Check again with the needs-an-update line, the install-over by the page, and both resends completing.

**Case 7, CircleCI's chain.** Made for the run in `a2uiverse-apps`: CircleCI's first sign-in asking for "Rerun and cancel your workflows" beside read access, at 0.2.0. Step 1: "How are my builds doing?" stopped for sign-in, CircleCI's tile asking only "See your projects, pipelines and their runs"; signed in as retz8 through the window, the slot showed "Recent pipeline runs". Claude in Chrome was refused on CircleCI's sign-in page until its tunnel address was allowed. Step 2: 0.2.0 restarted and not published; the App Library read "A newer version is on its way from the publisher" and was closed; the marketplace stopped. The spec's Retry has nothing to retry on a slot that painted, so a press on the failed run's row stood in: "CircleCI has changed, and the Store couldn't be reached." with Retry, the progress line "CircleCI couldn't check for updates", not the needs-more-access tile, CircleCI not called. The marketplace restarted, Retry gave "CircleCI has changed, and the Store is waiting on its publisher, a2uiverse-apps." with Check again. Step 3: 0.2.0 published — Stellify's publish refusing a card that requires sign-in without a preview, the launcher's own preview and publish run for CircleCI alone; Check again gave "CircleCI needs an update to show this." with Update, and Update opened the consent card over the slot: "This version asks for more. The next time you use it, CircleCI will also ask to be able to" over "Rerun and cancel your workflows". Step 4: Update confirmed, "CircleCI is updated." with Loading…, the progress line "✓ CircleCI" meanwhile (decision 43); then "Needs more access" with Allow. Allow's window signed in again with no chooser, CircleCI's sign-in page remembering the account, and the slot filled with the run pressed in step 2, the kept press sent again over a look the update kept (decision 41). The journal: the question stopped for sign-in, the sign-in and its resend, the press stopped on the new permission with the Store unreached, the Retry with the waiting line, Check again with the card update, the install-over by the page, the resend stopped for "pipelines.write", the sign-in for it and the resend completing. CircleCI's agent called three times: the first answer, the preview, the kept press. Seen again after the fix, on the rebuilt client: CircleCI's account signed out in the App Library, a press on the failed run's row gave the sign-in tile over the answer on screen; signed in again through the window, CircleCI's step read, as recorded in the page, done, working for the press, "CircleCI not signed in", "CircleCI signing in", working for about a second while the resend ran, then done (decision 43).

**Case 8, Linear's newer build.** "What's assigned to me in Linear?" stopped for sign-in, Linear's tile asking "See your issues"; signed in through the window, Claude in Chrome allowed on Linear's sign-in page first, the slot showed "My issues". "Which of my Linear issues are in progress?" on a canvas of its own showed the same list. Made for the run: Linear's palette warmed, its base cream and its accent orange, rebuilt and published at the same card, 0.1.0, the catalog moving to a new build. The App Library opened over the open canvas read every app "Up to date", its check having installed the newer build, journaled as an install-over. The list on screen kept its cool grey. A press on an issue painted a new surface in the new build, cream; Linear's back arrow returned to the list in the old look, a forward arrow beside it. On the past canvas, a press on an issue was answered in the new build. Linear's deterministic answer to opening an issue is its one recording, A2U-5, whichever issue is pressed. The journal: the first question stopped for sign-in, the sign-in and its resend, the second question, the install-over, the press creating its surface, the step back to the first paint, and the past canvas's press creating its own. No points.

**Case 9, the install refused.** Google Calendar uninstalled from the App Library: "Google Calendar is uninstalled and its account is signed out." "What's on my calendar today?" offered it under "None of your apps can do this. From the Store:", with Install and More in the Store. The dev publisher unpublished Calendar, and Install gave "The Store can't be reached right now, so nothing was installed." with Try again (decision 44). Calendar published again; Try again installed it with no consent card, the card never having been shown (decision 45), and the slot took Calendar's sign-in, "See your calendar". The reader found the offer too wide across the full canvas, Install at its far edge (decision 46). The journal: the uninstall by the page and the account signed out, the question, the install by the page, the gap's `useApp` stopped for sign-in. The refused press never reached the orchestrator and is not journaled. Calendar left installed, not signed in. Seen again after the fixes, on the rebuilt client and the orchestrator restarted: Calendar uninstalled, "What's on my calendar today?" offered it at the Store column's width, Install beside its description (decision 46); with the marketplace stopped, Install gave "The Store can't be reached right now, so nothing was installed." with Try again, and once it was restarted, Try again opened the consent card (decision 45), cancelled; Calendar's view opened in the Store from its name, the dev publisher unpublished Calendar, and Install there through the page's card gave "Google Calendar isn't in the Store anymore, so nothing was installed.", Install disabled; back on the canvas, Install on the offer gave the same line, Install disabled (decision 44). Calendar published again and installed by id. The journal: the uninstall, the question, the Store opened from the offer, the page's install refused as not published.

**Case 10, the no-update line.** Made for the run in `a2uiverse-apps`: Shop B's catalog copied to a new id, `catalogs/v2`, the agent holding it alone, restarted. The App Library, opened while Shop B was still published, read Shop B "A newer version is on its way from the publisher", its live card fetched again; the dev publisher then unpublished Shop B. "Compare camera prices at Shop A and Shop B." gave Shop B's slot "Shop B has changed, and the Store has no update for it.", with no press, the progress line "Shop B no update available", Shop A in crimson and "Only Shop A answered, so there's nothing to combine."; Shop B's agent not called, the update check before the key. The journal: the question, Shop B's dispatch stopped on the catalogs with the no-update line and the state not published, Shop A completed. No points.

**The dark walk.** The stack stopped; the client built against the registry snapshot with its orchestrator address on port 5173's tunnel address, `preview:snapshot` naming `localhost:4173`, and served on 5173; the reader switched the browser to dark. Each store-loop beat opened with `&byhand`: beat 31, Shop B installed in the snapshot's world, "From the Store:" with Installed and Show it here, its press answered by Shop B's key tile; beat 32, both shops offered at the Store column's width, its recording holding no press; beats 33 and 34, Show it here answered by the installed line and by Shop B's key tile; beat 7, "Nothing in the Store can do this yet." and the Store page's search; the Store unreached, "Couldn't reach the Store."; needs an update, Update refused by the snapshot's 404 in the checks' words (decision 48); waiting, Check again unanswered (decision 50); the slot Shop B was uninstalled from; CircleCI's update card, its access box lost in the card (decision 47); and the per-paint builds, the two builds alike in dark (decision 49). Every line, press and tile read in dark but those. Seen again after the fixes, on the rebuilt client and snapshot: Check again took the slot to pending with its line kept and back to the same line; the access box drawn on the card; "That didn't go through, so nothing changed." with Try again; the second build's Price `rgb(119, 170, 190)` and the first canvas's `rgb(214, 154, 95)`.

### After the sitting

**The state left.** Every temporary edit in `a2uiverse-apps` reverted — Shop A's two extra lines and versions, CircleCI's new permission and version, Linear's palette, Shop B's new line — the checkout clean at `b85bbfa`, the three catalogs rebuilt. The marketplace's state wiped, its embedding model kept; the `STATE_DIR` line naming the sitting's folder taken out of the orchestrator's `.env`; the sitting's folder removed.

**The regression pass after**, all green:
- The platform's `pnpm verify`: 22 of 22.
- `a2uiverse-apps`' `pnpm verify`, at `b85bbfa`: 31 of 31.
- The Python suites: the kit 350, GitHub 144, Gmail 131, Calendar 123, CircleCI 82, Linear 77, Shop A 98, Shop B 99.
- The Store's captures recorded again from the closing launch's marketplace (decision 51); the live search test on them, three runs.
- The replay suite: 134 passed. Before the baselines were taken again, 21 screenshots differed, each by a decision of the sitting — the collapse line (decision 25), the second-person descriptions (decision 26), "Closest matches" (decision 38), Check again (decision 39), the updated line (decision 40) — and 3 checks on the captures' date. The baselines are each machine's own, not in the repo.
- The live suite: 7 passed — accounts, publish, sign-in, the loop on Calendar, More in the Store, store, update.

**The closing launch.** Under the publish with both tiers, all seven apps published as `a2uiverse-apps` and installed by id, none left uninstalled.

### Findings

- A plan that searches the Store takes about 30 s and up to 41 s: 28 s for the camera comparison, 33 s for the day's agenda, 41 s for "Which cameras can I buy, and where?"; "Install Shop A." answered within 25 s, and in 32 s with decision 37's worked example.
- The Store's search can't tell a search nothing fits from a match: with the embedding model all-MiniLM-L6-v2, "flight booking" scores Google Calendar 0.24 and "flights" Shop B 0.225, above the lowest right match in the labelled searches, "continuous integration" and CircleCI at 0.164, so no floor and margin keep every expected app and drop the flight searches' — the best cut on the cards as published shows 18 apps it should not across the labelled searches and 13 across ten flight, travel and booking searches. The Planner judges fit and offers none, searching again: 66 s. In the Backlog.
- The live search test scored Store recordings older than decision 26's descriptions; on the cards as published the cut shows 19 apps it should not across the labelled searches, against the 16 it allowed, and CircleCI's score for "continuous integration" moves between 0.145 and 0.164 with what is embedded beside it, across the floor. Recorded again and the test set to the cards as published (decision 51).
- Linear's deterministic answer to opening an issue is its one recording, A2U-5, whichever issue is pressed. In the Backlog.
- Claude in Chrome asks leave per site, and each tunnel port is a site of its own: a sign-in window on an agent's port not yet allowed stops the run until the reader allows it.
- A `pnpm dev:all` run against an orchestrator whose `.env` names a sitting's state folder reconciles that folder's registry: the sitting's apps installed from this computer, the ones it left out uninstalled.
- The tunnel holds requests for seconds at a time: an install's row read "Installed" with "Loading…" for 11 s once and 1.5 s the next, an update's line "Loading…" for about 15 s while the new look loaded, the client's read of the installed apps and its `useApp` crossing the tunnel; the Store's list once took about 8 s to load, and a consent card up to 8 s to open.
- A question that changes only part of the canvas on screen is undesigned: every question opens a canvas of its own, so "What's on this canvas?" answers about the canvas it was asked from. In the Backlog, worth discussing before Phase 20.
