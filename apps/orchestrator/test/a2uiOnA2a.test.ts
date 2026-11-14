/**
 * A2UI on A2A in the orchestrator (task 20.4), against an agent on A2A 0.3, the server of
 * `@a2a-js/sdk` 0.3.14, and one on A2A 1.0, the server of `@a2a-js/sdk` 1.x, reached at its A2A
 * 1.0 interface and through its 0.3 layer: what the dispatch and the relay read of an answer in
 * each spelling, what an agent receives for a press, and the auth-required request in either
 * shape, the dispatch ending at the state. The same is read over wires captured from a scratch
 * agent on Python's `a2a-sdk` 1.3.0.
 */
import {rm} from 'node:fs/promises';
import {afterEach, describe, expect, test, vi} from 'vitest';
import type {ServedCard} from '@a2uiverse/card';
import {a2uiPart, type AuthRequired} from '@a2uiverse/sdk';
import {
  artifactUpdate,
  authRequiredBody,
  authRequiredScript,
  cardFor as cardFor03,
  completingScript,
  finalUpdate,
  firstTurnTask,
  startFakeAgent,
  type FakeAgent,
  type Message as Message03,
  type RequirementShape,
  type Script,
} from '@a2uiverse/smoke-transport/testing';
import {
  artifactUpdateV1,
  authRequiredScriptV1,
  cardForV1,
  completingScriptV1,
  dataPartV1,
  firstTurnTaskV1,
  startFakeAgentV1,
  statusUpdateV1,
  textPartV1,
  type FakeA2aVersion,
  type FakeAgentV1,
  type PartMarksV1,
  type ScriptV1,
} from '@a2uiverse/smoke-transport/testing/v1';
import {capturedFetch, capturedWire} from '@a2uiverse/smoke-transport/testing/wire';
import {TaskState, type Part} from '@a2a-js/sdk';
import {textPart, userMessage} from '../src/a2a/parts.js';
import type {WireEvent} from '../src/a2a/wire.js';
import {AgentsPool, type Credentials} from '../src/agentsPool/agentsPool.js';
import type {DispatchTurn} from '../src/agentsPool/types.js';
import {composeFragment} from '../src/composition/fragmentRelay.js';
import {History} from '../src/composition/history.js';
import {Partitions} from '../src/composition/partitions.js';
import {emptyTouches, mergeTouches, touchesOf} from '../src/journal/surfaces.js';
import {fixtureArtifact, testRegistry} from './registryFixture.js';

const CAT = 'cat';

/** The three ways the platform reaches an agent on JSON-RPC, by the fake and the interface taken. */
type Path = 'A2A 0.3' | 'A2A 1.0' | 'A2A 1.0 through its 0.3 layer';
const PATHS: Path[] = ['A2A 0.3', 'A2A 1.0', 'A2A 1.0 through its 0.3 layer'];

/** The two A2UI messages of one paint, as `data` carries them. */
const CREATE = {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId: CAT}};
const UPDATE = {
  version: 'v0.9',
  updateComponents: {surfaceId: 's1', components: [{id: 'root', component: 'Text', text: 'hi'}]},
};
const NAMESPACED = [
  {version: 'v0.9', createSurface: {surfaceId: 'shop:s1', catalogId: CAT}},
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: 'shop:s1',
      components: [{id: 'root', component: 'Text', text: 'hi'}],
    },
  },
];

/** One data part as a test writes it for either fake: its data, and how it is marked. */
interface Carried {
  data: unknown;
  marks?: PartMarksV1;
}

const part03 = ({data, marks}: Carried): Message03['parts'][number] =>
  ({
    kind: 'data',
    data,
    ...(marks?.metadata ? {metadata: marks.metadata} : {}),
  }) as Message03['parts'][number];
const partV1 = ({data, marks}: Carried): Part => dataPartV1(data, marks);

const agents: Array<FakeAgent | FakeAgentV1> = [];
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(agents.splice(0).map(agent => agent.close()));
  await Promise.all(dirs.splice(0).map(dir => rm(dir, {recursive: true, force: true})));
});

interface Scripts {
  v03: Script;
  v1: ScriptV1;
}

/** The fake of `path`, running its script, installed as `shop` with its catalog handed. */
async function poolFor(path: Path, scripts: Scripts, credentials?: Credentials) {
  const made = await testRegistry([]);
  dirs.push(made.stateDir);
  let cardUrl: string;
  let agent: FakeAgent | FakeAgentV1;
  if (path === 'A2A 0.3') {
    const fake = await startFakeAgent({
      script: scripts.v03,
      card: url => cardFor03(url, {name: 'Shop', catalogs: [CAT]}),
    });
    cardUrl = made.cards.serve(fake.card);
    agent = fake;
  } else {
    const order: FakeA2aVersion[] = path === 'A2A 1.0' ? ['1.0'] : ['0.3', '1.0'];
    const fake = await startFakeAgentV1({
      script: scripts.v1,
      card: interfaces => cardForV1(interfaces, {name: 'Shop', catalogs: [CAT], order}),
    });
    cardUrl = made.cards.serveAt(fake.cardUrl, fake.served as ServedCard);
    agent = fake;
  }
  agents.push(agent);
  const result = await made.registry.install({
    appId: 'shop',
    cardUrl,
    catalogs: [await fixtureArtifact(CAT)],
  });
  if (!result.ok) throw new Error(result.findings.join('; '));
  const pool = new AgentsPool(made.registry, {
    hardCapMs: 30_000,
    debugIds: false,
    ...(credentials ? {credentials} : {}),
  });
  return {agent, pool};
}

/** An agent answering `carried` on a completed task, on either fake. */
const answering = (...carried: Carried[]): Scripts => ({
  v03: completingScript(carried.map(part03)),
  v1: completingScriptV1(carried.map(partV1)),
});

function turn(parts: Part[] = [textPart('hello')]): DispatchTurn {
  const message = userMessage(parts, {contextId: 'o-ctx', taskId: 'o-task'});
  return {clientContextId: 'o-ctx', clientTaskId: 'o-task', message};
}

/**
 * A dispatch drained as the executor's pump takes it: each event composed for the private wire,
 * with what the orchestrator then counts of it — the surfaces touched, the partitions, the paints.
 */
async function relayed(handle: ReturnType<AgentsPool['dispatch']>) {
  const composed: WireEvent[] = [];
  const history = new History();
  const partitions = new Partitions();
  let touches = emptyTouches();
  for await (const event of handle.events) {
    const out = composeFragment(event, {source: 'shop', taskId: 'o-task'});
    composed.push(out);
    touches = mergeTouches(touches, touchesOf(out));
    partitions.apply(out);
    history.observe(out);
  }
  const record = await handle.done;
  return {record, composed, touches, history, partitions};
}

/** Every data part's value the relayed events carry in a status message, in order. */
const valuesOf = (composed: WireEvent[]): unknown[] =>
  composed.flatMap(event =>
    event.kind === 'statusUpdate'
      ? (event.data.status?.message?.parts ?? []).flatMap(part =>
          part.content?.$case === 'data' ? [part.content.value] : [],
        )
      : [],
  );

describe.each(PATHS)('what the dispatch and the relay read from an agent on %s', path => {
  const onV1Wire = path === 'A2A 1.0';
  const marks: Array<[string, PartMarksV1]> = [
    ['application/a2ui+json in metadata.mimeType', {metadata: {mimeType: 'application/a2ui+json'}}],
    ['application/json+a2ui in metadata.mimeType', {metadata: {mimeType: 'application/json+a2ui'}}],
    ['application/a2ui+json in mediaType', {mediaType: 'application/a2ui+json'}],
    ['application/json+a2ui in mediaType', {mediaType: 'application/json+a2ui'}],
    ['nothing', {}],
  ];

  test.each(marks)('a part marked %s is A2UI by what it holds', async (_name, mark) => {
    const {pool} = await poolFor(
      path,
      answering({data: CREATE, marks: mark}, {data: UPDATE, marks: mark}),
    );
    const {record, composed, touches, history} = await relayed(pool.dispatch('shop', turn()));
    expect(record).toMatchObject({outcome: 'completed', endState: 'TASK_STATE_COMPLETED'});
    expect(valuesOf(composed)).toEqual(NAMESPACED);
    expect(touches).toEqual({created: ['shop:s1'], updated: ['shop:s1'], deleted: []});
    expect(history.paintsOf('shop')).toEqual({count: 1, at: 0});
  });

  test("the relay passes an agent's part with the marks the wire carried, its surface id alone rewritten", async () => {
    const mark = {
      metadata: {mimeType: 'application/json+a2ui', note: 'kept'},
      mediaType: 'application/a2ui+json',
    };
    const {pool} = await poolFor(path, answering({data: CREATE, marks: mark}));
    const {composed} = await relayed(pool.dispatch('shop', turn()));
    const parts = composed.flatMap(event =>
      event.kind === 'statusUpdate' ? (event.data.status?.message?.parts ?? []) : [],
    );
    expect(parts).toEqual([
      {
        content: {$case: 'data', value: NAMESPACED[0]},
        metadata: mark.metadata,
        filename: '',
        // A2A 0.3 has no field for a part's MIME type: an agent's `mediaType` rides the A2A 1.0
        // wire alone.
        mediaType: onV1Wire ? mark.mediaType : '',
      },
    ]);
  });

  test('a bare list in data is read, each entry on its own, and relayed as a list', async () => {
    const unspoken = {version: 'v0.8', beginRendering: {surfaceId: 's1'}};
    const {pool} = await poolFor(
      path,
      answering({data: [CREATE, {note: 'no version'}, unspoken, UPDATE]}),
    );
    const {record, composed, touches, history, partitions} = await relayed(
      pool.dispatch('shop', turn()),
    );
    expect(record.outcome).toBe('completed');
    expect(valuesOf(composed)).toEqual([
      [NAMESPACED[0], {note: 'no version'}, unspoken, NAMESPACED[1]],
    ]);
    expect(touches).toEqual({created: ['shop:s1'], updated: ['shop:s1'], deleted: []});
    expect(history.paintsOf('shop')).toEqual({count: 1, at: 0});
    expect(partitions.has('shop:s1')).toBe(true);
  });

  test('a paint outside the entitlement is refused inside a list as it is alone', async () => {
    const outside = {version: 'v0.9', createSurface: {surfaceId: 's2', catalogId: 'urn:other'}};
    const {pool} = await poolFor(path, answering({data: [CREATE, outside]}));
    const {record, composed} = await relayed(pool.dispatch('shop', turn()));
    expect(record).toMatchObject({outcome: 'failed', cause: 'catalog', catalogId: 'urn:other'});
    expect(valuesOf(composed)).toEqual([]);
  });

  test('an object holding a messages list is not read: relayed as written, no surface, no paint', async () => {
    const wrapped = {messages: [CREATE, UPDATE]};
    const {pool} = await poolFor(path, answering({data: wrapped}));
    const {record, composed, touches, history, partitions} = await relayed(
      pool.dispatch('shop', turn()),
    );
    expect(record.outcome).toBe('completed');
    expect(valuesOf(composed)).toEqual([wrapped]);
    expect(touches).toEqual(emptyTouches());
    expect(history.paintsOf('shop')).toBeUndefined();
    expect(partitions.has('shop:s1')).toBe(false);
  });

  test('A2UI in an artifact is not read: relayed as it is, no surface, no paint, nothing refused', async () => {
    const outside = {version: 'v0.9', createSurface: {surfaceId: 's2', catalogId: 'urn:other'}};
    const carried: Carried[] = [{data: CREATE}, {data: UPDATE}, {data: outside}];
    const {pool} = await poolFor(path, {
      v03: ({ctx}) => [
        firstTurnTask(ctx),
        artifactUpdate(ctx, carried.map(part03)),
        finalUpdate(ctx, 'completed', []),
      ],
      v1: ({ctx}) => [
        firstTurnTaskV1(ctx),
        artifactUpdateV1(ctx, carried.map(partV1)),
        statusUpdateV1(ctx, TaskState.TASK_STATE_COMPLETED, []),
      ],
    });
    const {record, composed, touches, history, partitions} = await relayed(
      pool.dispatch('shop', turn()),
    );
    expect(record).toMatchObject({outcome: 'completed', endState: 'TASK_STATE_COMPLETED'});
    expect(record.catalogId).toBeUndefined();
    const artifacts = composed.filter(event => event.kind === 'artifactUpdate');
    expect(artifacts).toHaveLength(1);
    expect(
      artifacts[0]!.data.artifact?.parts.map(p =>
        p.content?.$case === 'data' ? p.content.value : undefined,
      ),
    ).toEqual([CREATE, UPDATE, outside]);
    expect(touches).toEqual(emptyTouches());
    expect(history.paintsOf('shop')).toBeUndefined();
    expect(partitions.entries()).toEqual([]);
  });
});

describe('what an agent receives for a press (task-20.4 decisions 5, 7)', () => {
  const ACTION = {
    version: 'v0.9',
    action: {name: 'open', surfaceId: 's1', sourceComponentId: 'row', timestamp: 't', context: {}},
  };
  const press = () => turn([a2uiPart(ACTION)]);

  test('an agent on A2A 0.3: one message in the part, marked in metadata.mimeType, no mediaType on the wire', async () => {
    const {agent, pool} = await poolFor('A2A 0.3', answering({data: CREATE}));
    await relayed(pool.dispatch('shop', press()));
    const {message, extensionsHeader, headers} = (agent as FakeAgent).requests[0]!;
    expect(message.parts).toEqual([
      {kind: 'data', data: ACTION, metadata: {mimeType: 'application/a2ui+json'}},
    ]);
    expect(extensionsHeader).toContain('https://a2ui.org/a2a-extension/a2ui/');
    expect(headers['a2a-extensions']).toBeUndefined();
    expect(message.extensions ?? []).toEqual([]);
    expect(message.metadata).toHaveProperty('a2uiClientCapabilities');
  });

  test('an agent on A2A 1.0: one message in the part, marked in metadata.mimeType and in mediaType', async () => {
    const {agent, pool} = await poolFor('A2A 1.0', answering({data: CREATE}));
    await relayed(pool.dispatch('shop', press()));
    const {message, headers, reached} = (agent as FakeAgentV1).requests[0]!;
    expect(reached).toBe('1.0');
    expect(message?.parts).toEqual([
      {
        data: ACTION,
        metadata: {mimeType: 'application/a2ui+json'},
        mediaType: 'application/a2ui+json',
      },
    ]);
    expect(headers['a2a-extensions']).toContain('https://a2ui.org/a2a-extension/a2ui/');
    expect(headers['x-a2a-extensions']).toBeUndefined();
    expect(message?.extensions ?? []).toEqual([]);
    expect(message?.metadata).toHaveProperty('a2uiClientCapabilities');
  });

  test('an agent on A2A 1.0 reached through its 0.3 layer: the 0.3 wire, mediaType left off', async () => {
    const {agent, pool} = await poolFor('A2A 1.0 through its 0.3 layer', answering({data: CREATE}));
    await relayed(pool.dispatch('shop', press()));
    const {message, headers, reached} = (agent as FakeAgentV1).requests[0]!;
    expect(reached).toBe('0.3');
    expect(message?.parts).toEqual([
      {kind: 'data', data: ACTION, metadata: {mimeType: 'application/a2ui+json'}},
    ]);
    expect(headers['x-a2a-extensions']).toContain('https://a2ui.org/a2a-extension/a2ui/');
  });
});

describe('the auth-required request at the dispatch (task-20.4 decisions 9, 10)', () => {
  /** A vault that takes every request for more access, recording the request as read. */
  function recording() {
    const requested: Array<AuthRequired | undefined> = [];
    const credentials: Credentials = {
      prepare: async () => ({headers: {}}),
      unauthorized: async () => ({need: {cause: 'again'}}),
      markAgain: async () => {},
      requested: (_source, request) => {
        requested.push(request);
        return {kind: 'escalate', scheme: 'signIn', keys: ['write'], words: ['Change your orders']};
      },
    };
    return {requested, credentials};
  }
  const asking = (shape: RequirementShape): Scripts => ({
    v03: authRequiredScript('signIn', ['write'], shape),
    v1: authRequiredScriptV1('signIn', ['write'], shape),
  });
  const READ = {securityRequirements: [{schemes: {signIn: {list: ['write']}}}]};

  describe.each(PATHS)('from an agent on %s', path => {
    test.each<[RequirementShape]>([['1.0'], ['0.3']])(
      "in A2A %s's requirement shape: read to the one shape, the dispatch ended at the state",
      async shape => {
        const {requested, credentials} = recording();
        const {pool} = await poolFor(path, asking(shape), credentials);
        const started = Date.now();
        const {record, composed} = await relayed(pool.dispatch('shop', turn()));
        // The agent on A2A 1.0 holds its stream open after it asks: the dispatch does not wait.
        expect(Date.now() - started).toBeLessThan(3000);
        expect(requested).toEqual([READ]);
        expect(record).toMatchObject({
          outcome: 'failed',
          endState: 'TASK_STATE_AUTH_REQUIRED',
          authority: {cause: 'signIn', scheme: 'signIn', keys: ['write'], escalation: true},
        });
        // The request is read, never relayed.
        expect(valuesOf(composed)).toEqual([]);
      },
    );

    test('a part holding both keys is read by securityRequirements', async () => {
      const both = {
        ...authRequiredBody('1.0', 'signIn', ['write']),
        ...authRequiredBody('0.3', 'other', ['read']),
      };
      const {requested, credentials} = recording();
      const {pool} = await poolFor(
        path,
        {
          v03: ({ctx}) => [finalUpdate(ctx, 'auth-required', [{kind: 'data', data: both}])],
          v1: ({ctx, firstTurn}) => [
            ...(firstTurn ? [firstTurnTaskV1(ctx)] : []),
            statusUpdateV1(ctx, TaskState.TASK_STATE_AUTH_REQUIRED, [
              textPartV1('Please sign in.'),
              dataPartV1(both),
            ]),
          ],
        },
        credentials,
      );
      await relayed(pool.dispatch('shop', turn()));
      expect(requested).toEqual([READ]);
    });
  });

  test('the stream the dispatch left on an agent on A2A 1.0 is closed behind it', async () => {
    const {credentials} = recording();
    const {agent, pool} = await poolFor('A2A 1.0', asking('1.0'), credentials);
    await relayed(pool.dispatch('shop', turn()));
    await vi.waitFor(async () => expect(await (agent as FakeAgentV1).connections()).toBe(0), {
      timeout: 10_000,
      interval: 100,
    });
  });
});

describe.each(['1.0', '0.3'])(
  "the dispatch over wires captured from Python's a2a-sdk 1.3.0, reached at A2A %s (task-20.4 decision 15)",
  version => {
    const FIXTURE_CATALOG = 'https://example.com/catalogs/fake/v1/catalog.json';
    const create = {
      version: 'v0.9',
      createSurface: {surfaceId: 'shop:s1', catalogId: FIXTURE_CATALOG},
    };
    const update = {
      version: 'v0.9',
      updateComponents: {
        surfaceId: 'shop:s1',
        components: [{id: 'root', component: 'Text', text: 'hi'}],
      },
    };

    /** The scratch agent installed as `shop` from its captured card, its answer replayed. */
    async function poolOver(asked: string, credentials?: Credentials) {
      const wire = capturedWire(`python-${version}-${asked}.json`);
      const made = await testRegistry([]);
      dirs.push(made.stateDir);
      const result = await made.registry.install({
        appId: 'shop',
        cardUrl: made.cards.serveAt(
          'http://127.0.0.1:18741/.well-known/agent-card.json',
          wire.card as ServedCard,
        ),
        catalogs: [await fixtureArtifact(FIXTURE_CATALOG)],
      });
      if (!result.ok) throw new Error(result.findings.join('; '));
      return new AgentsPool(made.registry, {
        hardCapMs: 30_000,
        debugIds: false,
        fetchImpl: capturedFetch(wire),
        // The replay stands in for the agent: no connection is opened.
        openConnection: () => Promise.resolve(true),
        ...(credentials ? {credentials} : {}),
      });
    }

    test.each([['one'], ['media-type']])(
      '%s: one message per part, relayed namespaced',
      async asked => {
        const pool = await poolOver(asked);
        const {record, composed, touches, history} = await relayed(pool.dispatch('shop', turn()));
        expect(record).toMatchObject({
          outcome: 'completed',
          endState: 'TASK_STATE_COMPLETED',
          a2aVersion: version,
          binding: 'JSONRPC',
        });
        expect(valuesOf(composed)).toEqual([create, update]);
        expect(touches).toEqual({created: ['shop:s1'], updated: ['shop:s1'], deleted: []});
        expect(history.paintsOf('shop')).toEqual({count: 1, at: 0});
      },
    );

    test('list: a list reaches the reading bare, wrapped on the 0.3 wire or not, and is relayed as a list', async () => {
      const pool = await poolOver('list');
      const {record, composed, touches, history} = await relayed(pool.dispatch('shop', turn()));
      expect(record.outcome).toBe('completed');
      expect(valuesOf(composed)).toEqual([[create, update]]);
      expect(touches).toEqual({created: ['shop:s1'], updated: ['shop:s1'], deleted: []});
      expect(history.paintsOf('shop')).toEqual({count: 1, at: 0});
    });

    test('artifact: A2UI in an artifact is relayed and not read', async () => {
      const pool = await poolOver('artifact');
      const {record, composed, touches, history} = await relayed(pool.dispatch('shop', turn()));
      expect(record).toMatchObject({outcome: 'completed', endState: 'TASK_STATE_COMPLETED'});
      expect(composed.filter(event => event.kind === 'artifactUpdate')).toHaveLength(1);
      expect(touches).toEqual(emptyTouches());
      expect(history.paintsOf('shop')).toBeUndefined();
    });

    test.each([['auth-1.0'], ['auth-0.3'], ['auth-held']])(
      '%s: the request is read to the one shape, the dispatch ended at the state',
      async asked => {
        const requested: Array<AuthRequired | undefined> = [];
        const pool = await poolOver(asked, {
          prepare: async () => ({headers: {}}),
          unauthorized: async () => ({need: {cause: 'again'}}),
          markAgain: async () => {},
          requested: (_source, request) => {
            requested.push(request);
            return {kind: 'escalate', scheme: 'signIn', keys: ['things.write'], words: ['Change']};
          },
        });
        const started = Date.now();
        const {record} = await relayed(pool.dispatch('shop', turn()));
        expect(Date.now() - started).toBeLessThan(3000);
        expect(requested).toEqual([
          {securityRequirements: [{schemes: {signIn: {list: ['things.write']}}}]},
        ]);
        expect(record).toMatchObject({
          outcome: 'failed',
          endState: 'TASK_STATE_AUTH_REQUIRED',
          authority: {cause: 'signIn', scheme: 'signIn', keys: ['things.write']},
        });
      },
    );
  },
);
