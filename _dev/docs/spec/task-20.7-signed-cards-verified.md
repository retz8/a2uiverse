# 20.7 — Signed cards verified

Sub-task 20.7 of [Phase 20](phase-20-a2a-1-0.md) in [`_dev/TODO.md`](../../TODO.md). The platform verifies the signature on an agent card that carries one, each time it fetches the card from its card URL. It works under decision 7 of the phase spec (device-code sign-in, signed cards and the extended card) and settles, for signed cards, open item 4 of that spec: what a signature is checked against and who signs. After 20.3 (the card), whose decision 18 had the card's one reading keep a card's signatures with nothing using them until this sub-task.

These words are used throughout.

1. A signed card is a card whose `signatures` list holds at least one entry. An unsigned card holds none.
2. The check is the verification this spec defines. A signature passes when the check verifies it. A card passes when at least one of its signatures does.
3. The card URL is the address the platform holds for an app's card: the one its publisher gave at publish, kept in the marketplace's entry and the registry's record.
4. The key set is the JSON Web Key Set a signature names in its `jku` header parameter. The `kid` header parameter names one key in it.
5. The card as served is the JSON an agent answered with, which the platform keeps verbatim (decision 4 of the phase spec).
6. The reading is the card's one reading, `readCard` in `packages/card` (decision 1 of the [20.3 task spec](task-20.3-the-card.md)).

The sources these decisions rest on:

1. The [A2A 1.0 specification](https://a2a-protocol.org/v1.0.0/specification/), section 8.4 (Agent Card Signing). Signing is optional. A signature is a JSON Web Signature over the card in canonical JSON, with the `signatures` field and default-valued fields removed. Section 8.4.2: "The protected header MUST include" `alg`, `typ` ("SHOULD be set to "JOSE"") and `kid`, and "MAY include" `jku`. Section 8.4.3: a client retrieves the public key "using the `kid` and `jku` (or from a trusted key store)", "Clients SHOULD verify at least one signature before trusting an Agent Card", "Expired or revoked keys MUST NOT be used for verification", and "Multiple signatures MAY be present to support key rotation". The specification does not say what makes a key the agent's own.
2. The [A2A 0.3 specification](https://a2a-protocol.org/v0.3.0/specification/), section 5.5.6, which defines the same signature object and says it "follows the JSON format of an RFC 7515 JSON Web Signature". It names no canonical form and no way to find the key.
3. [RFC 7515](https://www.rfc-editor.org/rfc/rfc7515) (JSON Web Signature). Section 4.1.2, on `jku`: "an HTTP GET request to retrieve the JWK Set MUST use Transport Layer Security". Section 6, on the parameters that identify a key: "These Header Parameters MUST be integrity protected if the information that they convey is to be utilized in a trust decision". Section 10.3: "The key management technique employed to obtain public keys must authenticate the origin of the key".
4. [RFC 8725](https://www.rfc-editor.org/rfc/rfc8725) (JSON Web Token Best Current Practices). Section 3.1: "Libraries MUST enable the caller to specify a supported set of algorithms and MUST NOT use any other algorithms when performing cryptographic operations." Section 3.2: "applications MUST only allow the use of cryptographically current algorithms". Section 3.10: "blindly following a "jku" (JWK set URL) or "x5u" (X.509 URL) header, which may contain an arbitrary URL, could result in server-side request forgery (SSRF) attacks. Applications SHOULD protect against such attacks, e.g., by matching the URL to a whitelist of allowed locations".
5. [RFC 6454](https://www.rfc-editor.org/rfc/rfc6454) (The Web Origin Concept), section 4, which gives the origin of a URI as "the triple (uri-scheme, uri-host, uri-port)".
6. The [card design record](../../../docs/design/card.md), for how a card is fetched, kept and read today.
7. What was found by running on 2026-11-14, listed next.

Found by running, with one card signed by the Python A2A SDK (`a2a-sdk`) at 0.3.26 and at 1.3.0 and by `@a2a-js/sdk` 1.3.0, and each served card tried against each verifier:

1. The Python A2A SDK 1.3.0 and `@a2a-js/sdk` 1.3.0 sign byte-identical payloads for the same card, and each verifies the other's.
2. Neither signs the served JSON with only `signatures` removed. Both put the card through A2A 1.0's schema and drop default and empty values first. Canonical JSON ([RFC 8785](https://www.rfc-editor.org/rfc/rfc8785)) over the card as served failed for every card as the three signers served it, and passed only for a card built to carry no default and no empty value.
3. The verifier of `@a2a-js/sdk` 1.3.0 passes every card served in A2A 1.0's shape, from either 1.0 signer, when handed the served JSON as it is. Handed a card it has already read into memory, it fails every card that has sign-in schemes ([issue 663](https://github.com/a2aproject/a2a-js/issues/663), open; [pull request 664](https://github.com/a2aproject/a2a-js/pull/664), open).
4. That verifier has no list of algorithms. It passed RS256, EdDSA, ES384 and the shared-secret HS256 when handed a key for each. It skips a signature whose protected header lacks `typ` or `kid`, and passes one whose `typ` is "JWT". The Python A2A SDK 1.3.0's verifier passes a signature with no `typ`. Every signer run writes a `typ`.
5. The Python A2A SDK 0.3.26 signs the card in A2A 0.3's shape with its own schema defaults removed, serialized in a form that is not RFC 8785. Only it verifies its own cards. `@a2a-js/sdk` 0.3.14 has no signing code. The 0.3 SDKs in other languages were not checked.
6. A card the Python A2A SDK 1.3.0 converts to A2A 0.3's shape carries the signature made over the 1.0 form, and no verifier reproduced that payload.
7. The reading reads a card as written for A2A 0.3 only when the card lists no `supportedInterfaces`. A card from a 1.x server that carries both shapes reads as A2A 1.0.
8. A server on `@a2a-js/sdk` 1.x with its 0.3 layer on answers the card fetch, which names A2A 1.0 (decision 4 of the 20.3 task spec), with the card its signature was made over. Asked with no version it answers a card in 0.3's shape whose signature no verifier passed.
9. Three things sit outside a signature: a field outside A2A 1.0's schema; the second copy of the card in 0.3's shape that a Python A2A SDK 1.3.0 card carries when it also lists a 0.3 interface; and the sign-in schemes a server on `@a2a-js/sdk` 1.x serves in its in-memory form.
10. No agent that composes today signs its card: the seven kit apps, the agent kit and upstream's samples carry no signature.

## Scope

1. What a signature is checked against, and what a pass says.
2. The check itself: the key set and its fetch, the header parameters, the algorithms, the canonical form.
3. A signed card written for A2A 0.3.
4. Where the check runs and what a card that does not pass meets at each door: publish, install, `stellify preview`, an installed app's slot, the marketplace's listing.
5. The words a person reads.
6. Who signs among the real agents.
7. What proves the sub-task, the `[apps]` tail, and the documents it changes.
8. Out: verifying who a publisher is, which section 17 (Out of scope) of [`SPEC.md`](../../../SPEC.md) keeps out as "publisher identity verification"; a signature on an extended card, which is 20.8's (the extended card read for a signed-in account); how the agent kit signs, which is 20.9's (the agent kit on A2A 1.0); the hand-written A2A 1.0 agent that signs its card (20.10); the acceptance sitting (20.12).

## Locked decisions

### 1. A signature is checked against the key it names, on the card URL's own origin

The check takes the key from the key set the signature names, and the `jku` must be on the card URL's own origin. A pass says the card the platform holds is intact against the keys at its agent's own origin. It says nothing about who the publisher is.

### 2. The origin, and the key set's fetch

1. The `jku` must have the card URL's scheme, host and port (source 5).
2. The origin is taken from the card URL as the platform holds it. Where a redirect of the card's own fetch led does not count.
3. The `jku` must be `https`, unless its host is the local machine, where `http` is taken, as the popup rule of section 8 (Authority) of SPEC has it ("to https only, localhost exempt") and as decision 10 of the [20.5 task spec](task-20.5-the-bindings.md) has it for a gRPC address.
4. The key set's fetch follows no redirect.
5. The card's own time limit (decision 5 of the 20.3 task spec) covers the card's fetch and the key set's together.
6. No key set is kept between fetches. A key no longer in the set no longer passes.

### 3. The header parameters are read from the protected header

`kid` and `jku` are read from the protected header only. A signature passes only when its protected header holds `alg`, `typ` and `kid`. Any value of `typ` is taken.

### 4. A signature passes under a fixed list of public-key algorithms

The list is RS256, RS384, RS512, PS256, PS384, PS512, ES256, ES384, ES512 and EdDSA. A signature under any other algorithm does not pass, `none` and the shared-secret HMAC algorithms among them. The list is the platform's own to enforce (found by running, item 4).

### 5. The canonical form is the A2A SDK's, over the card as served

For a card the reading reads as A2A 1.0, the payload a signature is checked against comes from `canonicalizeAgentCard` in `@a2a-js/sdk`, given the card as served. The rules of decisions 1 to 4 are the platform's own, around it. No patch of `@a2a-js/sdk` is made.

### 6. A signature on a card written for A2A 0.3 is kept and not judged

A card the reading reads as written for A2A 0.3 is taken as an unsigned card is, whatever its `signatures` hold. The check is the A2A 1.0 specification's, applied to cards the reading reads as A2A 1.0.

This amends decision 7 of the phase spec, "A card that carries a signature is verified", to cards written for A2A 1.0.

### 7. Nothing more is done about what a signature does not cover

The check does not refuse a signed card for carrying something outside its signature (found by running, item 9), and a signed card is read from the card as served, through the reading, as any card is.

### 8. The check runs with every fetch of a card from a card URL

Every card fetched from a card URL is checked as it is fetched: by the marketplace at publish and at its drift check, by the orchestrator at install, at boot, at the update check's refetch and at the Store's live drift check, and by Stellify (the platform's pack and publish tool) at `preview` and `publish`.

1. A stored copy is never checked again.
2. Nothing is remembered between fetches. Each card is judged on what it carries when it is fetched, and a card whose signatures were removed is an unsigned card.
3. An unsigned card makes no second fetch and is taken as today.
4. The client does not run the check. It reads cards through the orchestrator.

### 9. A signed card that does not pass is refused

A card that carries signatures, none of which passes, is turned away at the doors of decision 6 of the phase spec: publish is refused, install is refused, `stellify preview` says so on the publisher's terminal, and an installed app's slot takes the failure tile (decision 10). It is refused whether the check ran and failed or could not run: the signature does not match the card, the protected header names no `jku`, the `jku` is on another origin, the key set holds no key under that `kid`, or decision 3 or 4 is not met.

One passing signature is enough, whatever the card's other signatures do.

### 10. An installed app whose live card does not pass

1. A key set that does not answer within the time limit is treated as the card not answering. At a refetch the registry keeps the card it holds and the app carries on. At publish and install it is the refusal a card that does not answer gets.
2. Every other failure means the card was fetched and is refused. The app stays installed, and its slot takes the failure tile under a cause of its own, with Retry, which fetches the live card again first, as decision 13 of the 20.3 task spec has it for an agent the platform cannot reach.

### 11. The marketplace does nothing new for a listed app whose live card later does not pass

The listing stays as published. The drift check treats the card as one it could not take, and the entry's flag stays as it was. The person learns at Install, through decision 13's refusal, and the publisher at their next publish or `stellify preview`. This is decision 17 of the 20.3 task spec, for this case.

### 12. Nothing is drawn for a pass

A person meets the check only through a refusal. A pass is recorded in the orchestrator's journal and as a note on Stellify's terminal at `preview` and `publish`.

### 13. The words a person reads

1. The tile: "This app's details couldn't be confirmed, so it isn't shown."
2. The App Library's line, in place of the app's update state: "Details couldn't be confirmed".
3. The notice on the app's view in the App Library: "Shop B's details couldn't be confirmed, so it isn't shown."
4. A refused install: "Shop B can't be installed. Its details couldn't be confirmed, so nothing was installed."
5. A refused update: "Shop B can't be updated. Its details couldn't be confirmed, so nothing changed."

The publisher's finding, at publish and at `stellify preview`, names the reason in a developer's terms.

### 14. A change of signature alone is no update

Decision 12 of the 20.3 task spec stands: two cards are compared with their signatures set aside. A card that gains, loses or changes a signature, and nothing else, is the same card.

### 15. The orchestrator's own card stays unsigned

The orchestrator does not sign its card, and the canvas shell does not verify it.

### 16. A signature on an extended card is 20.8's

Whether a signature on an extended card is verified is left to 20.8's own grill, starting from the rules locked here. The check is built so that it can be given a card that did not come from a card URL.

### 17. Who signs

1. The hand-written A2A 1.0 agent of 20.10 signs its card, as decision 12 of the phase spec has it.
2. The agent kit offers signing as something its publisher turns on, off by default. No agent in the roster is required to sign. How the kit signs is left to 20.9's own grill.

### 18. Stellify's version and the `[apps]` tail

Stellify's version moves. The Stellify pin in `a2uiverse-apps` moves as 20.7's `[apps]` tail, as decision 14 of the [20.6 task spec](task-20.6-device-code-sign-in.md) moved it, and is proven the same way: the install there, `pnpm verify` there, and one `stellify preview` with the pinned build.

### 19. What proves 20.7

1. `pnpm verify` is green.
2. Fake agents in the test suites cover a card that passes, each failure decision 9 names, a key set that does not answer, a card with several signatures of which one passes, and a signed card written for A2A 0.3.
3. Cards signed by the Python A2A SDK are kept as fixtures, so the check is proven against a signer the platform did not write.
4. A test of invariant 1.
5. One live sitting through the tunnel in the browser, with one installed app's card URL answered by a stand-in. First it serves a signed card that passes: the app paints as before and nothing is drawn. Then it serves one that does not pass: the tile, the App Library's line and notice and the install refusal are each seen once, and the finding is read on Stellify's terminal.
6. The `[apps]` tail, as decision 18 has it.

### 20. The documents 20.7 changes

In the same session as the code:

1. The [card design record](../../../docs/design/card.md): the check, what a pass says, the origin rule and what happens at each door. Its known limit that nothing uses a card's signatures is removed.
2. The READMEs of the packages 20.7 touches.
3. SPEC: its sentences on signed cards, and three rows in the protocol delta register of section 14 (Protocol stance), each tagged local convention: the key set on the card URL's own origin; `http` taken for a key set on the local machine; a signature on a card written for A2A 0.3 not judged.
4. [`_dev/a2a-findings.md`](../../a2a-findings.md), none filed upstream by this sub-task: the verifier of `@a2a-js/sdk` taking any algorithm its key callback hands a key for; the Python A2A SDK 1.3.0's verifier reading sign-in schemes from the unsigned copy in 0.3's shape; its converted 0.3 card carrying a signature nothing verifies; the Python A2A SDK 0.3.26's form not being RFC 8785; and the A2A 1.0 specification not saying what makes a key the agent's own.
5. The amendments: decision 7 of the phase spec (decision 6 here) and decision 18 of the 20.3 task spec, which says nothing uses a card's signatures.
6. `_dev/TODO.md`: the 20.7 line's `[apps]` tail and the 20.9 line's clause on signing.

## Invariants

1. A signed card's reading and its checked payload come from the same function of `@a2a-js/sdk`, so the platform reads nothing from a signed card that its signature does not cover.
2. Words on the screen are for customers: nothing drawn names a signature, a key or a protocol term (invariant 3 of the phase spec).
3. Every agent that composes today composes after this sub-task. None signs today, and an unsigned card is taken as today.

## Open items

Left to the plan:

1. Where the check's code lives and what it is called.
2. The names of the slot's cause, the install refusal and the journal's fields.
3. The exact words of the publisher's findings.
4. How the fakes and the fixtures are arranged.
