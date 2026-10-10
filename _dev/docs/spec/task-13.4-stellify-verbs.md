# Task 13.4 — Stellify: claim, preview, publish, unpublish, list

Sub-task 13.4 of Phase 13 (`_dev/docs/spec/phase-13-marketplace-publish.md`, decisions 3, 4, 13, 14 and 15): the verbs that take a catalog package's publisher to the marketplace, beside Phase 11's `pack` and `check`, and the publisher's home-directory configuration that every one of them reads. Over the contracts task 13.2 put in the sdk and the marketplace task 13.3 built. Decides the phase spec's open item on a listing verb.

## Scope

- The publisher's home-directory configuration: what it holds, where it lives, how it is written and overridden.
- `claim`, `preview`, `publish`, `unpublish`, and `list`, each as a command and as a function of the programmatic API.
- `preview`'s A2A transport with the terminal-state wait, the credential the publisher supplies and how it rides, the document it writes, and what it checks the paint against.
- The ahead-of-the-Store notices on every contact with the marketplace.
- The package's new runtime dependency and its version.
- Tests, and the documents of this session.
- Out: the launcher's flag and the dev publisher's own token keeping (13.6); the pin moved on every catalog package and `preview` run on each app (13.7); the round trip by hand (13.8); `docs/design/marketplace.md` and `app-install.md`'s Stellify section (13.9); the Store page showing a publisher their own listings (Phase 14).

## Locked decisions

### 1. One publisher per machine

The home-directory configuration holds one publisher: the marketplace's address, the name and the token. `claim` writes it; every other verb reads it, with no flag naming a marketplace or a publisher. A file already holding a publisher refuses a new claim unless the claim says to replace it, since an overwritten token is lost with no recovery. The launcher's dev publisher of 13.6 stays out of this file and keeps its token in its own place.

### 2. The file and its override

The file is `publisher.json` in a `stellify` directory under the XDG configuration directory — `~/.config` unless `XDG_CONFIG_HOME` says otherwise — the same path on every OS. It is owner-only and written through a temporary file renamed into place, as the registry's write token and the kit's sign-in store are. One environment variable, `STELLIFY_HOME`, names a different directory, for the tests and for a person keeping two setups apart; no verb takes a flag for it.

### 3. The claim verb

`claim` takes the name and the marketplace's address, the address required with no default — the one place it is given. `--replace` is the flag of decision 1. On success it prints the name, the address and the path the token was kept in; the token itself is never printed. A refused claim prints the marketplace's findings one per line and exits 1 with the file untouched, as `check` prints findings. `claim` prints no notices, the name having no apps yet.

### 4. The transport over `@a2a-js/sdk`

Stellify gains `@a2a-js/sdk` pinned at 0.3.14 as a runtime dependency beside esbuild, external in the committed build, resolved from npm at a vendor's git install as esbuild is. `preview`'s transport is the marketplace's smoke transport with a credential header added: a client built from the fetched card, one streaming message carrying the A2UI extension and the app's entitlement as its client capabilities, every data part collected across the stream, the same end-state rule, the 401 wrapper.

### 5. The credential

The publisher supplies the secret alone in the environment variable `STELLIFY_CREDENTIAL`; no flag, no file. The header it rides in is chosen from the card exactly as the orchestrator's vault chooses it: the first usable alternative of the card's `security` in the card's order names the scheme; `http` bearer, `oauth2` and `openIdConnect` ride as a bearer `Authorization` header, `apiKey` in a header rides as that named header. A card whose alternatives name none of those is refused with a finding saying the scheme is not supported here, the vault's rule. The publisher never names the header.

### 6. Preview's inputs and its document; publish's preview

`preview` takes the app id, the card URL and packed artifact directories, as `registry install` does, and never packs. It writes one file, the sdk's preview document — captured by the publisher, at the fetched card's version, with the words asked and every A2UI message the stream carried — named `preview.json` in the working directory by default, `--out` putting it elsewhere, relative to the working directory as `pack --out` is. `publish` takes the file through `--preview`, explicitly, never looking for a default; a sign-in app published without it gets the marketplace's own refusal. `publish` reads the file through the sdk's preview validator before sending, a malformed file a refusal naming it. `preview` prints as `check` does: the findings one per line and exit 1, or one line naming the file written, the card version and the number of surfaces painted; `--json` prints the document. Exit codes are `check`'s, 1 for findings, 2 for usage.

### 7. Preview runs for every card

For a card that requires no sign-in, `preview` sends the request with no credential, a set `STELLIFY_CREDENTIAL` ignored with a note, judges the paint through the same check and writes the document all the same; its summary line says the marketplace captures that app's preview itself at publish. For a card that requires sign-in, the credential is required and the document is what `publish` sends. `preview` checks the paint only: the sign-in answer, the request sent with no credential, stays the marketplace's live check at publish.

### 8. The paint check's schemas, and the marketplace contact

The entitlement is the fetched card's declared catalog ids plus the basic catalog, through the sdk's entitlement function, exactly as the marketplace advertises it. Each handed directory passes the sdk's gate first, so its descriptor and schema are read as publish will read them, a failing directory a finding before any request. A declared id not handed is resolved from the marketplace: an entry of this publisher in `index.json` naming the id gives the artifact id, and the artifact's descriptor and schema are fetched from the marketplace's static layout. `preview` therefore reaches the marketplace whenever the publisher file exists and prints the notices as every contact does; with no publisher file it makes no contact. A marketplace it cannot reach is one warning line, the run going on with the handed schemas.

### 9. Publish and unpublish

`publish` takes the app id, the card URL, packed artifact directories and `--preview`; `unpublish` the app id. Both refuse before any request when no publisher is claimed on this machine, naming the path looked at and the claim to run. The artifact directories are read as `registry install` reads them — every file under the directory, sent as the sdk's publish body with each file base64 — a directory that cannot be read a refusal naming it; the descriptor is not checked locally, the marketplace's gate being the gate. `publish` prints the marketplace's answer as `registry install` prints the registry's: the summary line and each note on success; "refused" with every finding indented and exit 1 on refusal, a 403 the same way, a 401 saying the token on this machine is not one the marketplace knows. `unpublish` prints "unpublished" and the app id, or the refusal, with no confirmation prompt. `--json` on both prints the marketplace's response body as it came.

### 10. The notices, and the list verb

Every verb that reaches the marketplace fetches `index.json`, keeps the entries whose publisher is the file's name, and prints one line to stderr per entry flagged ahead of the Store, before its own output: the app id, the catalog ids its card declares and the Store has no artifact for, the version the Store does not know, and that a publish is wanted. A marketplace that cannot be reached is the verb's own failure, not a missing notice. Stellify gains `list`: one line per app of the publisher's — the app id, the card version, each catalog id at its build's short hash, the lines retired, and what the Store lacks when flagged — the notices inline there rather than printed twice. The phase spec's open item on a listing verb is decided by this.

### 11. The programmatic API

One exported function per verb, in the shape task 11.3's decision 4 set: the marketplace's address and the token explicit arguments, never read from the file by the API; the catalogs as in-memory file maps, what `artifactFiles` returns; the marketplace's answer or the findings returned, never thrown on a refusal; the notices returned as data. The command line alone reads the publisher file and the directories. The exported types stay self-contained in Stellify's own types, no `@a2a-js/sdk` type in the public surface.

### 12. Timeouts and the judgement

`preview` reads the marketplace's two variables with their defaults — `A2UIVERSE_CARD_TIMEOUT_SECONDS`, 10, for the card fetch; `A2UIVERSE_SMOKE_TIMEOUT_SECONDS`, 60, for the smoke request — and takes no flag for them. Its judgement of what the transport saw mirrors the marketplace's for a live paint, so `preview` and `publish` say the same things: a stream with no final event is "the agent never finished"; a task ended as failed, canceled or rejected is a finding with the agent's own words; an error or a timeout is "the smoke request failed"; anything else goes to the paint check. Two cases are Stellify's own, a credential having been sent: a 401 is "the agent refused the credential"; an `auth-required` end is "the agent asked to sign in although a credential was sent", naming the scopes asked for.

### 13. Proof

In `pnpm verify`, Stellify's vitest suite over its own fakes: a fake marketplace scripted per route and recording what it receives, so the tests assert the wire — the claim body, the bearer header, each artifact's files as base64, the preview beside them; and a fake agent over the A2A sdk's server, a copy of the marketplace's, so Stellify's real client talks to a real A2A server. Covered: the claim writing the file owner-only and refusing without `--replace`; `STELLIFY_HOME`; `preview` with a bearer credential and with an `apiKey` header, the request carrying the header the card named, the document written at the card's version with every message; the no-sign-in case with the variable ignored; a held catalog's schema fetched from the marketplace, and the warning when it is down; each judgement of decision 12; `publish` and `unpublish` printing the marketplace's answers and refusals, 401, 403 and 422 alike; `list`; the notices from a flagged entry; `--json` on every verb; the API never throwing on a refusal. The committed-dist freshness test unchanged, the build's externals gaining `@a2a-js/sdk`. The real round trip — a fresh marketplace, the claim, every app published and installed by id — is 13.8's, by hand, and the launcher's every launch under its flag from 13.6.

### 14. Documents

`packages/stellify/README.md`: the five verbs, the publisher file and `STELLIFY_HOME`, `STELLIFY_CREDENTIAL`, the two timeout variables, the notices, the API's new functions, `@a2a-js/sdk` beside esbuild in the installing section, the where-things-are table. The root README where it describes Stellify, now the pack and publish tool. SPEC §13's Stellify sentence gaining `list`. The Phase 13 spec: decision 4 amended with `list` and a pointer to this task, the open item on the listing verb marked decided. `_dev/TODO.md`: the Phase 14 note gaining the Store page showing a publisher their own listings; the 13.6 line gaining that the launcher keeps its dev publisher's token in its own place and calls Stellify's API with it explicit, never the home-directory file. Not now: `docs/design/marketplace.md` and `app-install.md`'s Stellify section (13.9); the apps repo's pin and READMEs (13.7).

### 15. Version 0.2.0

The package moves from 0.1.0 to 0.2.0. `packedBy.version` is the one field that moves an artifact's hash (task 11.3 decision 6), so when 13.7 moves every catalog package's pin, every roster catalog packs to a new artifact id with its schema unchanged: the launcher's next install moves every row, and each app's first publish after that is a build move the additive-evolution check accepts.

## Invariants

- No credential leaves the publisher's machine: `STELLIFY_CREDENTIAL` is read and sent to the agent alone, never written to the document, never sent to the marketplace, never printed.
- The token lives in the publisher file alone and is never printed.
- The marketplace's words pass through unchanged: every finding, summary and note Stellify prints from a marketplace answer is the marketplace's own.
