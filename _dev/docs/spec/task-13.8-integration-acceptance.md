# Task 13.8 — Integration + acceptance

Spec for sub-task 13.8 of Phase 13 (`_dev/docs/spec/phase-13-marketplace-publish.md`): the phase's acceptance run — on the deterministic roster through the tunnel, a fresh marketplace, the claim, every app published and installed from the marketplace by id alone, composition unchanged; each update state exercised over the real marketplace and orchestrator; a second publisher refused; a breaking schema refused; a catalog shared by two apps; the marketplace unreachable and restarted; a regression pass before and after. SPEC §9.1, §9.3, §10.

## Scope

- The two checks: the regression pass, and one sitting by hand through the tunnel.
- How the sitting is driven, how points found in it are handled, and where the code is worked.
- The secret sweep extended to the marketplace.
- The starting state, and the publish of the whole roster.
- The second publisher.
- A catalog shared by two apps of one publisher, and the automatic update beside an app installed from a local pack.
- Linear's cases: the newer build, from a local pack and automatic; ahead of the Store; the card update.
- The marketplace unreachable, and its own restart.
- Shop A's cases: ahead of the Store; the major update; the required update; the breaking schema.
- No longer published, and what an unpublished app id keeps.
- The state the sitting leaves, and the closing launch.
- The sitting's order and the record.

## Locked decisions

### 1. Two checks

`pnpm verify` in both repos, the client's Playwright replay suite against the baselines on disk, task 12.12's live sign-in test, and each Python agent's tests run apart are the regression pass. It runs before the sitting — every failure and diff named, anything unexplained fixed before going on — and after it, the baselines retaken and what changed named. One sitting by hand on the deterministic roster through the tunnel. The update states are read in the terminal — `registry updates`, the install summaries, the journal's registry lines, the marketplace's log and flag, Stellify's notices; the canvas shows composition and the builds that moved.

### 2. The sitting is driven case by case

Claude runs every terminal command on the Mac and drives the canvas in the reader's browser through Claude in Chrome on the tunnel's addresses. Before each case Claude says in brief what it tests; the reader says go and watches alongside, stepping in to raise a point or to take a step by hand.

### 3. Nothing is deferred

Every point the reader raises or the sitting finds is fixed on the spot, one at a time, agent side included, seen again, and added to this spec as a numbered decision with what it replaced. A point asking for something a later phase builds — the App Library showing the update states, the Store page, the canvas tile for an app ahead of the Store — is recorded as a finding for that phase.

### 4. Worked directly on `main`

The platform's code on `main`, the agents', the kit's and the catalogs' on `a2uiverse-apps`' `main`; no worktree. Each fix is committed as it lands; `a2uiverse-apps` is pushed at the end. The cases' temporary edits are never committed and are reverted by the end of the sitting.

### 5. Where the cases' changes are made

Linear carries the catalog shared by two apps, the newer builds and the card update. Shop A carries the cases that touch the catalog id: the major update, the required update and the breaking schema. Shop B carries no longer published. Each change is temporary.

### 6. The major update through a temporary patch

The kit's card names one catalog id, from its one `catalog.json`. For the major update, a temporary patch in Shop A's entry point makes its card name the old catalog id and a new one while the agent keeps painting in the old; a copy of its catalog packed under the new id is handed at publish. The kit's one-id limit — a kit app cannot keep an old line beside a new one, so every catalog-id change on the kit retires the line — is recorded as a finding under Phase 15's migration window.

### 7. The secret sweep covers the marketplace

The sweep collects every publisher file's token it finds — the launcher's, and any given to it — beside the vault's and the agents' secrets, and searches the marketplace's state folder and its output by default, the folder resolved as the marketplace resolves its own. Committed and tested before the sitting. It runs after the publish of the roster and again at the end.

### 8. The starting state

The marketplace's state wiped, its embedding model kept; the launcher's dev publisher file removed, so the claim is a first claim; the orchestrator on a fresh state folder holding only the embedding model's cache, so every app is installed by id into an empty registry and every account is signed in from its tile. The existing orchestrator state folder is left as it is. `A2UIVERSE_PUBLIC_URL` holds the tunnel's addresses for the whole sitting.

### 9. The roster published

Both tiers launched together under `--publish` (decision 21). Read: the launcher's first claim and its publisher file; each publish's summary; the preview captured for each app with sign-in or a key, and the marketplace's own smoke test for Shop A; `stellify list` as the dev publisher, seven apps at card 0.1.0 with each catalog at its build; `marketplace search` over three phrases — "pull requests waiting for my review", "camera prices", "failing builds" — each expected to rank its app first; `registry list`, every source `marketplace`; each install's summary, every file fetched into the empty registry; `registry updates`, all seven up to date. Then the three compositions, each sign-in app signed in from its tile the first time: "What needs my attention today?", "what's the status of what I'm working on?", and "Compare camera prices across both shops" with Shop B connected through its key page — each fragment in its catalog, attributed by its card's `name`, the merge landing, one merged value clicked onto its element.

### 10. The second publisher

A second publisher, `someone-else`, under a home of its own: claiming `a2uiverse-apps` refused as taken, then `someone-else` claimed; publishing `aperture-copy` with Shop A's card URL refused on the catalog id its card declares; the same handing a pack of Shop A's catalog refused; publishing `linear` with Linear's card URL refused on the app id; unpublishing `linear` refused. After each, the dev publisher's `stellify list` and `registry updates` are unchanged. Its home is deleted after.

### 11. A catalog shared by two apps

The dev publisher publishes `linear-admin` with Linear's card URL, installed by id: two apps on one Linear row in the index and the registry. A Linear build with an additive change installed from its local pack moves the row, `linear-admin` following, named in the summary and the journal's registry line. A published Linear build is listed on both entries, then reverted. A Linear build with a component removed, installed from its local pack, is refused for carrying `linear-admin`; with `linear-admin` uninstalled the same build moves the row alone. Linear is installed again by id at the committed build; `linear-admin` is unpublished.

### 12. An automatic update never carries an app installed from a local pack

The update check skips a marketplace app's automatic update when the row's move would carry an app installed from a local pack; the marketplace app stays at a newer build, reported, and the person's install by id moves both, naming the follower. With Linear from a local pack and `linear-admin` from the marketplace, the published Linear build of decision 11 is the probe, run before the fix and after it; the fix carries an orchestrator test. The boot says each automatic update left undone and the apps it would have moved. Replaced: the automatic update moving the row, an app installed from a local pack carried with it.

### 13. Linear's cases

Linear installed again from its local pack, its source `local`. A visible change to its catalog's implementation alone, packed, previewed and published at card 0.1.0: `registry updates` reads a newer build for Linear and leaves it, no automatic line in the journal; installed by id, its source `marketplace`, a reload shows the new look. The change reverted, packed and published as a second build: the check installs it itself — up to date, the journal's line automatic, a reload shows the original look. Then the card moves: `version` 0.2.0 and the first sign-in asking `issues.write` too; Linear's agent restarted, then the orchestrator: `registry updates` reads ahead of the Store naming 0.2.0, the report sent; the marketplace's log and flag; `registry install linear` refused in the Store-behind words; `stellify list` printing the notice; Linear still composing on its installed card. Previewed and published at 0.2.0, the flag cleared: `registry updates` reads a card update naming `issues.write`; installed by id, Linear's slot takes the needs-more-access tile, and Allow signs in again and paints.

### 14. The marketplace unreachable, and its own restart

After Linear's cases the marketplace is stopped: `registry updates` reads every state unknown within the timeout; `registry install linear` is refused naming the address; the orchestrator restarted with it down prints its one line and one question still composes. The marketplace started again boots from its files: `stellify list` and `registry updates` read as before it stopped. In Shop A's ahead-of-the-Store window the marketplace is restarted after Shop A's agent and before the orchestrator, so its own refetch at boot sets the flag and the orchestrator's report is a nudge.

### 15. Shop A's cases

A copy of Shop A's catalog packed under a new catalog id; the patch of decision 6 and `version` 0.2.0; the agent restarted, the marketplace restarted, the orchestrator restarted: `registry updates` reads ahead of the Store naming the new id and 0.2.0. Published with the new artifact, the marketplace's smoke test live: `registry updates` reads a major update naming the new id; installed by id, both artifacts held; the camera comparison composes. The catalog moved to the new id, the patch dropped, `version` 0.3.0, the agent restarted and published: the marketplace notes the old line retired and drops its row; `registry updates` reads update required naming the old id; installed by id, the old artifact gone; the camera comparison merges Shop A in the new id with Shop B. Video removed from the new id's schema, packed and published at 0.3.0: refused, the refusal naming Video removed; reverted.

### 16. No longer published

Shop B unpublished as the dev publisher: `registry updates` reads no longer published; `marketplace search` no longer returns it; `registry install shop-b` by id is refused; the camera comparison still merges it. Shop B republished at 0.1.0 with a changed card is the probe of decision 17, run before its fix and after it; then Shop B republished unchanged.

### 17. An unpublished app id keeps its versions and its last card

Unpublish takes an app out of the index and its search and keeps the versions its id published and the card at its last version. A republish of the same card at the last version is accepted, the app listed again; a changed card carries a version never published; an earlier version is refused as moved past. Replaced: unpublish forgetting the app's versions, a later publish starting them afresh.

### 18. The state the sitting leaves, and the closing launch

Every temporary edit reverted, `a2uiverse-apps` holding only the committed fixes; the marketplace's state wiped again, its embedding model kept; the sitting's orchestrator state folder removed. Then both tiers launched together under `--publish` on the reverted checkouts against the wiped marketplace, the launcher's publisher file kept, so it meets the 401 and claims its name again: all seven published and installed by id, `registry updates` all up to date.

### 19. The sitting's order

The sweep's extension; the regression pass before; the starting state; the roster published, then the sweep; the second publisher; the catalog shared by two apps, with decision 12's probe, fix and probe; Linear's cases; the marketplace unreachable; Shop A's cases with the marketplace's restart; no longer published, with decision 17's probe, fix and probe; the sweep over the whole sitting; the cleanup and the closing launch; the regression pass after; the write-up.

### 20. The record

This spec is the record. Each on-the-spot fix is added as a numbered decision as it lands, with what it replaced. The write-up — before the sitting, the sitting case by case, after it, the findings — carries each case's terminal lines, the journal's registry lines, the screen for a canvas case, the sweeps' counts, and the regression runs before and after. Findings for later phases go into their phase's notes in `_dev/TODO.md` at the write-up. Every amendment to the phase spec, SPEC.md and earlier sub-task specs that 13.8 calls for — among them decision 12's on phase decision 16, task 13.5's decision 9 and SPEC §10, and decision 17's on phase decisions 7 and 15 and SPEC §9.3 — is made by 13.9.

### 21. A launch runs several tiers

The launcher's `--tier` takes several tiers joined by commas, and one launch runs them together, the reconcile over what that launch ran. A launch ran one tier and its reconcile took out another tier's apps, so the five apps and the two stores could not stand installed from the marketplace at once. Replaced: a launch running one tier.

### 22. A region never shrinks below what it holds

An app's region on the canvas keeps at least the height of what it holds. In a column, a region taller than its share keeps its height and its neighbours take the rest; where everything fits, the shares stay equal. Replaced: a region shrinking to its share of the column, a taller fragment running over the region below it.

### 23. A publish's previews sign in where each agent says

Under `--publish` each sign-in app's preview opens the agent's sign-in page at the address the agent gives, so with `A2UIVERSE_PUBLIC_URL` set the deterministic launch's previews go through the tunnel, and the agents' ports are forwarded and Public before it. The tunnel document says so. Replaced: the tunnel document saying a publish needs nothing of the tunnel.

### 24. The marketplace logs every refusal

A refused claim and a refused unpublish each print one line in the marketplace's log, as a refused publish does: the name or the app id, who asked, and the findings. Replaced: only a refused publish logged, a claim of a taken name and another publisher's unpublish leaving no line.

### 25. The marketplace's command tests reach no running marketplace

The `marketplace search` test of the default address answers its own request, so a marketplace running on its port does not change it. Replaced: the test reaching `localhost:10002`, failing whenever the marketplace runs there.

### 26. A published additive change stays at its catalog id

A schema change published at a catalog id is not taken back by a later publish at that id: the marketplace refuses the earlier schema as a removal. After the catalog shared by two apps, the marketplace's state is wiped, its embedding model kept, and both tiers launched again under `--publish` with the launcher's publisher file kept, so Linear's cases start from its committed build. Replaced: decision 11's published Linear build reverted by a later publish.

### 27. Ahead of the Store with a scope added, the slot asks for it

The orchestrator judges a slot's access against the live card it fetched. In Linear's ahead-of-the-Store window, its live card asking `issues.write` beside `issues.read`, Linear's slot takes the needs-more-access tile with no call to the agent, before the Store has the card. What the canvas says for an app ahead of the Store is recorded as a finding for Phase 15's pre-dispatch check. Replaced: decision 13's Linear still composing on its installed card in that window.

### 28. A merged column is computed by the operator its words name

The shell's formula operators gain `difference`: the gap between exactly two numbers, never negative, no value when either is absent. The Synthesizer fills a column with the operator that computes what its words say, by that operator's description; where none does, the column is dropped or renamed, never filled by an operator that computes something else. Replaced: a planned "Difference" column filled with `max`, the larger price shown as the difference.

### 29. The update check fetches each app's live card

Each update check fetches every installed app's live card beside its marketplace entry, in parallel. A card that answers replaces the one the orchestrator held, its search vector recomputed when it changed; one that does not answer leaves the one held. The states, and every sign-in judged on the live card after, read the card the agent serves now. Replaced: the live card fetched at boot and at install alone, an agent moved since judged on its old card until the orchestrator restarted.

### 30. A Store flag the live card no longer bears out is reported again

The update check reports an app whose entry the Store flags as ahead while the live card it fetched shows no drift, so the marketplace refetches the card and clears the flag. These reports are kept apart from the drift reports, and the boot says each one. Replaced: an app reported only when the orchestrator saw drift, a flag outliving an agent that moved back.

## Invariants

- No credential reaches the marketplace.
- Install is one operation on every path; composition is unchanged over apps installed from the marketplace.
- Nothing a2uiverse-specific rides the vendor wire: the live card is read as written.

## Write-up

### Before the sitting

The sweep's extension (`8c1ae71`) and the launcher's several tiers (`a40f223`, decision 21) committed. The regression pass before, all green: the platform's `pnpm verify` 22 of 22 tasks and 62 script tests; `a2uiverse-apps`' `pnpm verify` 31 of 31; the Playwright replay 75 passed; the live sign-in test 1 passed; the Python suites — the kit 323, GitHub 144, Gmail 131, Calendar 123, CircleCI 82, Linear 77, Shop A 98, Shop B 99.

### The sitting

**The starting state and the roster published.** The marketplace booted with "apps: none published", the orchestrator with "apps: none installed". `dev:agents — claimed a2uiverse-apps at http://localhost:10002`, then each app `published … · card 0.1.0` and `installed … · card 0.1.0` at the same build. Previews: Shop A's `capturedBy: marketplace`, the six others' `capturedBy: publisher`. `stellify list`: seven apps at 0.1.0. Search: "pull requests waiting for my review" — GitHub 0.555 first; "camera prices" — Shop B 0.411, Shop A 0.379; "failing builds" — CircleCI 0.371 first. `registry list`: every source `marketplace`; every artifact in the registry byte-identical to the marketplace's. `registry updates`: seven up to date. Journal: seven `install` lines, `outcome: installed`, `source: marketplace`.

**The three compositions.** Each sign-in app signed in from its tile, Shop B through its key page, each fragment in its catalog under its name. "What needs my attention today?" joined Google Calendar, Gmail, GitHub and Linear; the Linear row "Shell-action report hangs through the tunnel" landed on Linear's issue. "what's the status of what I'm working on?" joined Linear issues to GitHub PRs and CircleCI runs; pull request #7 landed on GitHub's. "Compare camera prices across both shops" joined both shops, Lumen Z6 Shop A's alone and Orbit GM3 Shop B's alone; US$3,149.00 landed on "3149" in Shop B's Kestrel R5 row. Calendar's fragment ran over Gmail's tile: decision 22. Sweep: 24 secrets collected, none in 153 files.

**The second publisher.** `publisher name "a2uiverse-apps" is taken`; `claimed someone-else`; `aperture-copy` refused twice, `catalog "…/shop-a-catalog/catalogs/v0.9.1/catalog.json" belongs to publisher "a2uiverse-apps"`, bare and with Shop A's pack, no artifact stored; `publish linear` and `unpublish linear` refused, `app id "linear" belongs to publisher "a2uiverse-apps"`. The dev publisher's `stellify list` and `registry updates` unchanged after each. The marketplace logged no line for the refused claim or the refused unpublish: decision 24. Its command test failed with a marketplace running on its port: decision 25. The launcher's previews signed in through the tunnel: decision 23.

**A catalog shared by two apps.** `linear-admin` published from Linear's card, `the held build counts as covered`, installed by id: both apps on `sha256-JvcQSoor…` in the index and the registry. Linear's build adding Avatar's `size` value `large`, from its local pack: `updated linear · … → sha256-zJbZyJNl… · linear-admin followed`. The check then tried `linear-admin`'s automatic update back to the Store's build, carrying Linear, refused only by the additive check; with a probe build `sha256-g_GajWmz…` published, listed on both entries, the check installed it, the journal line `automatic` with `followed: ["linear"]`: decision 12's probe before its fix. After it: no install, no journal line, both `newer build`, the boot saying `automatic update of linear-admin left undone: it would move linear, installed from a local pack`, and the install by id `… · linear followed`. The build removing `PriorityIcon`: refused, `not an additive evolution of the build linear-admin renders in: components/PriorityIcon: removed`; with `linear-admin` uninstalled, it moved the row alone. The committed build republished: refused, `components/Avatar/properties/size/enum: "large" removed`: decision 26; the marketplace wiped and both tiers launched again, `claimed a2uiverse-apps again … it no longer knew the token`, every build as before.

**Linear's cases.** Linear from its local pack, `local`. A palette change to the In Review colour, published at 0.1.0: `newer build`, no journal line; installed by id, `marketplace`, the icon `lch(55 90 330)`. A first build changing the stylesheet's fallback alone painted unchanged: the palette sets the colour. The revert published: `up to date`, the journal line `automatic`, the icon `lch(58 52 148)`. Card 0.2.0 with `issues.write`: the boot `linear is ahead of the Store — reported to the marketplace`; `the Store lacks version 0.2.0`; the marketplace's line and flag `{"version":"0.2.0"}`; `registry install linear` refused, `the Store is behind linear: its card now declares version 0.2.0 that the Store does not have yet`; `stellify list` `ahead of the Store: version 0.2.0 the Store does not know`. Linear's slot asked for `issues.write` in that window: decision 27. Published at 0.2.0: `notice: linear is ahead of the Store … publish it`; the flag cleared; `card update 0.1.0 → 0.2.0 asks signIn: issues.write`; installed by id, `card 0.1.0 → 0.2.0`; the needs-more-access tile, Allow asking `openid issues.write`, Linear painting.

**The marketplace unreachable, and its own restart.** Stopped: seven `unknown`; `registry install linear` refused, `the marketplace at http://localhost:10002 could not be reached: ECONNREFUSED`; the orchestrator's boot `marketplace at http://localhost:10002 unreached (ECONNREFUSED) — update states unknown until the next check`; Linear composing. Started: `stellify list` and `registry updates` identical to before.

**Shop A's cases.** The copy under `…/shop-a-catalog/catalogs/v2/catalog.json` packed; the patch and 0.2.0, the live card naming both ids. The marketplace's own boot refetch: `shop-a is ahead of the Store: catalogs …/v2/catalog.json and version 0.2.0`; the orchestrator's report after it a nudge; `the Store lacks catalog …/v2/catalog.json and version 0.2.0`. Published with the new artifact, the preview `capturedBy: marketplace` at 0.2.0: `major update 0.1.0 → 0.2.0 new catalog …/v2/catalog.json`; installed by id, both artifacts held; the camera comparison merged, its planned "Difference" column showing the larger price: decision 28, seen again at US$150, US$70, US$50 and "—". The catalog moved, the patch dropped, 0.3.0: `…/v0.9.1/catalog.json retired for shop-a`, its artifact dropped; the check read the boot's card: decision 29, then `update required 0.2.0 → 0.3.0 retired …/v0.9.1/catalog.json`; seen live at 0.3.1, ahead of the Store with no restart; the marketplace's 0.3.1 flag outlived the revert: decision 30, cleared at the next boot. Installed by id: `…/v0.9.1/catalog.json sha256-1E-0aZuq… gone`; the camera comparison merged Shop A in the new id with Shop B. Video removed: refused, `components/Video: removed`; reverted.

**No longer published.** `unpublished shop-b`: `not published`; the search without Shop B; `registry install shop-b` refused, `app "shop-b" is not published`; the camera comparison merging Shop B. A changed card at 0.1.0 accepted as `published shop-b`: decision 17's probe before its fix. After it: the publisher's record keeping `shop-b` at `["0.1.0"]` with its last card; a changed card at 0.1.0 refused, `the card changed, but version "0.1.0" is already published`; the same card `published … · note: shop-b is listed again`, the search ranking it first again.

**The sweep over the sitting.** 24 secrets collected, none in 156 files: the journal, every file of the marketplace's state but its embedding model, every process's output.

**The cleanup and the closing launch.** `a2uiverse-apps` clean at `origin/main`, nothing of the sitting committed there; the marketplace wiped; the sitting's orchestrator state removed; `STATE_DIR` gone from the orchestrator's `.env`. The closing launch: `claimed a2uiverse-apps again`, the seven published at their builds and installed by id into the orchestrator's own registry, every source `marketplace`, seven up to date.

### After the sitting

The regression pass after, all green: the platform's `pnpm verify` 22 of 22 tasks and 63 script tests; `a2uiverse-apps`' 31 of 31; the Playwright replay 75 passed, no baseline retaken; the live sign-in test 1 passed; the Python suites unchanged. What moved: the script tests 62 to 63 (decision 21); the shell catalog 448 to 450 (decisions 22 and 28); the client 592 to 593 (decision 28); the marketplace 73 to 75 (decisions 24 and 17); the orchestrator 539 to 542 (decisions 12, 29 and 30). One orchestrator test, "a paint after a step back drops nothing…", failed once in a full run and passed alone three times and in the next full runs.

### Findings

- Phase 15: the kit's one-id limit (decision 6); the canvas for an app ahead of the Store asking a new scope from the live card (decision 27).
- Amendments for 13.9: decision 12 on phase decision 16, task 13.5's decision 9 and SPEC §10; decision 17 on phase decisions 7 and 15 and SPEC §9.3; decision 23 on task 13.6; decision 26 on decision 11; decision 27 on decision 13 and phase decision 16's ahead-of-the-Store window; decision 28 on SPEC §5.2's operators; decision 29 on the phase spec's "the card it fetched at boot" and task 13.5's live-card fetch; decision 30 on the phase spec's report.
- The marketplace logs a flag it sets, and no line when its refetch clears one.
