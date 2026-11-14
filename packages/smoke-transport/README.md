# @a2uiverse/smoke-transport

How the platform reaches an agent: the **dial**, which walks a card's interfaces over JSON-RPC, HTTP+JSON and gRPC, and the transport of the smoke request (the one A2A request of the hello-fragment smoke test) on top of it. Node alone, private to the monorepo. The orchestrator's dispatch and the marketplace depend on it through the workspace, and Stellify's committed build inlines it. The fetch of the live card and its reading are the card package's ([`packages/card`](../card/README.md)).

## Quick start

```ts
import {fetchLiveCard, readCard} from '@a2uiverse/card';
import {a2aSmokeRunner} from '@a2uiverse/smoke-transport';

const {served} = await fetchLiveCard('http://localhost:12001/.well-known/agent-card.json', {
  timeoutMs: 10_000,
});
const card = readCard(served);
const seen = await a2aSmokeRunner()({
  card,
  entitlement: {'v0.9': [basicCatalogId], 'v0.9.1': [basicCatalogId, shopCatalogId]},
  words: 'What cameras do you have?',
  timeoutMs: 60_000,
});
// {kind: 'ended', state: 'completed', messages: [...]}
```

## What's in it

1. `new Dialer({connectTimeoutMs, fetchImpl?})` is the dial. `dial({card, first?, params, credential?, serviceParameters?, signal?})` walks the interfaces the platform speaks in the card's order, `first` (the one that last answered) ahead of the rest, and sends the request to the first one reached. It resolves to `{taken, notReached, events}`, the interface the request went to, each one passed over before it, and the answer, a refusal for sign-in arriving in it as `UnauthorizedError`. It rejects with `NoInterfaceReachedError`, carrying `notReached`, when it reaches none. `send(card, taken, …)` sends again to an interface already taken, with no walk, and `cancelTask(card, taken, id)` cancels there. The dialer keeps one A2A SDK client per interface.
2. An interface is never reached, and the walk moves on, when no connection to it opens within `connectTimeoutMs` (`connection`), what answered says it does not serve it (`unserved`), or it cannot carry the credential (`credential`). Anything else ends the walk where it stands, so a request is never delivered twice.
3. `passedOverNote(entry, taken)` and `noneReachedFinding(notReached)` are what a publisher reads of the walk, at publish and at `preview`. `signInSignalOf(taken)` names a refusal for sign-in on that interface's binding: `401`, or `UNAUTHENTICATED` on gRPC.
4. `a2aSmokeRunner({fetchImpl?, connectTimeoutMs?})` returns the runner, which sends through the dial with 10 s to open each connection. A run takes the card as read, the entitlement to advertise, the words to ask, a timeout and, optionally, `headers` carrying a credential. Stellify passes the header the card's scheme names. The marketplace passes none, since no credential reaches it.
5. `SmokeObservation` is what a run reports, one of five kinds, the first three beside `taken` and `notReached`:

   | Kind           | When                                                                                                                        | Carries                                                                                      |
   | -------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
   | `unauthorized` | the agent refused the request for sign-in: HTTP 401, or the gRPC status `UNAUTHENTICATED`                                   |                                                                                              |
   | `ended`        | the task reached auth-required, or the stream closed after a message, or with its task's last state terminal or interrupted | `state`, every A2UI message, the agent's words, the auth-required request when there was one |
   | `unfinished`   | the stream closed on a task that had not ended                                                                              | the last `state` the stream carried, absent when it carried none; every A2UI message         |
   | `unreached`    | the walk reached no interface the card lists                                                                                | `notReached`                                                                                 |
   | `error`        | the request failed once sent, the timeout passed, or the card lists no interface to dial                                    | `message`                                                                                    |

6. `FAILED_STATES` holds the states that end a task as a failure the agent declared itself: `failed`, `canceled`, `rejected`.

The runner reports and does not judge. What an observation means at publish and at `preview` is written in the marketplace and in Stellify, each in its own words.

## Things worth knowing

1. The dial is on `@a2a-js/sdk` `1.3.0`, pinned exactly, with `@grpc/grpc-js` and `@bufbuild/protobuf` for its gRPC transport, and speaks JSON-RPC, HTTP+JSON and gRPC on A2A 0.3 and 1.x. It opens a connection to an interface itself, the TLS handshake included, before the SDK opens its own for the request: that is where the time limit holds. The SDK is handed the read card listing the one interface tried, and its 0.3 layer talks to an interface on A2A 0.3.
2. A gRPC interface is read as a bare `host:port` or as a URL with a scheme, and the SDK is handed `host:port`, the path left out. `https://` dials with TLS, `http://` without, and a bare `host:port` with TLS unless its host is `localhost`, `127.0.0.1` or `::1`. The credential rides on gRPC as one metadata entry under its header's name in lowercase. [`docs/design/card.md`](../../docs/design/card.md) has the walk in full.
3. An answer ends by its task's state. `final` is not read: a stream that closes on a task still `working` never finished, whatever an update was marked.
4. A state is spelled in lowercase, as A2A 0.3 names it (`input-required`, `auth-required`), for an agent on either A2A version. A state A2A 1.0 gives no name is `unknown`.
5. An answer that reaches auth-required has ended when the state arrives. The runner stops reading there and leaves the stream, since A2A 1.0 asks an agent that waits for a credential to keep it open. An agent that holds its stream open after any other last event runs into the timeout.
6. A card listing no interface the platform speaks comes back as an `error` carrying the card package's finding, with nothing sent. The marketplace and Stellify refuse such a card before a run.
7. A card the SDK cannot read never reaches the runner: the card package's `readCard` refuses it first.
8. A2UI is read from a bare message and from a status message, never from an artifact, through the platform sdk's `a2uiMessagesIn`: a part's `data` holds one message or a list, bare or still wrapped as `{value: [...]}` by an A2A 0.3 layer, and its mark is not read.

## Testing against an agent

Two in-process agents, each given a card and a script of events, each answering on JSON-RPC, HTTP+JSON and gRPC and recording every request it received with the binding it came in on, and the wires captured from a third. This package's tests, the marketplace's and Stellify's run against both, and the orchestrator's against the second. Each takes `admit`, which refuses a request as its binding asks sign-in: HTTP 401, or the gRPC status `UNAUTHENTICATED`.

1. `@a2uiverse/smoke-transport/testing` is an agent on A2A 0.3: the server of `@a2a-js/sdk` 0.3.14, which this package keeps as a dev dependency under the alias `@a2a-js/sdk-v0_3`. It answers JSON-RPC at its URL, HTTP+JSON under `/rest` and gRPC on a port of its own; `cardFor`'s `transports` lists them in the card's order. Its card and its script are written in A2A 0.3's shapes.
2. `@a2uiverse/smoke-transport/testing/v1` is an agent on A2A 1.0: the server of `@a2a-js/sdk` 1.3.0 with its 0.3 layer on, answering the six paths: JSON-RPC at `/a2a/v1` and `/a2a/v0_3`, HTTP+JSON under `/rest`, gRPC on a port of its own. `cardForV1`'s `paths` lists them in the card's order, and each request it records says which binding and which A2A version it reached. Its script is written in the SDK's in-memory shapes. It serves its card in A2A 1.0's JSON; the SDK's own card handler serves its in-memory form. Its `serve` option answers the card URL with another card, a signed one made against its own `keySetUrl`, and its `keySet` option is what that URL answers, `hang` answering nothing; `serveCard` and `serveKeySet` change either mid-test. Its `authRequiredScriptV1` asks for sign-in and holds its stream open, and `echoScriptV1` answers with the parts it received.
3. `@a2uiverse/smoke-transport/testing/wire` replays a wire captured from a real agent: `capturedWire(name)` loads one of [`test/fixtures`](test/fixtures/README.md), thirty-two answers of a scratch agent on Python's `a2a-sdk` 1.3.0 over JSON-RPC and HTTP+JSON, and `capturedFetch(wire)` is a `fetch` that answers with it. A test replaying a wire passes the dial an `openConnection` that opens none. `scripts/capture-fixtures.mjs` captures them again, and asks the same agent over gRPC on both A2A versions, printing what each answer ended on.

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
  // gRPC at A2A 1.0 listed ahead of JSON-RPC at 0.3: the card's order is what the walk follows.
  card: urls =>
    cardForV1(urls, {
      catalogs: [catalogId],
      paths: [
        {binding: 'GRPC', version: '1.0'},
        {binding: 'JSONRPC', version: '0.3'},
      ],
    }),
  script: completingScriptV1(paintPartsV1(catalogId)),
});
// agent.cardUrl, agent.served, agent.requests[0].binding === 'GRPC'
```

## Commands

```bash
pnpm --filter @a2uiverse/smoke-transport build | typecheck | test | lint
```

The tests need no network beyond localhost.

The smoke test as a whole, and what each observation becomes at publish, is in [`docs/design/marketplace.md`](../../docs/design/marketplace.md). How an A2UI part is read on A2A 0.3 and 1.0 is in [`docs/design/a2ui-on-a2a.md`](../../docs/design/a2ui-on-a2a.md).
