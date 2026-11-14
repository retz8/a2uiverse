# 20.9 — The agent kit on A2A 1.0

Sub-task 20.9 of [Phase 20](phase-20-a2a-1-0.md) in [`_dev/TODO.md`](../../TODO.md), an `[apps]` sub-task: its code lands in `a2uiverse-apps`. The agent kit (the vendor-agent SDK the seven apps of `a2uiverse-apps` are built on) moves from `a2a-sdk` 0.3.26 to 1.x with its own part-building in place of `a2ui-a2a`, and an agent built on it answers A2A 1.0 and 0.3 over JSON-RPC, HTTP+JSON and gRPC. It works under decision 13 of the phase spec (the agent kit moves to A2A 1.0 in this phase, ahead of upstream) and decision 14 (a kit agent answers both A2A versions on all three bindings). It settles what four earlier task specs left to it: what a kit agent writes (decision 11 of the [20.4 task spec](task-20.4-a2ui-on-a2a-1-0.md)), whether the kit's own sign-in offers device code (the scope of the [20.6 task spec](task-20.6-device-code-sign-in.md)), how the kit signs its card (decision 17 of the [20.7 task spec](task-20.7-signed-cards-verified.md)) and how the kit serves an extended card (decision 15 of the [20.8 task spec](task-20.8-the-extended-card.md)). After 20.3 (the card) and 20.4 (A2UI on A2A 1.0).

These words are used throughout.

1. The kit is `a2ui-agent-kit`, in `agent-kit/` of `a2uiverse-apps`. A kit agent is an agent built on it. The publisher is the author of a kit agent's app.
2. The app's config is the one object an app hands the kit, `AgentAppConfig`.
3. The Python A2A SDK is `a2a-sdk`. Upstream's helper is `a2ui-a2a`, upstream A2UI's toolkit for A2A in Python.
4. A path is one binding at one A2A version. There are six: JSON-RPC, HTTP+JSON and gRPC, each on A2A 1.0 and on A2A 0.3.
5. A mark is the MIME type a data part carries, in its part metadata as `mimeType` or in the part's own `media_type` field, `mediaType` on the wire.
6. A press is the A2UI `action` message a client sends when the person presses something inside a fragment.
7. `paintMeta` is the kit's per-paint shell object, a data part of its own carrying a paint's title and its question marker.
8. The auth-required request is the data part a kit agent puts on its status message when a tool needs a scope the token lacks.
9. The extended card is the card an agent serves an authenticated caller. An account's card is the extended card served to one signed-in account. The flag is `capabilities.extendedAgentCard` on the public card.
10. The base URL is the address a kit agent advertises for its HTTP interfaces.
11. Stellify is the platform's pack and publish tool.

The sources these decisions rest on:

1. The [phase spec](phase-20-a2a-1-0.md): decision 8 (the auth-required request is read in the requirement shape of the agent's own card), decision 12 (the hand-written A2A 1.0 agent signs in by device code, and the live sitting over every path is acceptance), decision 13 and decision 14.
2. The [20.4 task spec](task-20.4-a2ui-on-a2a-1-0.md): decision 2 (the platform reads a part by what its `data` holds, and no reader reads a mark), decision 3 (the reading takes one message or a bare list, each entry judged on its own), decision 5 (the platform writes one message per part, "held on evidence": it stands until a real agent is found that reads only a list), decision 8 (`paintMeta` is marked `application/a2ui-shell+json`, and the kit takes the string up in 20.9) and decision 9 (the auth-required request is read in either shape from an agent on either A2A version).
3. The [20.5 task spec](task-20.5-the-bindings.md): decision 8 (the sign-in signal is HTTP 401 on JSON-RPC and HTTP+JSON and `UNAUTHENTICATED` on gRPC), decision 9 (on gRPC the credential rides as one metadata entry under the scheme's header name in lowercase, and a header name that is no legal gRPC metadata key cannot ride) and decision 13 (toward an agent on A2A 0.3 over HTTP+JSON and gRPC the mark does not arrive, and no patch is carried because the kit reads a press by its content).
4. The [20.6 task spec](task-20.6-device-code-sign-in.md): decision 1 (a redirect sign-in goes ahead of device code).
5. The [20.7 task spec](task-20.7-signed-cards-verified.md): decisions 1 to 4 (a signature passes when its protected header holds `alg`, `typ` and `kid`, under a public-key algorithm, against the key set at a `jku` on the card URL's own origin, and no key set is kept between fetches), decision 6 (a card read as written for A2A 0.3 is taken as an unsigned card is) and decision 14 (a change of signature alone is no update).
6. The [20.8 task spec](task-20.8-the-extended-card.md): decision 1 (from an account's card the platform reads how the account is reached and what it can do), decision 5 (sign-in, catalog ids and the name on screen are never read from it) and decision 11 (a signature on an account's card is checked against the app's own card URL).
7. [`SPEC.md`](../../../SPEC.md): section 8 (Authority), where the AuthVault signs in "with the authorization-code flow and PKCE"; section 9.1 (The app and the catalog artifact), where two cards are the same card "when they are equal as read with how the agent is reached set aside"; section 9.4 (Vendor agents), where a vendor agent "runs on one port in one of three modes"; and the rows of section 14 (Protocol stance) on `paintMeta`, on the auth-required request and on a gRPC interface's address.
8. The [notes on an A2UI part on A2A 0.3 and 1.0](../phase-20-a2ui-part-on-a2a-notes.md), sections 7, 9 and 10.
9. [`_dev/a2a-findings.md`](../../a2a-findings.md): finding 9 (toward an agent on A2A 0.3 over HTTP+JSON and gRPC, `@a2a-js/sdk` drops every part's metadata), finding 11 (`@a2a-js/sdk` cannot dial a gRPC address written with a scheme), finding 16 (the Python A2A SDK's client reads a card's sign-in schemes from the A2A 0.3 copy served beside them, which cannot hold `pkceRequired`, and checks the signature against that copy) and finding 17 (a card the Python A2A SDK writes in A2A 0.3's shape keeps the signature made over its 1.0 form, which no verifier passes).
10. Upstream's helper at `upstream/main` `3ed960186`, and upstream's open [pull request 3162](https://github.com/a2ui-project/a2ui/pull/3162), which widens `a2ui-a2a` to `a2a-sdk` 1.x, last updated on 2026-11-09.
11. The [tunnel environment](../tunnel-environment.md), for the ports.
12. What was found on 2026-11-14, listed next.

Found on 2026-11-14, by reading the kit at `2769609` of `a2uiverse-apps` and the Python A2A SDK 1.3.0 as installed. An item marked run was run against the installed 1.3.0 on Python 3.14.3.

1. The kit depends on `a2ui-a2a` 0.1.0, which requires `a2a-sdk` below 0.4.0. Nothing else in the kit's lockfile puts a ceiling on `a2a-sdk`: `a2ui-agent-sdk` 0.9.0 and `google-adk` 2.8.0 do not depend on it.
2. The kit uses upstream's helper for an A2UI part, for the card's A2UI extension entry, for choosing the A2UI version a request is answered in, and in its test helpers.
3. Each of the seven apps depends on the kit by path and pins `a2a-sdk` below 0.4.0 itself. The scaffolder, `create-a2ui-agent`, writes the same pin and a commit of the kit into the app it generates.
4. A kit agent today writes one A2UI message per part with upstream's `create_a2ui_part`, which puts the MIME string in `metadata.mimeType` alone: `application/json+a2ui` for a message stamped v0.9 and `application/a2ui+json` for one stamped v0.9.1. It marks `paintMeta` `application/json+a2ui-shell`, writes the auth-required request as `security` in A2A 0.3's shape, and reads a press by content from one object, raising when `data` is a list.
5. On `a2a-sdk` 1.x, pull request 3162 keeps upstream's mapping and copies the string of `metadata.mimeType` into the part's `media_type`. Upstream's `get_a2ui_messages` reads only parts that carry the mark.
6. One request handler of the Python A2A SDK serves all six paths. JSON-RPC and HTTP+JSON, on both A2A versions, answer from one HTTP app on one port. gRPC has a server and a port of its own, where the A2A 1.0 and the A2A 0.3 services answer side by side (run).
7. The Python A2A SDK serves the card at `/.well-known/agent-card.json`, as the A2A 1.0 card with A2A 0.3's fields merged in whenever the card lists an interface at A2A 0.3. `supportedInterfaces` keeps the order the list was written in (run).
8. The Python A2A SDK checks no credential: none on gRPC, and none for the extended card's call on any path. A check in front of the HTTP app refuses with HTTP 401 on the four HTTP paths, and one in front of the gRPC server reads the request's metadata and answers `UNAUTHENTICATED` on both services (run).
9. When an executor returns after moving a task to auth-required, the stream ends on all six paths (run).
10. `a2a-sdk` 1.3.0 gives an executor no way to mark an extension activated, and no response names one on any of the six paths (run).
11. The Python A2A SDK signs a card with a helper that writes the protected header its caller hands it and appends a signature each time it is called. A card listing all six paths, signed by it and served by the SDK's card route, verifies when read as A2A 1.0 with unknown fields dropped, and does not verify over the JSON as served (run).
12. The request handler takes a static extended card and a hook that is handed that card and the call context for each caller. The flag gates the call. On the three A2A 0.3 paths the answer is in A2A 0.3's shape (run).
13. The Python A2A SDK's HTTP+JSON routes end with a catch-all for a tenant prefix, and a route listed after them under a nested path is not reached (run).
14. The kit's sign-in server makes a P-256 key at first run, keeps it in the app's state directory with a random `kid`, signs ID tokens with it under ES256 and serves the public half itself. It offers the authorization-code flow, S256 PKCE required, and refresh.
15. Each app's config carries `default_port`, and the launch command takes `--port`. The tunnel environment gives vendor agents 11001 and up and mock agents 12001 and up, "one port per app regardless of run mode". The orchestrator reaches the agents on `localhost`, and the browser opens only an agent's sign-in pages.
16. The platform's [contract](../../../packages/sdk/contracts/a2uiverse.v0.9.json) has no sentence about the kit.

## Scope

1. What a kit agent writes: an A2UI part, `paintMeta` and the auth-required request. What it reads: a press. How it chooses the A2UI version of an answer.
2. Serving the six paths: the publisher's list, the ports and the card.
3. The credential on every binding.
4. Signing the card.
5. The extended card.
6. The kit's own sign-in and device code.
7. What moves with the kit, its version, what proves the sub-task and the documents it changes.
8. Out: the roster spread over the six paths and republished, and whether a roster agent signs its card or serves an extended card, which are 20.11's (the fleet); the hand-written A2A 1.0 agent (20.10); the live sitting over every path (20.12, integration and acceptance); the move to `a2ui-core` 0.5.0, which stays a Backlog line; any change to the platform's code.

## Locked decisions

### 1. An A2UI part is upstream's helper carried over

A kit agent writes one A2UI message per part. The MIME string follows upstream's mapping, `application/json+a2ui` for a message stamped v0.9 and `application/a2ui+json` for one stamped v0.9.1, in `metadata.mimeType`, and the same string goes in the part's `media_type`, as pull request 3162 writes it on `a2a-sdk` 1.x.

### 2. `paintMeta` carries `application/a2ui-shell+json` in both fields

`paintMeta` is marked `application/a2ui-shell+json`, the string decision 8 of the 20.4 task spec fixed, in `metadata.mimeType` and in `media_type`.

### 3. The auth-required request is written in A2A 1.0's shape

A kit agent writes the request as `securityRequirements` in A2A 1.0's requirement shape, always, to a caller on either A2A version. The part stays unmarked.

### 4. A press is read by content, from one object or a bare list

A kit agent reads a press by what a part's `data` holds: one message object, or a bare list of messages, each entry judged on its own. It reads no mark. A list still wrapped as `{value: [...]}` is not read.

### 5. The A2UI version is chosen as upstream's helper chooses it, and no response names it

A request is answered in the newest A2UI version it names that the card advertises, and otherwise in the app's newest. No response names the choice. The version stamp on each A2UI message carries it.

### 6. The publisher writes the whole list of six paths on the app's config

The app's config holds the six paths in the order the card lists them. The kit refuses, at startup, a list that repeats a path, names one the kit does not serve, or leaves one out. With nothing set, the list is JSON-RPC, HTTP+JSON and gRPC on A2A 1.0, then the same three on A2A 0.3. The setting is on the app's config and is not a launch option.

### 7. The four HTTP paths share one port, and gRPC has its own

JSON-RPC and HTTP+JSON, on both A2A versions, answer on the app's one HTTP port. gRPC, on both A2A versions, answers on a second port, which comes from `default_grpc_port` on the app's config and `--grpc-port` at launch, as the HTTP port comes from `default_port` and `--port`.

### 8. The gRPC address on the card is a bare `host:port`

The card lists each gRPC interface at the launch host and the gRPC port, with no scheme.

### 9. The Python A2A SDK's own card route serves the card

The card is served as the Python A2A SDK serves it: in A2A 1.0's shape, with A2A 0.3's fields merged in. The kit writes no card route of its own.

### 10. One credential check covers every A2A call on all six paths

The check covers every A2A call on each path, the extended card's call included. The card, the sign-in routes and the key set of decision 14 stay open. A refusal is HTTP 401 on the four HTTP paths and the gRPC status `UNAUTHENTICATED` on the two gRPC paths. On gRPC the credential is read from the metadata entry under the scheme's header name in lowercase.

### 11. An `apiKey` header name gRPC cannot carry stops the app at startup

An app whose `apiKey` scheme names a header that is no legal gRPC metadata key does not start, and the kit names the header.

### 12. An answer that asks for more access ends its stream there

On all six paths, a kit agent's answer ends when its task moves to auth-required, as it does today.

### 13. The card says what it said

With signing and the extended card off, a kit agent's card reads the same after the move as before it, how the agent is reached set aside. `pkceRequired` is not written.

### 14. Signing: one field on the app's config, a key the kit makes

Signing is off by default, and the publisher turns it on with one field on the app's config. The kit makes a P-256 key at first run and keeps it in the app's state directory. It signs the card under ES256 and serves the key set itself, under the base URL.

### 15. The extended card: a function from the signed-in account to that account's skills

The extended card is off by default. The publisher turns it on by setting one optional function on the app's config, from the signed-in account to that account's skills. The kit builds an account's card as the public card with those skills in place of the public ones, and sets the flag. When signing is on, an account's card is signed with the same key. An app that sets the function and has no sign-in does not start.

### 16. A signature on an account's card in A2A 0.3's shape is left as the SDK writes it

On the three A2A 0.3 paths the Python A2A SDK serves an account's card in A2A 0.3's shape with the signature made over its 1.0 form still on it, which no verifier passes (finding 17). The kit does nothing about it. The platform takes a card in A2A 0.3's shape as an unsigned card is.

### 17. The kit's own sign-in offers no device code

The kit's sign-in server stays on the authorization-code flow with PKCE. The hand-written A2A 1.0 agent of 20.10 is the real agent that signs in by device code.

### 18. One change moves the kit, the seven apps and the scaffolder

The kit, each app's own `a2a-sdk` pin, and the scaffolder's generated pin and kit commit move in one change in `a2uiverse-apps`. The kit is 0.2.0. `a2ui-core` stays at 0.4.0 with the kit's local fix.

### 19. No platform code changes

20.9 changes no code in `a2uiverse`: no release of a platform package, and the Stellify pin in `a2uiverse-apps` does not move. The contract is untouched. What a kit agent writes is described in the agent kit's design record.

*Amended on 2026-11-14, in 20.9's implementation.* The launcher in `a2uiverse/scripts` gives the deterministic copy it previews a sign-in app from under `--mode live --publish` a free `--grpc-port` beside its free HTTP port, and the kit turns gRPC's port reuse off, so a taken gRPC port stops an agent. No platform package is released.

### 20. 20.9's implementation starts after 20.8 lands

The proof of an account's card against the platform (decision 21, item 4) needs 20.8 (the extended card read for a signed-in account) on `main`.

### 21. What proves 20.9

1. The gates: the kit's tests, each app's tests, and `pnpm verify` in `a2uiverse-apps`.
2. The kit's own tests drive a kit agent over real sockets on each of the six paths with the Python A2A SDK's own client: a question, a press as one object and as a list, a refusal without a credential and an answer with one, the request for more access, a signed card, and an account's card.
3. Each of the seven apps' cards reads the same as before the move (decision 13), checked with the card package's sameness test.
4. `stellify preview` runs against one mock app with each of the six paths first in turn, once with signing on and once with the extended card on.
5. One live sitting through the tunnel in the browser ([tunnel environment](../tunnel-environment.md)).
   1. The seven kit apps on the default list, from scratch state, published and installed. The temporal merge, the entity join and the shops' merge are composed, with one press inside a fragment, one sign-in, and one request for more access answered with Allow.
   2. Shop B put on gRPC at A2A 0.3 first, for a question, a press and its sign-in.

### 22. The documents 20.9 changes

In `a2uiverse`:

1. The [agent kit's design record](../../../docs/design/agent-kit.md).
2. [`SPEC.md`](../../../SPEC.md): the sentence of section 9.4 that has a vendor agent run on one port, and the `paintMeta` row of section 14, which says a kit agent still writes the older string.
3. The [tunnel environment](../tunnel-environment.md), for the ports.
4. [`_dev/a2a-findings.md`](../../a2a-findings.md): what the plan's runs confirm about the Python A2A SDK as a server.
5. `_dev/TODO.md`: 20.9's line; a new Backlog line that returns the kit to `a2ui-a2a` once it allows `a2a-sdk` 1.x, as decision 13 of the phase spec asks; and the Backlog line on finding 1 of `_dev/a2a-findings.md` (a streamed answer on `a2a-sdk` 0.3 never naming its activated extensions), reworded, since it no longer describes the kit.
6. Older task decisions that 20.9 makes false, amended in place under an "Amended by task 20.9" line.

In `a2uiverse-apps`:

7. The kit's README, the apps' agent READMEs where they name a port, and the scaffolder's README and templates.

## Invariants

1. Every agent that composes today composes after this sub-task (invariant 2 of the phase spec). The seven kit apps are among them.
2. The move changes how a kit agent is reached and nothing its card says (decision 13).

## Open items

Left to the plan:

1. Where the four HTTP paths sit under the base URL.
2. The gRPC port numbers of the seven apps.
3. The names of the new fields on the app's config, other than `default_grpc_port`.
4. The form of the `a2a-sdk` pin.
5. The key set's path.
6. Which older task decisions are amended.

Facts left for the plan to check by running:

1. That a real kit agent's signed card passes the platform's own check.
2. That the platform's press reaches a kit agent on A2A 0.3 over gRPC with its mark dropped.
