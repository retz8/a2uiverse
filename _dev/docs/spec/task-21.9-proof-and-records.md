# 21.9 — Step 1's proof and records

The fleet published again into the dev marketplace and installed from it, phase decision 14's short live pass through the tunnel, and the records checked against the pinned releases: `_dev/a2ui-findings.md`, SPEC §14's protocol delta register, the design records and the READMEs. Sub-task 21.9 of Phase 21 (`_dev/docs/spec/phase-21-v1-0-migration.md`).

The upstream check (phase decision 17) read `upstream/main` at `36725eee0` of 2026-11-25 and found no event: `@a2ui/web_core` and `@a2ui/react` are at 0.16.1 and `@a2ui/markdown-it` at 0.2.4 on npm, `a2ui-core` is at 0.7.1 and `a2ui-agent-sdk` at 0.12.1 on PyPI, and upstream pull requests 4171, 4170, 4347 and 3930 are open.

## Scope

- The dev marketplace's state (`apps/marketplace/.state`) and the dev registry (`apps/orchestrator/.state/registry`): the seven apps published again and installed from the marketplace.
- One live pass through the tunnel.
- `_dev/a2ui-findings.md` and `_dev/a2ui-contributions.md`.
- SPEC §14's protocol delta register.
- The design records and the READMEs of both repos.
- `_dev/TODO.md`: notes on the lines of sub-tasks 21.21 and 21.22.
- A fix for a defect of A2UIVerse's own that the republish or the live pass finds (decision 7).
- Out: a registry left from before step 1 rebuilt and crossed; Shop C; a press inside a fragment; the entity join and the two shops' merge as proof — sub-task 21.21; `_dev/a2a-findings.md` and the findings that name no package step 1 moved; a finding filed upstream; the register's rows that name no finding checked here — sub-task 21.22; the phase spec's invariants.

## Locked decisions

### 1. The update path is the dev state's own

The dev marketplace holds the seven apps as published on 2026-11-14, each catalog at a build packed for host-module interface `0.14.0`. The dev registry holds them as sub-task 21.8's hand launch installed them from disk, each at a build packed for `0.16.1`. The seven are published again over the marketplace's entries, each new build held to the additive check against the held one, and each is installed again from the marketplace by its id, the vault's accounts kept. A newer build installing itself at the update check rests on the live suite's update story (`apps/client/e2e-live/update.spec.ts`), green in sub-task 21.8. No registry from before step 1 is rebuilt.

### 2. The republish

Each app is published at the card version it holds, 0.2.0, its card unchanged. The dev marketplace's state is kept. One launch through the launcher publishes the seven as the dev publisher, installs each from the marketplace and stays up for the live pass: both tiers, the agents' public address on the tunnel as it was on 2026-11-14. A card the marketplace refuses as changed, or a stop on the launcher's publisher file, comes back to the owner before a version moves or any state is wiped.

### 3. The dev state is copied aside first

Before the launch, the marketplace's state directory and the orchestrator's registry and vault are copied into the git-ignored `.state/` at the repo root, readable by the owner alone. The copy is deleted when this sub-task is done.

### 4. The fleet runs in `live`

All seven agents run in `live` mode. CircleCI runs in `stub`, from a launcher of its own, only if its held account does not refresh.

### 5. Three questions, and the temporal merge

The pass asks three questions:

1. "What needs my attention today across my inbox, my calendar and GitHub?", the temporal merge over Gmail, Google Calendar and GitHub.
2. "What's the status of what I'm working on: my Linear issues, their GitHub pull requests and their CircleCI runs?", the entity join over Linear, GitHub and CircleCI.
3. "Compare camera prices at Shop A and Shop B.", the two shops' merge.

It passes when each of the seven catalogs has painted once in its own slot and the temporal merge has landed. The entity join and the two shops' merge are recorded as they come, landed or declined. Shop C keeps its install of 2026-11-15 and is not started. No press inside a fragment is part of the pass.

### 6. Who drives, and who signs in

Claude in Chrome drives the pass through the tunnel and reads the screen and the orchestrator's journal. The owner makes every sign-in, in the window the slot opens. Claude types no credential and reads none, and waits at a sign-in window. Shop B's demo key is connected on the orchestrator's own page.

### 7. A failure, once traced

Each failure of the republish or the pass is traced to its cause before anything is done about it.

1. A defect of A2UIVerse's own, in the platform, the agent kit, an agent's prose or examples, or a catalog, is fixed where it is found. A catalog fix lands on the apps repo's `main`, the catalog at a patch version, and is published again, the installed app taking the new build at the update check. A fix in Stellify or the sdk that forces the catalog packages to be re-packed comes back to the owner first.
2. An upstream cause is a finding in `_dev/a2ui-findings.md`, and the pass goes on around it where it can.
3. For a cause outside both, a vendor's server not answering or a model writing one bad paint, the question is asked again. A question that passes unchanged on the second ask passes, and the done-notes name it with what the first ask showed.
4. A paint refused under one of the stricter verdicts of the new releases (task-21.2 decision 2) is traced to whether the agent's own prompt or example led the model to write it. If it did, that is a defect of A2UIVerse's own. If the model wrote it once on its own, point 3 applies.

A fix that changes a decision of an earlier sub-task's spec or of SPEC comes back to the owner before it is made.

### 8. Thirteen findings, each by its own reproduction

The findings of `_dev/a2ui-findings.md` that name a package step 1 moved are checked: 5, 9, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22 and 32. Each finding's Reproduction is run on the pinned release, once, and not kept as a test. Where a finding has nothing to run, the source it names is read in the pinned release. Each gets a verdict: holds, gone or changed.

Findings 23 to 31, which name upstream's samples, the extension specifications, `a2ui-a2a` and `@a2ui/angular`, and findings 33 to 36, written in this phase against 0.16.1, stay as written. So does `_dev/a2a-findings.md`, which names no A2UI release.

### 9. What a verdict does to a finding

A finding that holds stays. Its Component line and its citations of a file and a line are restated at the pinned release, and a sentence on what A2UIVerse does around it is corrected where step 1 changed that. A finding whose fix is merged upstream and not yet in a pinned release holds.

A finding that is gone leaves `_dev/a2ui-findings.md`, and `_dev/a2ui-contributions.md` keeps its line: under Merged where the fix was A2UIVerse's own pull request, under Closed, with the reason and the upstream pull request, where upstream answered it another way.

A finding that changed is rewritten to what is true on the pinned release. Finding 18's passage on a union of an id and text drops the union and points to finding 36.

No finding is filed upstream in this sub-task.

### 10. The register's rows

The row on `addCatalog` carried as a local patch is restated: `addCatalog` refuses a catalog id the processor holds and nothing replaces or removes one, so the client puts another build of a held catalog in the held one's place in the processor's own list. It names finding 32 and keeps its tag, upstream bug report.

The row on `@a2ui/react` drawing developer text where a component cannot be drawn leaves.

Any other row that names one of the thirteen findings follows that finding's verdict: it stays, is restated, or leaves with it.

### 11. The documents, by search

Every README and design record of both repos is searched for:

1. the old and the new release numbers of `@a2ui/web_core`, `@a2ui/react`, `a2ui-core` and `a2ui-agent-sdk`;
2. the two local patches, the stand-ins and `data-a2ui-placeholder`;
3. `addCatalog` and the processor's own list of catalogs;
4. the host-module interface and its version, the names the host lends and their entry points;
5. Stellify's version and the catalogs' versions;
6. the GitHub catalog's `not`, `and` and `or`, and `ActionBar.Menu`'s `trailingVisual` and `overflowIcon`.

Each hit is read in its paragraph and held against the code, and a sentence that is false is corrected.

The descriptor shown in `docs/design/app-install.md` is corrected to what a pack writes today. The pack command's printed line in that record and in `docs/design/trusted-page.md`, and the package version named in `docs/design/marketplace.md`, stay as examples.

### 12. `_dev/TODO.md`

The line of sub-task 21.22 takes a note, "From 21.9", stating facts and nothing of what that sub-task does with them: step 1's changes of behaviour, each with its sub-task decision (the stricter verdicts of task-21.1 decision 2 and task-21.2 decision 2; nothing drawn where a component cannot be drawn, task-21.5 decision 4; the GitHub catalog's two, task-21.7 decisions 3 and 4); each finding that left or was rewritten; each row of the register that moved.

The line of sub-task 21.21 takes one only if there is a fact to state: what the dev marketplace and the dev registry hold after the republish, and which accounts signed in again.

### 13. The gates are cited

The first half of phase decision 14's proof is the runs recorded at the commits the two repos sit on: the platform's `pnpm verify`, replay suite and live suite at sub-task 21.8's done commit, and the apps repo's `pnpm verify` at `cde22ed`. `prettier --check` runs on every document this sub-task changes.

A fix under decision 7 runs `pnpm verify` again in the repo it lands in. A catalog fix also repeats the replay suite on the registry snapshot at the new pin (task-21.8 decision 6), and a fix in the client or the orchestrator repeats the live suite.

### 14. The record is the done-notes

The republish and the pass are recorded in the message of this sub-task's done commit, and no sitting log is written: the two repos' commits; the mode and the models; each app's card version and new build, and the registry reading all seven as installed from the Store; each question with its time and the catalogs that painted; the temporal merge landing and how the other two merges came out; each sign-in made; each question asked twice, with what its first ask showed; whether CircleCI ran in `live` or in `stub`.

### 15. No worktree

The planned changes are documents, on this repo's `main` and, for a README of the apps repo, on that repo's `main`. Only a code fix under decision 7 opens a worktree in this repo.

### 16. What proves it

1. The two repos' gates and suites as recorded at their commits (decision 13).
2. The dev marketplace's index naming all seven apps at card 0.2.0, each catalog at a build whose descriptor names host-module interface `0.16.1`.
3. The dev registry reading all seven as installed from the Store at those builds, the vault's accounts still there.
4. The live pass: each of the seven catalogs painted once, and the temporal merge landed.
5. Each of the thirteen findings with a verdict, and `_dev/a2ui-findings.md`, `_dev/a2ui-contributions.md` and SPEC §14 agreeing with it.
6. Decision 11's search run over both repos, every hit read, no sentence left false.
7. `prettier --check` green on every document changed.
