# 20.3 — The card

Sub-task 20.3 of [Phase 20](phase-20-a2a-1-0.md) in [`_dev/TODO.md`](../../TODO.md). An agent's card is kept as its agent served it and read one way, in A2A 1.0's shape, by every process of the platform. A card written in A2A 1.0's shape can be published and installed, a change of A2A version or bindings alone is no update, and an agent the platform cannot reach is turned away at every door. It works under three decisions of the phase spec: decision 4 (a card is kept verbatim and read one way), decision 5 (a change of A2A version or bindings alone is not an update) and decision 6 (an unreachable agent is turned away at every door). It removes the orchestrator's own card type, which decision 1 of the [20.1 task spec](task-20.1-private-wire-and-dispatch.md) kept until the one reading lands. After 20.1 (the private wire and the dispatch) and 20.2 (marketplace and Stellify), parallel with 20.4 (A2UI on A2A 1.0).

Four packages carry similar names here. The A2A SDK is `@a2a-js/sdk`. The platform sdk is `@a2uiverse/sdk`. The smoke-transport package is `@a2uiverse/smoke-transport`. The card package is the workspace package this sub-task adds.

## Scope

1. The card's one reading: what it returns, where it lives, and who calls it.
2. The fetch of the live card: one for the three processes, what it sends, and its time limits.
3. The card at rest: its type, what the index entry's contract requires of it, and a stored card that does not read.
4. A card the reading cannot read.
5. Reaching an agent: which interfaces the platform speaks, which one it takes, and who chooses when a client is built.
6. When two cards are the same card.
7. An agent the platform cannot reach, at each door, with the words a person and a publisher read.
8. What 20.3 claims about an agent on A2A 1.0, and what proves the sub-task.
9. Versions, the Stellify pin in `a2uiverse-apps`, and the documents it changes.
10. Out: how A2UI parts, `paintMeta` (the kit's per-paint shell object) and the auth-required request are marked on A2A 1.0 (20.4); the bindings other than JSON-RPC (20.5); device-code sign-in (20.6); verifying a card's signature (20.7); the extended card (20.8); SPEC's A2A vocabulary beyond the sentences decision 24 names (20.13).

## Locked decisions

### 1. The reading returns the A2A SDK's own `AgentCard`

The card's one reading returns the A2A SDK's in-memory `AgentCard`, built by the A2A SDK's own two functions: `parseLegacyAgentCard` for a card written for A2A 0.3, and `AgentCard.fromJSON` for every other. The platform writes no card type of its own. What the A2A SDK's two functions drop, the reading drops, and what `parseLegacyAgentCard` refuses, the reading refuses (decision 8).

*Amended by task 20.5 decision 7.* Every interface of a card written for A2A 0.3 is at the A2A version the card names, where `parseLegacyAgentCard` puts each further interface at `0.3`.

### 2. The reading lives in a workspace package of its own, for the card

The client, the orchestrator, the marketplace and the smoke-transport package depend on the card package. Stellify's committed build inlines it, as it inlines the platform sdk and the smoke-transport package. The platform sdk keeps two invariants of the [13.2 task spec](task-13.2-sdk-marketplace-contracts.md): its main export stays browser-safe with ajv its only dependency, and it depends on no A2A package. The platform sdk's functions that take a card keep structural parameter types, over the read shape.

### 3. One fetch of the live card, for the three processes

The fetch of the live card moves from the smoke-transport package into the card package, and the orchestrator, the marketplace and Stellify use it. The orchestrator's own fetch and its second guard on a fetched card are removed. The orchestrator's tests keep their seam by injecting a fetch.

### 4. The card fetch sends `A2A-Version: 1.0`

The fetch names A2A 1.0 in its request, as the A2A SDK's own card resolver does. The card an agent serves to that request is the card kept.

### 5. The orchestrator gives a card fetch 10 s at boot, at the update check and at install

The three fetches that have no time limit today take 10 s, the limit the marketplace and Stellify give the same fetch. The two that have 5 s keep it: the update tile's refetch and Publish's listings. A card that misses the limit at boot is a card that could not be fetched: its app stays installed and unroutable until a check reaches it (section 10 of [`SPEC.md`](../../../SPEC.md)).

### 6. The browser client runs the same reading, where a card arrives

The wire between the platform's processes carries a card as its agent served it. The client reads each card where it arrives over `orchestratorApi` (the client's non-A2A channel to the orchestrator), and everything past that point holds read cards. The Store recordings stay as they are.

### 7. A card at rest is a JSON object with no field named

The orchestrator's [`InstalledCard`](../../../apps/orchestrator/src/registry/installedCard.ts) and the platform sdk's [`PublishedCard`](../../../packages/sdk/js/src/marketplace.ts) are removed. The type of a stored card names no field, so a field is reached only through the reading. The [index entry's contract](../../../packages/sdk/contracts/marketplace-entry.schema.json) describes the stored card as the agent's card as served, in the shape of the A2A version it was written in, and requires nothing of it. The check that the card's version is the last of the entry's `versions` moves to the marketplace, where the entry is written. A reader of an entry takes the published version from `versions`. The registry's store requires of a stored card that it is an object.

### 8. A card that cannot be read is refused at the reading, at every door

Nothing runs after a card that does not read. At publish and at `stellify preview` the publisher reads one finding, "the card at" followed by the card URL, "could not be read:" and the A2A SDK's own message, and no smoke request is sent. A thing that is not a card is "not an agent card", or "not an agent card: no name". At boot and at the update check, an installed app whose live card does not read is treated as one whose card could not be fetched: it stays installed and unroutable until a check reaches a card that reads. A refused install carries the existing cause for an app that could not be reached. Decision 4 of the 20.1 task spec holds: the reading fills in nothing the A2A SDK's translator requires, until a real agent is refused.

### 9. A stored card that does not read is damaged state

The registry and the marketplace each read every stored card once at load. A stored card that does not read refuses the boot, naming the app and the reading's reason, as a stored card that is not a card does today.

### 10. One function says which interfaces the platform speaks, and which one it takes

The card package holds one list of the bindings the platform speaks and one function over it. Given a read card, the function returns the interfaces the platform speaks, in the card's order. An agent is reachable when that list is not empty, and the first entry is the interface taken. An interface is spoken when its binding is on the list and its A2A version is from 0.3 up to but not including 1.0, or is 1.x. An absent version counts as 0.3, as the A2A SDK reads it. The list holds JSON-RPC in 20.3, and 20.5 adds HTTP+JSON and gRPC to it. Until 20.5 lands, an agent serving only HTTP+JSON or gRPC is turned away at the doors.

*Amended by task 20.5 decisions 1 and 2.* The list holds JSON-RPC, HTTP+JSON and gRPC. The first entry is where a dial's walk starts, and the interface taken is the first the walk reaches; the walk moves to the next only from one never reached.

### 11. The platform chooses the interface and the A2A SDK dials it

The orchestrator's dispatch and the smoke runner hand the A2A SDK the read card with the one interface decision 10 takes. The card's order then holds inside one binding too, where the A2A SDK alone would take an A2A 1.0 interface over a 0.3 one, the first case decision 9 of the phase spec names. No patch to the A2A SDK is carried. The dispatch's address is the chosen interface's URL. The A2A version and the binding the journal records for a dispatch (decision 5 of the 20.1 task spec) are the chosen interface's.

*Amended by task 20.5 decisions 2, 6, 10 and 11.* The dial, written once in the smoke-transport package for the orchestrator's dispatch and the smoke runner, hands the A2A SDK the read card listing the one interface it tries, a gRPC one at the `host:port` it reads. The dispatch's address and the A2A version and the binding the journal records are those of the interface the request went to, and the journal lists each one passed over before it.

### 12. Two cards are the same card when equal as read, how the agent is reached set aside

Both cards go through the reading. Their interfaces are set aside: URL, binding, A2A version and tenant. Their signatures are set aside too, since a signature covers the interfaces. Everything else the reading holds must be equal: name, description, version, provider, capabilities and extensions, sign-in schemes and requirements, modes, skills. A field the reading does not name counts for nothing. The publish's card-version rule (decision 5 of the [13.3 task spec](task-13.3-marketplace-process.md)) and the install summary's "nothing changed" use this test. A card that says in A2A 1.0's shape something its 0.3 card could not say is a changed card.

Every accepted publish stores the live card as served. The update check and the Store's drift test compare catalog ids, the version and the scopes each scheme asks, through the reading.

### 13. An installed app the platform cannot reach: its slot

The dispatch judges reachability before the agent is called, ahead of the update check and ahead of any sign-in being asked, on the card it would dial from: the live card this run holds, or the stored one when the agent was down at startup. The app stays routed: the Router ranks it and a plan may dispatch it. Its slot takes the failure tile under a cause of its own and is out of the merge as any failed source is. The tile keeps Retry, and Retry fetches the app's live card again first, within five seconds, as a Retry from the update tile does (section 10 of SPEC).

The tile says: "This app now connects in a way A2UIVerse can't use."

### 14. The App Library and the Planner's reader say it too

The installed list carries the condition beside whether each app was reached, judged from the live card each run already holds. In the App Library the app reads "Connects in a way A2UIVerse can't use" in place of its update state, and the notice on its view is the tile's statement with the app's name: "Shop B now connects in a way A2UIVerse can't use." The Planner's installed-apps reader hands the Planner the same words.

### 15. What a publisher reads at publish and at `stellify preview`

Publish is refused and `stellify preview` captures nothing, with nothing sent to the agent. The finding names what the card lists and what the platform speaks: "the card lists no interface A2UIVerse speaks: it lists GRPC at A2A 1.0 and HTTP+JSON at A2A 1.0; A2UIVerse speaks JSONRPC at A2A 0.3 and 1.x". Bindings are spelled as the card spells them, and the platform's half is written from the list of decision 10. A card that lists no interface at all reads "the card lists no interface". The finding is the same at publish and on Stellify's terminal.

### 16. A refused install or update has a cause of its own

An install or an update of an agent the platform cannot reach is refused, from a local copy and from the marketplace alike, under a cause of its own beside the existing ones. Its words: "Shop B can't be installed. It connects in a way A2UIVerse can't use, so nothing was installed.", and for an update "Shop B can't be updated. It connects in a way A2UIVerse can't use, so nothing changed." It leaves no press. The finding is decision 15's.

### 17. The marketplace does nothing new for a published app that becomes unreachable

The listing stays as published. A live card that reads is judged for drift as today, whatever interfaces it lists, and a live card that does not read leaves the entry's flag as it was. The person learns at Install, through decision 16's refusal, and the publisher at their next publish, through decision 15's finding.

### 18. Sign-in schemes, signatures and the extended card

A sign-in scheme the vault does not sign in with keeps today's tile, "Signing in to Shop B isn't supported here.", the device-code flow among them until 20.6. The reading keeps a card's signatures and its extended-card flag, and nothing uses them until 20.7 (signed cards verified) and 20.8 (the extended card).

*Amended by task 20.7 decisions 5, 6 and 8.* A signed card read as A2A 1.0 is checked with every fetch from its card URL, its signatures judged over the A2A SDK's canonical form of the card as served; a signed card read as written for A2A 0.3 is taken as an unsigned card is. The reading keeps a card's extended-card flag, and nothing uses it until 20.8.

### 19. Every reader goes through the reading

Beside the four processes, the readers are two scripts ([`dev-agents.mjs`](../../../scripts/dev-agents.mjs) and [`launch-preview.mjs`](../../../scripts/launch-preview.mjs)), the [registry snapshot](../../../packages/registry-snapshot/world.js) and the embedder's corpus text. The platform's own card needs no reading: the orchestrator already holds it as the A2A SDK's `AgentCard`.

### 20. 20.3 claims the card and the dial for an agent on A2A 1.0

A card in A2A 1.0's shape is fetched, kept, read, judged reachable, published and installed. A dispatch and a smoke request to a fake agent on A2A 1.0 over JSON-RPC reach the interface chosen and bring a painted answer back, its A2UI parts in the one form today's readers take. The fake is the 1.x A2A SDK's server, beside the 0.3.14 one decision 3 of the 20.1 task spec keeps. Every other spelling of A2UI on A2A 1.0 belongs to 20.4 (A2UI on A2A 1.0). Nothing live is claimed for A2A 1.0.

### 21. What proves 20.3

1. `pnpm verify` is green.
2. The reading runs on real cards. Every tracked 0.3 card reads: the platform sdk's four card fixtures and the seven Store recordings. The A2A 1.0 card fixtures are captured from real servers, the 1.x `@a2a-js/sdk` server's and Python's `a2a-sdk` 1.x server's, never written by hand. The refusals of decision 8 are tested.
3. Reachability and the choice of decision 10 are tested over: a custom binding alone; HTTP+JSON or gRPC alone; an A2A version of 2.0; an absent version; two interfaces on JSON-RPC in each order.
4. A dispatch and a smoke request to the fake A2A 1.0 agent reach the first interface in the card's order, in both orders, and the journal records that interface's A2A version and binding.
5. Decision 5 of the phase spec: one agent's card served in A2A 0.3's shape and then in 1.0's, nothing else changed. The update state stays up to date, with no consent card and no Store flag. A publish at the published version is accepted and stores the live card. A changed skill at a published version is still refused.
6. Decision 6 of the phase spec: each of the four doors is tested with its words (decisions 13 to 16).
7. The text the Router and the marketplace's search embed for a card is the same before and after, for every tracked card.
8. The client's two Playwright suites pass: the one over the recordings, with the recorded beats and the Store recordings untouched, and the live one.
9. One live sitting through the tunnel in the browser, from scratch state ([tunnel environment](../tunnel-environment.md)). The seven kit apps in deterministic mode are published and installed from the marketplace. Upstream's Node and Python ADK restaurant finders, from `a2ui-upstream` at `9e8a9bac5`, are published by their card URLs and installed. The temporal merge, the entity join and the shops' merge are composed, with one sign-in completed in its popup and one press inside a fragment. One question goes to each finder. The Store and the App Library are read in the browser.
10. At that sitting the new words are seen once in the browser: the tile (decision 13), the App Library's line and notice (decision 14) and the install refusal (decision 16). For this, one installed app's card URL is answered by a card that lists only gRPC.

### 22. Versions, and the `[apps]` tail

The platform sdk is 0.9.0 and Stellify is 0.6.0. The Stellify pin in `a2uiverse-apps` moves as 20.3's `[apps]` tail, as decision 10 of the [20.2 task spec](task-20.2-marketplace-and-stellify.md) moved it: after 20.3's code is on `main` of `a2uiverse` and pushed, in the nine `package.json` files that carry the pin and in that repository's lockfile. The tail is proven as 20.2's was: the install there, `pnpm verify` there, and one `stellify preview` with the pinned build from Shop B's catalog folder against its running agent.

### 23. 20.3 lands in one merge

### 24. The documents 20.3 changes

1. A design record of its own for the card, in `docs/design/`: the card as served and as read, the interface taken, what reachable means, when two cards are the same, and each door.
2. The design records 20.3 makes false, corrected: the [orchestrator's](../../../docs/design/orchestrator.md), the [marketplace's](../../../docs/design/marketplace.md), [app install](../../../docs/design/app-install.md), [authority](../../../docs/design/authority.md), the [trusted page](../../../docs/design/trusted-page.md), the [store loop](../../../docs/design/store-loop.md) and the [client's](../../../docs/design/client.md).
3. READMEs: a new one for the card package; the [smoke-transport package's](../../../packages/smoke-transport/README.md), the fetch having left it; [Stellify's](../../../packages/stellify/README.md), for the three packages its build inlines and the new findings; the [platform sdk's](../../../packages/sdk/README.md), for `PublishedCard` and the entry's contract; the [marketplace's](../../../apps/marketplace/README.md) and the [orchestrator's](../../../apps/orchestrator/README.md) where they name the fetch or its time limits; the root README's row for the package.
4. [`SPEC.md`](../../../SPEC.md): what 20.3 decides, written where SPEC says otherwise today, in A2A 1.0's vocabulary for the sentences it writes: sections 9.1, 9.3 and 10, and the known consequence in section 16 on the card's three copies. The rest of SPEC's A2A vocabulary waits for 20.13 (design records, READMEs and SPEC). The protocol delta register in section 14 gains no row.
5. Five older task decisions, amended in place under an "Amended by task 20.3" line: decision 4 of the 20.2 task spec (the smoke-transport package also holds the fetch of the live card); decision 1 of the [16.5 task spec](task-16.5-stellify.md) (what Stellify's build inlines); decision 5 of the 13.3 task spec (the card-version rule: when a card has changed); decision 5 of the 13.2 task spec (the index entry: what it requires of the stored card); decision 2 of the [14.8 task spec](task-14.8-client-app-library.md) (an app not reached: the installed list's further condition).
6. [`_dev/a2a-findings.md`](../../a2a-findings.md): what the plan's runs confirm about the A2A SDK, each reported upstream where nobody has. Its choice of interface inside one binding, read around by decision 11. The card form its server serves to a caller naming no A2A version, with its A2A 1.0 interfaces beside 0.3's fields, which its own parser reads as asking no sign-in. Its taking any A2A version outside 0.3's range as 1.0.
7. `_dev/TODO.md`: 20.3's line gains its `[apps]` tail; 20.5's line gains that it widens the card package's list of spoken bindings; the Backlog gains a line to drop decision 11's reading around the A2A SDK's choice at the release that follows the card's order, as decision 9 of the phase spec asks for each case.

## Invariants

1. Cards already stored stay valid as they are (decision 4 of the phase spec). On 2026-11-13 the reading of decision 1 read all 23 cards at rest: the five in the orchestrator's registry, the seven in the marketplace's index, the seven Store recordings and the platform sdk's four card fixtures.
2. Nothing drawn for a person names a binding, a protocol version or the A2A SDK (invariant 3 of the phase spec). A finding is the publisher's, shown verbatim beneath a plain lead, and names both.
3. The platform sdk depends on no A2A package (the 13.2 task spec).

## Open items

Left to the plan:

1. The card package's name and layout.
2. Where the fake A2A 1.0 agent lives.
3. The names in code of the two new causes: the slot's failure cause and the install refusal's.
4. Whether the orchestrator reads the environment variable the marketplace and Stellify read for the card fetch's time limit.
5. The growth of the client's bundle from the reading, measured. A large growth reopens decision 6.

Facts left for the plan to check by running:

1. Whether the A2A SDK dials the one interface it is given.
2. Whether the nine agents that compose today serve the same card to a request naming `A2A-Version: 1.0` as to one naming none.
3. What Python's `a2a-sdk` 1.x serves to a caller naming A2A 1.0, and whether it reads with its sign-in intact.
4. What the 1.x `@a2a-js/sdk` server serves for a card with sign-in schemes: the [A2A SDK notes](../phase-20-a2a-js-sdk-1.3.0-notes.md), section 5, read from its source that it may serialize its in-memory form.
5. Whether the reading runs in a browser: the same notes, section 3, read from the source that the A2A SDK's 0.3 client entry has no `node:` import and uses `Buffer` for message parts alone.
