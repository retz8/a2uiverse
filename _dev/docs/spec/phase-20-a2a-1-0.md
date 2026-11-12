# Phase 20 — A2A 1.0

Phase 20 of [`_dev/TODO.md`](../../TODO.md). A2UIVerse takes any agent on A2A 0.3 or A2A 1.0, over whichever standard binding its card lists first, and reads the card as the agent wrote it. This spec replaces the A2A line in section 14 (Protocol stance) of [`SPEC.md`](../../../SPEC.md) and keeps that section's constraint: an existing A2UI agent composes with zero changes.

## Scope

1. The platform's own processes (the client, the orchestrator, the marketplace, and Stellify, the platform's pack and publish tool) on `@a2a-js/sdk` 1.x, reaching agents on A2A 0.3 and 1.0 over JSON-RPC, HTTP+JSON and gRPC.
2. The agent card: how it is stored, how it is read, what a change to it means, and what happens to an agent the platform cannot reach.
3. Three things a card can ask of a client: device-code sign-in, a signature to verify, and an extended card for a signed-in account.
4. How A2UI rides A2A 1.0 where upstream A2UI does not say.
5. In `a2uiverse-apps`: the agent kit (the vendor-agent SDK) on A2A 1.0, one hand-written A2A 1.0 agent, and the roster spread so that real agents cover every path.
6. The writing: SPEC in A2A 1.0's vocabulary, the protocol delta register in section 14 of SPEC, and the findings for upstream.
7. Out: a custom A2A binding; a model of A2A of the platform's own between its code and the SDK; any caller of the orchestrator's A2A endpoint other than the canvas shell; verifying that a publisher is who it claims to be, which section 17 (Out of scope) of SPEC keeps out.

## Locked decisions

### 1. The platform is on `@a2a-js/sdk` 1.x, and an agent composes on A2A 0.3 or 1.0

The client, the orchestrator, the marketplace and Stellify move to `@a2a-js/sdk` 1.x and are written against its types. Which SDK version the platform sits on is the platform's own concern. An agent composes whether it speaks A2A 0.3 or 1.0: the SDK's opt-in 0.3 layer, `legacyCompat`, translates a 0.3 agent's card and wire at the edge (the SDK's [migration guide](https://github.com/a2aproject/a2a-js/blob/main/docs/migration-guide.md) and its [0.3 compatibility guide](https://github.com/a2aproject/a2a-js/blob/main/docs/compatibility-v0_3.md)). The platform keeps no model of A2A of its own between its code and the SDK.

### 2. All three standard bindings, chosen by the card's order

The platform reaches an agent over JSON-RPC, HTTP+JSON or gRPC, the three standard bindings of the [A2A 1.0 specification](https://a2a-protocol.org/v1.0.0/specification/), on either A2A version. It takes the first interface in the card's own order that it speaks. An agent whose card lists only a custom binding is unreachable. The credential, and an agent's signal that it needs sign-in, are stated for every binding and not for HTTP alone.

### 3. The orchestrator's A2A endpoint is a private wire

Its one caller is the canvas shell, shipped from the same repository as the orchestrator. The endpoint speaks A2A 1.0 over JSON-RPC, and the orchestrator's card lists that one interface. It takes no caller on A2A 0.3 and serves no other binding.

### 4. A card is kept verbatim and read one way

The registry (the orchestrator's record of installed apps) and the marketplace keep a card exactly as the agent served it, in the shape of whichever A2A version it was written in. Every reader in the platform goes through one reading that presents the card in A2A 1.0's shape. Cards already stored stay valid as they are.

### 5. A change of A2A version or bindings alone is not an update

When an agent changes the A2A version or the bindings it serves, and nothing else, the person sees nothing: no update state, no consent card, no flag at the Store, and no new card version asked of the publisher. Dispatch follows the live card. The update check and the Store's drift test compare what a card means (its catalog ids, its version, its sign-in) through the one reading of decision 4. The stored copies keep their older shape until the app is next published or installed over for another reason.

### 6. An unreachable agent is turned away at every door

An agent is reachable when its card lists at least one interface on a standard binding at an A2A version the SDK speaks, 0.3 or 1.x. Any other agent is turned away at each door it could come through:

1. Publish is refused, so the app is never listed.
2. Install from a local copy is refused.
3. Stellify's preview capture says so on the publisher's terminal.
4. An installed app whose live card later lists nothing the platform speaks stays installed, and its slot takes the failure tile under a cause of its own.

The words on the tile are plain and name no binding and no protocol version.

### 7. Device-code sign-in, signed cards and the extended card

The platform takes up all three. The AuthVault (the orchestrator's credential store) signs in by the device-code flow, which A2A 1.0 adds. A card that carries a signature is verified. The extended card that an agent serves to a signed-in caller is read for that account.

### 8. Where upstream A2UI is silent on A2A 1.0: read every spelling, write each agent's own

Upstream's A2UI extension specifications are written in A2A 0.3's terms and name no A2A version. When reading, content decides: a part is A2UI under `application/a2ui+json` or the older `application/json+a2ui` in `metadata.mimeType`, under `mediaType`, or unmarked, and its `data` may be one message or a list. When writing, the platform addresses each agent in the terms of that agent's own A2A version, marked as upstream's specification requires. A2UIVerse's own two conventions on the vendor wire follow the same rule: `paintMeta` (the kit's per-paint shell object) is read under either mark, and the auth-required request is read in the requirement shape of the agent's own card. The reading is recorded in the protocol delta register, and upstream's silence in [`_dev/a2ui-findings.md`](../../a2ui-findings.md) as a report for upstream.

### 9. The decisions and the agents win over the SDK

Where `@a2a-js/sdk` contradicts a decision in this spec, or refuses an agent that composes today, the platform carries a local patch (upstream's own fix where one is merged) or reads around the SDK. Each case is recorded in [`_dev/a2a-findings.md`](../../a2a-findings.md), reported upstream where nobody has, and given a Backlog line to drop the patch at the release that fixes it.

Three cases were known when this spec was written, from reading the SDK's source at tag `v1.3.0` without running it:

1. Inside one binding, 1.3.0 takes a 1.0 interface over a 0.3 one whatever the card's order, and of several 1.0 interfaces the last ([issue 734](https://github.com/a2aproject/a2a-js/issues/734); [pull request 764](https://github.com/a2aproject/a2a-js/pull/764), unreleased, fixes the second and keeps the first).
2. Its 0.3 translators throw on a card with no `capabilities`, `defaultInputModes`, `defaultOutputModes` or `skills`, and on a message with no `messageId`.
3. A server built on it leaves a stream open when a task asks for sign-in.

### 10. SPEC is written in A2A 1.0's vocabulary

Card fields, operations and task states take A2A 1.0's names throughout SPEC, with 0.3's name beside one only where an agent on 0.3 differs on the wire. Sentences that hold for one binding only are rewritten to hold for all three.

### 11. One phase

Phase 20 holds all of it, and the move to `@a2a-js/sdk` 1.x comes before everything else.

### 12. What proves the phase

Every agent that composes today composes after the move, upstream's sample agents among them. Fake agents in the platform's test suites cover each of the six paths (three bindings on two A2A versions) and each capability of decision 7.

In `a2uiverse-apps`, real agents cover the same ground. The kit's agents are spread over the six paths. One hand-written A2A 1.0 agent, built on an SDK other than the platform's own, serves all three bindings, signs its card, signs in by device code and serves an extended card. It is the hand-written agent that the Phase 22 entry of `_dev/TODO.md` planned, built here; Phase 22 keeps its other agents.

Acceptance is the loop of the ecosystem run in section 12 (Milestones) of SPEC (publish a new app, discover it, install it, compose it with an existing one, act inside it) in a live sitting over every path.

A2A 0.3 over HTTP+JSON and gRPC is proven against the Python SDK's own 0.3 support: after decision 13, no agent in the roster is built natively on a 0.3 SDK for those two bindings.

### 13. The agent kit moves to A2A 1.0 in this phase, ahead of upstream

The kit moves onto `a2a-sdk` 1.x with its own part-building in place of `a2ui-a2a`, which requires `a2a-sdk` below 0.4.0 (upstream [pull request 3162](https://github.com/a2ui-project/a2ui/pull/3162) widens that pin and is open). A Backlog line returns the kit to `a2ui-a2a` once it allows `a2a-sdk` 1.x. `a2uiverse-apps` and `a2uiverse` are one project, and the kit's move belongs to this phase.

### 14. A kit agent answers both A2A versions on all three bindings

A kit agent answers A2A 1.0 and 0.3 over JSON-RPC, HTTP+JSON and gRPC, in an order its publisher sets, 1.0 first by default. The roster is spread by that setting so that each of the six paths has a real agent.

## Invariants

1. Every decision here, and every decision a sub-task makes under it, answers one question: what would be the best shape for A2UIVerse at the end. The boundary of a sub-task does not narrow a decision.
2. An existing A2UI agent composes with zero changes (section 14 of SPEC), and no agent that composes today is lost by this phase.
3. Words on the screen are for customers: nothing drawn names a binding, a protocol version or the SDK.

## Open items

Left to the sub-tasks' own grills:

1. Where the card's one reading lives.
2. The words on any tile.
3. The exact fields of the reading and the writing in decision 8.
4. The design of each of the three capabilities in decision 7, including what a signature is checked against, who signs (kit agents among them), and what is read from an extended card.
5. Whether dispatch tries the next listed interface when the first one fails.
6. What the journal records of the A2A version and the binding a dispatch used.
7. Which agent the hand-written one is, and which SDK it is built on.
8. How the roster is spread over the six paths.
