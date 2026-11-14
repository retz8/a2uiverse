# 20.5 — The bindings

Sub-task 20.5 of [Phase 20](phase-20-a2a-1-0.md) in [`_dev/TODO.md`](../../TODO.md). The platform reaches an agent over HTTP+JSON and gRPC as well as JSON-RPC, on A2A 0.3 and 1.0, walking the card's interfaces in the card's own order. It works under decision 2 of the phase spec (all three standard bindings, chosen by the card's order, with the credential and the sign-in signal stated for every binding) and settles the phase spec's open item 5 (whether dispatch tries the next listed interface when the first one fails). It widens the list that decision 10 of the [20.3 task spec](task-20.3-the-card.md) left at JSON-RPC alone, and it carries the rule of decision 2 of the [20.2 task spec](task-20.2-marketplace-and-stellify.md): the first patch to the A2A SDK that alters how an agent is reached moves the A2A SDK into Stellify's committed build. After 20.3 (the card), parallel with 20.6 (device-code sign-in in the vault), 20.7 (signed cards verified) and 20.8 (the extended card).

The A2A SDK is `@a2a-js/sdk`. The platform sdk is `@a2uiverse/sdk`. The card package is `@a2uiverse/card`. The smoke-transport package is `@a2uiverse/smoke-transport`. The two dialers are the orchestrator's dispatch and the smoke runner, the one A2A request behind publish and `stellify preview`.

## Scope

1. The bindings the platform speaks.
2. The walk: which interface a dial takes, when it moves to the next one, what it remembers, and how long opening a connection may take.
3. What the journal records, and what a publisher reads, of an interface that was not reached.
4. The sign-in signal and the credential on each binding.
5. How a gRPC interface is dialed.
6. Where the dial is written, and what gRPC adds to Stellify at a vendor's install.
7. A part's metadata toward an agent on A2A 0.3 over the two new bindings.
8. What proves the sub-task, the versions, the Stellify pin in `a2uiverse-apps`, and the documents it changes.
9. Out: device-code sign-in (20.6); verifying a card's signature (20.7); the extended card (20.8); what a kit agent serves and checks on each binding (20.9); the six paths live in the browser (20.12); SPEC's A2A vocabulary beyond the sentences decision 19 names (20.13).

## Locked decisions

### 1. The platform speaks JSON-RPC, HTTP+JSON and gRPC

The card package's one list of spoken bindings ([`interfaces.ts`](../../../packages/card/src/interfaces.ts)) holds JSON-RPC, HTTP+JSON and gRPC, at the A2A versions decision 10 of the 20.3 task spec names: 0.3 up to but not including 1.0, and 1.x. Reachability, the four doors, the App Library's line and the publisher's finding are judged and written from the list, as decisions 10 to 16 of the 20.3 task spec have them.

### 2. A dial walks the card's spoken interfaces, and moves on only from one never reached

A dial takes the first spoken interface in the card's order. It moves to the next spoken interface only when the one it took was never reached (decision 3). It does not move on after a refusal for sign-in, a stream that broke, a failed task or a timeout. A press is never delivered twice.

When the walk reaches no interface, the slot fails under the existing cause for an agent that could not be reached, with Retry. A person reads no new words.

### 3. What never reached means

An interface was never reached in three cases:

1. The connection could not be opened: the name did not resolve, the connection was refused, the TLS handshake failed, or the time limit of decision 4 passed.
2. What answered said the interface is not there: the A2A error for a version not supported (`VersionNotSupportedError`, section 5.4 of the [A2A 1.0 specification](https://github.com/a2aproject/A2A/blob/v1.0.0/docs/specification.md)); the gRPC status `UNIMPLEMENTED` ([gRPC status codes](https://github.com/grpc/grpc/blob/master/doc/statuscodes.md)), which a gRPC client also reports for an HTTP 404 carrying no gRPC status ([HTTP to gRPC status code mapping](https://github.com/grpc/grpc/blob/master/doc/http-grpc-status-mapping.md)); an HTTP 404 or 405 carrying no A2A error, on JSON-RPC and HTTP+JSON.
3. The interface cannot carry the account's credential (decision 9).

The gRPC status `UNAVAILABLE`, HTTP 502, 503 and 504, and a connection that drops after the request went out are ordinary failures of the slot.

*Amended in task 20.5, from its runs against Python's `a2a-sdk` 1.3.0.* The second case also holds the JSON-RPC error -32601, "Method not found" ([JSON-RPC 2.0](https://www.jsonrpc.org/specification): "The method does not exist / is not available"). A2A 0.3 and 1.0 name the send method differently, `message/stream` and `SendStreamingMessage`, so a JSON-RPC server with no handler for an interface's A2A version answers it, where the same agent answers HTTP 404 on HTTP+JSON and `UNIMPLEMENTED` on gRPC.

### 4. Opening a connection gets 5 s at a dispatch and 10 s at publish and `stellify preview`

The limit holds for each interface the walk tries, and covers opening the connection alone. These are the two limits decision 5 of the 20.3 task spec gives a fetch of the live card: 5 s where a person waits on the canvas, 10 s elsewhere. The dispatch's hard cap and the smoke request's timeout keep running from the start, with the dials inside them.

### 5. The interface that answered is remembered while the run holds that live card

A dispatch starts at the interface that last answered for the app. The walk starts over from the card's first spoken interface when the app's live card is fetched again, or when the remembered interface is not reached. A follow-up press and a cancel go to the remembered interface. The memory is the orchestrator's, in memory alone.

### 6. The journal records the interfaces not reached

The journal's dispatch record ([`types.ts`](../../../apps/orchestrator/src/agentsPool/types.ts)) keeps the A2A version and the binding of the interface the dispatch used (decision 5 of the [20.1 task spec](task-20.1-private-wire-and-dispatch.md)). Beside them it lists each interface tried before that one and not reached, in the order tried: its binding, its A2A version, and which case of decision 3 it was. When no interface is reached, the version and the binding of the interface used stay absent and the list says what was tried.

### 7. Publish and `stellify preview` walk the same way, and the publisher is told

The smoke request walks as a dispatch does. When a later interface answers, publish is accepted and `preview` captures, and each interface passed over is a note, on the accepted publish and on Stellify's terminal:

1. `GRPC at A2A 1.0 (grpc.shop-b.example:443) was not reached: no connection could be opened; the request went to JSONRPC at A2A 0.3`
2. `GRPC at A2A 1.0 (grpc.shop-b.example:443) was not reached: what answered there does not serve it; the request went to JSONRPC at A2A 0.3`
3. `GRPC at A2A 1.0 (grpc.shop-b.example:443) was passed over: the credential's header "X-Api~Key" is not a name gRPC can carry; the request went to JSONRPC at A2A 0.3`

When no interface is reached, publish is refused and `preview` captures nothing, with one finding in place of "the smoke request failed":

`no interface the card lists was reached: GRPC at A2A 1.0 (grpc.shop-b.example:443): no connection could be opened; JSONRPC at A2A 0.3 (https://shop-b.example/): what answered there does not serve it`

The binding and the A2A version are spelled as the card spells them, and each interface is named with its URL. The third note appears at `stellify preview` alone, since the marketplace sends no credential.

*Amended in task 20.5, from its live sitting.* A card written for A2A 0.3 names its version once, for the agent, and the A2A SDK reads its further interfaces at a fixed `0.3`, so the note read `GRPC at A2A 0.3.0 (…) was not reached: …; the request went to JSONRPC at A2A 0.3`. The card's one reading puts every interface of a 0.3 card at the version the card names, decision 1 of the 20.3 task spec amended, and the A2A SDK's reading is a fourth finding in `_dev/a2a-findings.md`.

### 8. The sign-in signal on each binding

At the transport, the signal that an agent needs sign-in is HTTP 401 on JSON-RPC and on HTTP+JSON, and the gRPC status `UNAUTHENTICATED` on gRPC. Each is treated as HTTP 401 is today: one refresh and a resend, and a second refusal makes the account sign in again. Inside the task the signal is `TASK_STATE_AUTH_REQUIRED` on every binding. HTTP 403 and the gRPC status `PERMISSION_DENIED` stay an ordinary failure of the slot on every binding.

Section 3.3.2 of the A2A 1.0 specification names these codes: an authentication error is HTTP `401 Unauthorized` or gRPC `UNAUTHENTICATED`, and an authorization error is HTTP `403 Forbidden` or gRPC `PERMISSION_DENIED`.

### 9. The credential on each binding

On JSON-RPC and HTTP+JSON the credential rides as the HTTP header it rides as today: `Authorization: Bearer <token>` for OAuth, OpenID Connect and `http` bearer, or the header an `apiKey` scheme names. On gRPC it rides as one plain metadata entry under that header's name in lowercase: `authorization` with the value `Bearer <token>`, or the `apiKey` scheme's header name in lowercase with the key as its value. The vault, the schemes it signs in with, and the header Stellify picks for `stellify preview` are unchanged on every binding.

Section 7.3 of the A2A 1.0 specification has a client send credentials "in protocol-appropriate headers or metadata", and section 10.2 has service parameters ride as gRPC metadata with lowercase keys. Neither A2A version names the metadata key a credential takes on gRPC.

An `apiKey` header name that is not a legal gRPC metadata key cannot ride on a gRPC interface: a name holding a character outside `0-9 a-z _ - .` once in lowercase, a name starting with `grpc-`, or a name ending in `-bin` ([gRPC over HTTP2](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md)). The walk passes over such an interface as one never reached, under the third case of decision 3.

### 10. A gRPC interface: its address, and when TLS is used

The platform reads both spellings of a gRPC interface's URL: a bare `host:port`, as the A2A SDK's own sample agent writes it, and a URL with a scheme, as the example card of the A2A specification writes it (`https://georoute-agent.example.com/a2a/grpc`, on both A2A versions). It hands the A2A SDK a `host:port`, in the card that already lists the one interface taken (decision 11 of the 20.3 task spec). A path in the URL is left out.

`https://` dials with TLS and `http://` without. A bare `host:port` dials with TLS unless its host is the local machine (`localhost`, `127.0.0.1`, `::1`), which dials without. A TLS dial checks the agent's certificate against the system's trusted authorities, and a certificate that fails is a handshake that failed.

### 11. One dial, written once, for both dialers

The dial is written once, for Node alone, and the orchestrator's dispatch and the smoke runner both use it. Given a read card, a credential and a time limit, it walks the interfaces and returns a connected client with what it tried. It holds the walk and decision 3's cases, the time limit of decision 4, the reading of a gRPC address and the choice of TLS, the credential as a header or as gRPC metadata, and the sign-in refusal on each binding. The dispatch keeps the resend after a refresh, the relay and the journal. The smoke runner keeps its report of what the answer was. Stellify's committed build inlines the dial as it inlines the other workspace packages.

### 12. Stellify depends on the two gRPC packages

`@grpc/grpc-js` and `@bufbuild/protobuf`, the two optional peers the A2A SDK's gRPC transport imports, are dependencies of Stellify, so `stellify preview` speaks every binding publish speaks. The orchestrator and the smoke-transport package depend on them too.

### 13. The mark that does not reach an agent on A2A 0.3 over HTTP+JSON and gRPC: no patch

Toward an agent on A2A 0.3 over HTTP+JSON or gRPC, the A2A SDK drops every part's `metadata`, in both directions. Its 0.3 layer on those two bindings is generated from the A2A repository at tag `v0.3.0`, where a part holds text, a file or data and nothing else ([`a2a.proto` at `v0.3.0`](https://github.com/a2aproject/A2A/blob/v0.3.0/specification/grpc/a2a.proto)). The field was added to the A2A repository on 2025-09-03, after that tag. Python's `a2a-sdk` carries it, at 0.3.26 and in the 0.3 layer of 1.3.0.

The platform writes its one spelling of an A2UI part as decision 5 of the [20.4 task spec](task-20.4-a2ui-on-a2a-1-0.md) has it, and on these two paths the mark in `metadata.mimeType` does not arrive. No patch to the A2A SDK is carried for it, on the evidence rule of decision 4 of the 20.1 task spec: the agent kit and upstream's two restaurant finders read a press by its content. Reading is untouched, since every reader of the platform reads by content.

*Amended in task 20.5, from its runs against Python's `a2a-sdk` 1.3.0.* Reading is touched in one case. Both A2A SDKs' 0.3 layers send a list in `data` as `{value: [...]}` and flag it in the part's `metadata`, and on these two paths the flag is dropped with the rest, so the list arrives still wrapped. The platform sdk's one reading takes an object holding `value` and nothing else, `value` a list, as that list. No patch is carried.

### 14. 20.5 as specified carries no patch

Everything decided here reads around the A2A SDK, which stays external in Stellify's committed build. If a run in the plan shows that a decision cannot be had without a patch that alters how an agent is reached, the A2A SDK moves into Stellify's committed build in that change, with the two gRPC packages, as decision 2 of the 20.2 task spec has it.

### 15. What stands in for agents on the six paths

The fake A2A 0.3 agent (the server of `@a2a-js/sdk` 0.3.14) and the fake A2A 1.0 agent (the server of `@a2a-js/sdk` 1.3.0, answering A2A 1.0 and 0.3), in the smoke-transport package's testing entries, are widened to all three bindings and cover the six paths inside `pnpm verify`.

The scratch agent on Python's `a2a-sdk` 1.3.0 ([`serve_a2ui.py`](../../../packages/smoke-transport/scripts/serve_a2ui.py)) is widened to all six paths. Its answers over HTTP+JSON, on both A2A versions, are captured and replayed in the suites, as 20.4 captured its answers over JSON-RPC. Its answers over gRPC are proven by a run against it live, recorded on 20.5's line in `_dev/TODO.md`.

### 16. What proves 20.5

1. `pnpm verify` is green, the fakes of decision 15 over the six paths inside it.
2. The Python scratch agent, as decision 15 has it.
3. One live sitting through the tunnel in the browser ([tunnel environment](../tunnel-environment.md)) covers the nine agents that compose today, the seven kit apps and upstream's Node and Python ADK restaurant finders, as the earlier sittings of this phase did.
4. At that sitting the walk is seen once: one installed app's card URL is answered by its own card with an unreachable gRPC interface listed first, the app still paints over JSON-RPC, and the journal shows the interface not reached and the one used. The note of decision 7 for that card is read once at publish and at `stellify preview`.
5. Nothing is claimed live in the browser for HTTP+JSON or gRPC. That is 20.12's (integration and acceptance).

### 17. Versions, and the `[apps]` tail

Stellify is 0.8.0. The platform sdk keeps its version.

The Stellify pin in `a2uiverse-apps` moves as 20.5's `[apps]` tail, as decision 10 of the 20.2 task spec moved it: after 20.5's code is on `main` of `a2uiverse` and pushed, in the nine `package.json` files that carry the pin and in that repository's lockfile. The tail is proven by the install there resolving Stellify 0.8.0, the A2A SDK at `1.3.0` and the two gRPC packages, by `pnpm verify` there, and by one `stellify preview` with the pinned build from Shop B's catalog folder against its running agent.

### 18. 20.5 lands in one merge

The widened list, the dial, both dialers and the fakes land together.

### 19. The documents 20.5 changes

1. The design records 20.5 makes false, corrected: the [card's](../../../docs/design/card.md), for the interface taken; the [orchestrator's](../../../docs/design/orchestrator.md); the [marketplace's](../../../docs/design/marketplace.md); the record on [A2UI on A2A](../../../docs/design/a2ui-on-a2a.md), for the mark that does not arrive.
2. READMEs: the [card package's](../../../packages/card/README.md), the [smoke-transport package's](../../../packages/smoke-transport/README.md), [Stellify's](../../../packages/stellify/README.md), the [orchestrator's](../../../apps/orchestrator/README.md) and the [marketplace's](../../../apps/marketplace/README.md), and one for a new package if the plan makes one.
3. [`SPEC.md`](../../../SPEC.md), where it says otherwise today: section 8's sentence on the sign-in signal, "HTTP 401 at dispatch", restated for every binding; the A2A line of section 14. The protocol delta register in section 14 gains four rows: the walk and what never reached means; a gRPC interface's address and when TLS is used; the credential on gRPC; the mark that does not reach an agent on A2A 0.3 over HTTP+JSON and gRPC. The rest of SPEC's A2A vocabulary waits for 20.13.
4. [`_dev/a2a-findings.md`](../../a2a-findings.md): three findings, each confirmed by running in the plan and written as a report for upstream. A part's metadata dropped by the A2A SDK toward A2A 0.3 on HTTP+JSON and gRPC. Neither A2A version naming the metadata key a credential takes on gRPC. The A2A specification's example URL for a gRPC interface being one the A2A SDK does not dial. Filing a report upstream is not part of 20.5.
5. Older task decisions, amended in place under an "Amended by task 20.5" line: decisions 10 and 11 of the 20.3 task spec (the first spoken interface is the interface taken); decision 5 of the 20.1 task spec (the journal's dispatch record); decision 5 of the 20.4 task spec (the platform's one spelling of an A2UI part), for decision 13's two paths; decision 3 of the 20.2 task spec (the orchestrator's dispatch is not part of the smoke-transport package), only if the plan puts the dial there.
6. `_dev/TODO.md`: 20.5's line gains its `[apps]` tail; 20.9's line (the agent kit on A2A 1.0) gains that a kit agent checks its credential on every binding and reads it on gRPC from the metadata entry of decision 9, where today the kit's check holds for JSON-RPC's one path; the Backlog gains a line to drop decision 13's exception at the A2A SDK release that carries a part's metadata.

## Invariants

1. A press is never delivered twice (decision 2).
2. Nothing drawn for a person names a binding, a protocol version or the A2A SDK (invariant 3 of the phase spec). 20.5 adds no words for a person. A note and a finding are the publisher's, and name both.
3. No gRPC code enters the client's bundle, and the card package's main entry stays safe for a browser (decision 6 of the 20.3 task spec).
4. No credential reaches the marketplace (invariant 1 of the 20.2 task spec).
5. No agent that composes today is lost (invariant 2 of the phase spec).

## Open items

Left to the plan:

1. Where the dial lives: a Node-only entry of the card package, the smoke-transport package, or a package of its own.
2. The names in code: the journal's new fields and the three cases of decision 3.
3. Whether the Python scratch agent's answers over gRPC can also be captured and replayed in the suites.

Facts left for the plan to check by running:

1. Whether a gRPC URL with a scheme fails in the installed `@grpc/grpc-js`, as the A2A SDK hands it over untouched.
2. Whether the time limit on opening a gRPC connection can be had without a patch to the A2A SDK.
3. How each answer of decision 3's second case arrives on each binding, from the servers of `@a2a-js/sdk` and from Python's `a2a-sdk`.
4. How a gRPC client is closed, so that `stellify preview` exits.
5. What the two gRPC packages add to a vendor's install.
6. Whether any gRPC server depends on the path of its interface's URL.
