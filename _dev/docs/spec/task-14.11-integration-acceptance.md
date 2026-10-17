# Task 14.11 — Integration + acceptance

Spec for sub-task 14.11 of Phase 14 (`_dev/docs/spec/phase-14-shell-trusted-pages.md`, decision 23): the phase's acceptance run on the deterministic roster through the tunnel, the marketplace under the launcher's publish flag. It covers the page opened every way its address allows; browser writes probed through the tunnel; the App Library's accounts followed onto the canvas; Publish under a name claimed on the page; the Store; every update state live; the Planner's reader; the browser holding no secret; a dark pass; and a regression pass before and after. It also takes the two faults found in task 14.10, and what task 14.10's decision 17 left to this pass: the ahead-of-the-Store notice live and one pressable update live.

## Scope

- The two faults found in task 14.10, fixed before the sitting.
- The two checks: the regression pass, and one sitting by hand through the tunnel.
- How the sitting is driven, how points found in it are handled, and where the code is worked.
- The starting state, and the state the sitting leaves.
- The publisher on the page.
- The ways in and the address.
- Browser writes probed through the tunnel.
- Gmail's accounts on the page and on the canvas.
- GitHub uninstalled and installed again from the Store.
- Publish, the Store with Shop B, and Shop B's chain.
- Every update state live: Linear's, Shop A's, Shop B's.
- The Planner's reader.
- The browser holding no secret.
- The dark pass.
- What stays on the replay suite.
- The sitting's order and the record.
- Out: the amendments the sitting calls for (task 14.12).

## Locked decisions

### 1. Two checks

The regression pass:
- `pnpm verify` in both repos;
- the client's replay suite against the baselines on disk;
- task 14.10's live suite, whole, run while the sitting's stack is down;
- each Python agent's tests, run apart.

It runs before the sitting, every failure and diff named and anything unexplained fixed before going on. It runs again after the sitting, the baselines retaken on disk and what changed named. Then there is one sitting by hand on the deterministic roster through the tunnel.

### 2. The sitting is driven case by case

Before each case Claude gives a brief of what it tests. On the reader's go, Claude drives the page in the reader's browser through Claude in Chrome on the tunnel's addresses, and runs every terminal command on the Mac. After each case the reader gives UX and design feedback, fixed on the spot before the next case.

### 3. Nothing is deferred

Every point the reader raises or the sitting finds is handled the same way:
- fixed on the spot, one at a time, agent side included;
- seen again;
- added to this spec as a numbered decision with what it replaced.

A point asking for something a later phase builds is recorded as a finding for that phase.

### 4. Worked directly on `main`

The platform's code goes on `main`. The agents', the kit's and the catalogs' code goes on `a2uiverse-apps`' `main`. There is no worktree. Each fix is committed as it lands. The cases' temporary edits are never committed and are reverted by the end of the sitting.

### 5. The two faults found in task 14.10 are fixed before the sitting

The two faults:
- An uninstall refused on an app's view is said on that view, as on the list.
- The Store's loading skeleton draws its app tile as the board's square.

Each is fixed with its test and committed before the regression pass before. A baseline either moves is retaken and named.

### 6. The starting state

- The marketplace's state is wiped, its embedding model kept.
- The orchestrator runs on a fresh state folder holding only the embedding model's cache. Every app is installed by id into an empty registry, and every account is signed in from its tile. The existing orchestrator state folder is left as it is.
- The tunnel's addresses are set for the agents' sign-in pages for the whole sitting.
- The launcher publishes and installs the roster but Shop B. Shop B's agent runs, neither published nor installed.

### 7. The publisher on the page owns Shop B

A name claimed on the page owns Shop B, and Shop B's cases run through Publish as that name. The update states of the roster's other apps are made on the terminal with Stellify as the dev publisher.

### 8. The ways in and the address

This case runs with a canvas composed beneath: "What needs my attention today?", GitHub and Gmail signed in from their tiles. It covers:
- the Planner's buttons that open the Store and open the App Library on an app (open Publish's button lands at the start of decision 12);
- the manual entry point;
- a typed address carrying a query, and one carrying an app;
- browser Back closing the page to the canvas untouched beneath, its regions and scroll as left;
- Back and Forward between destinations;
- a reload landing on the page over a fresh session.

### 9. Browser writes probed through the tunnel

Against the orchestrator's tunnel address, four writes are each refused:
- a JSON write from a foreign origin;
- one with no origin and no token;
- a form-encoded post;
- a JSON write to the uninstall route from a tab on a foreign site, stopped at the browser's preflight, the app still installed.

A write from the page itself is the control.

### 10. Gmail's accounts, on the page and on the canvas

Gmail is signed in from its tile the first time it composes. On the App Library, each act is followed onto the canvas:
- **Permissions:** read in the card's own words.
- **Rename:** the canvas beneath keeps the old label, and a new question names the new one.
- **The second account:** added through the sign-in window with no canvas. A question over mail merges both under their labels. A Gmail slot left waiting on an open canvas loads on its own press.
- **Sign-out:** each account signed out with its outcome line. The next question to that account asks for sign-in again.

### 11. GitHub out and back

GitHub is uninstalled from the App Library, the confirm saying it signs its accounts out, and its access is cancelled. It is found again in the Store by search, installed through the consent card naming its scopes, signed in from its tile and composed, all without a reload.

### 12. Publish

- "How do I publish my app?" is answered with a button landing on Publish.
- A name is claimed on the page, its token shown once. Then it is signed out, and signed in with the pasted token.
- On the terminal, Shop B's sample is captured with Stellify on its demo key and its catalog packed.
- Shop B is published from the page, from its packed folders with that preview file, and listed.

### 13. The Store, with Shop B

- Every roster listing shows its state in place of Install.
- A search finds Shop B under the claimed name, its sample drawn live, and the publisher's name is followed to its apps.
- Shop B is installed through the consent card saying it asks to connect with a key, and connected through its key page.
- "Compare camera prices across both shops" composes beside Shop A in the same session without a reload.
- Shop B's permissions view says it is connected with a key.

### 14. Shop B's chain

- **Ahead of the Store:** Shop B's card moves to 0.2.0 and its agent restarts. The ahead-of-the-Store notice shows on its Publish listing, and waiting for the publisher in the App Library.
- **Card update:** 0.2.0 is published from the page. A card update with nothing new to ask follows, and its Update is pressed in the App Library.
- **Breaking pack:** a pack of Shop B's catalog with a component removed is refused, with the gate's findings.

### 15. Every update state live

Each of the six update states is made on a real app, read on the App Library in plain words, and every pressable one taken from the page. Linear's are in decision 16 and Shop A's in decision 17. Shop B's are decision 14's card update and decision 19's no longer published.

### 16. Linear's cases

- **The quiet newer build:** a visible change to Linear's catalog is published at the same card. The check, run on opening the App Library, installs it itself, and the next canvas draws the new build without a reload.
- **Waiting for the publisher:** its card moves to 0.2.0, asking `issues.write` beside its read scope.
- **The card update asking for more:** 0.2.0 is published, and the Update goes through the consent card asking for more. Linear is signed in again and paints.

### 17. Shop A's cases

With task 13.8's recipes:
- The major update, made by a temporary patch naming a second catalog id, is pressed.
- Then the update required, made by retiring the old id, is pressed.

The camera comparison merges after each.

### 18. The Planner's reader

"Is anything out of date?" is asked three times:
- at the start, all up to date;
- after Linear's 0.2.0 is published and before anything runs the check again, the answer giving the old state with the time of the last check, the plan not waiting on the marketplace;
- after the App Library has run the check, the answer naming the card update.

Its button lands on the App Library at that app.

### 19. No longer published

Shop B is unpublished from the page. The App Library says no longer published, the Store's search no longer finds it, and the camera comparison still merges it.

### 20. The browser holds no secret

The secret sweep runs after the roster is published and over the whole sitting.

At three moments the token is searched for in the browser's local storage, session storage, IndexedDB, every history entry's address and state, and the page:
- after the claim;
- after the token's screen is dismissed;
- after a sign-in by pasted token.

No read's answer after the claim carries the token.

### 21. The dark pass

After the cases, the reader switches the browser to dark, and each destination is walked once: the Store with a listing and an app's view, the App Library with an app's accounts, Publish with its listings. Each point is fixed as any other. If the unit computer's setting cannot be switched, dark is recorded as not seen.

### 22. Left to the replay suite

The uninstall refused on an app's view, and the sign-in the platform does not support, are not produced live.

### 23. The state the sitting leaves, and the closing launch

- Every temporary edit is reverted, `a2uiverse-apps` holding only the committed fixes.
- The marketplace's state is wiped again, its embedding model kept.
- The sitting's orchestrator state folder is removed.

Then a closing launch runs under the publish flag with all seven apps, published and installed by id.

### 24. The sitting's order

1. The two faults' fixes.
2. The regression pass before.
3. The starting state.
4. The roster published, then the sweep.
5. The ways in.
6. The write-check probe.
7. Gmail's accounts.
8. GitHub out and back.
9. Publish.
10. The Store with Shop B.
11. Shop B's chain.
12. Linear's cases, with the Planner's second and third answers.
13. Shop A's cases.
14. No longer published.
15. The dark pass.
16. The sweep over the whole sitting.
17. The cleanup and the closing launch.
18. The regression pass after.
19. The write-up.

### 25. The record

This spec is the record. Each on-the-spot fix is added as a numbered decision as it lands, with what it replaced.

The write-up has four parts: before the sitting, the sitting case by case, after it, and the findings. Findings for later phases go into their phase's notes in `_dev/TODO.md` at the write-up. Every amendment to the phase spec, SPEC.md and earlier sub-task specs that 14.11 calls for is made by 14.12.

### 26. The page's reads are bounded

Every read the trusted page makes of the orchestrator — the installed apps, the accounts, the update check, the publisher, the Store's reads — gets 10 s to answer and is asked once more, as the catalog loader's JSON reads are (task 11.8). No answer to that either is the orchestrator unreached, each read in the page's own state for it. Replaced: a read with no bound — one the tunnel left unanswered held the App Library on "Checking for updates", the Store's search on its loading rows and an app's view without its publisher's name, until the page was left.

### 27. The Store's search shows the apps that match

The marketplace's search answers the apps scoring at least 0.15 and within 0.095 of the best score, in rank order. A search no app reaches answers none, and the Store says so.

The two numbers are fitted with the platform's embedding model on 47 labelled searches over the seven cards the Store recordings hold:
- **The labels:** an app is expected where its card says it does what the search asks; allowed where its card only touches it; 12 searches expect none.
- **The fit:** the floor and the margin missing the fewest expected apps and showing the fewest unexpected, the floor 0.017 under the weakest expected score kept — "continuous integration", CircleCI at 0.167.
- **At the cut:** one expected app missed, Linear for "tickets", which the model ranks below Calendar; 16 unexpected apps across the set; 7 of the 12 searches that expect none answering none.

The labelled searches and a live test holding the cut sit beside the marketplace's tests. The Router is untouched. Replaced: the search answering every published app ranked, the Store listing each one as a best match — 276 unexpected apps across the same set.

### 28. Back returns from an app's view to its list

Opening an app's view from its list — the Store's results or apps, the App Library's "Your apps" — pushes the view onto the browser's history, so browser Back returns to that list, as the view's own way back does, and that way back goes back over the view's entry. Tabs, searches, Publish and a view opened with no list behind it still replace the entry on screen, so Back from a list closes the page. Closing the page goes back over every entry it pushed. Replaced: every move inside the page replacing its one entry, Back from an app's view closing the page — phase-14 decision 11 and task 14.6's history rule amended for that move.

### 29. The Store holds the lists it has shown

While the Store is open, each list it has shown — every app, a search's matches — is held. Shown again — the search cleared, back from an app's view, the same search again — it is not read again until the registry changes (an install, update or uninstall from the Store), or on Try again. Another tab or closing the page lets go of them. Replaced: every list read again each time it was shown, clearing a search reading every app afresh.

### 30. A search naming an app finds it

An app whose name every searched word starts — in any case, "goog" for Google Calendar — is a match, listed first, ahead of decision 27's matches in rank order. The labelled searches gain nine naming an app, and the live test holds both. Replaced: a name found only through the model's score — "google" finding nothing, Google Calendar scoring under three other apps, below the floor.

### 31. The Store's search clears with an icon

The search box clears with a 28px ✕ icon button, inset from the box's edges so its hover never meets them. Replaced: a "Clear" text button whose hover ran to the box's edge.

### 32. An account's buttons keep apart

An account's Permissions, Rename and Sign out each keep their hover apart from the next, 4px between them, and the rename's Cancel 8px from Save — none with a ghost button's negative margin, each as tall as a button beside it, 24px. Replaced: the three overlapping on hover, and Cancel's hover touching Save.

### 33. A sample enlarges

Every sample — on an app's view in the Store and on Publish's listings — carries Enlarge at the end of its "Sample answer" line, opening the same picture at full width in a dialog of its own, up to 960px wide, scrolling past 85% of the window's height, its question and caption as the frame's, closed by its ✕ or Esc. Replaced: a listing's sample only as a narrow thumbnail cut at its frame.

### 34. A publish in the Store lands on the listings

A publish the Store takes moves Publish to its listings, the address theirs, the outcome atop them with the Store's own summary folded under Details. A publish running or refused stays in the form's place. Replaced: the outcome in the form's place, the address still the form's, behind Back to your apps.

### 35. Steps are drawn as steps

Steps a person takes in order are a vertical list on the canvas, one numbered line each, under a sentence saying what they get done — the platform-UI guidance's rule — and the platform card's publishing skill names its four steps, numbered. Replaced: the four steps run together in one paragraph.

### 36. A key account is named when it is connected

The token page asks, below the key, for an optional name for the account, its hint the name the account gets left blank. Left blank, the first key account takes the app's name ("Shop B"); a later one adds the day it was connected ("Shop B · connected Oct 17"), and its number only if that is taken too. A name the person typed stays theirs, as a rename does; one another of the app's accounts holds, ignoring case, falls back to the default. An account connected again keeps its name, and its page asks none. Replaced: every key account labelled by its number — "Shop B account 1".

### 37. A card update asks for more only when it does

A card update naming a new permission reads "An update that asks for more" and its Update passes the consent card. One naming none reads "A new version is available" and its Update goes straight through, in the Store, the App Library and the Planner's reader alike. Replaced: every card update read as asking for more and passed the consent card, empty when it asked nothing new.

### 38. Publish sees an app ahead of the Store at once

Publish's listings are read through the orchestrator's `listings.json?publisher=<name>`: each of the publisher's apps has its live card fetched again, given five seconds, and the sdk's drift test run. The listing shows the drift the card shows now, and where it differs from the Store's flag the marketplace is sent the report. A card that does not answer in time leaves the Store's flag. Replaced: the listings were the Store's index filtered on the name, the notice appearing only once an orchestrator with the app installed had run its update check and reported.

### 39. A build's look stays on its own surfaces

Each surface of a loaded build is marked with its artifact id, on a box-less element around the catalog's Provider. A stylesheet inside an artifact is read as text, its relative addresses made whole against its own, and its rules wrapped as written in an `@scope` rooted at that build's mark, then adopted onto the page in the order the artifact asked for them. Fonts, keyframes, a layer order and rules aimed at `:root`, `html` or `body` stay page-wide. A browser without `@scope` takes a link per sheet, as before. Replaced: every artifact sheet a page-wide link, so a newer build's look restyled a canvas still drawn in the older one, a Store sample's build restyled the canvases, and GitHub's `*{box-sizing:border-box}` reached every other catalog. The replay baselines showing Linear, Shop A and Shop B were retaken: those catalogs now draw as their own sheets say, a few pixels taller where GitHub's reset had sized them.

### 40. A write the tunnel swallows is read back

Every write the page makes gets 60 s to answer, a publish 190 s: above the orchestrator's own limits, 10 s for each request to the Store and each account's access cancelled at its app, and 180 s for relaying a publish. With no answer the write is never sent again: the page reads back what it was changing and answers as the write would have.
- An install or an update is done when the app is installed at the card version and builds the Store lists now; an uninstall, when the app is gone.
- A rename is done when the account holds the new name; a sign-out, when the account is gone.
- A claim, a publisher's sign-in or sign-out is read from who is signed in to Publish. A claim held here has no secret to show: the board says the name is theirs and kept on this computer, and that the secret didn't reach the page.
- A publish is done when the publisher's listing carries the builds it handed and is no longer ahead of the Store; an unpublish, when the listing is gone.

What only the lost answer knew stays unsaid: the apps that followed an update, whether an account's access was cancelled at its app. A read-back that cannot reach the orchestrator either answers as not reached. Replaced: a write with no time limit, the page saying "Updating" until reloaded when the tunnel left the request unanswered.

## Invariants

- The browser holds no secret.
- The canvas stays mounted beneath the page.
- The developer's own orchestrator state folder is never touched by the sitting.

## Write-up

### Before the sitting

**The two faults found in task 14.10** were fixed and committed.
- **The uninstall refusal** (`e69e0b1`). A refused uninstall is said on the app's view, the same notice as atop the list. Its unit test and the replay suite's L10 check the view.
- **The loading tile** (`77bf046`). A loading app tile keeps the tile's square, 40 and 56 alike, so the Store's and the App Library's skeletons both draw it.
  - The replay suite's S3 checks the loading row's tile at 40 × 40. Its baseline `store-s3-browse-states` passed both before the fix and after it: the skeleton's grey sits within the screenshot comparison's per-pixel tolerance of the page's white. It was retaken on disk.

**The regression pass before**, all green:
- The platform's `pnpm verify`: 22 of 22 tasks and 66 script tests. The suites: shell catalog 452, client 743, orchestrator 596, marketplace 77, Stellify 111, sdk 275, embedder 13.
- `a2uiverse-apps`' `pnpm verify`: 31 of 31.
- The replay suite: 112 passed.
- The live suite: 5 passed — accounts, publish, sign-in, store, update.
- The Python suites: the kit 323, GitHub 144, Gmail 131, Calendar 123, CircleCI 82, Linear 77, Shop A 98, Shop B 99.
