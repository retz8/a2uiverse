# 20.10 — The hand-written A2A 1.0 agent

Sub-task 20.10 of [Phase 20](phase-20-a2a-1-0.md) in [`_dev/TODO.md`](../../TODO.md), an `[apps]` sub-task: its code lands in `a2uiverse-apps`. One real agent is built there without the agent kit and without any A2UI library, on an A2A SDK other than the platform's own. It serves JSON-RPC, HTTP+JSON and gRPC on A2A 1.0, signs its card, signs in by device code and serves an extended card. It works under decision 12 of the phase spec (what proves the phase) and settles open item 7 of that spec, which agent the hand-written one is and which SDK it is built on. It is the agent three earlier task specs name: the one that signs in by device code (the scope of the [20.6 task spec](task-20.6-device-code-sign-in.md) and decision 17 of the [20.9 task spec](task-20.9-the-agent-kit-on-a2a-1-0.md)), the one that signs its card (decision 17 of the [20.7 task spec](task-20.7-signed-cards-verified.md)) and the one that serves an extended card (decision 15 of the [20.8 task spec](task-20.8-the-extended-card.md)).

These words are used throughout.

1. Shop C is the agent this sub-task builds, also called the store. Shop A and Shop B are the two mock camera stores already in `mocks/` of `a2uiverse-apps`.
2. The Go A2A SDK is [`a2a-go`](https://github.com/a2aproject/a2a-go).
3. The kit is `a2ui-agent-kit`, the vendor-agent SDK the seven apps of `a2uiverse-apps` are built on. A kit agent is an agent built on it.
4. A member is a made-up account of Shop C. There are two: the trade member and the ordinary member.
5. The extended card is the card an agent serves an authenticated caller. A member's card is the extended card Shop C serves one signed-in member.
6. The device-code flow is the OAuth 2.0 device authorization grant of [RFC 8628](https://www.rfc-editor.org/rfc/rfc8628). The code page is the orchestrator's own page that shows the user code. Shop C's sign-in page is the page of the store's own where a member gives or checks that code.
7. The vault is the AuthVault, the orchestrator's credential store.
8. A press is the A2UI `action` message a client sends when the person presses something inside a fragment.
9. A mark is the MIME type a data part carries, in its part metadata as `mimeType` or in the part's own `mediaType` field.
10. `paintMeta` is the kit's per-paint shell object. The auth-required request is the data part a kit agent puts on its status message when an action needs a scope the token lacks.
11. The public basic catalog is the standard A2UI basic catalog, held by the platform for every app.
12. Stellify is the platform's pack and publish tool. The launcher is the set of scripts in `scripts/` of `a2uiverse` that starts the apps, and its roster is the list of apps it starts.

The sources these decisions rest on:

1. The [phase spec](phase-20-a2a-1-0.md): decision 2 (the platform takes the first interface in the card's own order that it speaks), decision 8 (`paintMeta` and the auth-required request are A2UIVerse's own two conventions on the vendor wire), decision 9 (a case where an SDK contradicts a decision is recorded in `_dev/a2a-findings.md` and reported upstream where nobody has), decision 12, and invariant 2 (an existing A2UI agent composes with zero changes).
2. The Phase 22 entry of `_dev/TODO.md` (agents beyond the kit), which calls this agent "the one hand-written with no A2UI libraries, speaking A2A 1.0, built in Phase 20 (20.10)".
3. The [20.4 task spec](task-20.4-a2ui-on-a2a-1-0.md): decision 2 (content decides, and no reader reads a mark), decision 3 (`data` holds one message or a bare list of messages), decision 4 (A2UI is read from a message, never from an artifact) and decision 5 (the platform writes a press as one message per part, held until a real agent is found that reads only a list).
4. The [20.5 task spec](task-20.5-the-bindings.md): decision 8 (the sign-in signal is HTTP 401 on JSON-RPC and HTTP+JSON and the gRPC status `UNAUTHENTICATED` on gRPC, each answered with one refresh and a resend) and decision 9 (on gRPC a bearer token rides as the metadata entry `authorization`).
5. The [20.6 task spec](task-20.6-device-code-sign-in.md): decision 1 (the vault follows a device-code scheme only when the card offers no redirect sign-in), decision 3 (the code page opens the address with the code already in it when the server's answer carries one, and otherwise the bare address), decision 4 (the app's own window is left to the app), decision 8 (a dynamic registration names the grants the vault uses), decision 9 (the server is found from the card's `oauth2MetadataUrl` or from the origin of the device authorization address, and must offer a client ID metadata document or dynamic registration), decision 10 (who signed in is judged by the ID token's subject; refresh, revocation and sign-out do not change), decision 11 (`login_hint` names the account for a bound sign-in) and decision 13 (Stellify's `preview` runs no sign-in flow, and the publisher's own token rides as a bearer header).
6. The [20.7 task spec](task-20.7-signed-cards-verified.md): decision 1 (a signature is checked against the key it names, on the card URL's own origin), decision 3 (the protected header holds `alg`, `typ` and `kid`), decision 5 (the canonical form is that of `@a2a-js/sdk`, and no patch of it is made), decision 7 (nothing more is done about what a signature does not cover) and decision 9 (a signed card that does not pass is refused).
7. The [20.8 task spec](task-20.8-the-extended-card.md): decision 1 (an account's extended card is that account's live card), decision 3 (the Router and the Planner read each account's card), decision 5 (sign-in, catalog ids and the name on screen are never read from it), decision 11 (a signature on an account's card is checked against the app's card URL's origin) and decision 14 (`stellify preview` fetches, checks and walks the publisher's account's card).
8. The [20.9 task spec](task-20.9-the-agent-kit-on-a2a-1-0.md): decision 1 (a kit agent writes one A2UI message per part, marked in both fields), decision 4 (a kit agent reads a press by content), decision 6 (the order of a kit agent's interfaces is on the app's config and is not a launch option), decision 14 (the kit makes a P-256 key at first run, keeps it in the app's state directory, signs under ES256 and serves the key set itself), decision 15 (an account's card is signed with the same key), decision 19 (20.9 changed no platform code) and decision 21 (what proved 20.9).
9. [`SPEC.md`](../../../SPEC.md), section 9.2: every app's catalog entitlement holds the public basic catalog, "a card declaring no catalogs falls back to the basic catalog", publish takes "zero or more catalog artifacts", and "an unmodified upstream agent on the basic catalog needs nothing packed". The same section says the themed basic catalog "is what the mock stores and the scaffolder's `basic` template carry".
10. The [authority design record](../../../docs/design/authority.md): a sign-in requirement that is an empty list or holds an empty alternative "means no sign-in is needed"; the vault introduces itself by a client ID metadata document first and by dynamic registration ([RFC 7591](https://www.rfc-editor.org/rfc/rfc7591)) second; "on the deterministic roster every agent is on this machine, so the vault keeps no registration"; a server answering `invalid_client` has forgotten the vault, and the registration is dropped and made again.
11. The [notes on an A2UI part on A2A 0.3 and 1.0](../phase-20-a2ui-part-on-a2a-notes.md), section 9: upstream's extension specification requires `metadata["mimeType"] = "application/a2ui+json"` on an A2UI part, says its `data` "MUST be an array of messages", and names no A2A 1.0 field.
12. The README of `a2uiverse-apps`, for the kit agents' launch options and for `paintMeta` as "the one thing an agent sends for A2UIVerse alone".
13. The [tunnel environment](../tunnel-environment.md), for the ports.
14. What was found on 2026-11-14, listed next.

Found on 2026-11-14. An item marked run was run; the rest was read from source.

1. The Go A2A SDK's latest release is v2.8.0 of 2026-11-06, not a prerelease, and requires Go 1.26. Read at that tag, and not run:
   1. It implements A2A 1.0 and serves JSON-RPC, HTTP+JSON and gRPC from one request handler.
   2. Its signer writes `alg`, `kid`, `typ` and `jku` into the protected header and canonicalizes the card JSON as given. Its ready-made wrapper signs the public card only.
   3. It takes an extended card from a function that is handed the call's context, which carries the caller.
   4. One interceptor runs before a call on every binding. Its error for a call with no credential maps to HTTP 401 on HTTP+JSON, to `UNAUTHENTICATED` on gRPC and to the JSON-RPC error code -31401.
   5. A data part's `data` takes any JSON value, and its card types hold the device-code flow.
2. [Issue 445](https://github.com/a2aproject/a2a-go/issues/445) of the Go A2A SDK, open, reports that it canonicalizes the served JSON while `@a2a-js/sdk` canonicalizes its own projection of the card, so signatures do not cross-verify.
3. `canonicalizeAgentCard` of `@a2a-js/sdk` 1.3.0 as installed, given a card shaped like Shop C's, keeps a capability flag that is `false` (run). Its code drops empty strings, nulls, empty lists, empty objects and fields its card model does not know.
4. The development machine has no Go toolchain.
5. Shop B answers a typed question with its listing, a question about shipping or returns with its policy, and three presses: open one camera, back to the list, and sort by price or by rating. Its no-model mode builds each answer from the dataset by code.
6. `mocks/dataset/products.json` keeps the shared cameras under `products` and each store's own policy and listing under `stores`, keyed by the store's id.
7. The basic catalog's id is the same at A2UI v0.9 and v0.9.1, read from `upstream/main` of the A2UI fork.
8. All seven roster apps send `paintMeta`, hand a catalog artifact at publish and write one A2UI message per part.
9. The vault takes a sign-in that brings no ID token. Such an account has no subject, and its label is the numbered one.
10. The launcher starts every roster entry as a kit agent, builds and packs a catalog package for each, and previews a sign-in app with a token from the kit's own entry point or with a demo key.
11. Stellify's `preview` and `publish` take the artifact folders as optional.
12. The platform's dial always sends one streaming message, carrying the A2UI extension and the app's entitlement as its client capabilities.
13. The live sittings of 20.6 and 20.8 ran against scratch agents that were never committed. No committed agent signs in by device code, and none has two accounts whose cards differ.
14. The tunnel environment lists mock agents on ports 12001 and up as not forwarded, and their gRPC ports as 12101 and up. Shop A is on 12001 and 12101, Shop B on 12002 and 12102.
15. `docs/design/` holds no record for the mock stores.

## Scope

1. Which agent the hand-written one is, what it is called and where it lives.
2. The SDK it is built on, the A2A version and the bindings it serves, and the order of its interfaces.
3. How it answers, what it can be asked, and what it writes and reads for A2UI.
4. Its sign-in: its authorization server, how the vault introduces itself, what the server issues, and the store's own sign-in page.
5. Its members and the extended card.
6. Signing its cards.
7. How it is run and published, its launch options and what it keeps across a restart.
8. What proves the sub-task and the documents it changes.
9. Out: Shop C in the launcher's roster, and any other change to the platform's code; an answer to callers on A2A 0.3; the roster spread over the six paths (20.11, the fleet); the acceptance sitting over every path (20.12, integration and acceptance); the other agents of Phase 22.

## Locked decisions

### 1. The agent is a third mock camera store

The hand-written agent is a mock camera store beside Shop A and Shop B. It reads the same `mocks/dataset/products.json`, with a listing and prices of its own.

### 2. Its name, its character, its place and its ports

Its app id is `shop-c` and its name on screen is "Shop C". Its brand is "Halide Supply", an invented members' warehouse for working photographers: a person signs in to see its stock, and trade accounts get trade prices. It lives in `mocks/shop-c/` of `a2uiverse-apps`, with the agent in `mocks/shop-c/agent/` and no catalog folder. It answers on port 12003, and gRPC on 12103.

The shared dataset gains a `shop-c` entry holding the store's policy, its listing and its trade prices. The two members are kept with the store and not in the shared dataset.

### 3. Built in Go, on the Go A2A SDK

Shop C is written in Go on `a2a-go` v2.8.0.

### 4. Every answer is built by code

Shop C uses no model and has no run modes. Each answer is built in Go from the dataset.

### 5. A2A 1.0 alone, on three interfaces

Shop C answers A2A 1.0 over JSON-RPC, HTTP+JSON and gRPC, and its card lists those three interfaces. It takes no caller on A2A 0.3.

### 6. gRPC first, in an order set in the store's source

The card lists gRPC, then HTTP+JSON, then JSON-RPC. The order is one list in the store's own source and is not a launch option. The other orders are run by editing the list.

### 7. What Shop C can be asked, and what can be pressed inside it

Shop C answers what Shop B answers. A typed question paints its listing with price and rating, and a question about shipping or returns paints its policy. A press opens one camera, goes back to the list, or sorts by price or by rating. For the trade member, a question about trade prices paints the listing with the trade price beside the ordinary one.

### 8. The public basic catalog, at A2UI v0.9.1

Shop C paints in the public basic catalog and has no catalog package of its own. It is published with no artifact and drawn in the client's own basic look. Its messages are stamped A2UI v0.9.1.

### 9. Nothing written for A2UIVerse alone

Shop C writes A2UI over A2A as upstream's A2UI extension specifies and nothing more. Its author has read the A2A 1.0 specification and upstream A2UI and nothing else. It sends no `paintMeta`.

It sends no auth-required request either, so it never asks for more access in the middle of a task. Its sign-in grants everything it needs at once.

### 10. An A2UI part by the letter of upstream's extension specification

Each answer is one data part whose `data` is the list of its A2UI messages, marked `application/a2ui+json` in `metadata.mimeType` and nowhere else. The part rides a message, never an artifact.

Shop C reads a press by content, from one message object or from a list of messages.

Shop C serves the streaming operation and says so on its card. The card names upstream's A2UI extension.

### 11. The store is its own authorization server, and device code is its only sign-in

Shop C runs its authorization server in the same Go process and on the same origin as its A2A endpoints: the device authorization endpoint, the token endpoint, its metadata and its sign-in page. The card offers the device-code flow as its only sign-in and requires it, so every A2A call needs a token the store issued.

### 12. The vault introduces itself by dynamic registration alone

The store's metadata names a registration endpoint and no support for a client ID metadata document.

### 13. An ID token, refresh tokens and revocation

Beside the device grant, the store's authorization server issues an ID token that names the member, issues refresh tokens, and serves a revocation endpoint.

### 14. Shop C's sign-in page

The store's answer to the device authorization request carries both addresses, the bare one and the one with the code already in it. Opened at the address with the code, the page shows the code back to be checked. Opened at the bare address, it asks for the code to be typed. It then lists the two members, says in plain words what signing in lets A2UIVerse do, and offers Approve and Refuse. A `login_hint` naming a member the store knows fixes the page to that member.

### 15. Two members, and what the trade member's card adds

Shop C has two made-up members, one of them a trade account. The public card lists what Shop A and Shop B list: browsing the cameras, and shipping and returns. The trade member's card adds one skill, "Trade prices". The ordinary member's card says what the public card says. Only skills differ: the interfaces on a member's card are the public card's.

### 16. The Go A2A SDK's own signer signs the public card and each member's card

Shop C signs with the Go A2A SDK's signer, the public card and each member's card alike. It makes one P-256 key at first run, keeps it in its state directory, signs under ES256 and serves the key set itself on its own origin.

### 17. If a signed card does not pass the platform's check, the store gives way

The platform's check stays as it is. The store's card is first written so that the Go A2A SDK's canonical form and the platform's agree. Only if no card the store needs can pass does the store sign with code of its own, in the form the platform checks. Either way the disagreement is recorded in [`_dev/a2a-findings.md`](../../a2a-findings.md) with a reproduction against both SDKs, and given a Backlog line.

If the reproduction shows that the A2A 1.0 specification's canonicalization rules back the Go A2A SDK's form and not that of `@a2a-js/sdk`, the question goes back to the user as a platform question and is not settled inside 20.10.

### 18. Shop C stays out of the launcher's roster, and no platform code changes

Shop C is started by hand from its own folder, installed from its card URL or published with Stellify by hand, all written down in its README. The launcher and its roster are untouched, and 20.10 changes no code in `a2uiverse`. A Backlog line covers the launcher taking an agent that is not a kit agent.

### 19. A command of the store's own prints a member's token

Shop C has a command that prints a token for a named member. It runs the store's device-code flow against the running store from start to finish and approves the code as that member, with no browser. The publisher gives that token to `stellify preview`, and the preview is taken as the trade member.

### 20. The kit agents' launch options, and everything kept across a restart

Shop C takes the kit agents' launch options under the same names, all but `--mode`: `--port`, `--grpc-port`, `--host`, `--base-url`, `--public-url` and `--state-dir`. The state directory keeps the signing key, the ID-token key, the registered clients and the tokens, so a restart leaves members signed in and the card's key unchanged.

### 21. What proves 20.10

1. The gates: Shop C's own Go tests, formatting and vet pass, and `pnpm verify` in `a2uiverse-apps` stays green.
2. Shop C's tests drive it over real sockets on each of the three bindings with the Go A2A SDK's own client: a question, each press, a refusal without a token and an answer with one, the public card and each member's card, each signature passing the Go A2A SDK's own verifier.
3. Its tests cover its authorization server: registration; the device grant through approval, refusal, an expired code and being asked too fast; refresh; revocation; the ID token; `login_hint`.
4. Its tests check every A2UI message it writes against the A2UI v0.9.1 schemas and the basic catalog's schema. The agent itself uses no A2UI library.
5. The platform's own readers take it. The card package's fetch passes the signed public card and each signed member's card. `stellify preview` as the trade member, with each of the three bindings first in turn, reports that the signature passed and that the member's card was read, and paints one surface. `stellify publish` with no artifact folder is accepted.
6. One live sitting through the tunnel in the browser ([tunnel environment](../tunnel-environment.md)), on scratch state, Shop A and Shop B started by the launcher and Shop C by hand.
   1. With gRPC first: Shop C is published and offered from a question that needs it, installed, and signed in to by device code through the two real windows as the trade member. It is composed with Shop A and Shop B, with a sort press inside it. The ordinary member is added as a second account, and a question about trade prices goes to the trade member alone. One sign-in is refused on Shop C's page.
   2. With HTTP+JSON first, and with JSON-RPC first: a question and a press each, the journal naming the binding each time.

The expired code, being asked too fast, and the vault registering again after the state directory is deleted are proven by the tests alone.

Go 1.26 is installed on the development machine with Homebrew when implementation begins, on the user's go-ahead.

### 22. The documents 20.10 changes

In `a2uiverse-apps`:

1. Shop C's README and its agent's README: what it is, a quick start, the commands for starting it, getting a member's token, previewing and publishing by hand, the two members, and the interface order.
2. The root README wherever Shop C makes a sentence false: the apps table, that every agent is built on the kit, that every agent runs in three modes, how the mock stores sign in, the publishing table and the layout.

In `a2uiverse`:

3. [`SPEC.md`](../../../SPEC.md): the sentence of section 9.2 that says the themed basic catalog is what the mock stores carry, and any sentence that counts the mock stores as two.
4. The [tunnel environment](../tunnel-environment.md): Shop C's two ports, port 12003 forwarded for its sign-in page, and that it is started by hand.
5. [`_dev/a2a-findings.md`](../../a2a-findings.md): what the runs confirm or find about the Go A2A SDK as a server, the signature's canonical form among them.
6. `_dev/TODO.md`: 20.10's line; the Backlog line of decision 18; the Backlog line of decision 17, if its case occurs.
7. Older task decisions that 20.10 makes false, amended in place under an "Amended by task 20.10" line.

No design record is added. How Shop C is built is in its agent's README. The authority design record's device-code section keeps its invented example.

## Invariants

1. An existing A2UI agent composes with zero changes (invariant 2 of the phase spec). Shop C composes knowing nothing of A2UIVerse (decision 9).
2. 20.10 changes no code in `a2uiverse` (decision 18).
3. Every member of Shop C is made up. The command of decision 19 approves a code without a person on that ground alone.
4. Words on the screen are for customers. What a person reads from Shop C's card, and on its sign-in page, is plain language.

## Open items

Left to the plan:

1. Where the `stellify` command is installed for an app with no package of its own.
2. Whether the authorization server is written by hand or built on a Go OAuth library, and how the Go code is laid out.
3. The exact words on the card and on Shop C's sign-in page.
4. Shop C's listing, prices, trade prices and policy text, and the members' names.
5. How long codes and tokens live.
6. How the tests obtain the A2UI schemas.
7. What the ordinary member sees on asking for trade prices.
8. The findings' numbers in `_dev/a2a-findings.md`.

Facts left for the plan to check by running:

1. That a card signed by the Go A2A SDK passes the platform's own check: whether Go writes each field of the card in the JSON shape the platform's canonical form keeps.
