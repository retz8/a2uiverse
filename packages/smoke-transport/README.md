# @a2uiverse/smoke-transport

How the marketplace and Stellify reach an agent: the fetch of its live card, and the transport of the smoke request (the one A2A request of the hello-fragment smoke test). Private to the monorepo. The marketplace depends on it through the workspace, and Stellify's committed build inlines it.

## Quick start

```ts
import {a2aSmokeRunner, fetchLiveCard} from '@a2uiverse/smoke-transport';

const card = await fetchLiveCard('http://localhost:12001/.well-known/agent-card.json', {
  timeoutMs: 10_000,
});
const seen = await a2aSmokeRunner()({
  card,
  entitlement: {'v0.9': [basicCatalogId], 'v0.9.1': [basicCatalogId, shopCatalogId]},
  words: 'What cameras do you have?',
  timeoutMs: 60_000,
});
// {kind: 'ended', state: 'completed', messages: [...]}
```

## What's in it

1. `fetchLiveCard(cardUrl, {timeoutMs, fetchImpl?})` fetches the card under a timeout and returns it as its agent served it, typed as the platform sdk's `PublishedCard`. It throws in the words of a finding: `HTTP 404`, `did not answer within 10 s`, `not an agent card: no url or name`.
2. `a2aSmokeRunner({fetchImpl?})` returns the runner. A run takes the card, the entitlement to advertise, the words to ask, a timeout and, optionally, `headers` carrying a credential. Stellify passes the header the card's scheme names. The marketplace passes none, since no credential reaches it.
3. `SmokeObservation` is what a run reports, one of four kinds:

   | Kind           | When                                                                                     | Carries                                                                                      |
   | -------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
   | `unauthorized` | the agent answered HTTP 401                                                              |                                                                                              |
   | `ended`        | the stream closed after a message, or with its task's last state terminal or interrupted | `state`, every A2UI message, the agent's words, the auth-required request when there was one |
   | `unfinished`   | the stream closed on a task that had not ended                                           | the last `state` the stream carried, absent when it carried none; every A2UI message         |
   | `error`        | the agent was not reached, the timeout passed, or the A2A SDK refused the card           | `message`                                                                                    |

4. `FAILED_STATES` holds the states that end a task as a failure the agent declared itself: `failed`, `canceled`, `rejected`.

The runner reports and does not judge. What an observation means at publish and at `preview` is written in the marketplace and in Stellify, each in its own words.

## Things worth knowing

1. The runner is on `@a2a-js/sdk` `1.3.0`, pinned exactly, and speaks JSON-RPC. It hands the card to the SDK as served, and the SDK's 0.3 layer talks to an agent on A2A 0.3.
2. An answer ends by its task's state. `final` is not read: a stream that closes on a task still `working` never finished, whatever an update was marked.
3. A state is spelled in lowercase, as A2A 0.3 names it (`input-required`, `auth-required`), for an agent on either A2A version. A state A2A 1.0 gives no name is `unknown`.
4. An agent that holds its stream open after its last event runs into the timeout.
5. A card the SDK's 0.3 layer refuses comes back as an `error` in the SDK's own words: a card with no `capabilities`, `defaultInputModes`, `defaultOutputModes` or `skills`, a skill with no `tags`, or a sign-in scheme of an unknown `type`.

## Testing against an agent

`@a2uiverse/smoke-transport/testing` is an in-process agent on A2A 0.3: the server of `@a2a-js/sdk` 0.3.14, which this package keeps as a dev dependency under the alias `@a2a-js/sdk-v0_3`. A test gives it a card and a script of events in A2A 0.3's shapes, and reads back every request it received. This package's tests, the marketplace's and Stellify's all run against it.

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

## Commands

```bash
pnpm --filter @a2uiverse/smoke-transport build | typecheck | test | lint
```

The tests need no network beyond localhost.

The smoke test as a whole, and what each observation becomes at publish, is in [`docs/design/marketplace.md`](../../docs/design/marketplace.md).
