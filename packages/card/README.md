# @a2uiverse/card

An agent's card on A2UIVerse: the one reading every process reads a card through, the fetch of the live card, the interface the platform takes, and when two cards are the same card. Private to the monorepo. The client, the orchestrator, the marketplace and the smoke transport ([`packages/smoke-transport`](../smoke-transport/README.md)) depend on it through the workspace, and Stellify's committed build inlines it.

## Quick start

```ts
import {fetchLiveCard, readCard, spokenInterfaces} from '@a2uiverse/card';

const served = await fetchLiveCard('http://localhost:12001/.well-known/agent-card.json', {
  timeoutMs: 10_000,
});
const card = readCard(served); // the A2A SDK's own AgentCard, in A2A 1.0's shape
const [taken] = spokenInterfaces(card);
// {url: 'http://localhost:12001', protocolBinding: 'JSONRPC', protocolVersion: '0.3.0', tenant: ''}
```

Keep `served` at rest, as the agent wrote it. Hand `card` to every reader.

## What's in it

1. `ServedCard` is a card as its agent served it, the form a card is kept in. The type names no field, so a field is reached only through `readCard`.
2. `readCard(served)` reads a card written for A2A 0.3 or 1.0 into the A2A SDK's in-memory `AgentCard`, with the A2A SDK's own two functions: `parseLegacyAgentCard` for a 0.3 card, `AgentCard.fromJSON` for every other. It throws in the words of a finding: `not an agent card`, `not an agent card: no name`, or the A2A SDK's own message for a card it refuses.
3. `cardReadError(served)` is that message without the throw, `undefined` for a card that reads.
4. `fetchLiveCard(cardUrl, {timeoutMs, fetchImpl?})` fetches the card under a time limit and returns it as served. It throws in the words of a finding: `HTTP 404`, `did not answer within 10 s`, `not JSON (…)`, `not an agent card` for a body that is no JSON object.
5. `SPOKEN_BINDINGS` lists the bindings the platform speaks: `JSONRPC`.
6. `spokenInterfaces(card)` returns the interfaces the platform speaks, in the card's order. An agent is reachable when the list is not empty, and the first entry is the interface taken.
7. `a2aVersionOf(agentInterface)` is the A2A version an interface is on: its own, or `0.3` when it names none.
8. `cardToDial(card, taken)` is the read card listing the one interface taken: what the A2A SDK's client is handed, so it dials that interface.
9. `noInterfaceFinding(card)` is what a publisher reads of a card the platform cannot reach: `the card lists no interface A2UIVerse speaks: it lists GRPC at A2A 1.0 and HTTP+JSON at A2A 1.0; A2UIVerse speaks JSONRPC at A2A 0.3 and 1.x`, or `the card lists no interface`.
10. `sameCard(a, b)` says whether two read cards are the same card: equal as read, with their interfaces and their signatures set aside.
11. `signInAlternatives(card)` is the card's sign-in requirements as a list of alternatives, each a scheme's name to the scopes it asks.
12. `asksSignIn(card)` is true when every alternative names a scheme. No requirement, or an empty alternative, asks nothing.

## Things worth knowing

1. The package is on `@a2a-js/sdk` `1.3.0`, pinned exactly. Its main entry runs in a browser: the client reads each card where it arrives from the orchestrator.
2. The fetch sends `A2A-Version: 1.0`, as the A2A SDK's own card resolver does. The card an agent serves to that request is the card kept.
3. An interface is spoken when its binding is on `SPOKEN_BINDINGS`, compared whatever its case, and its A2A version is from 0.3 up to but not including 1.0, or is 1.x. An interface naming no URL is not spoken: a 0.3 card with no `url` reads to one.
4. What the A2A SDK's two functions drop, the reading drops. Two cases are held as fixtures:
   1. The `@a2a-js/sdk` 1.3.0 server serves a sign-in scheme in its in-memory form, under `scheme.$case`. The reading keeps the card's requirements and drops the scheme.
   2. The same server, with its A2A 0.3 layer on, answers a caller naming no A2A version with A2A 1.0's interfaces beside 0.3's fields. The reading reads that card as asking no sign-in.
5. `sameCard` counts a field the reading does not name for nothing. A card that says in A2A 1.0's shape something its 0.3 card could not say, such as an OAuth flow requiring PKCE, is a changed card.

## Fixtures

[`test/fixtures`](test/fixtures/README.md) holds seven cards in A2A 1.0's shape, captured from two real servers: the `@a2a-js/sdk` 1.3.0 server and Python's `a2a-sdk` 1.3.0. None is written by hand. The tests also read every tracked card written for A2A 0.3: the platform sdk's four card fixtures and the seven Store recordings.

To capture them again, with [`uv`](https://docs.astral.sh/uv/) on the PATH for the Python server:

```bash
pnpm --filter @a2uiverse/card build
cd packages/card && node scripts/capture-fixtures.mjs
```

## Commands

```bash
pnpm --filter @a2uiverse/card build | typecheck | test | lint
```

The tests need no network beyond localhost.

Why a card is kept as served and read one way, how the interface is chosen, and what happens to an agent the platform cannot reach is in [`docs/design/card.md`](../../docs/design/card.md).
