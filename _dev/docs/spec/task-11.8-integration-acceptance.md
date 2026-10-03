# Task 11.8 — Integration + acceptance

Spec for sub-task 11.8 of Phase 11 (`_dev/docs/spec/phase-11-app-bundle-registry.md`): the phase's acceptance run — an empty registry booted, every app installed from its card URL and its packed catalog on the deterministic roster through the tunnel, GitHub first, with no code naming any of them; installs, uninstall, install-over and the update flow exercised live; composition over runtime-loaded catalogs; a regression pass. The phase's proof (decision 17) and invariants.

## Scope

- The two checks: the regression pass and a live run on the deterministic roster through the tunnel.
- How the reader's feedback during the live run is handled.
- Where the code is worked.
- A gate proving no client or orchestrator code names an app.
- The launcher starting agents without installing them.
- Which Stellify packs the catalogs the run installs.
- The live run's cases and their order: the empty boot, every app installed, composition, install-over, a shared catalog, a breaking update, uninstall, the shops.
- The visual baselines.
- The record: this spec and its write-up.

## Locked decisions

### 1. Two checks, split by kind

`pnpm verify` and the client's Playwright suite, replaying the recorded beats over the registry snapshot, are the regression pass. A live run on the deterministic roster through the tunnel, with the reader watching the screen, shows the install lifecycle, then composition over the catalogs it installed.

### 2. The reader's feedback is fixed on the spot, Store matters excepted

Each point the reader raises during the live run is fixed at once, one at a time, seen on reload, and added to this spec as a numbered decision. A point belonging to the Store, the App Library or the marketplace experience is recorded as a finding for Phases 13 to 15, not fixed. Feedback that would change what an agent sends is noted and handled after the run.

### 3. Worked directly on `main`

The platform's code is worked directly on `main`, and a catalog fix on `a2uiverse-apps`' `main`: no worktree. A catalog fix is seen by packing it again and installing it over the running registry. At the end `a2uiverse-apps` is pushed once and the registry snapshot's pin moves once.

### 4. A gate that no runtime code names an app

A test in `pnpm verify` searches the client's and the orchestrator's runtime source for every app id, catalog id and catalog package name on the dev roster, against a short explicit allow-list; each allowed entry is justified in the write-up. Tests, fixtures and the dev harness are outside it. Its first green run is the proof's evidence.

### 5. The launcher starts agents without installing them

The launcher gains a tested flag that starts the roster's agents and neither packs nor installs them. Every install in the live run is made by hand through the registry command, from the app's card URL and its artifact directory.

### 6. Each catalog packed by its own package's Stellify

Each catalog the run installs is packed in its own checkout in `a2uiverse-apps`, by the Stellify its package holds as a dev dependency. Each artifact's descriptor hash is compared with the registry snapshot's for the same catalog at `42cd2c6`; a mismatch is a finding.

### 7. Every app, the shops included

All seven apps are installed live: the five of the default tier, then Shop A and Shop B from a second launch on the mocks tier without install.

### 8. The empty boot, and GitHub first without a reload

A fresh state directory boots the orchestrator; the client is up and the agents run uninstalled. The installed list is empty and the catalog table holds only the basic catalog and the shell catalog. A GitHub-only question, "What pull requests need my review?", is answered by the shell alone with no dispatch, its answer quoted. "I want to install the GitHub app" is asked and what the shell does is recorded, not fixed. With the page open GitHub is packed and installed; the same question again paints in GitHub's catalog, its artifact fetched after the install, the slot pending until it loads, the earlier turn still in the trail. One reload then shows GitHub's artifact loaded by boot's preload, before any turn.

### 9. The other installs and the composition cases

Gmail, Google Calendar, CircleCI and Linear are installed one by one with no reload, the catalog table growing by one each. Then the temporal merge, "What needs my attention today?" — every vendor paints in its catalog, the merge lands, one merged value per vendor clicked — and the entity join, "what's the status of what I'm working on?" — the table lands, a Linear value and a CircleCI value clicked. A click passes under task 10.7's bar: the ring lands on the element showing the value, or on its row or card when the vendor does not draw that field; a landing on the fragment boundary or the vendor's slot fails. Each fragment's attribution reads its card's own `name`. The collision detector reports no collision, its `@font-face` family list read.

### 10. Install-over

A small, visible, temporary change to GitHub's catalog is packed and installed over GitHub with the page open: the command reports the install over, the table's row carries the new hash; a GitHub question on the open page shows the old look (task 11.5, decision 6); after a reload it shows the new one. The change is reverted, packed and installed over again: the hash equals the first pack's, and after a reload the original look is back. The change is never committed. When a real catalog fix lands earlier in the run, it stands in for the constructed change and the revert pass is dropped.

### 11. A shared catalog: two apps naming one catalog id

A second app id, `github-admin`, is installed from GitHub's card URL, standing for one publisher's two apps on one catalog. Handed the artifact `github` holds, it is accepted and the table keeps one row. Handed decision 10's changed artifact, it is refused, naming `github`: the publisher cannot update a catalog two of its installed apps name. Uninstalling one app leaves the catalog in the table; uninstalling both removes it; `github` is installed again to continue. The refusal is recorded as a finding on the publisher's catalog ownership, which Phase 13 decides; the rule of task 11.4's decision 5 is not changed in 11.8.

### 12. The breaking update

GitHub's catalog id is changed to a new version, its agent restarted so its card names the new id and the orchestrator restarted so the card is refreshed. A GitHub question asked before the install-over shows the mismatch window, recorded as it is. The catalog is packed and installed over with the page open: the old catalog id leaves the table and a GitHub question paints in the new id with no reload. Everything is reverted and installed over back to the original. How an update is discovered and consented to, and the mismatch window, are recorded as findings for Phases 13 to 15.

### 13. Uninstall

Linear is uninstalled with the temporal merge's canvas open: the installed list and the catalog table no longer hold Linear or its catalog, the basic and the shell catalogs remain, and the canvas keeps Linear's fragment as drawn. "I want to uninstall Linear" is asked and what the shell does is recorded, not fixed. A click on a Linear row fails its slot into the not-installed tile with Retry. "What needs my attention today?" asked again leaves Linear out and merges the other four. Linear is installed again and Retry on the tile paints the drill-down. A dispatch already running when its app is uninstalled rests on the orchestrator's test of it, named in the write-up.

### 14. The shops

A second launch on the mocks tier without install; Shop A and Shop B are packed and installed, then Phase 4's pinned comparison turn over them: their catalogs land, the comparison merges, their attributions read "Shop A" and "Shop B". The collision detector is read again over all seven catalogs.

### 15. The regression pass runs before the live run and after it

First `pnpm verify`, then the Playwright suite against the baselines on disk from 11.5, every failure and diff named; anything unexplained is fixed before the live run. After the live run's fixes, the suite runs again, the baselines are retaken and what changed is named.

### 16. The sitting's order

The gate of decision 4 and the flag of decision 5; the regression pass before; the empty boot; GitHub first, then the reload; the other four installs; the temporal merge and the entity join, with attribution; the collision detector; the install-over; the shared catalog; the install-over's revert; the breaking update and its revert; uninstall; the shops; the regression pass after; the write-up. Every pack records its hash against the snapshot's.

### 17. The record

This spec is the record. Each on-the-spot fix is added as a numbered decision as it lands, with what it replaced. The write-up at the end carries each case's evidence, the gate's allow-list justified, the packs' hashes against the snapshot's, the Playwright runs before and after, and the findings not fixed — among them the shared-catalog refusal, the update flow's discovery, consent and mismatch window, and what the shell did with the install and uninstall requests. Every amendment to the phase spec that 11.8's findings call for is made by 11.9.

### 18. Stellify files a package's own files from its root wherever the package sits

Packed installed in a `node_modules`, as the registry snapshot packs each catalog, every file of the package was filed under `node_modules/<name>/` as a dependency's, its stylesheet loads in the entry spelled the same way, so the snapshot's artifact of a catalog and its publisher's differed. A file of the package is told by its path below the package root, not by the whole path. A test packs the fixture catalog in its checkout and installed in a `node_modules` to the same descriptor. Replaced: a file of the package told by its whole path holding no `node_modules`.

### 19. A button keeps its label's width

The shell's answer to "I want to install the GitHub app." painted its "Search Store for GitHub" button across the whole canvas: the Planner set the heading, the text and the button in a `Column` with no `align`, and the basic catalog's `Column` stretches its children across by default. The shell catalog's `Button` takes its label's width, at most its container's; the `Column` keeps the protocol's default, so text, tables and cards still fill the width. Replaced: a button stretched across a `Column` like any child.

### 20. A stylesheet that gets no answer is asked once more, then fails

GitHub installed with the page open, its fragment held "Loading…" for good: of the 77 stylesheets its entry loads and waits for, one request the tunnel never answered left its link with neither a load nor an error, so the entry's import never settled and the catalog neither loaded nor failed. A stylesheet link that gets no answer in 10 s is replaced by a fresh one under a URL of its own — a link for the same URL was handed the request still unanswered; no answer to that either rejects the load, so the catalog's load fails and its slots show the load failure with Retry — the transport's own "no answer in 10000 ms — sending once more". Retry loads again with the entry imported under a URL of its own: the browser keeps a module whose evaluation failed and answers its URL with the same failure, so a Retry on the same URL failed at once with the old reason. Every other request of a load is bounded the same way: the table and the descriptor asked once more after 10 s, the entry — megabytes of a design system through the tunnel — imported once more after 30 s under a URL of its own, then the load fails; on the install-over's reload the table read and then GitHub's entry went unanswered. The descriptor is read past the browser's cache, as the table is: the browser held a second read of its URL behind the one unanswered, so its second ask, and a Retry's, never left the page. Replaced: a stylesheet load waiting on its link's load or error, unbounded; a load after a failed one importing the same entry URL; the table, the descriptor and the entry waited on unbounded; the descriptor read through the browser's cache.

### 21. The capability tile hugs its line and its button

On an empty registry the capability tile drew a box across the whole canvas, its one line and its small button centred in it, so it read as an empty placeholder. The tile keeps its box — task 7.9's decision 23 keeps it, SPEC §8 calling it a tile — sized to its content at the slot's leading edge, where the failure tile's line sits, the line and the button side by side. What the tile holds beyond a minimal line stays Phase 15's, as Phase 6's spec defers it. Replaced: a box stretched across the slot, its line above its button, centred.

### 22. An install says what it changed

The registry command printed "installed github over the one installed" for any install over a held app id, whatever it changed or did not. The install answers with a one-line summary its reader — the command and the launcher's log — prints: installed, updated or reinstalled; the card's version, old → new when it moved; each catalog's artifact, old → new when it moved, a catalog id gone or new named in full; "nothing changed" when the card and the catalogs are as they were — `updated github · card 0.1.0 · catalog sha256-muNbmR5m… → sha256-bYxc_jOA…`. Replaced: "installed <id>", with "over the one installed" on an install over a held id.

### 23. Retry sends again the press that failed

A press on Linear's row in a canvas drawn before Linear was uninstalled failed `uninstalled`; Linear installed again, Retry on its tile painted Linear's list — the slot's request from the turn — not the issue the press had opened. A press inside a fragment that fails is kept on its slot, and the slot's Retry sends that press again; a Retry that fails again keeps it for the next, and a press or a Retry that completes lets it go. A slot whose failure was its turn's dispatch retries the plan's request as before. SPEC §8.3's Retry, "re-dispatches that slot alone", is amended in 11.9. Replaced: Retry sending the plan's request whatever had failed.

## Evidence

### Before the live run

- **The gate of decision 4.** Green in `pnpm verify`. Its allow-list, each entry the only place it found a naming: `apps/client/src/beats/` — the replay's fixture data, the recorded and hand-authored beats carrying the app ids, surfaces and catalog ids they were painted with (183 lines); the Planner's worked examples (10 lines) and the Synthesizer's (8 lines), authored over fixture cards and sources, routing nothing.
- **The flag of decision 5.** Tested in `scripts/launch-plan.test.mjs`; documented in the root README and `_dev/docs/tunnel-environment.md`.
- **`pnpm verify`.** Green: 19 of 19 tasks, 26 script tests. One run failed the orchestrator's quiescence heartbeat test (task 8.10), which passed alone three times out of three and in the next run.
- **The Playwright suite against the 11.5 baselines.** 74 of 74 passed, no diff, before decision 18 and again over the snapshot rebuilt with it.
- **The packs' hashes against the snapshot's** (decision 6), dry-run before the sitting. Before decision 18 GitHub's, the one compared, differed by its own files' paths. After it, Gmail's, Google Calendar's, CircleCI's, Shop A's and Shop B's agree. GitHub's and Linear's still differ in their entry alone: esbuild names a bundled module by its path from the package — in a comment over each module, and as the key of a CommonJS dependency's wrapper — and a dependency sits at another path in the apps checkout's pnpm store than in this repo's.

### The live run

The deterministic roster through the tunnel on 2026-10-03, the orchestrator on a fresh state directory (the embedding model's cache copied in, nothing else), the agents started with `--no-install`.

- **Case 1 — the empty boot** (decision 8). The installed list `[]`; the catalog table the basic catalog and the shell catalog, both provided by the client; the orchestrator's boot line "apps: none installed". The client's boot read the table and fetched no artifact. "What pull requests need my review?" — the Planner named one gap, "pull requests", and the shell filled its slot with the capability tile, "No installed app can do this." and "Search the Store"; the journal's record `dispatch: []`, `shell:main` alone painted. "I want to install the GitHub app." — the shell painted "Install GitHub", "New apps are found and installed in the Store. Open the Store to search for and install GitHub." and a "Search Store for GitHub" button, its action the shell's open-the-Store with the query; pressed, the Store's placeholder over the canvas, "Searching for "GitHub"" and "Not built yet."; the journal an `openStore` action, no dispatch. The button drawn across the canvas became decision 19.
- **Case 2 — GitHub first, without a reload** (decision 8). GitHub packed by its own Stellify, `sha256-muNb…`, installed from its card URL with the page open. The same question: the slot pending at "Loading…" while the client fetched the table, the descriptor, the entry and the stylesheets the entry loads; GitHub painted in Primer, "My Open Pull Requests" with six, its attribution "GitHub", the earlier canvas behind the back arrow. Twice the tunnel left a stylesheet request unanswered, and the fragment held "Loading…" for good — decision 20; on the third run `BaseStyles` went unanswered again and its second ask, under `?attempt=2`, loaded. One reload: GitHub's entry and its 77 stylesheets loaded at boot, before any question.
- **Case 3 — the other four installs** (decision 9). Each packed by its own Stellify and installed by hand with the page open, the catalog table's artifacts growing 2, 3, 4, 5: Gmail `sha256-wgM8…`, Google Calendar `sha256-IVqo…`, CircleCI `sha256-yNyW…` — each the snapshot's — and Linear `sha256-7gyH…`, not the snapshot's (the finding on one install). The installed list five apps, each under its card's `name`: GitHub, Gmail, Google Calendar, CircleCI, Linear.
- **Case 4 — composition over the catalogs installed** (decision 9). The page unreloaded since the four installs, so their catalogs loaded as their paints arrived. "What needs my attention today?" — Google Calendar, Gmail, GitHub and Linear painted, each in its own catalog, attributed by its card's `name`; the merged view "Needs attention today", with a Calendar section of its own; no stylesheet needed a second ask. Landings, every one on the element: Gmail's subject (`gm-text`), Linear's title (`lc-text`), GitHub's title (Primer `Text`), Calendar's "Budget sync" (`gc-text`). "what's the status of what I'm working on?" — Linear, GitHub and CircleCI joined, "Active work status" with Issue, Status, Pull request, CI build and Updated. Landings: A2U-5's "In Review" on Linear's row (Linear draws the status as an icon); "Success" on CircleCI's status badge, the element; "#7" on the pull request's row in Primer's list (GitHub draws `retz8/a2uiverse#7`). The collision detector over the five artifacts the registry holds: `@font-face` families `linear-catalog-inter`, `calendar-catalog-sans`, `gmail-catalog-sans`, `circleci-catalog-inter`, none twice, GitHub's none; its one finding Primer's `--progress-bg` written on `:root`, the violation its test already records with github-catalog as owner.
- **Case 5 — install-over, as built** (decision 10). GitHub's open-pull-request icon turned from `--fgColor-open` to `--fgColor-danger` for the case, never committed; packed, `sha256-bYxc…`, and installed over GitHub with the page open — the command "installed github over the one installed", the table's row the new hash, the old artifact's files dropped, GitHub its only holder. The same question on the open page: the old look, the icon `var(--fgColor-open)` drawn green, no request for the new artifact (task-11.5 decision 6). After a reload the table read, then GitHub's entry, went unanswered through the tunnel — decision 20 extended to every request of a load — and once bounded: the new look, the icon `var(--fgColor-danger)` drawn red, from `sha256-bYxc…`; every earlier canvas gone with the reload, the back arrow disabled.
- **Case 6 — a shared catalog** (decision 11), with the install-over's revert (decision 10). `github-admin` installed from GitHub's card URL with the artifact `github` held, `sha256-bYxc…`: accepted, the table one row for GitHub's catalog. The temporary change reverted and packed again: `sha256-muNb…`, Case 2's hash — the same source, the same artifact. `github-admin` handed it: refused, `catalog "…/github-catalog/catalogs/v0.9.1/catalog.json" is held at another hash by github`, the table unchanged. `github` uninstalled: the catalog's row and its files stayed, `github-admin` naming it; `github-admin` uninstalled: the row and the files gone. `github` installed again with `sha256-muNb…`.
- **Case 7 — the breaking update** (decision 12). GitHub's catalog id moved for the case to `…/github-catalog/v2/catalogs/v0.9.1/catalog.json` — in its schema, its `CATALOG_ID` and the agent's deterministic paint, which carries the id it was recorded in — never committed; packed, `sha256-A9Zr…`; the agent restarted, its card naming the new id; the orchestrator restarted, the card refreshed at boot, the registry still entitling the old id. The mismatch window: GitHub's paint refused at the hub, "painted in catalog … outside its entitlement", the slot the catalog cause's "This app sent something that can't be shown here." with no Retry. Installed over with the page open: `updated github · card 0.1.0 · catalog …/catalogs/v0.9.1/catalog.json sha256-muNbmR5m… gone · catalog …/v2/catalogs/v0.9.1/catalog.json sha256-A9ZrhYLo… new`, the table the new id's row alone. The first sitting met unanswered requests and a descriptor read the browser held behind them — decision 20's descriptor read; the second, on a page booted holding the old id: the same question painted GitHub in the new id, loaded as its paint arrived, with no reload, the earlier canvas behind the back arrow, `primer-scoped.css` loaded on its second ask; both artifacts on the page. Reverted and installed over back: `…/v2/… sha256-A9ZrhYLo… gone · …/catalogs/v0.9.1/catalog.json sha256-muNbmR5m… new`, the `v2` files gone.
- **Case 8 — uninstall** (decision 13). "What needs my attention today?" over Google Calendar, Gmail, GitHub and Linear, every slot filled. Linear uninstalled with the page open: the installed list four apps, the catalog table the basic catalog and the shell catalog — both the client's — and four artifacts, Linear's row and files gone; Linear's fragment on the canvas as drawn. "I want to uninstall Linear." — the shell painted "App management", "Apps can be uninstalled and managed in the App Library. Linear is not currently installed on this platform." and "Open App Library", its action the shell's open-the-App-Library; no dispatch. A press on Linear's A2U-5 row in the earlier canvas: the journal's action `open-issue` failed `uninstalled`, the slot "This app isn't installed anymore." with Retry, the merge joined again "without Linear". The question asked again from that canvas: Google Calendar, GitHub and Gmail planned, Linear left out. Linear installed again, `installed linear · card 0.1.0 · catalog sha256-7gyHPFPh…`; Retry on its tile: the slot re-dispatched, filled with Linear's list — the slot's request, as SPEC §8.3's Retry re-dispatches a slot, not the press that failed — and the merge joined "including Linear". The reader judged Retry should send the press again — decision 23; on its run, the same steps: the press on A2U-5 failed `uninstalled`, Linear installed again, the first Retry never reached the orchestrator through the tunnel and the tile said so with "That didn't reach A2UIVerse.", the second sent the press again — the slot A2U-5's issue, "Say on the canvas when an utterance fails", In Review, High — and the merge joined "including Linear".

## Invariants

- Nothing a2uiverse-specific rides the vendor wire: the card is read as written, the artifact is outside the protocol.
- Composition keeps working over runtime-loaded catalogs: merges land, a merged value navigates to its element, the collision detector holds.
- No line of client or orchestrator runtime code names an installed app.

## Findings not fixed

- **An install from the canvas, for Phases 14 and 15.** Asked "I want to install the GitHub app.", the shell answers with the Store affordance — "Search Store for GitHub", opening the Store with the query — and the Store is the placeholder. The reader wants the install itself on the canvas: an app-store result with an Install button the user presses there. SPEC §9.3 holds that the model never authors the Store page nor reads the marketplace index and may only paint an affordance into it, and §8 that the capability tile is deterministic, with no model wording, and that install consent follows the authority tile; a model-authored install control could be steered by what the model reads, a vendor's card among it. A shape inside both: the Planner names the query, and the shell — platform code, not the model — draws the Store result from the marketplace index with Install, its consent a trusted step.

- **One package packs to one artifact only within one install.** esbuild spells each bundled module's path from the package into the entry, so the same source packed from the publisher's checkout and from a consumer's install differs wherever a dependency sits at another path; and two installs may resolve different versions besides. GitHub's and Linear's catalogs show it against the snapshot.
- **GitHub's entry waits for all 77 of Primer's stylesheets**, those of components a paint does not use among them: through the tunnel, about 80 requests before GitHub's first paint.
- **The orchestrator's quiescence heartbeat test is timing-sensitive** under the full parallel `pnpm verify`.

## Open items

- Ownership of a catalog id by its publisher — who may replace the artifact for an id, and so how one publisher updates a catalog several of its apps name — is decided in Phase 13.
- How an app update is discovered and accepted, and the window between an agent's new card and its install-over, belong to Phases 13 to 15.
