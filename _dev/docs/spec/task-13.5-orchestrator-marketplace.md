# Task 13.5 — Orchestrator: install from the marketplace, the shared-id rule, the update check

Sub-task 13.5 of Phase 13 (`_dev/docs/spec/phase-13-marketplace-publish.md`, decisions 1, 6, 7, 9, 10, 14, 15 and 16): the orchestrator's second way into install — the app id alone, resolved through the marketplace — the registry's rule for a held catalog id at a new hash on every path, the update check over the sdk's state vocabulary served over `orchestratorApi`, the automatic build update for apps installed from the marketplace, and the report of an app ahead of the Store. Over the contracts task 13.2 put in the sdk and the marketplace task 13.3 built. Amends phase decisions 7 and 14, SPEC §9.1 and §9.3, and replaces task 11.4's decision 5.

## Scope

- The orchestrator's marketplace address and the timeout on every contact with it.
- Install by app id over the existing install route: the entry read, the artifacts resolved, only the files the registry lacks fetched, the same core as a local install.
- The record keeping where the app came from.
- The refusal when the Store is behind the app, and the report.
- The shared-id rule: the row moving on every path, every app naming it following, the additive-evolution check at install, the summary and the journal.
- The update check: what it reads, the eight states computed, the route that serves them, the boot.
- The automatic build update.
- The registry command's verbs.
- Tests, and the documents and amendments of this session.
- Out: the launcher's flag (13.6); the pin moved on every catalog package (13.7); the round trip by hand (13.8); `docs/design/marketplace.md` and `app-install.md` (13.9); the App Library showing the states (Phase 14); the tile for an app ahead of the Store and the update offered on the canvas (Phase 15); the orchestrator's own card-fetch timeout.

## Locked decisions

### 1. The marketplace's address

One environment variable, `MARKETPLACE_URL`, names the orchestrator's marketplace and defaults to `http://localhost:10002`, the marketplace's own default port. Every boot contacts it. When it cannot be reached, the boot prints one line, every installed app's state is `unknown`, and an install by id is refused with a finding naming the address. The boot never fails for it.

### 2. Install by id rides the install route

The existing install route and its write token carry both paths: a body naming a card URL and artifacts is the local install as today; a body carrying the app id alone is the install from the marketplace. A body mixing the two shapes is refused with a finding. The registry command's `install <app-id>` with nothing after the id is the marketplace path. The orchestrator reads the app's entry, takes the card URL from it, reads each artifact's descriptor from the marketplace's static layout, and fetches only the files whose hashes the registry does not already hold — a file held under another artifact is copied from it — then hands the same core the same request a local install hands it: the live card fetched, each artifact gated, coverage, the summary. An install by id of a held app is the install-over, as today.

### 3. The record keeps where the app came from

The installed record gains a source, `marketplace` or `local`, set by the path the last install of the app came by. Records written before this task read as local. The installed list serves it.

### 4. The Store-behind refusal, and the report with it

At an install by id the sdk's ahead-of-the-Store function runs over the entry and the live card the orchestrator fetched. Either half non-empty — a catalog id the entry has no artifact for, or a version not among the published ones — refuses the whole install with one finding in words that say the Store is behind the app, naming the catalog ids and the version the Store lacks and that the publisher is told at their next contact, never that the app is broken. The orchestrator posts a report. The entry's flag alone never refuses: when the marketplace flagged the app but the card the orchestrator fetched is covered, the install proceeds. The ordinary coverage check still runs after.

### 5. The shared-id rule on every path, and the evolution check at install

An install handing an artifact for a held catalog id at another hash moves the row, on the local path and the marketplace path alike; every other installed app naming the id follows it — its catalog pointed at the new artifact, its entitlement, card and source untouched — and the old artifact goes when nothing names it, through the sdk's unnamed-rows function. The sdk's additive-evolution check, the new artifact's schema against the held row's, runs when the move would carry another installed app with it and refuses the whole install when the schema is not an additive evolution; an app alone on its row moves it freely. This replaces task 11.4's decision 5, which refused the install while another app named the id. The marketplace's check at publish stays unconditional.

### 6. The summary and the journal

A moved row is one event, one line each. The install summary's moved-catalog part names the followers by id. The journal's one `registry` line for the install gains the followers; every registry line from now on carries the source the install came by; an automatic update's line says it was automatic.

### 7. The update check's reading

The check reads one entry per installed app from the marketplace, in parallel under the timeout. A 404 is `not-published` for that app. A marketplace not reached — a network failure or a timeout on any read — makes every state `unknown`. An entry that answers but fails the sdk's entry validator makes that one app `unknown`, the cause logged, the others judged. The live card is the one the orchestrator holds for the run — fetched at boot, or at the app's latest install-over; an app with no live card this run has no drift computed and is judged on the other states. The eight states and their details are computed in the orchestrator over the sdk's vocabulary and served shape, decided in the sdk's order, the drift half through the sdk's ahead-of-the-Store function and the retirement half through its retired-lines function, with the installed card as the earlier and the published card as the later. A card update's new scopes are read from the card's `security` alternatives, as the vault reads them: for each scheme the published card's alternatives name, the scope keys the installed card's alternatives do not name for that scheme, every scope for a scheme the installed card never names.

### 8. One operation behind the route and the boot

The check is one operation: fetch the entries, compute the states, perform the automatic update of decision 9, and answer the states as they stand after it — an app just moved reads `up-to-date`, one whose automatic update failed still reads `newer-build`. `GET /registry/updates.json`, no token, served with no caching, runs that operation and answers its result. The boot runs the same operation after the installed cards are fetched and before the orchestrator listens, so the automatic update lands before the client preloads. Concurrent calls coalesce onto the one in flight; the installs it performs queue behind the registry's one-at-a-time rule.

### 9. The automatic build update

An app installed from the marketplace whose state is `newer-build` — the card version unchanged, one or more held catalogs at an older build than the entry's — is installed over at once through the install by id, at boot and whenever the check runs, journaled as automatic. A failed automatic update is a journaled refusal that leaves the installed build in place, the state staying `newer-build`, tried again at the next check. An app installed from a local pack is never moved by the index; the check still reports the newer build for it. A card change or a new catalog id is never automatic.

### 10. The report

The orchestrator posts a report to the marketplace for every installed app the check finds ahead of the Store, on every check that sees it, and for an install by id refused by decision 4. The report carries the app id and nothing else. It is sent and not waited on, under the timeout, a failure logged and nothing more; the marketplace coalesces the reports it receives.

### 11. The timeout

One environment variable, `A2UIVERSE_MARKETPLACE_TIMEOUT_SECONDS`, default 10, bounds every request to the marketplace — the entry reads, the descriptor and file fetches at an install by id, the report. The boot's worst case on a marketplace that does not answer is one bounded wait.

### 12. The registry command

The command gains `updates`: it calls the states route and prints one line per installed app — the app id, the state, the installed and published versions, and the state's details in words: the builds that moved, the new catalog ids, the retired ids, the new scopes, or what the Store lacks. `list` gains the source column. `install <app-id>` is decision 2's.

### 13. Proof

The orchestrator's tests over a scripted marketplace in the orchestrator's own test directory: a small server serving a temporary directory in the sdk's static layout, the entries and artifacts written by the test, a report route recording what arrives, the fake embedder and the fake vendors already there. Covered: an install by id with every file fetched into an empty registry, then a second build fetching only the files it lacks; the Store-behind refusal on each drift half, with the report sent; a moved row with followers on the local path and the marketplace path, the summary and the journal line; the evolution check refusing a breaking move with followers and letting a lone row move; each of the eight states; the automatic update at boot before listen and from the route, its journal line, and its failure leaving the build; a local-pack app left in `newer-build`; `unknown` on a marketplace down and on one malformed entry; the command's `install <app-id>` and `updates`. The suite stays free of the marketplace package; the round trip over the real marketplace is 13.8's. `pnpm verify` green.

### 14. Documents and amendments

In this session: the orchestrator README where it says what is installed and how it runs — the install by id, the `updates` verb, `MARKETPLACE_URL` and the timeout variable; `docs/design/orchestrator.md` where the registry, the boot and the journal are described, and its code table; the tunnel document's note that the orchestrator reaches the marketplace on its own machine, so the default address stands in tunnel sessions. The phase spec's decision 7 amended by decision 5 here — the check at install runs when the move carries another installed app — and its decision 14 by decision 4 here — the refusal on either drift half; SPEC §9.1's "checked at publish and at install" and §9.3's "refused by coverage" each gaining the clause. `_dev/TODO.md`: the 13.6 line gaining that the launcher installs by id through the same install route with the app id alone; the 13.8 line gaining `registry updates` as the tool for each state; the Phase 14 note gaining that the states route runs the check. `docs/design/app-install.md` and `docs/design/marketplace.md` stay 13.9's.

## Invariants

- No credential reaches the marketplace: the report carries the app id and nothing about the person.
- Install is one operation on every path; composition is unchanged over apps installed from the marketplace.
- The live card is read as written; nothing a2uiverse-specific rides the vendor wire.
- The boot never fails for a marketplace that cannot be reached.
