# Task 13.3 — The marketplace process

Sub-task 13.3 of Phase 13 (`_dev/docs/spec/phase-13-marketplace-publish.md`, decisions 2, 3, 5, 7, 8, 9, 11, 12, 13, 14, 15 and 18): the marketplace as a running process over the contracts task 13.2 put in the sdk — its state on disk, the publishers and the claim, publish with its gate and the smoke test, the index with its embeddings and the search route, the artifacts hosted, the live-card refresh and the report, unpublish.

## Scope

- The process: its server, port, CORS rule and configuration.
- The state directory: the served subtree and the publishers file; the boot from them alone.
- Publishers and the claim.
- Publish: the order of its checks; the owner-only check over the app id and the catalog ids; coverage counting the publisher's owned held rows; the static gate; the additive-evolution check; the card-version rule; the preview rule; the smoke test with the marketplace's own A2A transport; the commit and the response.
- The index with its embeddings, the search route, and the `marketplace` script's `search` command.
- Artifacts hosted in the registry's static layout.
- The live-card refresh at boot and the report route.
- Unpublish.
- The static gate lifted from the orchestrator into the sdk, the orchestrator importing it.
- Tests and the documents of this session.
- Out: `docs/design/marketplace.md` (13.9); Stellify's verbs (13.4); the orchestrator's install from the marketplace and its update check (13.5); the launcher's flag (13.6).

## Locked decisions

### 1. Ownership is a ledger of its own, never released

The app ids and catalog ids a publisher owns are recorded in the marketplace's own file at first publish and are never released: unpublish removes the app from the index and its rows go when nothing names them, but the names stay the publisher's. The index entries and the catalog rows are derived state over the ledger. No user concept stands behind a publisher; a publisher is the name and its token, as today.

### 2. The served subtree is the truth, `index.json` derived

The state directory holds the served files in exactly the route layout the sdk fixes — `index.json`, `apps/<appId>/entry.json`, `apps/<appId>/preview.json`, `artifacts/<artifactId>/<path>` — and the per-app entry files are the truth: each is read at boot through the sdk's entry validator, `index.json` is regenerated from them after every write and at boot, and the artifacts are re-hashed at boot as the registry's are. One private file beside them, never served, holds the publishers and the ledger. A damaged file refuses the boot, naming its path.

### 3. Embeddings in memory

The skill embeddings are not persisted. At boot the marketplace embeds every entry's stored card through the shared corpus document in one batch and holds the vectors; a publish embeds the new card and replaces that app's vector; unpublish drops it.

### 4. The static gate lifts into the sdk

The per-artifact static gate — the descriptor present and valid, every listed file present with its hash and nothing unlisted, the host-interface version one the platform supplies, the schema parsed, its id agreeing, compiling with the A2UI validator — moves from the orchestrator's registry into the sdk as it is, its test with it, and the orchestrator imports it. The marketplace runs the same gate at publish, so its refusals read as the registry's.

### 5. The card-version rule, exactly

Three cases over the entry's `versions` and its stored card. At the entry's current version, the live card must deep-equal the stored card, key order ignored; builds may still move, so a new artifact for a held id with the card unchanged is accepted, the smoke test runs again, and the preview and `publishedAt` are refreshed; a publish that moves nothing is a no-op that still passes the smoke test. At a version earlier in `versions`, the publish is refused. At a version not in `versions`, the publish is a card change: the version is appended, the card replaced, and `retired` recomputed through the sdk's retired-lines function from the old card's ids to the new one's.

### 6. The smoke test's pass and its timeouts

For an app whose card needs no sign-in, the marketplace mirrors the orchestrator's end-state rule: the stream must end with a final event or a task in a terminal state, else the agent never finished; a `failed`, `canceled` or `rejected` state fails with the vendor's words; any other end goes on to the sdk's paint check over every A2UI data part collected across the stream. For a card that requires sign-in, the request goes with no credential and the sdk's sign-in answer check judges an HTTP 401 or a final `auth-required`. Two timeouts, configurable: `A2UIVERSE_CARD_TIMEOUT_SECONDS`, 10 by default, for every live-card fetch — publish, the refresh at boot and the report; `A2UIVERSE_SMOKE_TIMEOUT_SECONDS`, 60 by default, for the smoke request. A timeout is a refusal naming it.

### 7. A sign-in app publishes with a captured preview, or not at all

A publish of an app whose card requires sign-in that hands no captured preview is refused, with a finding saying the card requires sign-in and the publish needs the preview Stellify's `preview` captures. Every published app therefore has a preview, and `apps/<appId>/preview.json` never answers 404 for a listed app.

### 8. A preview is taken only for a sign-in app

A publish of an app whose card needs no sign-in that hands a captured preview is refused, with a finding saying a preview is only taken for an app whose card requires sign-in. The live paint is that app's preview. The preview field is present exactly when the card requires sign-in.

### 9. Boot: load, embed, listen, refresh in the background

The marketplace reads its files, embeds every entry, then listens. The live-card refresh runs in the background right after, every card in parallel under the card timeout, each entry's flag rewritten as its fetch lands. A publish or a report arriving meanwhile queues behind the writes as every write does.

### 10. Report: accepted at once, verified after

The report route answers `202` with an empty body at once; the refetch of the live card runs after the answer, one in flight per app id at a time, so a burst of reports costs one fetch. An unknown app id is accepted the same way and does nothing.

### 11. Methods and status codes

The reads — `index.json`, the entry, the preview — are GET with `no-cache`, `200`, `404` when not published; the artifact files are GET with the immutable cache header, `200` or `404`; search is GET with `no-cache`, `200` with the results, `400` when the query is missing or blank. Claim is POST: `201` with the name and the token, `422` for a name the grammar refuses, `409` for a taken name. Publish is POST with the bearer token: `200` with the outcome; `400` when the body does not read; `401` with no token or none a publisher holds the hash of; `403` when the app id or a catalog id belongs to another publisher, answered alone before the gate runs; `422` for every other finding, all of them listed. Unpublish is POST with the bearer token: `200` with `{ok, appId}`, `401`, `403` for another's app, `404` when not published. Report is POST, `202`, empty. Every refusal body is the sdk's `{ok: false, findings}`.

### 12. The `marketplace` script's `search` command

The marketplace package gains a `marketplace` script with one command, `search <words>`, a thin client over the running process's search route as the registry command is over the registry's, printing each result's app id, name and score in rank order. It is what the phase's proof of the search route runs against the published roster.

### 13. The process and its configuration

Express 5 with the orchestrator's CORS rule, at the root of its port, which `PORT` sets and defaults to 10002; `STATE_DIR` defaults to `.state` under the package; the embedder's cache lives at `models` under the state directory. The package depends on `@a2uiverse/embedder`, `@a2a-js/sdk` pinned at the orchestrator's 0.3.14, `express`, `cors`, and `@a2uiverse/shell-catalog` for its catalog id alone, so an artifact handed for the basic or the shell catalog is refused as the registry refuses it.

### 14. The state directory and its writes

`public` under the state directory is the served subtree of decision 2. `publishers.json` beside it, owner-only like the registry's write token, holds each publisher's name, token hash and claim time, and the app ids and catalog ids they own — the ledger of decision 1. Every file write is a temporary file renamed into place; writes queue one at a time; artifact directories are content-addressed and written only when absent; after every publish or unpublish the rows nothing names, found through the sdk's unnamed-rows function over every entry, are dropped and their directories removed; `index.json` is regenerated, sorted by app id.

### 15. Boot's reading

Boot reads the publishers file, every entry through the sdk's entry validator, every preview through the sdk's preview validator, and every artifact an entry names re-hashed as the registry's store does. Any damage refuses the boot naming the path; an empty state directory is a valid, empty marketplace.

### 16. Publish, in order

The token resolves to a publisher, else `401`. The body reads through the sdk's reader, else `400`. The app id passes its grammar. The app id, when owned by another publisher, answers `403`. The live card is fetched from the card URL under the card timeout. The catalog ids are read from the card through the sdk's declaration reader; any owned by another publisher answers `403`, whether or not an artifact was handed for it. From here every finding is collected as install collects them: the gate per artifact; duplicate ids among the handed artifacts; the public and the shell ids refused; coverage through the sdk's check with the publisher's owned held ids passed beside the public ones, so a held row counts as covered and a card-only publish hands nothing; the additive-evolution check against each held row's schema when the build moves; the card-version rule of decision 5; the preview rule of decisions 7 and 8. Then the smoke test of decision 6 — live, or the sign-in answer check with the captured paint judged through the sdk's paint check under the entitlement the app will have. Then the commit: the artifacts written, the rows moved, the entry, the preview, the ledger's first claims of the app id and of any new catalog id, the vector, `index.json`. The response is the sdk's outcome: the summary reads as install's does, and the notes name the held rows counted as covered, the rows moved with the publisher's apps that followed, the lines retired, and the ids claimed.

### 17. The smoke transport

The marketplace's own A2A client is built from the fetched card and sends one streaming message carrying the A2UI extension and the app's entitlement as its client capabilities — its published catalog ids plus the basic catalog, through the sdk's entitlement function — with the words the sdk chooses from the card. A fetch wrapper turns an HTTP 401 into the sign-in answer. Every data part across the stream is collected, and the end state is judged by decision 6.

### 18. Search

The words are embedded through the same embedder, ranked through the shared rank function over every entry's vector, and every entry is returned with its score in rank order, with no cap.

### 19. Unpublish

The owner's token removes the entry, the preview and the vector; the rows nothing names are dropped with their directories; ownership is kept; `index.json` is regenerated.

### 20. Refresh and report's verification

Both run the sdk's drift function over the entry and the card the marketplace fetched itself. Drift sets the entry's `aheadOfStore` with the ids and the version the Store lacks and the time seen; a covered card clears it; an unreachable or malformed card leaves the flag as it was.

### 21. Proof

Tests in the registry's style: a listening server on a free port called with `fetch`, a fake agent in the marketplace's own test directory modelled on the orchestrator's, the shared fake embedder, temporary state directories. Covered: the claim and its refusals; each publish refusal and the success path; the sign-in path with a captured preview; a build moving a held row and the publisher's other apps following; retirement by a card change; search; unpublish; the report; a boot from a populated directory; a damaged directory refused. The sdk's gate test moves with the gate; the orchestrator's suite stays green; `pnpm verify` green.

### 22. Documents

The marketplace README written for the process as built; the sdk and orchestrator READMEs where the gate moved; the tunnel document's port row for the marketplace no longer reserved. `docs/design/marketplace.md` stays 13.9's.

## Invariants

- No credential reaches the marketplace: the smoke request carries none, and the captured preview holds no trace of one.
- The reads take no token and are shaped like static files, so a directory in the served layout can stand in for the process.
- Nothing a2uiverse-specific rides the vendor wire: the live card is read as written, and the smoke request is an ordinary A2A message.
- Every refusal body is the sdk's refusal shape, every finding listed.
