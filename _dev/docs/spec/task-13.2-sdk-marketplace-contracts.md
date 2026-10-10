# Task 13.2 — sdk and shared code: the marketplace's contracts, the two rules, the embedder

Sub-task 13.2 of Phase 13 (`_dev/docs/spec/phase-13-marketplace-publish.md`, decisions 7, 8, 10, 11, 12, 13 and 14): the shapes and the checks the marketplace (13.3), Stellify (13.4) and the orchestrator (13.5) share, written once before those three run in parallel, and the embedder moved out of the orchestrator into a package both processes rank with.

## Scope

- The marketplace's contracts in the sdk: the index entry, the publisher, the captured preview, the update states.
- The marketplace's HTTP surface — the route layout and every body — as a contract in the sdk.
- The checks written once: the additive-evolution check, the retirement rule, the smoke-test paint check, ahead-of-the-Store detection.
- The embedder as a package of its own, and the orchestrator switched to it.
- The TODO notes for 13.3, 13.4 and 13.5 on what each reads from here and what each still writes.
- Out: the update-state computation (13.5); coverage counting a held row the publisher owns, the owner-only check and the card-version rule (13.3); the marketplace's own files and its publisher file (13.3); Stellify's home-directory configuration (13.4); any shared fetch client.

## Locked decisions

### 1. What is shared is what two parallel tasks both run

Beyond the TODO's list, 13.2 owns three more pieces because each has two callers among the parallel tasks: the marketplace's HTTP surface (served by 13.3, called by 13.4, 13.5 and the launcher), the smoke-test paint check (run by the marketplace at publish and by Stellify's preview), and ahead-of-the-Store detection (run by the orchestrator at boot and by the marketplace at its boot and on a report). The update-state computation runs in the orchestrator alone and stays with 13.5, reading the vocabulary fixed here; coverage counting a held row, the owner-only check and the card-version rule run in the marketplace alone and stay with 13.3, reading the shapes fixed here. Each gets a note in `_dev/TODO.md`.

### 2. The embedder is `@a2uiverse/embedder`, a private workspace package

The embedder leaves the orchestrator for a private workspace package under `packages/`, consumed by the orchestrator and the marketplace through the workspace protocol as the shell catalog is. It holds the `Embedder` interface, the transformers implementation with its model constants and cache-directory option, cosine, the corpus document — the one blend of a card's name, description and every skill's texts that is embedded, so the marketplace embeds a published card exactly as the Router embeds an installed one — one shared rank function, `FakeEmbedder` for both processes' tests, and the gated live model test. Each process passes its own cache directory, so the first-boot model download happens once per process. The sdk gains nothing of it: SPEC §13 draws the sdk as the catalog half's contract projection, and the embedder is platform machinery no vendor needs. A subpath export of the sdk with an optional peer dependency was weighed and set aside; it may be revisited later.

### 3. The orchestrator ranks through the package

The orchestrator's own embedder directory and the registry's corpus module go; its wiring, the Registry, the Router and the IntentJournal take the interface, the implementation, cosine, the corpus document and the rank function from the package. The Router keeps its cap and its keep rule on top of the shared rank. The orchestrator's behaviour is unchanged and its test suite passes as it is.

### 4. Contract form

The marketplace's contracts take the form task 11.2's decision 3 set. One descriptive JSON under the sdk's contracts carries the terms — the publisher, ownership, the version contract, retirement, the fixed greeting, the route layout with each body's field list. JSON Schemas beside it carry the two documents that are stored, served and read by more than one process: the index entry and the captured preview, compiled with ajv so every reader gets one error format. The wire bodies read once by one server — claim, publish, unpublish, report — and the update state the orchestrator serves are interfaces with field lists and hand-written readers, as the composition contract does. The contracts carry no version of their own; one contract test asserts the projection against all of it.

### 5. The index entry

One entry per app id: `appId`; `publisher`, the name; `cardUrl`, what the marketplace fetched the live card from and what the registry stores at install; `card`, the AgentCard as published, verbatim, its `version` the app's version and not duplicated as a field; `catalogs`, catalog id to artifact id, the builds; `versions`, every version this app id has published, in publish order, which the version rule and drift detection read — "a version the index does not know" is not "a version other than the current one", since a live agent behind the index is not ahead of the Store; `publishedAt`; `retired`, the catalog ids this app once published and its current card no longer names, so the Store and Phase 15 say it without history; `aheadOfStore`, absent or what the live card declares and the Store lacks — catalog ids, a version, and when the marketplace saw it. The skill embedding and the preview are not in the entry.

### 6. The publisher

The name has the app id's grammar — lowercase letters, digits and hyphens starting with a letter, capped at 63, `shell` reserved — through a sibling of the app-id check; a display-like name is out, since the name is claimed and compared. The token is 32 random bytes from Web Crypto spelled base64url without padding, no prefix; the sdk holds the minting and the hash, SHA-256 in the artifact hashes' `sha256-<base64>` form, so the marketplace mints, hashes and compares through one piece of code. The claim carries the name in and answers with the name and the token once, or with findings when the name is taken. Every later publish and unpublish carries the token as a bearer token, as the registry's write token travels.

### 7. The captured preview

A document: `appId`; `version`, the card version the paint was captured at; `words`, the request text the agent was sent; `messages`, the A2UI server-to-client messages in order, every kind kept — `createSurface`, `updateComponents`, `updateDataModel`, `deleteSurface` — surface ids as the agent wrote them, each surface's catalog id inside its `createSurface`; `capturedBy`, the marketplace live at publish or the publisher through preview; `capturedAt`. Not in it: `paintMeta` parts, the A2A task state, and any trace of a credential. The check over it reads `messages` alone, so one function serves the live paint and the captured one.

### 8. The update states

Eight states, exclusive, one per installed app, decided by the first match in this order: unknown, the marketplace unreached; no longer published, no entry for the app id; ahead of the Store, from the live card through the drift function, carrying the ids and the version the Store lacks; update required, an installed catalog id not on the published card, carrying the retired ids and the published version; major update, the published card naming a catalog id the installed card does not while every installed id is still there, suggested, carrying the new ids, the version old to new and any build that moved with it; card update, the published version differing from the installed one with no catalog id added or dropped, carrying the new scopes — security schemes or scopes on the published card and not on the installed one — and any build that moved with it, since a card change is never automatic and a build riding with it is named rather than installed silently; newer build, the card version unchanged and one or more installed catalogs at an older artifact id than the entry's, carrying each catalog's installed and published build, automatic for apps installed from the marketplace; up to date. "Card changed" is decided by version alone, since a publish at a published version changes nothing. The served shape is the app id, the state, the installed and published versions and the details under the state that carries them, as a discriminated union with field lists and a reader.

### 9. The additive-evolution check

A fixed structural walk of the held schema against the new one, never a semantic subsumption of two JSON Schemas, each refusal naming the component or function and the path. Refused: a component, a function or a `$defs` entry present in the held schema and absent in the new; a property present in the held and absent in the new; a property becoming required, or a new property listed as required — a new property is accepted only as optional; an enum value present in the held and absent in the new, new values accepted; `type`, `$ref` or `const` differing at any node; a constraint tightened — a constraint keyword added where the held node had none, or made stricter: `pattern`, `minimum`, `maximum`, `minLength`, `maxLength`, `minItems`, `maxItems`, `uniqueItems`, an `allOf` gaining an entry, `additionalProperties` or `unevaluatedProperties` going to `false`. Accepted: a constraint loosened or dropped; `description`, `title`, `default`, `examples`, `deprecated` and `x-` keys changing freely. Any other keyword is ignored, not refused, so a harmless keyword never blocks a publish; the list can grow with the sdk without a new catalog id. The walk compares the files as the gate reads them; a `$ref` is compared as a string, never resolved. Upstream's deprecation route — mark it, keep it — stays open.

### 10. The retirement rule, two functions

Two pure functions over ids, in the sdk beside coverage. Lines retired by a card change: the ids the earlier card named and the later one does not — the marketplace fills the entry's `retired` with it at publish, the orchestrator derives "update required" from it with the installed card as the earlier and the published card as the later. Rows no record names: given records each mapping catalog ids to artifact ids, the catalog ids and artifact ids nothing names any more — the marketplace drops those rows after a publish or an unpublish, the registry lets those artifacts go after an uninstall or a moved row. Both are trivial as code; written once so the words and the semantics agree in both processes.

### 11. The HTTP surface

At the root of the marketplace's port, no prefix, the reads shaped like static files so a directory can stand in for the process and the served subtree can be part of the state directory. Reads, no token: `index.json`, every entry — Phase 14's Store page lists from it, and Stellify filters it by its own publisher name to print the ahead-of-the-Store notices on every contact, so no per-publisher route exists; `apps/<appId>/entry.json`, one entry, 404 when not published, which is how the update check learns "no longer published"; `apps/<appId>/preview.json`, the preview document; `artifacts/<artifactId>/<path>`, the artifact's files, immutable, exactly as the registry serves them. Search, no token: `search?q=<words>`, entries in rank order each with its score. Writes: `claim`, `{publisher}` in, created with `{publisher, token}` once or refused with findings, no token; `publish`, bearer token, `{appId, cardUrl, catalogs: [{files}], preview?}`, the catalogs exactly as the registry's install body carries them and the preview the document of decision 7 when the publisher captured one, answering `{ok, appId, version, summary, notes}` or `{ok: false, findings}` as install answers; `unpublish`, bearer token, `{appId}`; `report`, `{appId}` and nothing else, accepted always as a nudge the marketplace verifies itself, no token. The sdk holds the route constants, the body shapes with field lists and readers, and the response shapes. Transport stays with each caller, as the client's orchestratorApi module is today; there is no shared fetch client.

### 12. The smoke-test check

In the sdk, run by the marketplace and by Stellify: the words — the card's first skill's first example, else one fixed greeting the sdk holds, "Hello! Show me what you can do."; messages from an answer — the A2UI server-to-client messages out of an A2A answer's data parts, structurally typed so the sdk still depends on no A2A package, one copy from here on where the orchestrator had its own; the paint check — messages, the entitlement and the catalog schemas by id in, findings out: at least one `createSurface`, every surface's catalog id in the entitlement, each surface's tree against its catalog's schema, no credential input through the existing bar, the entitlement being the app's published ids plus the basic catalog through the existing entitlement function; the sign-in answer check — for a card that requires sign-in, an HTTP 401 or an `auth-required` naming a scheme the card declares, through the existing reader. With each transport: sending the A2A request, collecting the answer, and observing that the task reached a terminal state — the marketplace with its own A2A client, Stellify with its own.

### 13. Ahead-of-the-Store detection

One function, the index entry and the live card in; nothing out when the card is covered, else the catalog ids the entry lacks and the live version when it is not in `versions` — the `aheadOfStore` field less the time the marketplace adds. Exact over the entry alone because coverage at publish guarantees the entry's `catalogs` lists an artifact for every id the published card declares, held rows included, so an id on the live card that is neither in `catalogs` nor public is one the Store lacks for this app. The card's ids are read through the existing declaration reader, so a malformed declaration is a finding, not drift. An unreachable live card is not drift: the orchestrator keeps the app unroutable for the run as today, and the marketplace leaves its flag as it was. The orchestrator reports when the result is non-empty; the marketplace runs the same function on its own fetch before setting the flag, and at its boot over every entry.

### 14. Proof

Every new sdk function with its own tests in the style the catalog contracts set: the additive check over held-and-new schema pairs for each refusal and each accepted change; the retirement functions; drift detection; the paint check over a scripted message list; the publisher name and token; each reader over well-formed and malformed bodies. The contract test extended: the descriptive JSON against the route constants and every field list, the two JSON Schemas against the compiled ones. The embedder package's tests over the corpus document, cosine and rank with the fake; the live model test gated as today. The orchestrator's suite green unchanged; `pnpm verify` green.

### 15. Documents

In this session: the sdk README gains the marketplace's contracts; the embedder package gets a README; the orchestrator README's component table and `docs/design/orchestrator.md` where the embedder's home moves — the diagram, the vectors section and the code table; `_dev/TODO.md` gains the notes of decision 1 — the update-state computation and coverage counting a held row for 13.5 and 13.3, the owner-only check and the card-version rule for 13.3, each pointing at the sdk shape it reads, and one for 13.4, that `preview` writes the document of decision 7 and `claim` speaks the wire of decision 6. `docs/design/marketplace.md` stays 13.9's; nothing here changes a decision in SPEC.

## Invariants

- The sdk's main export stays browser-safe, ajv its only dependency; nothing of the embedder reaches it.
- The sdk depends on no A2A package: every card and answer it reads is typed structurally.
- The contracts carry no version of their own; they are versioned with the sdk.
- Nothing a2uiverse-specific rides the vendor wire; no credential reaches the marketplace.
