/**
 * The fetch of an account's extended card (task-20.8 decisions 7, 9, 10, 16): on the six paths,
 * against the server of `@a2a-js/sdk` 1.3.0 answering both A2A versions; the answer as served; each
 * way it can bring no card; and the walk over the public card's spoken interfaces.
 */
import {afterEach, describe, expect, test} from 'vitest';
import {AgentCard} from '@a2a-js/sdk';
import {readCard} from '@a2uiverse/card';
import {Dialer, type FetchedExtendedCard} from './dial.js';
import type {AdmitRequest, FakeBinding} from './testing/fakeAgent.js';
import {
  cardForV1,
  completingScriptV1,
  startFakeAgentV1,
  textPartV1,
  type FakeA2aVersion,
  type FakeAgentV1Options,
  type FakeBindingUrls,
  type FakePath,
} from './testing/fakeAgentV1.js';

const BINDINGS: FakeBinding[] = ['JSONRPC', 'HTTP+JSON', 'GRPC'];
const VERSIONS: FakeA2aVersion[] = ['1.0', '0.3'];
const SIX: FakePath[] = BINDINGS.flatMap(binding => VERSIONS.map(version => ({binding, version})));
const name = ({binding, version}: FakePath) => `${binding} at A2A ${version}`;

const KEY = 'X-Shop-Key';

const open: {close(): Promise<void>}[] = [];
afterEach(async () => {
  await Promise.all(open.splice(0).map(server => server.close()));
});

/** Alice's card: the public card with one more skill, and an interface of its own. */
function alicesCard(urls: FakeBindingUrls, paths: FakePath[]): AgentCard {
  return cardForV1(urls, {
    paths,
    extendedCard: true,
    name: 'Shop B for Alice',
    skills: [
      {id: 'fake', name: 'fake', description: 'fake', tags: []},
      {id: 'orders', name: 'Orders', description: 'Lists your orders', tags: ['orders']},
    ],
  });
}

async function agent(
  paths: FakePath[],
  options: Partial<FakeAgentV1Options> & {flag?: boolean} = {},
) {
  const {flag = true, ...rest} = options;
  const started = await startFakeAgentV1({
    script: completingScriptV1([textPartV1('hi')]),
    card: urls => cardForV1(urls, {paths, extendedCard: flag}),
    extendedCard: (request: AdmitRequest) =>
      request.header(KEY) === 'alice' ? alicesCard(started.urls, paths) : undefined,
    ...rest,
  });
  open.push(started);
  return started;
}

const dialer = () => new Dialer({connectTimeoutMs: 2000});

/** The fetch for `path`, the public card read from what the fake serves. */
async function fetchFor(
  started: Awaited<ReturnType<typeof agent>>,
  {credential = {[KEY]: 'alice'}, timeoutMs = 5000} = {},
): Promise<FetchedExtendedCard> {
  return dialer().fetchExtendedCard({
    card: readCard(started.served),
    credential,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

/** The card an answer brought, read. */
function cardIn(fetched: FetchedExtendedCard): AgentCard {
  const {answer} = fetched;
  if (answer.kind === 'served') return readCard(answer.served);
  if (answer.kind === 'read') return answer.card;
  throw new Error(`no card: ${JSON.stringify(answer)}`);
}

describe('the extended card on the six paths', () => {
  for (const path of SIX) {
    test(`${name(path)}: the account's card, with the credential carried`, async () => {
      const started = await agent([path]);
      const fetched = await fetchFor(started);
      expect(fetched.taken?.protocolBinding).toBe(path.binding);
      expect(fetched.notReached).toEqual([]);
      const card = cardIn(fetched);
      expect(card.name).toBe('Shop B for Alice');
      expect(card.skills.map(skill => skill.id)).toEqual(['fake', 'orders']);
      const asked = started.requests.at(-1)!;
      expect(asked.binding).toBe(path.binding);
      expect(asked.reached).toBe(path.version);
      expect(asked.headers[KEY.toLowerCase()]).toBe('alice');
    });

    test(`${name(path)}: the answer as served where the wire carries one`, async () => {
      const started = await agent([path]);
      const {answer} = await fetchFor(started);
      if (path.version === '0.3' && path.binding !== 'JSONRPC') {
        // On gRPC the A2A SDK hands back only its own reading of a 0.3 message (finding 20); on
        // HTTP+JSON the A2A SDK's own server answers the JSON form of A2A 0.3's protobuf, which
        // the reading does not take, and the A2A SDK's reading of it stands in (finding 21).
        expect(answer.kind).toBe('read');
        return;
      }
      expect(answer.kind).toBe('served');
      const served = (answer as {served: Record<string, unknown>}).served;
      if (path.version === '0.3' && path.binding !== 'GRPC') {
        // A2A 0.3's own JSON: a top-level url, as the reading reads a card written for 0.3.
        expect(served.url).toBeDefined();
        expect(served.supportedInterfaces).toBeUndefined();
      } else {
        expect(served.supportedInterfaces).toBeDefined();
      }
    });

    test(`${name(path)}: an agent that has none configured`, async () => {
      const started = await agent([path], {extendedCard: undefined});
      const {answer, taken} = await fetchFor(started);
      expect(answer.kind).toBe('none');
      expect(taken?.protocolBinding).toBe(path.binding);
    });

    test(`${name(path)}: an agent whose own card has no flag`, async () => {
      const started = await agent([path], {flag: false});
      // The card handed to the fetch says it serves one; the agent's own card does not.
      const read = readCard(started.served);
      const card: AgentCard = {
        ...read,
        capabilities: {...read.capabilities!, extendedAgentCard: true},
      };
      const {answer} = await dialer().fetchExtendedCard({
        card,
        credential: {[KEY]: 'alice'},
        signal: AbortSignal.timeout(5000),
      });
      expect(answer.kind).toBe('none');
    });

    test(`${name(path)}: a credential refused`, async () => {
      const started = await agent([path], {admit: request => request.header(KEY) === 'alice'});
      const {answer} = await fetchFor(started, {credential: {[KEY]: 'mallory'}});
      expect(answer).toEqual({kind: 'refused'});
    });

    test(`${name(path)}: nothing answers within the time limit`, async () => {
      const started = await agent([path], {extendedCard: 'hang'});
      const {answer} = await fetchFor(started, {timeoutMs: 400});
      expect(answer).toEqual({kind: 'unanswered'});
    });
  }

  for (const path of SIX.filter(({binding}) => binding !== 'GRPC')) {
    test(`${name(path)}: an answer that is no card is handed back as served, for the reading to refuse`, async () => {
      const started = await agent([path], {extendedCard: {raw: {hello: 'world'}}});
      const {answer} = await fetchFor(started);
      expect(answer).toEqual({kind: 'served', served: {hello: 'world'}});
    });
  }
});

describe('HTTP+JSON at A2A 0.3 (finding 21)', () => {
  const path: FakePath = {binding: 'HTTP+JSON', version: '0.3'};

  test("an answer in A2A 0.3's JSON-schema form, as Python's A2A SDK writes it, is read as served", async () => {
    const started = await agent([path]);
    // Python's form: a sign-in scheme by its `type`, which the A2A SDK's own client does not read.
    const card = {
      name: 'Shop B for Alice',
      description: 'an agent for tests',
      version: '0.1.0',
      protocolVersion: '0.3.0',
      url: started.urls['HTTP+JSON'],
      preferredTransport: 'HTTP+JSON',
      capabilities: {streaming: true},
      defaultInputModes: ['text'],
      defaultOutputModes: ['text'],
      skills: [{id: 'orders', name: 'Orders', description: 'Lists your orders', tags: []}],
      securitySchemes: {key: {type: 'apiKey', in: 'header', name: KEY}},
      security: [{key: []}],
    };
    started.serveExtendedCard({raw: card});
    const {answer} = await fetchFor(started);
    expect(answer).toEqual({kind: 'served', served: card});
    expect(readCard(card).skills.map(skill => skill.id)).toEqual(['orders']);
  });

  test('an answer that names no card is handed back as served, for the reading to refuse', async () => {
    const started = await agent([path], {extendedCard: {raw: {hello: 'world'}}});
    const {answer} = await fetchFor(started);
    expect(answer).toEqual({kind: 'served', served: {hello: 'world'}});
  });
});

describe('the walk', () => {
  test('moves on from an interface whose server does not serve it, to the next the card lists', async () => {
    const started = await startFakeAgentV1({
      script: completingScriptV1([textPartV1('hi')]),
      card: urls =>
        AgentCard.fromJSON({
          ...(AgentCard.toJSON(
            cardForV1(urls, {paths: [{binding: 'HTTP+JSON', version: '1.0'}], extendedCard: true}),
          ) as object),
          supportedInterfaces: [
            {
              url: `${urls['HTTP+JSON']}/nowhere`,
              protocolBinding: 'JSONRPC',
              protocolVersion: '1.0',
            },
            {url: urls['HTTP+JSON'], protocolBinding: 'HTTP+JSON', protocolVersion: '1.0'},
          ],
        }),
      extendedCard: () => alicesCard(started.urls, [{binding: 'HTTP+JSON', version: '1.0'}]),
    });
    open.push(started);
    const fetched = await fetchFor(started);
    expect(fetched.taken?.protocolBinding).toBe('HTTP+JSON');
    expect(fetched.notReached.map(({why}) => why)).toEqual(['unserved']);
    expect(cardIn(fetched).name).toBe('Shop B for Alice');
  });

  test('starts from the interface it is told to, as a dispatch does', async () => {
    const paths: FakePath[] = [
      {binding: 'JSONRPC', version: '1.0'},
      {binding: 'GRPC', version: '1.0'},
    ];
    const started = await agent(paths);
    const card = readCard(started.served);
    const fetched = await dialer().fetchExtendedCard({
      card,
      first: card.supportedInterfaces[1],
      credential: {[KEY]: 'alice'},
      signal: AbortSignal.timeout(5000),
    });
    expect(fetched.taken?.protocolBinding).toBe('GRPC');
  });

  test('reaches no interface: unanswered, each one passed over said', async () => {
    const started = await agent([{binding: 'JSONRPC', version: '1.0'}]);
    await started.close();
    open.splice(open.indexOf(started), 1);
    const fetched = await fetchFor(started);
    expect(fetched.answer).toEqual({kind: 'unanswered'});
    expect(fetched.notReached.map(({why}) => why)).toEqual(['connection']);
  });
});
