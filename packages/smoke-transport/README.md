# @a2uiverse/smoke-transport

How the marketplace and Stellify reach an agent: the transport of the smoke request (the one A2A request of the hello-fragment smoke test). Private to the monorepo. The marketplace depends on it through the workspace, and Stellify's committed build inlines it. The fetch of the live card and its reading are the card package's ([`packages/card`](../card/README.md)).

## Quick start

```ts
import {fetchLiveCard, readCard} from '@a2uiverse/card';
import {a2aSmokeRunner} from '@a2uiverse/smoke-transport';

const card = readCard(
  await fetchLiveCard('http://localhost:12001/.well-known/agent-card.json', {timeoutMs: 10_000}),
);
const seen = await a2aSmokeRunner()({
  card,
  entitlement: {'v0.9': [basicCatalogId], 'v0.9.1': [basicCatalogId, shopCatalogId]},
  words: 'What cameras do you have?',
  timeoutMs: 60_000,
});
// {kind: 'ended', state: 'completed', messages: [...]}
```

## What's in it

1. `a2aSmokeRunner({fetchImpl?})` returns the runner. A run takes the card as read, the entitlement to advertise, the words to ask, a timeout and, optionally, `headers` carrying a credential. Stellify passes the header the card's scheme names. The marketplace passes none, since no credential reaches it.
2. `SmokeObservation` is what a run reports, one of four kinds:

   | Kind           | When                                                                                                                        | Carries                                                                                      |
   | -------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
   | `unauthorized` | the agent answered HTTP 401                                                                                                 |                                                                                              |
   | `ended`        | the task reached auth-required, or the stream closed after a message, or with its task's last state terminal or interrupted | `state`, every A2UI message, the agent's words, the auth-required request when there was one |
   | `unfinished`   | the stream closed on a task that had not ended                                                                              | the last `state` the stream carried, absent when it carried none; every A2UI message         |
   | `error`        | the agent was not reached, the timeout passed, or the card lists no interface to dial                                       | `message`                                                                                    |

3. `FAILED_STATES` holds the states that end a task as a failure the agent declared itself: `failed`, `canceled`, `rejected`.

The runner reports and does not judge. What an observation means at publish and at `preview` is written in the marketplace and in Stellify, each in its own words.

## Things worth knowing

1. The runner is on `@a2a-js/sdk` `1.3.0`, pinned exactly, and speaks JSON-RPC. It sends the request to the first interface in the card's order that the platform speaks, which the card package's `spokenInterfaces` names, on A2A 0.3 or 1.0. The SDK is handed the read card listing that one interface, and its 0.3 layer talks to an interface on A2A 0.3.
2. An answer ends by its task's state. `final` is not read: a stream that closes on a task still `working` never finished, whatever an update was marked.
3. A state is spelled in lowercase, as A2A 0.3 names it (`input-required`, `auth-required`), for an agent on either A2A version. A state A2A 1.0 gives no name is `unknown`.
4. An answer that reaches auth-required has ended when the state arrives. The runner stops reading there and leaves the stream, since A2A 1.0 asks an agent that waits for a credential to keep it open. An agent that holds its stream open after any other last event runs into the timeout.
5. A card listing no interface the platform speaks comes back as an `error` carrying the card package's finding, with nothing sent. The marketplace and Stellify refuse such a card before a run.
6. A card the SDK cannot read never reaches the runner: the card package's `readCard` refuses it first.
7. A2UI is read from a bare message and from a status message, never from an artifact, through the platform sdk's `a2uiMessagesIn`: a part's `data` holds one message or a bare list, and its mark is not read.

## Testing against an agent

Two in-process agents, each given a card and a script of events, each recording every request it received, and the wires captured from a third. This package's tests, the marketplace's and Stellify's run against both, and the orchestrator's against the second.

1. `@a2uiverse/smoke-transport/testing` is an agent on A2A 0.3: the server of `@a2a-js/sdk` 0.3.14, which this package keeps as a dev dependency under the alias `@a2a-js/sdk-v0_3`. Its card and its script are written in A2A 0.3's shapes.
2. `@a2uiverse/smoke-transport/testing/v1` is an agent on A2A 1.0: the server of `@a2a-js/sdk` 1.3.0 with its 0.3 layer on. It answers A2A 1.0 at `/a2a/v1` and A2A 0.3 at `/a2a/v0_3`, both over JSON-RPC, and each request it records says which of the two it reached. Its script is written in the SDK's in-memory shapes. It serves its card in A2A 1.0's JSON; the SDK's own card handler serves its in-memory form. Its `authRequiredScriptV1` asks for sign-in and holds its stream open.
3. `@a2uiverse/smoke-transport/testing/wire` replays a wire captured from a real agent: `capturedWire(name)` loads one of [`test/fixtures`](test/fixtures/README.md), sixteen answers of a scratch agent on Python's `a2a-sdk` 1.3.0, and `capturedFetch(wire)` is a `fetch` that answers with it. `scripts/capture-fixtures.mjs` captures them again.

```ts
import {
  cardFor,
  completingScript,
  paintParts,
  startFakeAgent,
} from '@a2uiverse/smoke-transport/testing';

const agent = await startFakeAgent({
  card: url => cardFor(url, {catalogs: [catalogId]}),
  script: completingScript(paintParts(catalogId)),
});
```

```ts
import {
  cardForV1,
  completingScriptV1,
  paintPartsV1,
  startFakeAgentV1,
} from '@a2uiverse/smoke-transport/testing/v1';

const agent = await startFakeAgentV1({
  // JSON-RPC at A2A 0.3 listed ahead of 1.0: the card's order is what a caller follows.
  card: interfaces => cardForV1(interfaces, {catalogs: [catalogId], order: ['0.3', '1.0']}),
  script: completingScriptV1(paintPartsV1(catalogId)),
});
// agent.cardUrl, agent.served, agent.requests[0].reached === '0.3'
```

## Commands

```bash
pnpm --filter @a2uiverse/smoke-transport build | typecheck | test | lint
```

The tests need no network beyond localhost.

The smoke test as a whole, and what each observation becomes at publish, is in [`docs/design/marketplace.md`](../../docs/design/marketplace.md). How an A2UI part is read on A2A 0.3 and 1.0 is in [`docs/design/a2ui-on-a2a.md`](../../docs/design/a2ui-on-a2a.md).
