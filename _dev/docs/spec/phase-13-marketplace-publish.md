# Phase 13 — Marketplace + publish

M9 of SPEC §12: the marketplace as a running process — the index of agent cards with their skill embeddings, the catalog artifacts hosted, the publish step, the hello-fragment smoke test — and the orchestrator installing from it. Settles the app version contract and the publisher's catalog ownership carried from task 11.8, and the smoke test meeting agents that need sign-in carried from Phase 12. Amends SPEC §9.1, §9.3, §10, §12, §13, §16, §17 and the §14 delta register; Phase 11's decisions 7 and 12; task 11.4's decision 5.

## Scope

- The marketplace process: publishers and the claim; publish with its gate and the smoke test; the index with embeddings and one search route; artifacts hosted; the live-card refresh and the stale flag; unpublish.
- Stellify's four new verbs — claim, preview, publish, unpublish — and the publisher's home-directory configuration.
- The orchestrator: install from the marketplace by app id alone; the registry's rule for a shared catalog id at a new hash; the update check and its states over `orchestratorApi`; the automatic build update; the report to the marketplace.
- The sdk: the marketplace's contracts and the checks the marketplace and the registry share; the embedder as shared code.
- The dev harness: the launcher's flag that publishes the roster to the marketplace and installs from it.
- `[apps]`: Stellify's pin moved on every catalog package; preview run on each app.
- SPEC amendments, the delta register rows, `docs/design/marketplace.md`, the READMEs, the Phase 14 and 15 notes in the TODO.
- Out: the Router's second index and the capability-gap loop (Phase 15); the Store page and the App Library (Phase 14); the tile on the canvas for an app ahead of the Store and the update offered there (Phase 15); publisher identity verification and lookalike review (SPEC §17); unpublishing one version; the agent kit minting a credential for its own publisher (open item).

## Locked decisions

### 1. The phase ends with publish, then install from the marketplace

The marketplace runs, persists an index, hosts artifacts, takes a publish and runs the smoke test; the orchestrator's install core gains its second way in — the app id alone, the card URL and the artifacts resolved through the marketplace — under the same gate as every other install. The proof is every roster app published from its checkout and installed from the marketplace by id, then composing as before. The Router does not query the marketplace in this phase.

### 2. A publisher is a name plus a secret

A publisher registers once with the marketplace by name and receives a token. Every publish carries it. An app id and a catalog id belong to the publisher who first published them, and only that token may publish over them. Whether a publisher is who they claim to be is not verified; it stays a known consequence beside SPEC §16's lookalike line.

### 3. The claim comes before the first publish

A Stellify verb claims a publisher name against the running marketplace. A free name is minted its token, which the marketplace stores only as a hash and returns once; a taken name is refused. Stellify keeps the token and the marketplace's address in the publisher's home-directory configuration, outside any checkout, and every later contact with the marketplace reads them from there. A lost token is a lost name: there is no recovery.

### 4. Stellify gains four verbs

Claim, preview, publish and unpublish are built in this phase beside Phase 11's pack and check. Publish and preview take the app id, the card URL and packed artifact directories, as the registry command's install does; they never pack. The card URL is given on every publish, since the live card is what the marketplace fetches. Every verb that reaches the marketplace first prints the notices for the publisher's apps that are ahead of the Store (decision 14).

### 5. A catalog id is owner-only, and its owner moves the one row

A catalog id belongs to the publisher who first publishes an artifact for it; only that publisher's apps may name it, and another publisher's app naming it is refused at publish whether or not it hands an artifact. The marketplace keeps one row per catalog id. A publish by the owner handing a new artifact for a held id replaces that row, and every app of theirs naming the id lists the new artifact. At publish, a row the marketplace already holds for an id the publisher owns counts as covered, so a publish that changes the card alone hands nothing.

### 6. Install is one operation on every path

A new hash for a held catalog id replaces the row, and every installed app naming the id follows it — on an install from the marketplace, by the registry command and by the launcher alike. The install summary names the apps that followed beside the old and new hashes. This replaces task 11.4's decision 5 and SPEC §10's sentence that such an install is refused while another installed app names the id. A direct install is the operator's act on their own machine; the protection that no app changes another's catalog is now the marketplace's owner-only rule. Known consequence: a hand install can replace the catalog another hand-installed app renders in, which the summary makes visible.

### 7. The version contract, at two levels

A catalog id is the catalog's only version. Within one id an artifact is a build, named by its artifact id; the descriptor's package version is stored and shown beside it, never enforced. A new artifact for a held id is accepted when its schema is an additive evolution of the row's — nothing removed, no type changed — and refused otherwise: a breaking change is a new catalog id. The check is written once in the sdk and runs at publish and at install. A new catalog id on the card is a new line. The card's `version` is the agent's version: a publish that changes the card must carry a version this app id has never published, and a publish at a published version must change nothing. An app's version as the index and a registry see it is the card's version and each catalog id at its build.

### 8. Retirement is a publish whose card drops the id

The publisher's obligation is the protocol's migration rule: the agent keeps painting in every catalog id it has published while the hub advertises it, until the publisher publishes a version whose card no longer names that id. That publish retires the line for that app; the marketplace records it, and the row goes once no published app names the id. There is no retire verb. Changing the live agent without publishing is the breach decision 14 detects.

### 9. The marketplace serves an artifact as the registry does

Each artifact is hosted in the static layout the registry already serves and the client's loader already reads — the descriptor and every file under the artifact's id, immutable content. Install from the marketplace reads the descriptor and fetches only the files whose hashes the registry does not already hold. Publish uploads the artifact's files as install's request body already carries them. There is no tarball; Phase 11's decision 7 and SPEC §9.1's tarball sentence are amended.

### 10. The orchestrator computes whether an update exists

The marketplace serves each app's index entry: the card version and each catalog id at its build. The orchestrator fetches the entries for its installed apps at boot and whenever asked, reads three things — the installed record, the index entry and the live card it fetched at boot — and holds per installed app one state: up to date; a newer build of a catalog, the id held; a major update, suggested, the installed id still on the new card; an update required, the installed line retired; a card update, naming its new scopes or catalogs; ahead of the Store; no longer published; unknown, when the marketplace could not be reached. The state is exposed over `orchestratorApi` for Phase 14's App Library. Install from the marketplace of an app already installed is the update, the same install-over as today.

### 11. The index holds and searches

At publish the marketplace embeds the card's skills as the Router embeds the registry's, and offers one search route: words in, cards ranked out. The embedder the orchestrator holds becomes shared code both processes use, so both rank the same way. The Store page in Phase 14 and the Router's miss in Phase 15 call that route; this phase proves it by a command and a test over the published roster, the Router untouched.

### 12. The smoke test checks behaviour, in the marketplace process, with no browser

At publish the marketplace sends the agent one A2A request, advertising exactly the entitlement the app will have when installed — its published catalog ids plus the basic catalog — and checks what the card promised: the agent answers and reaches a terminal state; the answer carries A2UI; every surface's catalog id is inside the entitlement; each tree validates against its catalog's schema; the credential bar holds over the paint. The request's words are the card's own — its first skill's first example — else a fixed greeting. The paint is stored with the published version as the app's preview, for the Store page to render in Phase 14 through the client's ordinary loader. No render and no screenshot at publish.

### 13. An agent that needs sign-in: the auth behaviour checked live, the paint captured by the publisher

An agent whose card requires sign-in is sent the request with no credential and passes when it answers as the contract says — HTTP 401, or `auth-required` naming a scheme its card declares. Preview runs the same smoke test on the publisher's machine against their running agent, with a credential they supply locally, and captures the paint; publish sends the captured paint beside the artifacts, and the marketplace checks it exactly as it checks a live one — entitlement, schema, credential bar — before storing it as the preview. No credential leaves the publisher's machine. Known weakness: for a signed-in app the paint is verified offline, so a publisher could capture a paint their agent never made. For an agent on the kit, the non-interactive entry issues the credential in deterministic and stub mode; in live mode the publisher brings their own.

### 14. Ahead of the Store

The live card is the only copy of the card that says what the agent does now; the index's and the registry's are snapshots. When the live card names a catalog id the index has no artifact for, or carries a version the index does not know, the app is ahead of the Store. The orchestrator sees it from the card it fetched at boot and reports it to the marketplace; the marketplace treats the report as a nudge, refetches the live card itself, and sets its flag only when it sees the drift too. The marketplace refetches every published app's card at its own boot the same way. A flagged listing says it is waiting for the publisher; an install of it is refused by coverage with words that say the Store is behind the app, never that the app is broken; the publisher is told at their next Stellify contact, with the catalog id their card declares and the Store lacks. The report carries the app id and nothing about the person. What the canvas says for such an app, and the update it offers once the publisher publishes, are Phase 15's.

### 15. Unpublish, owner only

A Stellify verb carrying the publisher's token removes an app from the index and its search; a catalog row goes when no published app names it. Registries that installed the app keep it, and the update check reports it as no longer published. One version alone cannot be unpublished.

### 16. A newer build of a held catalog installs itself

When the update check finds that the only difference between an installed app and the index is a newer build at a held catalog id, the card unchanged, the orchestrator installs it over at once — at boot before the client preloads, and whenever the check runs — journaled as an automatic update. Only apps installed from the marketplace are touched; the registry's record keeps where each app came from, and an app installed from a local pack is never moved by the index, the check still reporting the newer build for it. A card change or a new catalog id is never automatic. A failed automatic update leaves the installed build in place, the check reporting it, tried again next time.

### 17. The launcher can publish the roster

Beside `--no-install`, a launcher flag claims a dev publisher name, publishes each roster app to the marketplace after starting its agent, and installs each from the marketplace by id, so every roster app then counts as installed from the marketplace. Without the flag the launcher installs from the checkout as before, and a launch needs no running marketplace.

### 18. The marketplace's state

The marketplace keeps its index, its artifacts and its publishers as files in its own state directory and boots from them alone; an empty marketplace is a valid one.

### 19. Docs

SPEC §9.1 (publish, ownership, the version contract, retirement, no tarball), §9.3 (the publisher and the claim, the index and its search, the smoke test and the captured preview, the stale flag, unpublish), §10 (the shared-id rule, install from the marketplace, the update check, the automatic build update, the record's source), §12 and §13 wording, §16 (the known consequences above), §17; the §14 delta register's rows for the additive-evolution rule within a catalog id, machine-checked at publish and install, and for retirement by publish. Phase 11's decisions 7 and 12 and task 11.4's decision 5 amended. `docs/design/marketplace.md` is the area's record over one running example, publish to install; `app-install.md` gains the install from the marketplace and the update check and points to it for the rest. The Phase 14 and 15 notes in `_dev/TODO.md`.

## Invariants

- Nothing a2uiverse-specific rides the vendor wire: the live card is read as written, the artifact and the preview are outside the protocol.
- No credential reaches the marketplace.
- Install is one operation on every path; composition is unchanged over apps installed from the marketplace.

## Open items

- `[apps]`: whether the agent kit mints a credential for its own publisher's preview in live mode.
- Whether Stellify gains a verb listing what a publisher has published, or the notices on every contact are enough — the task's decision.
- Phase 14: the App Library showing each app's update state — a newer build quietly, a major update as a suggestion, a card update with its new scopes or catalogs named, required, ahead of the Store, no longer published; whether the Planner's installed-apps reader sees the update state.
- Phase 15: the pre-dispatch check for an app ahead of the Store — the live card's ids sharing nothing with the entitlement, the slot taking a tile with no vendor call — and the update it offers once the Store has it; the forced update for an installed line the agent retired; the hub advertising an app's old ids beside its new one after an install-over.
