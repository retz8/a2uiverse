# 20.8 — The extended card read for a signed-in account

Sub-task 20.8 of [Phase 20](phase-20-a2a-1-0.md) in [`_dev/TODO.md`](../../TODO.md). For each account the AuthVault (the orchestrator's credential store) holds, the platform asks the app's agent for the extended card it serves a signed-in caller, and takes that card as the account's own: how the account is reached and what it can do. It works under decision 7 of the phase spec (device-code sign-in, signed cards and the extended card) and settles, for the extended card, open item 4 of that spec: what is read from an extended card. After 20.3 (the card), whose decision 18 had the card's one reading keep a card's extended-card flag with nothing using it until this sub-task, and after 20.7 (signed cards verified), whose decision 16 left a signature on an extended card to this sub-task.

These words are used throughout.

1. The extended card is the card an agent serves to an authenticated caller through A2A's Get Extended Agent Card operation, `agent/getAuthenticatedExtendedCard` in A2A 0.3.
2. The flag is the field by which a card says its agent serves an extended card: `capabilities.extendedAgentCard` in A2A 1.0, `supportsAuthenticatedExtendedCard` in A2A 0.3.
3. The public card is the card at an app's card URL. The public live card is the one a run of the orchestrator holds from its latest fetch. The card as installed is the copy the registry (the orchestrator's record of installed apps) stores.
4. An account is one sign-in to an app that the vault holds, by a redirect, a device code or a pasted key. An account's card is the extended card the platform holds for that account.
5. The fetch is the request for an account's card.
6. The reading is the card's one reading, `readCard` in `packages/card` (decision 1 of the [20.3 task spec](task-20.3-the-card.md)).
7. The walk is how a dial goes over a card's interfaces (decision 2 of the [20.5 task spec](task-20.5-the-bindings.md)): the interfaces the platform speaks, in the card's order, from the one that last answered, moving on only from one never reached.
8. The check is the verification of a card's signature that the [20.7 task spec](task-20.7-signed-cards-verified.md) defines.
9. Stellify is the platform's pack and publish tool.

The sources these decisions rest on:

1. The [A2A 1.0 specification](https://a2a-protocol.org/v1.0.0/specification/), read from `docs/specification.md` at tag `v1.0.0` of `a2aproject/A2A`.
   1. Section 3.1.11 (Get Extended Agent Card). The answer is "A complete Agent Card object, which may contain additional details or skills not present in the public card". "The client MUST authenticate the request using one of the schemes declared in the public `AgentCard.securitySchemes` and `AgentCard.security` fields." "The operation MAY return different details based on client authentication level, including additional skills, capabilities, or configuration not available in the public Agent Card." "Clients retrieving this extended card SHOULD replace their cached public Agent Card with the content received from this endpoint for the duration of their authenticated session or until the card's version changes."
   2. Section 3.3.1 (Idempotency): "Get operations (Get Task, List Tasks, Get Extended Agent Card) are naturally idempotent".
   3. Section 3.3.4 (Capability Validation). An agent whose flag is off answers `UnsupportedOperationError`, and one that "declares support but has not configured an extended card" answers `ExtendedAgentCardNotConfiguredError`. "Clients SHOULD validate capability support by examining the Agent Card before attempting operations that require optional capabilities."
   4. Section 5.4 (Error Code Mappings): `UnsupportedOperationError` is `UNIMPLEMENTED` on gRPC.
   5. Section 8.4.3 (Signature Verification): "Clients SHOULD verify at least one signature before trusting an Agent Card". Section 8.4 says nothing of its own about the extended card.
   6. Section 13.3 (Extended Agent Card Access Control). The operation "MUST require authentication". Extended cards "MAY include additional skills not present in the public card", "MAY expose more detailed capability information (e.g., rate limits, quotas)" and "MAY include organization-specific or user-specific configuration". They "SHOULD NOT include sensitive information that could be exploited if leaked". "Agents SHOULD implement appropriate caching headers to control client-side caching of extended cards". The specification names no lifetime in time.
2. The [A2A 0.3 specification](https://a2a-protocol.org/v0.3.0/specification/), read from `docs/specification.md` at tag `v0.3.0`. Section 7.10 (`agent/getAuthenticatedExtendedCard`) has the same sentences on authentication and on replacing the cached public card, and names a 401 for a failed authentication.
3. [`SPEC.md`](../../../SPEC.md).
   1. Section 7 (Interaction routing), on fan-out: "an agent whose card shows no part is left out", and over an app's accounts "a question about state gathers from every account".
   2. Section 8 (Authority): "The words of a request are the card's as installed; a key the installed card does not declare makes the request invalid, and no consent is shown."
   3. Section 9.1 (The app and the catalog artifact): an app's catalog entitlement is "fixed at install and changed only by install-over".
   4. Section 9.3 (Marketplace and Store): "no credential reaches the marketplace", and the preview of an app that asks sign-in "is the paint the publisher's **preview** captured locally with their own credential".
   5. Section 10 (Orchestrator components): "The registry keeps each card as installed, as its agent served it, and changes it only by install-over; each run uses the card fetched at its startup or by the latest check that reached it".
4. The [card design record](../../../docs/design/card.md), for how a card is fetched, kept, read and dialed today, and the task specs of 20.3, 20.5, 20.6 and 20.7.
5. What was found on 2026-11-14, listed next.

Found on 2026-11-14, by reading the source of `@a2a-js/sdk` 1.3.0 as installed and of the Python A2A SDK (`a2a-sdk`) at 0.3.26 as the kit agents install it and at tag `v1.3.0`. No server was run. An item marked probed was run against the installed `@a2a-js/sdk` 1.3.0 client with a fake answer.

1. No agent that composes today serves an extended card. A search of `a2uiverse-apps`, of `a2ui-upstream` and of the card package's fixtures found no card with the flag.
2. The client of `@a2a-js/sdk` 1.3.0 asks for the extended card on all three bindings and on both A2A versions, and only when the card it holds has the flag (probed). It returns a card it has already read and never the answer as served. For an agent on A2A 0.3 it reads with its own translator, without the two changes the reading makes for a card written for A2A 0.3 (decision 7 of the 20.5 task spec and decision 12 of the [20.6 task spec](task-20.6-device-code-sign-in.md)).
3. Over A2A 0.3 on HTTP+JSON, that client decodes the answer as the JSON form of A2A 0.3's protobuf. The Python A2A SDK answers that path in A2A 0.3's JSON-schema form, at 0.3.26 and through 1.3.0's A2A 0.3 support. A sign-in scheme in that form makes the client throw (probed).
4. The Python A2A SDK 0.3.26 answers the gRPC call with the public card and never the extended one.
5. The Python A2A SDK 1.3.0 serves the extended card on all three bindings and through its A2A 0.3 support. Its handler makes no authentication check of its own for the call, and does not sign the extended card unless the agent does. A server on `@a2a-js/sdk` 1.3.0 signs the extended card when it is set up to sign.
6. On JSON-RPC, the client of `@a2a-js/sdk` 1.3.0 reports a refusal for sign-in, HTTP 401, as a plain error with no status code (probed).
7. The servers of both SDKs answer gRPC `FAILED_PRECONDITION` for an unsupported operation.

## Scope

1. What an account's card stands in for, and what is never read from it.
2. How the Router and the Planner read an app whose accounts have cards of their own.
3. The dial for an account.
4. The fetch: which accounts it is made for, when, where it goes, how long it gets and what it leaves when it brings no card.
5. How an account's card is read, and its signature.
6. Where an account's card is kept, and what reaches the client and the screen.
7. What `stellify preview` and the marketplace do.
8. Who serves an extended card among the real agents.
9. What proves the sub-task, the `[apps]` tail, and the documents it changes.
10. Out: how the agent kit serves an extended card, which is 20.9's (the agent kit on A2A 1.0); the hand-written A2A 1.0 agent that serves one (20.10); whether a roster agent serves one, which is 20.11's (the fleet); the acceptance sitting (20.12); the App Library showing what an app or an account can do, which goes to the Backlog.

## Locked decisions

### 1. An account's extended card is that account's live card

Wherever the platform acts for one account of an app, it reads the card the agent served that account in place of the public live card: the interfaces a dispatch to that account walks, and what the Router and the Planner know that account can do. What the install fixed stays on the card as installed: sign-in and its words, and the catalog ids. What is compared with the Store stays on the public card: the update check.

### 2. The accounts the fetch is made for

1. The fetch is made only when the app's public live card has the flag, on either A2A version.
2. It is made for every account the vault holds for that app, whatever its sign-in: a redirect, a device code or a pasted key.
3. The credential is supplied as for a dispatch, so the vault refreshes an expired token first. An account whose refresh fails has no fetch.
4. An app whose public card could not be fetched this run has no fetch for its accounts.

### 3. The Router and the Planner read each account's card

1. The Router ranks an app by its best-matching card, the public one or any account's.
2. The Planner is shown the app as today and, under each account, what that account's card says that the public card does not. It reads an account's name and description as text, beside its skills.
3. The fan-out rule of section 7 of SPEC holds one level down: an account whose card shows no part of the question is left out, as an app is today.
4. The Planner's installed-apps reader carries each account's card the way the shortlist's listing does.

### 4. A dispatch to an account walks that account's card alone

The walk runs over the account's card, in its order, and the interface that last answered is remembered per account. An account's card that lists no interface the platform speaks gives that account's slot the tile of decision 13 of the 20.3 task spec, "This app now connects in a way A2UIVerse can't use.", with Retry, which fetches the public card and then the account's card again. The public card's interfaces are never tried for an account that holds a card of its own.

### 5. Sign-in, catalog ids and the name on screen are never read from an account's card

A difference between an account's card and the card as installed in sign-in schemes, sign-in requirements, catalog ids or name changes nothing, and nothing is drawn for it. What an agent needs beyond its installed card it asks as today: more access through the in-task request for sign-in, a new catalog through a publish and an update.

### 6. When an account's card is fetched, and how long it is held

1. It is fetched whenever the run fetches the app's public card and holds it: at boot, at the update check, at a tile's Retry or Update, and at an install over the app.
2. It is fetched when a sign-in for that account completes: a first sign-in, signing in again, or more access granted.
3. It is held until the next of those fetches replaces it, and dropped when the account is signed out or the app uninstalled.
4. Nothing is on a timer, and no caching header is read.

### 7. The fetch walks the public card's interfaces

The fetch goes over the spoken interfaces of the public live card the run holds, by the walk, with the account's credential as a dispatch carries it on each binding (decision 9 of the 20.5 task spec). It moves on only from an interface never reached, which includes one that answers that it does not serve the operation. An account's card is never used to fetch its replacement.

### 8. The fetch's time limit, and what waits on it

1. Behind a fetch of the public card, the fetch gets what remains of that fetch's time limit, 10 s or 5 s (decision 5 of the 20.3 task spec), as decision 2 of the 20.7 task spec has it for a key set. Several accounts are fetched side by side, each within what remains.
2. At a sign-in's completion the fetch gets 5 s.
3. Whatever waits on the public fetch waits on this fetch too: boot, the update check's answer, a Retry's dispatch. A sign-in's outcome reaches the canvas once the fetch has ended, so the slot's resume dials from the account's card.

### 9. A fetch that brings no card leaves the account on the best card held

1. When the agent answers that it has none, with `ExtendedAgentCardNotConfiguredError` or `UnsupportedOperationError`, the account is served on the public card, and an account's card held from an earlier fetch is dropped.
2. When the agent refuses the credential, when nothing answers within the time limit, or when the answer is not a card that reads, the account keeps the card it held: its own from an earlier fetch in this run, otherwise the public card.
3. Nothing is drawn and no slot fails.
4. A refusal of the credential is not taken as the account needing sign-in. The next dispatch to the account finds that out as it does today.

### 10. An account's card is read by the reading, from the answer as served

On JSON-RPC and HTTP+JSON, on both A2A versions, the reading is given the JSON the agent answered, as it is for a public card. On gRPC, where the wire carries no JSON, it is given the JSON form of the message received. Where the client of `@a2a-js/sdk` cannot hand over the answer as served, the platform reads around it, as decision 9 of the phase spec has it: each case is a finding in [`_dev/a2a-findings.md`](../../a2a-findings.md) and a Backlog line.

### 11. A signature on an account's card is verified by the check

1. An account's card that carries signatures goes through the check, with the rules of the 20.7 task spec. The origin is the app's card URL's, since an account's card has no URL of its own.
2. A card that passes, an unsigned card and a card written for A2A 0.3 are taken.
3. A signed card that does not pass is not taken. The fetch ends as it does for an answer that is not a card that reads (decision 9).
4. The key set's fetch sits inside the time limit of decision 8. A key set that does not answer ends the fetch as nothing answering does.

### 12. An account's card is kept in the orchestrator's memory only

It is written nowhere: not to the registry, not to the vault's file, not to the journal, not to the logs. It is never sent to the marketplace. The journal records that a fetch was made, for which account, over which interface and how it ended, and never the card. After a restart with the agent down, an account is served on the stored public card until a fetch brings its own.

### 13. Nothing new is drawn, and an account's card never reaches the client

What a person can notice is in behaviour only: which apps and accounts answer a question, and that a dispatch reaches the account. An account whose card lists no interface the platform speaks is said at its slot alone, by the tile of decision 4. The App Library's line stays per app, judged from the public card.

### 14. `stellify preview` does for the publisher's account what the orchestrator does for a person's

1. When the public card has the flag and the publisher has signed in, the preview fetches that account's card, reads it and checks its signature, by decisions 7 to 11.
2. The smoke request then walks the account's card, as a dispatch to that account does (decision 4).
3. The publisher reads on the terminal a note that the account's card was read; a note for each thing in it the platform will not use, a sign-in scheme, a scope or a catalog id the public card lacks (decision 5); and a note when the fetch brought no card and the preview went ahead on the public card (decision 9).
4. An account's card that lists no interface the platform speaks is a finding, and nothing is captured.
5. The marketplace does nothing new. It holds no credential and never fetches an extended card.

### 15. Who serves an extended card

1. The hand-written A2A 1.0 agent of 20.10 serves an extended card, as decision 12 of the phase spec has it.
2. The agent kit offers serving one as something its publisher turns on, off by default. No agent in the roster is required to. How the kit serves it is left to 20.9's own grill, and whether a roster agent turns it on to 20.11's.
3. The orchestrator's own card keeps the flag off, and the canvas shell never asks for an extended card.

### 16. What proves 20.8

1. `pnpm verify` is green, and the client's two Playwright suites pass.
2. Fake agents in the test suites cover the fetch on each of the six paths (three bindings on two A2A versions) and each ending of decision 9: the agent says it has none, refuses the credential, does not answer, or answers a card that does not read.
3. Fake agents cover a signed account's card that passes and one that does not (decision 11); an account's card with other interfaces, dialed there; and one listing no interface the platform speaks, taking the tile with its Retry (decision 4).
4. Extended cards captured from real servers are kept as fixtures, never written by hand: the server of `@a2a-js/sdk` 1.x and the Python A2A SDK 1.x, each on A2A 1.0 and through its A2A 0.3 support.
5. A test that an account's card differing in sign-in or catalog ids changes nothing (decision 5).
6. A test that no account's card is found in the registry's file, the vault's file, the journal, or anything sent to the client or the marketplace (decisions 12 and 13).
7. The Router ranks an app by an account's card, and the Planner's listing and installed-apps reader carry it (decision 3), tested without a model.
8. `stellify preview` against a fake: each note and the finding of decision 14.
9. One live sitting through the tunnel in the browser ([tunnel environment](../tunnel-environment.md)), against a scratch agent on the Python A2A SDK 1.x that serves an extended card to a signed-in account.
   1. A question that only the account's skill answers reaches the app, and with two accounts only the one whose card has the skill is asked.
   2. The journal shows the dispatch going to the address the account's card names.
   3. The scratch agent then serves an account's card listing no interface the platform speaks, and the tile and its Retry are seen.
   4. The notes of `stellify preview` are read on the terminal.
10. The `[apps]` tail, as decision 17 has it.

### 17. Stellify's version, the `[apps]` tail, and landing

Stellify's version moves. The Stellify pin in `a2uiverse-apps` moves as 20.8's `[apps]` tail and is proven as decision 18 of the 20.7 task spec has it. 20.8 lands in one merge, after 20.7's code is on `main`.

### 18. The documents 20.8 changes

In the same session as the code:

1. The protocol delta register in section 14 (Protocol stance) of SPEC gains three rows, each tagged local convention.
   1. An account's extended card stands in for the public card in how the account is reached and what it can do, and never in sign-in, catalog ids or the name on screen, where the specifications have a client replace its cached public card.
   2. An account's card is held on the public card's schedule and for as long as the vault holds the account, with no timer and no caching header read, where the specifications say "for the duration of their authenticated session or until the card's version changes" and name no lifetime.
   3. A signature on an account's card is checked against a key set on the app's card URL's own origin, widening the row 20.7 adds for the public card.
2. SPEC's own sentences where 20.8 makes them say less than the truth: section 7 on fan-out over an app's accounts, section 9.1, section 9.3 on `stellify preview`, section 9.5 (Multi-account) and section 10.
3. The design records: the [card's](../../../docs/design/card.md), with its known limit that nothing uses a card's extended-card flag removed; the [orchestrator's](../../../docs/design/orchestrator.md) and the [authority's](../../../docs/design/authority.md) where 20.8 makes them false.
4. The READMEs of the packages 20.8 touches.
5. [`_dev/a2a-findings.md`](../../a2a-findings.md), each as the plan's runs confirm it, none filed upstream by this sub-task:
   1. the client of `@a2a-js/sdk` handing back a card it has read and never the answer as served;
   2. `@a2a-js/sdk` and the Python A2A SDK disagreeing on the form of the answer over A2A 0.3 on HTTP+JSON;
   3. the Python A2A SDK 0.3.26 never serving the extended card over gRPC;
   4. a refusal for sign-in on JSON-RPC arriving from the client of `@a2a-js/sdk` as a plain error with no status code;
   5. the Python A2A SDK 1.3.0's handler making no authentication check of its own for the call, where section 13.3 of the A2A 1.0 specification says the operation "MUST require authentication";
   6. both SDKs' servers answering gRPC `FAILED_PRECONDITION` for an unsupported operation, where section 5.4 of the A2A 1.0 specification says `UNIMPLEMENTED`.
6. Two older task decisions, amended in place under an "Amended by task 20.8" line: decision 18 of the 20.3 task spec, which says nothing uses a card's extended-card flag; and decision 5 of the 20.5 task spec, whose remembered interface is the one that last answered for the app, now for the account where it holds a card of its own.
7. `_dev/TODO.md`: 20.8's line gains that it comes after 20.7 and its `[apps]` tail; 20.9's line gains the kit offering an extended card, off by default; the Backlog gains a line for each place the A2A SDK is read around, to drop at the release that fixes it, and a line for the App Library showing what an app or an account can do.

## Invariants

1. Nothing written only on an account's card has passed the publish gate or a consent card, so no permission and no catalog comes from one (decision 5).
2. Words on the screen are for customers (invariant 3 of the phase spec). 20.8 draws nothing new.
3. Every agent that composes today composes after this sub-task. None serves an extended card today, and an agent whose extended card cannot be fetched, read or verified composes on its public card.

## Open items

Left to the plan:

1. How the answer as served is obtained on each of the six paths.
2. The wording of the Planner's listing and the lines added to its rules.
3. The names of the journal's fields, and the exact words of Stellify's notes and finding.
4. Where the code lives, and how the fakes and the scratch agent are arranged.

Facts left for the plan to check by running:

1. What the server of `@a2a-js/sdk` and the Python A2A SDK's servers each answer for the extended card over A2A 0.3 on HTTP+JSON.
2. Whether the JSON form of a gRPC answer reads the same as the JSON-RPC answer for the same card.
3. Whether the reading carries A2A 0.3's flag into the read card.
