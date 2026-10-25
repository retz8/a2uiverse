# Task 16.11 — Integration + acceptance

Spec for sub-task 16.11 of Phase 16 (`_dev/docs/spec/phase-16-upstream-upgrade.md`, decision 8): the phase's acceptance run through the tunnel, every agent in `live` mode on the new kit, the platform on `@a2ui/react` and `@a2ui/web_core` 0.14.0 and every catalog re-packed for the new host-module interface. It covers phase decision 8's list and every other change of the upgrade a person can see or do, and carries the question 16.8 left to the live run: whether the Planner and the Synthesizer still repair their output on a retry, reading `@a2ui/web_core`'s wording.

## Scope

- The two checks: the regression pass, and one sitting by hand through the tunnel.
- How the sitting is driven, how points found in it are handled, and where the code is worked.
- The agents' mode, and what the sitting touches.
- The starting state, and the state the sitting leaves.
- The temporal merge with Calendar's loop; the camera comparison with Shop B's loop; the entity join.
- Each fragment's reading presses, the two shops' chip sets, the quiet stand-ins; writes on the live accounts.
- The dark walk.
- Linear's newer build.
- The update tile every way in: Shop A's chain with the refused paint, CircleCI's chain, Shop B's no-update line.
- The old-interface pack refused.
- The Planner's and the Synthesizer's retry, forced.
- The journal after each case.
- What stays with the automated tests.
- The sitting's order and the record.
- Out: the amendments the sitting calls for, 16.12's.

## Locked decisions

### 1. Two checks

The regression pass:
- `pnpm verify` in both repos;
- the client's replay suite against the baselines on disk;
- the live suite, whole, run while the sitting's stack is down;
- each Python agent's tests, run apart.

It runs before the sitting, every failure and diff named and anything unexplained fixed before going on. It runs again after the sitting, the baselines retaken on disk and what changed named. Then there is one sitting by hand through the tunnel.

### 2. The sitting is driven case by case

Before each case Claude gives a brief of what it tests. On the reader's go, Claude drives the page in the reader's browser through Claude in Chrome on the tunnel's addresses, and runs every terminal command on the Mac. After each case the reader gives UX and design feedback, fixed on the spot before the next case.

### 3. Nothing is deferred

Every point the reader raises or the sitting finds is fixed on the spot, one at a time, agent side included — a difference the upgrade made, a fault it did not make, and a change of design the reader asks for alike — then seen again, and added to this spec as a numbered decision with what it replaced. A fix that changes behaviour is carried into SPEC by 16.12. A point asking for something a later phase builds is recorded as a finding for that phase.

### 4. Worked directly on `main`

The platform's code goes on `main`. The agents', the kit's and the catalogs' code goes on `a2uiverse-apps`' `main`. There is no worktree. Each fix is committed as it lands. The edits made for the run are never committed and are reverted by the end of the sitting.

### 5. Every agent runs `live`

The five vendor agents on their vendors' official MCP servers with the reader's accounts, the two shops on the model over their own data.

### 6. What the sitting touches

Phase decision 8's list, and every other change of the upgrade a person can see or do: the quiet stand-ins, navigation from a merged cell, each catalog's components pressed inside its fragment, the Store's live previews, an install while the client is open landing without a reload, an artifact packed for the old host interface refused, and the seven catalogs in dark. Each is produced live where the run's own means can make it; what cannot be is named in the write-up as left to the automated tests (decision 21).

### 7. The starting state

- The marketplace's state is wiped, its embedding model kept.
- The orchestrator runs on a fresh state folder holding only the embedding model's cache, named only in the sitting's own shells. The default orchestrator state folder is left as it is.
- The marketplace runs in its own terminal.
- The launcher runs both tiers in `live` under its publish, Calendar and Shop B published and left uninstalled. Every app passes the marketplace's publish gate, its hello-fragment smoke test included; the other five are installed from the marketplace by id.
- The tunnel's addresses are set for the agents' sign-in pages, but CircleCI's, which runs on a launcher of its own with its return address carried by hand in the window.
- Every account is signed in from its tile the first time its app composes, Shop B's key connected by the reader.
- The Planner, the Synthesizer and the seven agents run on `gemini-3.8-flash`.
- The client runs as a built preview if the dev server's module requests stall in the tunnel.

### 8. The temporal merge with Calendar's loop

A question about the day gathering from Gmail and GitHub that also needs a calendar:
- Calendar offered in its slot beside the merge reserved over them;
- Install through the consent card in the slot;
- Calendar's sign-in tile, and its sign-in window through the tunnel;
- the slot filling, and the merge taking Calendar in: the timeline over Calendar, Gmail and GitHub.

### 9. The camera comparison with Shop B's loop

"Compare camera prices at Shop A and Shop B.", asked with Shop A installed and Shop B not:
- the merge reserved over Shop A, and Shop B offered in its slot;
- Install through the consent card in the slot;
- Shop B's key connected;
- the slot filling, and the merge taking Shop B in.

Shop B's listing is opened in the Store for its live preview.

### 10. The entity join

Once the agents are up, Claude reads what Linear, GitHub and CircleCI answer for the linked set Phase 7 built: Linear issue A2U-8, in progress, linked to pull request #8 by "Fixes A2U-8" in its description, with a failing CircleCI run. Where it holds, the case runs as it is. Where it does not, it is rebuilt as task 7.9 did: the reader creates or moves the Linear issue, Claude edits the pull request's description once; anything beyond those two is asked first.

The join lands live, and a merged cell tapped lands on its element in the vendor's fragment.

### 11. Inside each fragment

- One reading press per app, then the fragment's back arrow: a pull request in GitHub, a message in Gmail, an event in Calendar, an issue in Linear, a run in CircleCI, a camera in each shop.
- The two shops asked something both filter, so two chip sets stand on one canvas: a chip picked in one leaves the other as it was.
- While each fragment streams in, the page is read for developer text where a child is still loading, and shows only the quiet stand-in.

### 12. No write on a live account without asking

No press writes to the reader's GitHub, Google, Linear or CircleCI accounts without the reader asked first, case by case. CircleCI's new permission, granted in its chain, is used for nothing. The only change planned is decision 10's one edit of the pull request's description, made only when the linked set needs it.

### 13. The dark walk

After the composition cases, the reader switches the browser to dark and Claude walks the trail back over the canvases the sitting made — the temporal merge, the camera comparison and the entity join, all seven catalogs among them — and opens the Store's previews.

### 14. Linear's newer build

Phase decision 8's newer build on an open canvas, as task 15.11 decision 15 ran it, live:
- A canvas has Linear's surfaces on screen. A second canvas showing Linear is left as a past canvas.
- Made for the run: a visible change to Linear's catalog, published at the same card. The App Library, opened over the canvas, has its check install the newer build.
- On the open canvas, a press inside Linear's fragment painting a new surface is drawn in the new build. The surfaces on screen keep the old look, and the fragment's back arrow returns to a paint keeping the old look.
- On the past canvas, an action pressed is answered in the new build.

### 15. Shop A's chain, with the refused paint

Task 15.11 decision 12's chain, as its decisions 39 to 41 left it, live. Made for the run: Shop A's current catalog moved to the kit's old line as published, and a new line holding a copy of its catalog under a new catalog id, with Video removed and one visible theme change.

1. **Suggested, not forced.** Shop A at a new card version with both lines, restarted and published. The App Library reads a major update. The camera comparison composes, Shop A painting in the old id, with no tile.
2. **Ahead of the Store.** The old line deleted, Shop A at the next card version, restarted and not published. A press reaches the agent, the call ends with no surface, and the card fetched again gives "Shop A has changed, and the Store is waiting on its publisher, a2uiverse-apps." with Check again. A second question is stopped before the call, on the card fetched.
3. **The refused paint.** Made for the run: Shop A's agent, holding only its new line, paints in it although the hub offers only the old. The hub refuses the paint, and the card fetched again gives the waiting line. The edit is reverted.
4. **The forced update and the repaint.** The new version published, retiring the old line. Check again gives "Shop A needs an update to show this.", and Update goes straight through. The slot sends its request again, and Shop A repaints in the new id with the new look while the other surfaces on screen keep the old. An older canvas's Shop A slot waiting on the same update reads "Shop A is updated." with Show it here.

### 16. CircleCI's chain

Task 15.11 decisions 13 and 14's new-permission variant, live:
1. CircleCI, signed in with read access, answers "How are my builds doing?".
2. CircleCI's card at a new version requiring `pipelines.write` beside read access, restarted and not published. The App Library is opened, its check fetching the live card again, and closed. The marketplace is stopped: a press gives "CircleCI has changed, and the Store couldn't be reached." with Retry. The marketplace restarted, Retry gives "CircleCI has changed, and the Store is waiting on its publisher, a2uiverse-apps." with Check again, not the needs-more-access tile.
3. The new version published, a card update. Check again gives "CircleCI needs an update to show this.". Update opens the consent card in the slot, asking for more in the card's words, and is allowed.
4. The slot sends again. The account lacks the new permission, so the slot takes the needs-more-access tile. The account is signed in again through the window, granting it, and the slot fills.

### 17. Shop B's no-update line

Shop B's catalog moved to a new id with no old line, Shop B restarted, and the dev publisher unpublishes it. The camera comparison's Shop B slot shows "Shop B has changed, and the Store has no update for it.", with no press.

### 18. The old-interface pack refused

Made for the run, in a scratch checkout: Shop B's catalog packed at `a2uiverse-apps`' commit before 16.9, `1f87a91`, with the Stellify it pinned then, for the old host interface. It is offered at publish and at install from disk, and each refuses it, the refusal naming the host interface.

### 19. The Planner's and the Synthesizer's retry, forced

Made for the run, in the orchestrator: the first attempt's output damaged after the model returns it, with a mistake `@a2ui/web_core`'s checks catch. Once for the Planner and once for the Synthesizer, on fresh canvases: Claude reads the findings the model was sent, and the second answer validates and paints. The edit is reverted.

### 20. The journal after each case

After each case, Claude reads the case's journal entries on the Mac and says whether everything the case did is there. A missing or wrong entry is a point like any other.

### 21. Left to the automated tests

Not produced live, each named in the write-up with the tests that hold it:
- the quiet stand-in for an unknown component, and for a child reference that cannot be resolved;
- the client's load gate refusing a build packed for the old host interface;
- an update refused;
- the no-update line for an app installed from your computer.

### 22. The state the sitting leaves, and the closing launch

- Every edit made for the run is reverted: in `a2uiverse-apps`, Shop A's two lines and versions and its refused-paint edit, CircleCI's new permission and version, Linear's catalog change and Shop B's new line, the checkout holding only the committed fixes; in the platform, the orchestrator's damaged first attempt.
- The scratch checkout of decision 18 is removed.
- The marketplace's state is wiped again, its embedding model kept. The sitting's orchestrator state folder is removed.
- On the live accounts, decision 10's linked set, if rebuilt, and the agents' own sign-ins stay.

Then a closing launch runs both tiers in `deterministic` under the publish, all seven apps published and installed by id, none left uninstalled. The Store's captures are recorded again from the closing launch only when a fix in the sitting changed an app's card.

### 23. The sitting's order

1. The regression pass before.
2. Decision 18's old pack made.
3. The starting state, then decision 10's linked set read.
4. The temporal merge with Calendar's loop.
5. The camera comparison with Shop B's loop.
6. The entity join.
7. The dark walk.
8. Linear's newer build.
9. Shop A's chain, with the refused paint.
10. CircleCI's chain.
11. The old-interface pack refused.
12. Shop B's no-update line.
13. The Planner's and the Synthesizer's retry, forced.
14. The stack down, and the state left.
15. The regression pass after.
16. The closing launch.

Each case's reading presses and checks inside its fragments (decision 11) run within the composition case that paints them.

### 24. The record

This spec is the record. Each on-the-spot fix is added as a numbered decision as it lands, with what it replaced.

The write-up has four parts: before the sitting, the sitting case by case, after it, and the findings. Findings for later phases go into their phase's notes in `_dev/TODO.md` at the write-up. Every amendment to the phase spec, SPEC.md and earlier sub-task specs that 16.11 calls for is made by 16.12.

### 25. The way back brings back a merge the Synthesizer set aside

A step to a combination of paints the merge was accepted over brings the merged view back when the Synthesizer declined, or couldn't make, the merge over the combination in between: the slot left as an accept leaves it, the shell repainted, with no call. A collapse the sources' state made stands. Replaced: the decline line kept over a wiring the orchestrator and the client had both restored.

### 26. GitHub's catalog lays a page out by its fragment's width

GitHub's `PageLayout` follows the width of the fragment it is drawn in, not the window's: below Primer's breakpoint, 48rem, Primer's narrow layout holds — the regions stacked, the pane at full width before or after the content, the dividers and what is hidden as their narrow variants say. GitHub's catalog at 0.2.1, republished at the same card; the registry takes the newer build at its check. Replaced: the pane beside the content in a 574px slot, the pull request's conversation 221px wide, a word to a line.

### 27. The deterministic roster after the first case

The temporal merge with Calendar's loop ran with every agent `live`. Every case after it runs on the deterministic roster, the Planner and the Synthesizer still on `gemini-3.8-flash`: the entity join on the deterministic set, Calendar's reading press on the deterministic roster's events, no write reaching a live account. Amends decisions 5, 7, 10 and 12. Replaced: every agent `live` through the sitting.

### 28. The way back restores the merged view's own tree

A step that restores a wiring the merge accepted puts back the merged view as it was accepted — its tree and its values — so a section a later re-synthesis added leaves with it, and returns with a step forward. Replaced: the remembered values over the latest tree, an empty "Calendar" section standing under the restored table.

### 29. The two shops' chip sets stay with the automated tests

The two shops, run `live` for one filtering question and then a second, answered both with their lists and sort buttons and no chip set. A `ChoicePicker` in each of two surfaces on one page, each its own radio group, is the client's renderer test's, on upstream's basic catalog, and is named in the write-up beside decision 21's items. Amends decision 11. Replaced: the two shops' chip sets checked live on one canvas.

### 30. GitHub's catalog draws in the OS appearance

GitHub's catalog follows the appearance the canvas follows, as the other six catalogs do: in dark, Primer's dark colors. GitHub's catalog at 0.2.2, republished at the same card; the registry takes the newer build at its check. Replaced: Primer's light colors on the dark canvas, the pull requests' titles dark grey on near-black and the branch names on white chips.

### 31. Check again judges the app on its live card as it is now

A Retry from the update tile, Update's or Check again, fetches the app's live card again before the check before the call, so an app back on what the Store holds is called and paints. Replaced: the check judging on the card the run last fetched, the waiting line standing after the app moved back until the App Library's check fetched its card again.

## Write-up

### Before the sitting

**The regression pass before**, all green, the gates run uncached:
- The platform's `pnpm verify`: 22 of 22 tasks and 68 script tests. The suites: shell catalog 520, client 884, orchestrator 683, marketplace 80, Stellify 112, sdk 301, embedder 13.
- `a2uiverse-apps`' `pnpm verify`, at `7a6d88d`: 31 of 31.
- The replay suite: 134 passed.
- The live suite: 7 passed.
- The Python suites: the kit 351, GitHub 143, Gmail 130, Calendar 122, CircleCI 82, Linear 77, Shop A 98, Shop B 99.

**Decision 18's old pack.** Shop B's catalog packed at `a2uiverse-apps` `1f87a91` with the Stellify it pinned, its descriptor naming host interface 0.9.1.

### The sitting, case by case

**The starting state.** The marketplace's state wiped, its embedding model kept; the orchestrator on a fresh state folder, `.state/sitting-16.11/orchestrator`; the marketplace in its own process; the client as a built preview on 5173, the dev server's module requests stalling in the tunnel.

**Case 1, the temporal merge with Calendar's loop**, every agent `live`. Calendar offered in its slot beside the merge, installed through the consent card, signed in through its window, the slot filling and the merge taking Calendar into the timeline; the stand-ins quiet; Gmail's scope escalation live. Points: the way back left a merge the Synthesizer had declined collapsed (decision 25, orchestrator `7b78048`); GitHub's pull request laid out beside its pane in a narrow slot, its conversation a word to a line (decision 26, GitHub's catalog 0.2.1, `a2uiverse-apps` `ad7ea37`); Calendar had no event to open; the way back kept the latest merge's tree, an empty "Calendar" section standing under the restored table (decision 28, client `f12db77`). The Gemini key's prepaid credit ran out mid-case (decision 27).

**Case 2, the camera comparison with Shop B's loop**, on the deterministic roster. Shop B offered in its slot, installed, its key connected, the slot filling and the merge taking Shop B in; Shop B's listing opened in the Store for its sample answer; each shop's camera opened and its "Back to the list" pressed. The shops run `live` for one filtering question and a second answered with their lists and sort buttons and no chip set (decision 29).

**Case 3, the entity join**, on the deterministic set. The join landed; a merged cell tapped landed on its element in the vendor's fragment; Linear's and CircleCI's presses and back arrows restored with no call.

**Seen again on the deterministic roster.** Calendar's event opened from the deterministic roster's events. The way back restored the merged view's own tree, Calendar's events back in the timeline and no empty section (decision 28). The declined merge brought back (decision 25) was not produced again, no walk declining; held by its orchestrator test. GitHub's narrow layout (decision 26) was not produced again, no deterministic flow painting a pull request; seen by the sheet injected on the live pull request in case 1, and the shipped 0.2.1 build carrying the container query.

**Case 4, the dark walk.** The browser switched to dark; the trail walked over the six canvases the sitting made, and the Store's seven sample answers opened. The canvas, the trail, the merged tables, Gmail, Calendar, Linear, CircleCI, Shop A and Shop B drew in dark. GitHub drew Primer's light colors on the dark canvas, its titles dark grey on near-black and its branch names on white chips (decision 30, GitHub's catalog 0.2.2, `a2uiverse-apps` `db7b6f3`). Seen again: the entity join asked afresh, GitHub's fragment in dark from the 0.2.2 build, and its Store sample in dark. Calendar's step back journaled as a step with no call, its combination seen, the walk silent; opening the canvases from the trail journaled nothing. A page opened by its address is a reload, and a reload starts a fresh session: the trail emptied.

**Case 5, Linear's newer build.** "What's assigned to me in Linear?", then "Which of my Linear issues are in progress?" on a canvas of its own. Made for the run: Linear's palette warmed, its base cream in light and brown in dark and its accent orange, published at the same card, 0.1.0. The App Library opened over the open canvas read every app "Up to date", its check having installed the newer build, journaled as an automatic install-over. The list on screen kept its cool grey; a press on an issue painted a new surface in the new build; Linear's back arrow returned to the list in the old build, "Forward to A2U-5" beside it. On the past canvas, a press on an issue was answered in the new build. The orchestrator answered each press in about 10 ms; the new build loading through the tunnel held each paint about 10 s. The journal: the sign-in refreshed, the two questions, the install-over, the press creating its surface, the step back with no call, the past canvas's press creating its own. No points.

**Case 6, Shop A's chain, with the refused paint.** Made for the run: Shop A's catalog copied to a new id, `catalogs/v2`, with Video removed and its accent turned from brown to purple; its current catalog packed as published, the pack the same artifact the registry held; the agent holding both lines at 0.2.0, then the new alone at 0.3.0. Step 1: 0.2.0 published with both lines; the App Library read "A new version is available"; "Compare camera prices at Shop A and Shop B." composed with Shop A in the old build, brown, and no tile. Step 2: the old line deleted, 0.3.0 restarted and not published; a press on a row of Shop A's answer reached the agent, which answered with no UI, the card fetched again giving "Shop A has changed, and the Store is waiting on its publisher, a2uiverse-apps." with Check again, the merge standing down to "Only Shop B answered, so there's nothing to combine."; "Which cameras can I buy, and where?" on a canvas of its own took the same line before the call, Shop A's log holding the press's one call. Step 3: the orchestrator holding the 0.3.0 card stops before the call, so Shop A went back to 0.2.0 with both lines and the App Library's check fetched that card; Check again then filled the slot in the old line. Shop A at 0.3.0, patched to paint in its new line whatever it was offered, restarted with no fetch of its card; "What cameras does Shop A have?" reached it, the paint refused as outside its entitlement, the card fetched again changed, the waiting line. The patch removed. Step 4: 0.3.0 published, retiring the old line; on the camera comparison Check again gave "Shop A needs an update to show this." with Update, and Update went straight through, no consent card. Shop A repainted in purple from the new build beside Shop B's own look, the merged view back. The canvas waiting on the same update read "Shop A is updated." with Show it here, the progress line "Shop A updated"; Show it here painted Shop A afresh in purple. The first Update was lost in the tunnel, a 503 from its gateway after about two minutes, the request never reaching the orchestrator; the page read Shop A back and said "That didn't go through, so nothing changed." with Try again, which went through. The journal: the comparison, the press failed with the card fetched again changed and the waiting line, the second question stopped before the call, the two Check agains, the refused paint with its cause and the card fetched again changed, Check again with the needs-an-update line, the install-over by the page, the two resends completing. Point: Check again judged on the card the run last fetched, the waiting line standing after the agent moved back (decision 31, orchestrator `877f8a0`). Seen again: Shop A run from the clean checkout at 0.1.0, "What cameras does Shop A have?" giving the waiting line; Shop A back at 0.3.0 with no App Library check, Check again reached it and Shop A painted in purple.

**Case 7, CircleCI's chain.** Made for the run: CircleCI's first sign-in asking for "Rerun and cancel your workflows" beside read access, at 0.2.0. CircleCI's sign-in server kept the made-up account's grant to the orchestrator's tunnel client from an earlier sitting, reads and writes; the first sign-in had taken the new permission back, and the first press went through. The account signed out in the App Library, its Permissions listing both first, the grant ended at CircleCI. Step 1: "How are my builds doing?" took CircleCI's tile asking only "See your projects, pipelines and their runs"; signed in as retz8 through the window, the grant read access only, the slot showed "Recent pipeline runs". Step 2: 0.2.0 restarted and not published; the App Library read "A newer version is on its way from the publisher" and was closed; the marketplace stopped; a press on the failed run gave "CircleCI has changed, and the Store couldn't be reached." with Retry, the progress line "CircleCI couldn't check for updates", not the needs-more-access tile, CircleCI not called. The marketplace restarted; Retry gave "CircleCI has changed, and the Store is waiting on its publisher, a2uiverse-apps." with Check again. Step 3: 0.2.0 published with its sample answer from a deterministic copy; Check again gave "CircleCI needs an update to show this."; Update opened the consent card in the slot, "Update CircleCI? This version asks for more. The next time you use it, CircleCI will also ask to be able to" over "Rerun and cancel your workflows", and was allowed. Step 4: the slot sent the press again and took "Needs more access" with Allow; signed in again through the window, no chooser, the slot filled with the run pressed in step 2. The first Update's requests and the first Allow window were lost in the tunnel, the page saying "The Store can't be reached right now, so nothing changed." with Try again, and "Open the sign-in again" finishing the sign-in. The journal: the sign-out by the page, the question stopped for sign-in, the sign-in and its resend, the press stopped with the Store unreached, the Retry with the waiting line, Check again with the card update, the install-over by the page, the resend stopped for the new permission, the two sign-in starts for it, the sign-in and the resend completing. No points.

**Case 8, the old-interface pack refused.** Published as Shop B through Stellify's publish, the Store answered 422: "host interface "0.9.1" is not one the platform supplies (it supplies "0.14.0")", beside a sample answer asked for a card requiring sign-in. Installed from disk through the registry command, refused with the same finding. Shop B's build in the registry and the Store unchanged, its listing as before. The journal: the install from disk refused, from a local pack by the command's token, with the finding; the refused publish never reached the orchestrator.

**Case 9, Shop B's no-update line.** Made for the run: Shop B's agent painting in a new catalog id, `catalogs/v2`, at 0.2.0 with no old line, restarted; Shop B unpublished by the dev publisher. "Compare camera prices at Shop A and Shop B." gave Shop B's slot "Shop B has changed, and the Store has no update for it." with no press, the progress line "Shop B no update available", Shop A in purple, the merge standing down. The journal: Shop B called on the card the run held, answering with no UI, the card fetched again changed, the update state not published, the line with no press.

**Case 10, the Planner's and the Synthesizer's retry, forced.** Made for the run in the orchestrator: the first answer of the first plan and of the first synthesis after boot damaged after the model returned it, a component of type `Carousel` added to its tree. "What's assigned to me in Linear?" on a fresh canvas: the plan's first attempt refused with web_core's findings, "Unknown component type 'Carousel' not found in catalog '…shell-catalog/catalogs/v0.9.1/catalog.json'." and "Component 'damaged' is not reachable from 'root' (Orphaned component 'damaged' is not reachable from root)"; the second attempt validated and Linear painted. "What's on my calendar today, and what needs my attention in Gmail and GitHub?" on a fresh canvas: the plan untouched; the synthesis's first attempt refused with the same two findings, sent back to the model with the damaged answer; the second validated and the timeline painted over Calendar, Gmail and GitHub. The edit reverted.

**The state left.** Every process stopped. In `a2uiverse-apps`, Shop A's two lines, versions and theme, CircleCI's new permission and version, Linear's palette and Shop B's new id reverted, the `catalogs/v2` folders removed, Shop A's and Linear's catalogs built again: the checkout holds the committed fixes alone, at `db7b6f3`. In the platform, the damaged first attempt reverted. The old pack removed. The marketplace's state wiped, its embedding model kept; the sitting's orchestrator state folder removed. The agents' own sign-in stores kept.

### After the sitting

**The regression pass after**, all green, the gates run uncached:
- The platform's `pnpm verify`: 22 of 22 tasks and 68 script tests. The suites: shell catalog 520, client 885, orchestrator 685, marketplace 80, Stellify 112, sdk 301, embedder 13. The client's one more is decision 28's test, the orchestrator's two decisions 25's and 31's.
- `a2uiverse-apps`' `pnpm verify`, at `db7b6f3`: 31 of 31.
- The Python suites: the kit 351, GitHub 143, Gmail 130, Calendar 122, CircleCI 82, Linear 77, Shop A 98, Shop B 99.
- The replay suite: 134 passed against the baselines on disk, no screenshot differing; none taken again.
- The live suite: 7 passed — accounts, publish, sign-in, the loop on Calendar, More in the Store, store, update.

**The closing launch.** Both tiers `deterministic` under the publish, against the default orchestrator state: `a2uiverse-apps` claimed again at the wiped marketplace, all seven apps published at card 0.1.0 and installed by id, none left uninstalled, each reachable. GitHub moved to the 0.2.2 build; the other six reinstalled with nothing changed. No fix changed an app's card; the Store's captures not recorded again.

### Findings

- One Gemini key serves the orchestrator and all seven agents; its prepaid credit ran out mid-sitting.
- The deterministic GitHub answers an open on its "My Open Pull Requests" list with no visible change: no deterministic flow paints a pull request. In the Backlog.
- The deterministic shops open a camera by updating the same surface, so the fragment has no back arrow; their own "Back to the list" serves.
- GitHub's catalog loads about 80 stylesheets one by one: through the tunnel its Store sample waited about 10 s on a fresh page. A build loaded on first use holds its first paint the same way, about 10 s for Linear's newer build. In the Backlog.
- Calendar's fragment on the deterministic roster shows an event's time with no zone, "Today, 11:00 – 12:00", while the timeline beside it shows the same event at 8:00 PM local time; Gmail names UTC on its own. In the Backlog.
- The client's console holds about 680 warnings at each load, zod-to-json-schema's at each recursive schema; already in 16.12's list.
- The tunnel's gateway answered 503 three times: Shop A's first Update after about two minutes, CircleCI's first Update, and CircleCI's first Allow window, which stayed blank. The orchestrator answered from the Mac throughout; the page's read-back and Try again, and "Open the sign-in again", carried each.
- A deterministic agent's sign-in server keeps an account's grants to a client across runs, and the orchestrator's tunnel client address is the same in every sitting: an earlier sitting's permission comes back on the next first sign-in until the account is signed out.
- Claude in Chrome asks leave per site, and each tunnel port is a site of its own: a sign-in window on an agent's port not yet allowed stops the run until the reader allows it.
- Left to the automated tests, with the tests that hold them: the quiet stand-in for an unknown component and for a child reference that cannot be resolved (the client's `rendererPatch.test.tsx`); the client's load gate refusing a build packed for another host interface (the client's `loader.test.ts`); an update refused (the client's `slotActs.test.ts`, and the replay suite's "L4 · updating, updated, waiting on the publisher, gone, and an update refused"); the no-update line for an app installed from your computer (the shell catalog's `update-tile.test.tsx`, the line with no press, and the sdk's `marketplace.test.ts`, "Installed from your computer"); a `ChoicePicker` in each of two surfaces on one page, each its own radio group (the client's `rendererPatch.test.tsx`, decision 29).
