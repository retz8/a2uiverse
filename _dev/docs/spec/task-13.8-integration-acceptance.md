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

Both tiers launched under `--publish`. Read: the launcher's first claim and its publisher file; each publish's summary; the preview captured for each app with sign-in or a key, and the marketplace's own smoke test for Shop A; `stellify list` as the dev publisher, seven apps at card 0.1.0 with each catalog at its build; `marketplace search` over three phrases — "pull requests waiting for my review", "camera prices", "failing builds" — each expected to rank its app first; `registry list`, every source `marketplace`; each install's summary, every file fetched into the empty registry; `registry updates`, all seven up to date. Then the three compositions, each sign-in app signed in from its tile the first time: "What needs my attention today?", "what's the status of what I'm working on?", and "Compare camera prices across both shops" with Shop B connected through its key page — each fragment in its catalog, attributed by its card's `name`, the merge landing, one merged value clicked onto its element.

### 10. The second publisher

A second publisher, `someone-else`, under a home of its own: claiming `a2uiverse-apps` refused as taken, then `someone-else` claimed; publishing `aperture-copy` with Shop A's card URL refused on the catalog id its card declares; the same handing a pack of Shop A's catalog refused; publishing `linear` with Linear's card URL refused on the app id; unpublishing `linear` refused. After each, the dev publisher's `stellify list` and `registry updates` are unchanged. Its home is deleted after.

### 11. A catalog shared by two apps

The dev publisher publishes `linear-admin` with Linear's card URL, installed by id: two apps on one Linear row in the index and the registry. A Linear build with an additive change installed from its local pack moves the row, `linear-admin` following, named in the summary and the journal's registry line. A published Linear build is listed on both entries, then reverted. A Linear build with a component removed, installed from its local pack, is refused for carrying `linear-admin`; with `linear-admin` uninstalled the same build moves the row alone. Linear is installed again by id at the committed build; `linear-admin` is unpublished.

### 12. An automatic update never carries an app installed from a local pack

The update check skips a marketplace app's automatic update when the row's move would carry an app installed from a local pack; the marketplace app stays at a newer build, reported, and the person's install by id moves both, naming the follower. With Linear from a local pack and `linear-admin` from the marketplace, the published Linear build of decision 11 is the probe, run before the fix and after it; the fix carries an orchestrator test.

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

Every temporary edit reverted, `a2uiverse-apps` holding only the committed fixes; the marketplace's state wiped again, its embedding model kept; the sitting's orchestrator state folder removed. Then both tiers launched under `--publish` on the reverted checkouts against the wiped marketplace, the launcher's publisher file kept, so it meets the 401 and claims its name again: all seven published and installed by id, `registry updates` all up to date.

### 19. The sitting's order

The sweep's extension; the regression pass before; the starting state; the roster published, then the sweep; the second publisher; the catalog shared by two apps, with decision 12's probe, fix and probe; Linear's cases; the marketplace unreachable; Shop A's cases with the marketplace's restart; no longer published, with decision 17's probe, fix and probe; the sweep over the whole sitting; the cleanup and the closing launch; the regression pass after; the write-up.

### 20. The record

This spec is the record. Each on-the-spot fix is added as a numbered decision as it lands, with what it replaced. The write-up — before the sitting, the sitting case by case, after it, the findings — carries each case's terminal lines, the journal's registry lines, the screen for a canvas case, the sweeps' counts, and the regression runs before and after. Findings for later phases go into their phase's notes in `_dev/TODO.md` at the write-up. Every amendment to the phase spec, SPEC.md and earlier sub-task specs that 13.8 calls for — among them decision 12's on phase decision 16, task 13.5's decision 9 and SPEC §10, and decision 17's on phase decisions 7 and 15 and SPEC §9.3 — is made by 13.9.

## Invariants

- No credential reaches the marketplace.
- Install is one operation on every path; composition is unchanged over apps installed from the marketplace.
- Nothing a2uiverse-specific rides the vendor wire: the live card is read as written.
