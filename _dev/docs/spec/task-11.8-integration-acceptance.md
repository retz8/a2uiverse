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

## Evidence

### Before the live run

- **The gate of decision 4.** Green in `pnpm verify`. Its allow-list, each entry the only place it found a naming: `apps/client/src/beats/` — the replay's fixture data, the recorded and hand-authored beats carrying the app ids, surfaces and catalog ids they were painted with (183 lines); the Planner's worked examples (10 lines) and the Synthesizer's (8 lines), authored over fixture cards and sources, routing nothing.
- **The flag of decision 5.** Tested in `scripts/launch-plan.test.mjs`; documented in the root README and `_dev/docs/tunnel-environment.md`.
- **`pnpm verify`.** Green: 19 of 19 tasks, 26 script tests. One run failed the orchestrator's quiescence heartbeat test (task 8.10), which passed alone three times out of three and in the next run.
- **The Playwright suite against the 11.5 baselines.** 74 of 74 passed, no diff, before decision 18 and again over the snapshot rebuilt with it.
- **The packs' hashes against the snapshot's** (decision 6), dry-run before the sitting. Before decision 18 none of the seven agreed. After it, Gmail's, Google Calendar's, CircleCI's, Shop A's and Shop B's agree. GitHub's and Linear's still differ in their entry alone: esbuild names a bundled module by its path from the package — in a comment over each module, and as the key of a CommonJS dependency's wrapper — and a dependency sits at another path in the apps checkout's pnpm store than in this repo's.

## Invariants

- Nothing a2uiverse-specific rides the vendor wire: the card is read as written, the artifact is outside the protocol.
- Composition keeps working over runtime-loaded catalogs: merges land, a merged value navigates to its element, the collision detector holds.
- No line of client or orchestrator runtime code names an installed app.

## Findings not fixed

- **One package packs to one artifact only within one install.** esbuild spells each bundled module's path from the package into the entry, so the same source packed from the publisher's checkout and from a consumer's install differs wherever a dependency sits at another path; and two installs may resolve different versions besides. GitHub's and Linear's catalogs show it against the snapshot.
- **The orchestrator's quiescence heartbeat test is timing-sensitive** under the full parallel `pnpm verify`.

## Open items

- Ownership of a catalog id by its publisher — who may replace the artifact for an id, and so how one publisher updates a catalog several of its apps name — is decided in Phase 13.
- How an app update is discovered and accepted, and the window between an agent's new card and its install-over, belong to Phases 13 to 15.
