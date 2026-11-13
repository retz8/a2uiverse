import {afterEach, describe, expect, test, vi} from 'vitest';
import {TaskState} from '@a2a-js/sdk';
import {dataPart, textPart, userMessage} from '../src/a2a/parts.js';
import {
  AgentsPool,
  type AgentsPoolOptions,
  type Credentials,
  REJECTED_VALUE,
  type UpdateGate,
} from '../src/agentsPool/agentsPool.js';
import type {Fault} from '../src/agentsPool/faults.js';
import type {DispatchTurn} from '../src/agentsPool/types.js';
import type {Refetched, UpdateCase, UpdateFinding} from '../src/registry/updateTile.js';
import {A2UI_EXTENSION_URIS, a2uiPart, BASIC_CATALOG_ID} from '@a2uiverse/sdk';
import {
  A2UI_PART,
  FAKE_CATALOG_ID,
  startFakeVendor,
  type AgentExecutionEvent,
  type FakeVendor,
  type Message as VendorMessage,
  type Script,
  type Task as VendorTask,
} from './fakeVendor.js';
import {contextIdOf, datasOf, partsOf, stampOf, stateOf, taskIdOf} from './privateWire.js';
import {cardFor, fixtureArtifact, testRegistry} from './registryFixture.js';

/** A status update as the fake vendor's script writes it, in A2A 0.3's shape. */
type VendorStatusUpdate = Extract<AgentExecutionEvent, {kind: 'status-update'}>;

const vendors: FakeVendor[] = [];
afterEach(async () => {
  await Promise.all(vendors.splice(0).map(v => v.close()));
});

/** A pool over a registry with the fake vendor installed as `github`, handing its catalog. */
async function poolFor(
  options: Parameters<typeof startFakeVendor>[0] = {},
  extra: Partial<AgentsPoolOptions> = {},
) {
  const vendor = await startFakeVendor(options);
  vendors.push(vendor);
  const {registry} = await testRegistry([
    {
      id: 'github',
      card: cardFor(vendor.url, {
        name: 'GitHub',
        catalogs: [FAKE_CATALOG_ID],
        streaming: options.streaming ?? true,
      }),
      catalogs: [await fixtureArtifact(FAKE_CATALOG_ID)],
    },
  ]);
  const pool = new AgentsPool(registry, {hardCapMs: 30000, debugIds: false, ...extra});
  return {vendor, pool, registry};
}

/** The second catalog of a two-entry card: declared for v0.9.1 alone, beside the fake's for v0.9. */
const V091_ONLY_CATALOG_ID = 'cat-v091';

/**
 * A pool over a registry whose installed card declares different sets per version (task-19.2):
 * the fake's catalog under the v0.9 URI, the second catalog under the v0.9.1 URI, both handed.
 */
async function poolForTwoEntries(
  options: Parameters<typeof startFakeVendor>[0] = {},
  extra: Partial<AgentsPoolOptions> = {},
) {
  const vendor = await startFakeVendor(options);
  vendors.push(vendor);
  const card = {
    ...cardFor(vendor.url, {name: 'GitHub'}),
    capabilities: {
      streaming: true,
      extensions: [
        {uri: A2UI_EXTENSION_URIS['v0.9'], params: {supportedCatalogIds: [FAKE_CATALOG_ID]}},
        {uri: A2UI_EXTENSION_URIS['v0.9.1'], params: {supportedCatalogIds: [V091_ONLY_CATALOG_ID]}},
      ],
    },
  };
  const {registry} = await testRegistry([
    {
      id: 'github',
      card,
      catalogs: [
        await fixtureArtifact(FAKE_CATALOG_ID),
        await fixtureArtifact(V091_ONLY_CATALOG_ID),
      ],
    },
  ]);
  const pool = new AgentsPool(registry, {hardCapMs: 30000, debugIds: false, ...extra});
  return {vendor, pool, registry};
}

/** A script answering one message that paints one surface: `stamp` its version, when given. */
const paintScript =
  (catalogId: string, stamp?: string): Script =>
  ({ctx, vendorContextId}) => [
    {
      kind: 'message',
      messageId: crypto.randomUUID(),
      role: 'agent',
      parts: [
        {
          kind: 'data',
          data: {
            ...(stamp === undefined ? {} : {version: stamp}),
            createSurface: {surfaceId: 's1', catalogId},
          },
        },
      ],
      contextId: vendorContextId,
      taskId: ctx.taskId,
    },
  ];

function turn(overrides: Partial<DispatchTurn> = {}): DispatchTurn {
  const message = userMessage([textPart('hello')], {
    contextId: 'o-ctx',
    taskId: 'o-task',
    metadata: {a2uiClientDataModel: {v: 1}},
  });
  return {clientContextId: 'o-ctx', clientTaskId: 'o-task', message, ...overrides};
}

async function drain(handle: ReturnType<AgentsPool['dispatch']>) {
  const events = [];
  for await (const e of handle.events) events.push(e);
  return {events, record: await handle.done};
}

describe('AgentsPool.dispatch', () => {
  test('logs one line when a relay starts and one when it settles, with the app, the task and the outcome (task 5.7)', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const {pool} = await poolFor();
      await drain(pool.dispatch('github', turn()));
      const lines = log.mock.calls.map(c => String(c[0]));
      expect(lines.some(l => /→ github task=o-task/.test(l))).toBe(true);
      expect(lines.some(l => /← github task=o-task completed \d+ ms/.test(l))).toBe(true);
    } finally {
      log.mockRestore();
    }
  });

  test('relays the vendor stream with orchestrator ids, source stamp, and parts by identity', async () => {
    const {pool} = await poolFor();
    const {events, record} = await drain(pool.dispatch('github', turn()));

    expect(events.map(e => e.payload?.$case)).toEqual(['task', 'statusUpdate']);
    const [task, last] = events;
    expect(taskIdOf(task)).toBe('o-task');
    expect(contextIdOf(task)).toBe('o-ctx');
    expect(stampOf(task)).toEqual({source: 'github'});
    expect(taskIdOf(last)).toBe('o-task');
    expect(stateOf(last)).toBe(TaskState.TASK_STATE_COMPLETED);
    expect(partsOf(last)[0]).toEqual(dataPart(A2UI_PART.data));
    expect(record.outcome).toBe('completed');
    expect(record.endState).toBe('TASK_STATE_COMPLETED');
    // The interface taken is the card's own, at the A2A version the card names (task-20.3 decision 11).
    expect(record.a2aVersion).toBe('0.3.0');
    expect(record.binding).toBe('JSONRPC');
    expect(record.vendorContextId).toBeDefined();
    expect(record.vendorContextId).not.toBe('o-ctx');
  });

  test('forwards parts and metadata, strips orchestrator ids, sends both A2UI extension URIs', async () => {
    const {pool, vendor} = await poolFor();
    const t = turn();
    await drain(pool.dispatch('github', t));

    const [received] = vendor.requests;
    expect(received.message.parts).toEqual([{kind: 'text', text: 'hello'}]);
    expect(received.message.metadata).toMatchObject(t.message.metadata!);
    expect(received.message.taskId).toBeUndefined();
    expect(received.message.contextId).toBeUndefined();
    expect(received.extensionsHeader).toContain('https://a2ui.org/a2a-extension/a2ui/v0.9.1');
    expect(received.extensionsHeader).toContain('https://a2ui.org/a2a-extension/a2ui/v0.9');
  });

  test('turn 2 on the same client context resends the vendor contextId learned in turn 1', async () => {
    const {pool, vendor} = await poolFor();
    const first = await drain(pool.dispatch('github', turn()));
    const second = await drain(pool.dispatch('github', turn({clientTaskId: 'o-task-2'})));

    expect(vendor.requests[1].message.contextId).toBe(first.record.vendorContextId);
    expect(vendor.contextIds).toHaveLength(1);
    expect(second.events.map(e => e.payload?.$case)).toEqual(['statusUpdate']);
    expect(contextIdOf(second.events[0])).toBe('o-ctx');
  });

  test('a different client context starts a separate vendor conversation', async () => {
    const {pool, vendor} = await poolFor();
    await drain(pool.dispatch('github', turn()));
    await drain(pool.dispatch('github', turn({clientContextId: 'o-ctx-2'})));
    expect(vendor.contextIds).toHaveLength(2);
  });

  test('a vendor answer ending on failed is relayed verbatim and recorded as failed', async () => {
    const script: Script = ({ctx, vendorContextId}) => [
      {
        kind: 'status-update',
        taskId: ctx.taskId,
        contextId: vendorContextId,
        final: true,
        status: {state: 'failed'},
      },
    ];
    const {pool} = await poolFor({script});
    const {events, record} = await drain(pool.dispatch('github', turn()));
    expect(stateOf(events[0])).toBe(TaskState.TASK_STATE_FAILED);
    expect(record.outcome).toBe('failed');
    expect(record.endState).toBe('TASK_STATE_FAILED');
  });

  test('a stream that ends before the answer did is recorded as failed with no endState', async () => {
    const script: Script = ({ctx, vendorContextId}) => [
      {
        kind: 'status-update',
        taskId: ctx.taskId,
        contextId: vendorContextId,
        final: false,
        status: {state: 'working'},
      },
    ];
    const {pool} = await poolFor({script});
    const {events, record} = await drain(pool.dispatch('github', turn()));
    expect(events).toHaveLength(1);
    expect(record.outcome).toBe('failed');
    expect(record.endState).toBeUndefined();
    expect(record.error).toMatch(/the stream ended before the answer did/);
  });

  test('an unreachable vendor is recorded as failed, and done never rejects', async () => {
    const {pool, vendor} = await poolFor();
    await vendor.close();
    vendors.length = 0;
    const {events, record} = await drain(pool.dispatch('github', turn()));
    expect(events).toEqual([]);
    expect(record.outcome).toBe('failed');
    expect(record.error).toBeTruthy();
  });

  test('cancel() aborts the stream and records cancelled', async () => {
    const script: Script = async function* ({ctx, vendorContextId}) {
      yield {
        kind: 'status-update' as const,
        taskId: ctx.taskId,
        contextId: vendorContextId,
        final: false,
        status: {state: 'working' as const},
      };
      await new Promise(resolve => setTimeout(resolve, 5_000));
    };
    const {pool} = await poolFor({script});
    const handle = pool.dispatch('github', turn());
    const events = [];
    for await (const e of handle.events) {
      events.push(e);
      handle.cancel();
    }
    const record = await handle.done;
    expect(events).toHaveLength(1);
    expect(record.outcome).toBe('cancelled');
  });

  test('pool.cancel(clientTaskId) reaches the in-flight dispatch', async () => {
    const script: Script = async function* () {
      yield* [];
      await new Promise(resolve => setTimeout(resolve, 5_000));
    };
    const {pool} = await poolFor({script});
    const handle = pool.dispatch('github', turn());
    setTimeout(() => pool.cancel('o-task'), 50);
    const {record} = await drain(handle);
    expect(record.outcome).toBe('cancelled');
  });

  test('pool.cancel cancels every handle a fan-out turn holds under one task id', async () => {
    const script: Script = async function* () {
      yield* [];
      await new Promise(resolve => setTimeout(resolve, 5_000));
    };
    const {pool} = await poolFor({script});
    const a = pool.dispatch('github', turn());
    const b = pool.dispatch('github', turn());
    setTimeout(() => pool.cancel('o-task'), 50);
    const [ra, rb] = await Promise.all([drain(a), drain(b)]);
    expect(ra.record.outcome).toBe('cancelled');
    expect(rb.record.outcome).toBe('cancelled');
  });

  test('a non-streaming vendor yields its single result and completes', async () => {
    const {pool} = await poolFor({streaming: false});
    const {events, record} = await drain(pool.dispatch('github', turn()));
    expect(events).toHaveLength(1);
    expect(events[0].payload?.$case).toBe('task');
    expect(record.outcome).toBe('completed');
    expect(record.endState).toBe('TASK_STATE_COMPLETED');
  });

  test('the hard cap is recorded; a dispatch ending before it is never capped', async () => {
    const {pool} = await poolFor();
    const handle = pool.dispatch('github', turn());
    let capped = false;
    void handle.capped.then(() => (capped = true));
    const {record} = await drain(handle);
    expect(record.deadlineMs).toBe(30000);
    expect(record.outcome).toBe('completed');
    expect(record.cappedAt).toBeUndefined();
    expect(capped).toBe(false);
  });
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** A vendor that says it has the task, then paints after `ms`. */
function slowScript(ms: number): Script {
  return async function* ({ctx, vendorContextId}) {
    yield {
      kind: 'task' as const,
      id: ctx.taskId,
      contextId: vendorContextId,
      status: {state: 'submitted' as const},
    };
    await sleep(ms);
    yield {
      kind: 'status-update' as const,
      taskId: ctx.taskId,
      contextId: vendorContextId,
      final: true,
      status: {
        state: 'completed' as const,
        message: {
          kind: 'message' as const,
          messageId: crypto.randomUUID(),
          role: 'agent' as const,
          parts: [A2UI_PART],
          contextId: vendorContextId,
          taskId: ctx.taskId,
        },
      },
    };
  };
}

describe('AgentsPool — the hard cap, the cause of a failure, cancel (task 8.3)', () => {
  test('the hard cap fires while the dispatch runs on: capped, then completed past it', async () => {
    const {pool} = await poolFor({script: slowScript(300)}, {hardCapMs: 60});
    const handle = pool.dispatch('github', turn());
    let cappedAt = 0;
    void handle.capped.then(() => (cappedAt = Date.now()));
    const {events, record} = await drain(handle);
    expect(cappedAt).toBeGreaterThan(0);
    expect(record.cappedAt).toBeDefined();
    expect(record.outcome).toBe('completed');
    expect(events.at(-1)?.payload?.$case).toBe('statusUpdate');
  });

  test('a vendor answer ending as a failure carries the vendor cause and its words', async () => {
    const script: Script = ({ctx, vendorContextId}) => [
      {
        kind: 'status-update',
        taskId: ctx.taskId,
        contextId: vendorContextId,
        final: true,
        status: {
          state: 'rejected',
          message: {
            kind: 'message',
            messageId: 'm',
            role: 'agent',
            parts: [{kind: 'text', text: 'Project not found: retz8/a2uiverse'}],
          },
        },
      },
    ];
    const {pool} = await poolFor({script});
    const {record} = await drain(pool.dispatch('github', turn()));
    expect(record).toMatchObject({
      outcome: 'failed',
      cause: 'vendor',
      vendorMessage: 'Project not found: retz8/a2uiverse',
    });
  });

  test('a broken connection and a stream that ended before the answer did are unreachable, with no words', async () => {
    const {pool, vendor} = await poolFor();
    await vendor.close();
    vendors.length = 0;
    const {record} = await drain(pool.dispatch('github', turn()));
    expect(record).toMatchObject({outcome: 'failed', cause: 'unreachable'});
    expect(record.vendorMessage).toBeUndefined();
  });

  test('an aborted dispatch asks its vendor to cancel the task over A2A', async () => {
    const {pool, vendor} = await poolFor({script: slowScript(2_000)});
    const handle = pool.dispatch('github', turn());
    const events = [];
    for await (const e of handle.events) {
      events.push(e);
      handle.cancel();
    }
    expect((await handle.done).outcome).toBe('cancelled');
    for (let i = 0; i < 100 && !vendor.methods.includes('tasks/cancel'); i++) await sleep(10);
    expect(vendor.methods).toContain('tasks/cancel');
  });
});

/**
 * A vendor that paints, then moves through `states` with no update marked final, and closes its
 * stream: upstream's restaurant finder ends its answers on `input-required` this way.
 */
function unmarkedScript(states: VendorTask['status']['state'][]): Script {
  return ({ctx, vendorContextId}) => [
    {kind: 'task', id: ctx.taskId, contextId: vendorContextId, status: {state: 'submitted'}},
    {
      kind: 'status-update',
      taskId: ctx.taskId,
      contextId: vendorContextId,
      final: false,
      status: {
        state: 'working',
        message: {kind: 'message', messageId: 'm', role: 'agent', parts: [A2UI_PART]},
      },
    },
    ...states.map(state => ({
      kind: 'status-update' as const,
      taskId: ctx.taskId,
      contextId: vendorContextId,
      final: false,
      status: {state},
    })),
  ];
}

describe('AgentsPool — a stream that ends on input required (task 18.5.1)', () => {
  test('a stream closing on input-required, not marked final, completes', async () => {
    const {pool} = await poolFor({script: unmarkedScript(['input-required'])});
    const {record} = await drain(pool.dispatch('github', turn()));
    expect(record.outcome).toBe('completed');
    expect(record.cause).toBeUndefined();
  });

  test('a stream closing while working, not marked final, is still unreachable', async () => {
    const {pool} = await poolFor({script: unmarkedScript([])});
    const {record} = await drain(pool.dispatch('github', turn()));
    expect(record).toMatchObject({outcome: 'failed', cause: 'unreachable'});
  });

  test('a non-streaming vendor answering one Task in input-required completes', async () => {
    const script: Script = ({ctx, vendorContextId}) => [
      {
        kind: 'task',
        id: ctx.taskId,
        contextId: vendorContextId,
        status: {
          state: 'input-required',
          message: {kind: 'message', messageId: 'm', role: 'agent', parts: [A2UI_PART]},
        },
      },
    ];
    const {pool} = await poolFor({streaming: false, script});
    const {record} = await drain(pool.dispatch('github', turn()));
    expect(record.outcome).toBe('completed');
  });

  test('input-required followed by more work before the close is not the end', async () => {
    const {pool} = await poolFor({script: unmarkedScript(['input-required', 'working'])});
    const {record} = await drain(pool.dispatch('github', turn()));
    expect(record).toMatchObject({outcome: 'failed', cause: 'unreachable'});
  });
});

describe('AgentsPool — the fault map (task 8.3 decision 14)', () => {
  const faulted = (fault: Fault) => ({faults: new Map([['github', fault]])});

  test('delay holds the stream, then forwards it whole', async () => {
    const {pool} = await poolFor({}, faulted({fault: 'delay', seconds: 0.15}));
    const started = Date.now();
    const {events, record} = await drain(pool.dispatch('github', turn({fromPlan: true})));
    expect(Date.now() - started).toBeGreaterThanOrEqual(140);
    expect(events.map(e => e.payload?.$case)).toEqual(['task', 'statusUpdate']);
    expect(record).toMatchObject({outcome: 'completed', fault: 'delay'});
  });

  test('hang forwards nothing and never ends; the cap fires and a cancel ends it', async () => {
    const {pool, vendor} = await poolFor({}, {...faulted({fault: 'hang'}), hardCapMs: 50});
    const handle = pool.dispatch('github', turn({fromPlan: true}));
    await handle.capped;
    handle.cancel();
    const {events, record} = await drain(handle);
    expect(events).toEqual([]);
    expect(record.outcome).toBe('cancelled');
    expect(vendor.requests).toHaveLength(0);
  });

  test('refuse fails as unreachable before any event, the vendor never asked', async () => {
    const {pool, vendor} = await poolFor({}, faulted({fault: 'refuse'}));
    const {events, record} = await drain(pool.dispatch('github', turn({fromPlan: true})));
    expect(events).toEqual([]);
    expect(record).toMatchObject({outcome: 'failed', cause: 'unreachable', fault: 'refuse'});
    expect(vendor.requests).toHaveLength(0);
  });

  test('fail ends with a vendor status update of failed carrying the message', async () => {
    const {pool, vendor} = await poolFor({}, faulted({fault: 'fail', message: 'Rate limited'}));
    const {events, record} = await drain(pool.dispatch('github', turn({fromPlan: true})));
    const [last] = events;
    expect(last.payload?.$case).toBe('statusUpdate');
    expect(stateOf(last)).toBe(TaskState.TASK_STATE_FAILED);
    expect(taskIdOf(last)).toBe('o-task');
    expect(record).toMatchObject({
      outcome: 'failed',
      cause: 'vendor',
      vendorMessage: 'Rate limited',
    });
    expect(vendor.requests).toHaveLength(0);
  });

  test('break forwards the first paint, then ends before the answer did', async () => {
    const script: Script = async function* ({ctx, vendorContextId}) {
      yield {
        kind: 'status-update' as const,
        taskId: ctx.taskId,
        contextId: vendorContextId,
        final: false,
        status: {
          state: 'working' as const,
          message: {
            kind: 'message' as const,
            messageId: 'm1',
            role: 'agent' as const,
            parts: [A2UI_PART],
          },
        },
      };
      yield* deterministicTail(ctx.taskId, vendorContextId);
    };
    const {pool} = await poolFor({script}, faulted({fault: 'break'}));
    const {events, record} = await drain(pool.dispatch('github', turn({fromPlan: true})));
    expect(events).toHaveLength(1);
    expect(record).toMatchObject({outcome: 'failed', cause: 'unreachable'});
    expect(record.endState).toBeUndefined();
  });

  test('break ends before the answer did after a paint that rode the state the vendor’s answer ended on', async () => {
    const script: Script = ({ctx, vendorContextId}) => [
      {
        kind: 'status-update',
        taskId: ctx.taskId,
        contextId: vendorContextId,
        final: true,
        status: {
          state: 'completed',
          message: {kind: 'message', messageId: 'm', role: 'agent', parts: [A2UI_PART]},
        },
      },
    ];
    const {pool} = await poolFor({script}, faulted({fault: 'break'}));
    const {events, record} = await drain(pool.dispatch('github', turn({fromPlan: true})));
    expect(events).toHaveLength(1);
    expect(record).toMatchObject({outcome: 'failed', cause: 'unreachable'});
    expect(record.endState).toBeUndefined();
  });

  test('invalid gives a component of the paint a prop its catalog rejects', async () => {
    const script: Script = ({ctx, vendorContextId}) => [
      {
        kind: 'status-update',
        taskId: ctx.taskId,
        contextId: vendorContextId,
        final: true,
        status: {
          state: 'completed',
          message: {
            kind: 'message',
            messageId: 'm',
            role: 'agent',
            parts: [
              {
                kind: 'data',
                data: {
                  version: 'v0.9',
                  updateComponents: {
                    surfaceId: 's1',
                    components: [
                      {id: 'root', component: 'Column', children: ['t']},
                      {id: 't', component: 'Text', text: 'hi'},
                    ],
                  },
                },
              },
            ],
          },
        },
      },
    ];
    const {pool} = await poolFor({script}, faulted({fault: 'invalid'}));
    const {events, record} = await drain(pool.dispatch('github', turn({fromPlan: true})));
    const data = datasOf(events[0])[0] as {
      updateComponents: {components: Array<Record<string, unknown>>};
    };
    expect(data.updateComponents.components).toEqual([
      {id: 'root', component: 'Column', children: REJECTED_VALUE},
      {id: 't', component: 'Text', text: 'hi'},
    ]);
    expect(record).toMatchObject({outcome: 'completed', fault: 'invalid'});
  });

  test('a fault hits the plan’s dispatch only, unless marked for every dispatch', async () => {
    const plain = await poolFor({}, faulted({fault: 'refuse'}));
    const action = await drain(plain.pool.dispatch('github', turn()));
    expect(action.record.outcome).toBe('completed');
    expect(action.record.fault).toBeUndefined();
    const every = await poolFor({}, faulted({fault: 'refuse', every: true}));
    const again = await drain(every.pool.dispatch('github', turn()));
    expect(again.record).toMatchObject({outcome: 'failed', fault: 'refuse'});
  });
});

function deterministicTail(taskId: string, contextId: string) {
  return [
    {
      kind: 'status-update' as const,
      taskId,
      contextId,
      final: true,
      status: {state: 'completed' as const},
    },
  ];
}

describe('AgentsPool — catalog entitlement and the installed set (task-11.4 decisions 6, 12)', () => {
  test('advertises to the agent its own entitlement, never the client’s list', async () => {
    const {pool, vendor} = await poolFor();
    const t = turn();
    t.message.metadata = {
      ...t.message.metadata,
      a2uiClientCapabilities: {'v0.9': {supportedCatalogIds: ['every', 'catalog', 'held']}},
    };
    await drain(pool.dispatch('github', t));
    // A one-entry card: the entitlement under each version's key, one set (task-19.2 decision 1).
    expect(vendor.requests[0].message.metadata?.a2uiClientCapabilities).toEqual({
      'v0.9': {supportedCatalogIds: [BASIC_CATALOG_ID, FAKE_CATALOG_ID]},
      'v0.9.1': {supportedCatalogIds: [BASIC_CATALOG_ID, FAKE_CATALOG_ID]},
    });
  });

  test("a two-entry card naming different sets: each version's own set under its key (task-19.2 decision 1)", async () => {
    const {pool, vendor} = await poolForTwoEntries();
    const t = turn();
    t.message.metadata = {
      ...t.message.metadata,
      a2uiClientCapabilities: {'v0.9': {supportedCatalogIds: ['every', 'catalog', 'held']}},
    };
    await drain(pool.dispatch('github', t));
    expect(vendor.requests[0].message.metadata?.a2uiClientCapabilities).toEqual({
      'v0.9': {supportedCatalogIds: [BASIC_CATALOG_ID, FAKE_CATALOG_ID]},
      'v0.9.1': {supportedCatalogIds: [BASIC_CATALOG_ID, V091_ONLY_CATALOG_ID]},
    });
  });

  describe('a paint is checked against the set of its stamp (task-19.2 decisions 2, 3)', () => {
    test('stamped v0.9 in a catalog the card declares for v0.9.1 only: refused, never relayed, the error naming the stamp', async () => {
      const {pool} = await poolForTwoEntries({script: paintScript(V091_ONLY_CATALOG_ID, 'v0.9')});
      const {events, record} = await drain(pool.dispatch('github', turn()));
      expect(JSON.stringify(events)).not.toContain(V091_ONLY_CATALOG_ID);
      expect(record).toMatchObject({
        outcome: 'failed',
        cause: 'catalog',
        catalogId: V091_ONLY_CATALOG_ID,
        error: `painted in catalog "${V091_ONLY_CATALOG_ID}" stamped v0.9, which its card declares for v0.9.1 only`,
      });
    });

    test('stamped v0.9.1 in that catalog: relayed', async () => {
      const {pool} = await poolForTwoEntries({script: paintScript(V091_ONLY_CATALOG_ID, 'v0.9.1')});
      const {events, record} = await drain(pool.dispatch('github', turn()));
      expect(record.outcome).toBe('completed');
      expect(JSON.stringify(events)).toContain(V091_ONLY_CATALOG_ID);
    });

    test('a stamp that is neither version is checked against the union: in either set relayed, outside both refused with the plain line', async () => {
      for (const [catalogId, stamp] of [
        [FAKE_CATALOG_ID, 'v0.8'],
        [V091_ONLY_CATALOG_ID, 'v1.0'],
      ] as const) {
        const {pool} = await poolForTwoEntries({script: paintScript(catalogId, stamp)});
        const {events, record} = await drain(pool.dispatch('github', turn()));
        expect(record.outcome).toBe('completed');
        expect(JSON.stringify(events)).toContain(catalogId);
      }
      const {pool} = await poolForTwoEntries({script: paintScript('urn:other', 'v1.0')});
      const {record} = await drain(pool.dispatch('github', turn()));
      expect(record).toMatchObject({
        outcome: 'failed',
        cause: 'catalog',
        catalogId: 'urn:other',
        error: 'painted in catalog "urn:other", outside its entitlement',
      });
    });

    test('a createSurface carrying no version is no A2UI message: relayed as written, judged by no reader (task-20.4 decisions 1, 2)', async () => {
      const {pool} = await poolForTwoEntries({script: paintScript('urn:other')});
      const {events, record} = await drain(pool.dispatch('github', turn()));
      expect(record.outcome).toBe('completed');
      expect(record.catalogId).toBeUndefined();
      expect(events.flatMap(datasOf)).toEqual([
        {createSurface: {surfaceId: 's1', catalogId: 'urn:other'}},
      ]);
    });

    test('the refetch after a refusal the axis made runs as today, on the union', async () => {
      const calls: string[] = [];
      const updates: UpdateGate = {
        catalogsChanged: () => false,
        permissionChanged: () => false,
        finding: () => Promise.resolve(undefined),
        refetched: appId => {
          calls.push(`refetched ${appId}`);
          return Promise.resolve('unchanged');
        },
      };
      const {pool} = await poolForTwoEntries(
        {script: paintScript(V091_ONLY_CATALOG_ID, 'v0.9')},
        {updates},
      );
      const {record} = await drain(pool.dispatch('github', turn()));
      expect(record).toMatchObject({outcome: 'failed', cause: 'catalog', refetched: 'unchanged'});
      expect(calls).toEqual(['refetched github']);
    });
  });

  test('a paint in a catalog outside the entitlement fails the dispatch with the catalog cause and the id, never relayed', async () => {
    const outside: Script = ({ctx, vendorContextId}) => [
      {
        kind: 'status-update',
        taskId: ctx.taskId,
        contextId: vendorContextId,
        final: true,
        status: {
          state: 'completed',
          message: {
            kind: 'message',
            messageId: crypto.randomUUID(),
            role: 'agent',
            parts: [
              {
                kind: 'data',
                data: {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId: 'urn:other'}},
              },
            ],
            contextId: vendorContextId,
            taskId: ctx.taskId,
          },
        },
      },
    ];
    const {pool} = await poolFor({script: outside});
    const {events, record} = await drain(pool.dispatch('github', turn()));
    expect(JSON.stringify(events)).not.toContain('urn:other');
    expect(record).toMatchObject({outcome: 'failed', cause: 'catalog', catalogId: 'urn:other'});
  });

  test('a paint in the basic catalog is inside every entitlement', async () => {
    const basic: Script = ({ctx, vendorContextId}) => [
      {
        kind: 'message',
        messageId: crypto.randomUUID(),
        role: 'agent',
        parts: [
          {
            kind: 'data',
            data: {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId: BASIC_CATALOG_ID}},
          },
        ],
        contextId: vendorContextId,
        taskId: ctx.taskId,
      },
    ];
    const {pool} = await poolFor({script: basic});
    const {record} = await drain(pool.dispatch('github', turn()));
    expect(record.outcome).toBe('completed');
  });

  test('a dispatch to an app not installed fails with the uninstalled cause, the vendor never asked', async () => {
    const {pool, vendor, registry} = await poolFor();
    await registry.uninstall('github');
    const {events, record} = await drain(pool.dispatch('github', turn()));
    expect(events).toEqual([]);
    expect(record).toMatchObject({outcome: 'failed', cause: 'uninstalled'});
    expect(vendor.requests).toEqual([]);
  });

  test('a dispatch already running when its app is uninstalled finishes under the entitlement it was sent with', async () => {
    const {pool, registry} = await poolFor({script: slowScript(200)});
    const handle = pool.dispatch('github', turn());
    const events = [];
    for await (const e of handle.events) {
      events.push(e);
      if (events.length === 1) await registry.uninstall('github');
    }
    const record = await handle.done;
    expect(record.outcome).toBe('completed');
    expect(JSON.stringify(events)).toContain(FAKE_CATALOG_ID);
  });
});

describe('AgentsPool — the update check (task-15.5 decisions 1 to 4)', () => {
  const finding = (why: UpdateCase): UpdateFinding => ({
    case: why,
    state: {appId: 'github', installedVersion: '1.0.0', state: 'unknown'},
    line: 'unreached',
  });
  /** A gate answering as told, and a vault asking nothing, each saying what it was asked in order. */
  function checks(
    answers: {
      catalogs?: boolean;
      /** What the catalog case judges once the live card is fetched again; `catalogs` before. */
      catalogsRefetched?: boolean;
      permission?: boolean;
      refetched?: Refetched;
      signIn?: boolean;
    } = {},
  ) {
    const calls: string[] = [];
    let fetchedAgain = false;
    const updates: UpdateGate = {
      catalogsChanged: appId => (
        calls.push(`catalogs ${appId}`),
        (fetchedAgain ? answers.catalogsRefetched : answers.catalogs) ?? false
      ),
      permissionChanged: source => (
        calls.push(`permission ${source}`),
        answers.permission ?? false
      ),
      finding: async (appId, why) => (calls.push(`finding ${appId} ${why}`), finding(why)),
      refetched: async appId => (
        calls.push(`refetched ${appId}`),
        (fetchedAgain = true),
        answers.refetched ?? 'unchanged'
      ),
    };
    const credentials: Credentials = {
      prepare: async () => {
        calls.push('prepare');
        return answers.signIn ? {need: {cause: 'again'}} : undefined;
      },
      unauthorized: async () => ({need: {cause: 'again'}}),
      markAgain: async () => {},
      requested: () => ({kind: 'unsigned'}),
    };
    return {calls, extra: {updates, credentials}};
  }

  test('an app that cannot paint in what it is installed with is stopped before the sign-in, its agent never called', async () => {
    const {calls, extra} = checks({catalogs: true, signIn: true});
    const {pool, vendor} = await poolFor({}, extra);
    const {events, record} = await drain(pool.dispatch('github', turn()));
    expect(events).toEqual([]);
    expect(vendor.requests).toEqual([]);
    expect(record).toMatchObject({outcome: 'failed', update: finding('catalogs')});
    expect(record.authority).toBeUndefined();
    expect(record.a2aVersion).toBeUndefined();
    expect(record.binding).toBeUndefined();
    expect(calls).toEqual(['catalogs github', 'finding github catalogs']);
  });

  test('a new permission on the live card is judged after the sign-in, and only once it is met', async () => {
    const asking = checks({permission: true, signIn: true});
    const first = await poolFor({}, asking.extra);
    const signingIn = await drain(first.pool.dispatch('github', turn()));
    expect(signingIn.record.authority).toEqual({cause: 'again'});
    expect(signingIn.record.update).toBeUndefined();
    expect(asking.calls).toEqual(['catalogs github', 'prepare']);

    const met = checks({permission: true});
    const second = await poolFor({}, met.extra);
    const {record} = await drain(second.pool.dispatch('github', turn()));
    expect(second.vendor.requests).toEqual([]);
    expect(record).toMatchObject({outcome: 'failed', update: finding('permission')});
    expect(met.calls).toEqual([
      'catalogs github',
      'prepare',
      'permission github',
      'finding github permission',
    ]);
  });

  test('an app that can paint is dispatched as before', async () => {
    const {calls, extra} = checks();
    const {pool, vendor} = await poolFor({}, extra);
    const {record} = await drain(pool.dispatch('github', turn()));
    expect(record.outcome).toBe('completed');
    expect(record.update).toBeUndefined();
    expect(vendor.requests).toHaveLength(1);
    expect(calls).toEqual(['catalogs github', 'prepare', 'permission github']);
  });

  const outside: Script = ({ctx, vendorContextId}) => [
    {
      kind: 'message',
      messageId: crypto.randomUUID(),
      role: 'agent',
      parts: [
        {
          kind: 'data',
          data: {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId: 'urn:v2'}},
        },
      ],
      contextId: vendorContextId,
      taskId: ctx.taskId,
    },
  ];

  test('a paint refused outside the entitlement fetches the live card again: changed, the finding on the catalog record', async () => {
    const {calls, extra} = checks({refetched: 'changed'});
    const {pool} = await poolFor({script: outside}, extra);
    const {record} = await drain(pool.dispatch('github', turn()));
    expect(record).toMatchObject({
      outcome: 'failed',
      cause: 'catalog',
      catalogId: 'urn:v2',
      refetched: 'changed',
      update: finding('catalogs'),
    });
    expect(calls.slice(-2)).toEqual(['refetched github', 'finding github catalogs']);
  });

  test('unchanged or unanswered, the catalog record says so and carries no finding', async () => {
    for (const refetched of ['unchanged', 'unanswered'] as const) {
      const {calls, extra} = checks({refetched});
      const {pool} = await poolFor({script: outside}, extra);
      const {record} = await drain(pool.dispatch('github', turn()));
      expect(record).toMatchObject({outcome: 'failed', cause: 'catalog', refetched});
      expect(record.update).toBeUndefined();
      expect(calls.at(-1)).toBe('refetched github');
    }
  });

  const noUi: Script = ({ctx, vendorContextId}) => [
    {
      kind: 'status-update',
      taskId: ctx.taskId,
      contextId: vendorContextId,
      final: true,
      status: {
        state: 'completed',
        message: {
          kind: 'message',
          messageId: crypto.randomUUID(),
          role: 'agent',
          parts: [{kind: 'text', text: "GitHub has changed and can't show this here."}],
          contextId: vendorContextId,
          taskId: ctx.taskId,
        },
      },
    },
  ];

  test('a call that ends with no UI fetches the live card again: one naming nothing installed brings the update tile (task-15.11 decision 5)', async () => {
    const {calls, extra} = checks({refetched: 'changed', catalogsRefetched: true});
    const {pool} = await poolFor({script: noUi}, extra);
    const {record} = await drain(pool.dispatch('github', turn()));
    expect(record).toMatchObject({
      outcome: 'failed',
      refetched: 'changed',
      update: finding('catalogs'),
    });
    expect(record.cause).toBeUndefined();
    expect(calls.slice(-3)).toEqual([
      'refetched github',
      'catalogs github',
      'finding github catalogs',
    ]);
  });

  test('with no UI and a card still naming something installed, unchanged or unanswered, the call completes, the outcome on the record', async () => {
    const cases = [
      {refetched: 'changed', catalogsRefetched: false},
      {refetched: 'unchanged'},
      {refetched: 'unanswered'},
    ] as const;
    for (const answers of cases) {
      const {calls, extra} = checks(answers);
      const {pool} = await poolFor({script: noUi}, extra);
      const {record} = await drain(pool.dispatch('github', turn()));
      expect(record).toMatchObject({outcome: 'completed', refetched: answers.refetched});
      expect(record.update).toBeUndefined();
      expect(calls).not.toContain('finding github catalogs');
    }
  });
});

describe('AgentsPool — the credential bar at the paint (task 12.7)', () => {
  const SECRET = {id: 'pw', component: 'TextField', label: 'Password', variant: 'obscured'};
  const CLEAN = {id: 'root', component: 'Text', text: 'Open your settings on the website.'};
  const isRepair = (message: VendorMessage) =>
    message.parts.some(p => p.kind === 'text' && p.text.startsWith('Your last answer included'));

  /** One paint per send: the secret field until the repair arrives, then a clean one. */
  function paints(options: {stream?: boolean; repairs?: boolean} = {}): Script {
    return ({ctx, vendorContextId}) => {
      const secret = !(options.repairs ?? true) || !isRepair(ctx.userMessage);
      const update = {
        version: 'v0.9',
        updateComponents: {surfaceId: 's1', components: secret ? [CLEAN, SECRET] : [CLEAN]},
      };
      // The basic catalog: its TextField declares `obscured`.
      const create = {
        version: 'v0.9',
        createSurface: {surfaceId: 's1', catalogId: BASIC_CATALOG_ID},
      };
      const event = (parts: object[], final: boolean): VendorStatusUpdate => ({
        kind: 'status-update',
        taskId: ctx.taskId,
        contextId: vendorContextId,
        final,
        status: {
          state: final ? 'completed' : 'working',
          message: {
            kind: 'message',
            messageId: crypto.randomUUID(),
            role: 'agent',
            parts: parts.map(data => ({
              kind: 'data' as const,
              data: data as Record<string, unknown>,
            })),
            contextId: vendorContextId,
            taskId: ctx.taskId,
          },
        },
      });
      return options.stream
        ? [event([create], false), event([update], false), event([], true)]
        : [event([create, update], true)];
    };
  }

  test('a paint carrying one is never relayed; the reason alone goes back once, in the same conversation', async () => {
    const {pool, vendor} = await poolFor({script: paints()});
    const {events, record} = await drain(pool.dispatch('github', turn()));
    expect(JSON.stringify(events)).not.toContain('obscured');
    expect(JSON.stringify(events)).toContain('Open your settings');
    expect(record).toMatchObject({outcome: 'completed'});
    expect(record.cause).toBeUndefined();
    expect(vendor.requests).toHaveLength(2);
    const [first, repair] = vendor.requests;
    expect(repair!.message.contextId).toBe(vendor.contextIds[0]);
    expect(repair!.message.parts).toEqual([
      {
        kind: 'text',
        text: 'Your last answer included a field that asks for a password, a one-time code, a PIN or a card number: the TextField component\'s variant "obscured". Answer the same request again without it; for anything like that, offer a link to your own website instead.',
      },
    ]);
    // The press or request is not sent again; the metadata it rode on is.
    expect(first!.message.parts).toEqual([{kind: 'text', text: 'hello'}]);
    expect(repair!.message.metadata?.a2uiClientDataModel).toEqual({v: 1});
  });

  test('what a streamed answer already showed is taken down, stamped refused, before the repair', async () => {
    const {pool, vendor} = await poolFor({script: paints({stream: true})});
    const {events, record} = await drain(pool.dispatch('github', turn()));
    const stamps = events.map(stampOf);
    const down = stamps.findIndex(stamp => stamp?.refused === true);
    expect(down).toBeGreaterThan(0);
    const takenDown = events[down];
    expect(takenDown.payload?.$case).toBe('statusUpdate');
    expect(stateOf(takenDown)).toBe(TaskState.TASK_STATE_WORKING);
    // In the platform's one spelling of an A2UI part (task-20.4 decision 5).
    expect(partsOf(takenDown)).toEqual([
      a2uiPart({version: 'v0.9', deleteSurface: {surfaceId: 's1'}}),
    ]);
    expect(JSON.stringify(events)).not.toContain('obscured');
    expect(record.outcome).toBe('completed');
    // The refused answer's task was still running: its vendor was asked to cancel it.
    await vi.waitFor(() => expect(vendor.methods).toContain('tasks/cancel'));
  });

  test('a repair refused again fails with the credential cause and the app’s own page', async () => {
    const vendor = await startFakeVendor({script: paints({repairs: false})});
    vendors.push(vendor);
    const card = {
      ...cardFor(vendor.url, {name: 'GitHub', catalogs: [FAKE_CATALOG_ID]}),
      provider: {organization: 'GitHub', url: 'http://github.example'},
      documentationUrl: 'https://docs.github.example',
    };
    const {registry} = await testRegistry([
      {id: 'github', card, catalogs: [await fixtureArtifact(FAKE_CATALOG_ID)]},
    ]);
    const pool = new AgentsPool(registry, {hardCapMs: 30000, debugIds: false});
    const {events, record} = await drain(pool.dispatch('github', turn()));
    expect(JSON.stringify(events)).not.toContain('obscured');
    expect(vendor.requests).toHaveLength(2);
    // provider.url is plain http on a public host: the documentation is the way out.
    expect(record).toMatchObject({
      outcome: 'failed',
      cause: 'credential',
      continueUrl: 'https://docs.github.example',
    });
  });

  test('a value its catalog does not declare as an option is free text, and passes', async () => {
    const script: Script = ({ctx, vendorContextId}) => [
      {
        kind: 'message',
        messageId: crypto.randomUUID(),
        role: 'agent',
        parts: [
          {
            kind: 'data',
            data: {
              version: 'v0.9',
              updateComponents: {
                surfaceId: 's1',
                components: [{id: 'root', component: 'Text', text: 'password'}],
              },
            },
          },
        ],
        contextId: vendorContextId,
        taskId: ctx.taskId,
      },
    ];
    const {pool, vendor} = await poolFor({script});
    const {record} = await drain(pool.dispatch('github', turn()));
    expect(record.outcome).toBe('completed');
    expect(vendor.requests).toHaveLength(1);
  });

  test('the credential fault: refusal then a clean repair on the plan’s dispatch; refused again with every', async () => {
    const clean = paints({repairs: true});
    const script: Script = s => clean({...s, ctx: {...s.ctx, userMessage: repairShaped(s)}});
    const once = await poolFor({script}, faulted({fault: 'credential'}));
    const repaired = await drain(once.pool.dispatch('github', turn({fromPlan: true})));
    expect(repaired.record).toMatchObject({outcome: 'completed', fault: 'credential'});
    expect(once.vendor.requests).toHaveLength(2);

    const every = await poolFor({script}, faulted({fault: 'credential', every: true}));
    const refused = await drain(every.pool.dispatch('github', turn({fromPlan: true})));
    expect(refused.record).toMatchObject({outcome: 'failed', cause: 'credential'});
  });

  const faulted = (fault: Fault) => ({faults: new Map([['github', fault]])});
  /** The vendor answers every send clean: the fault alone paints the secret field. */
  const repairShaped = (s: Parameters<Script>[0]): VendorMessage => ({
    ...s.ctx.userMessage,
    parts: [{kind: 'text', text: 'Your last answer included'}],
  });
});

describe('AgentsPool — the credential bar reads the painter’s catalog (task-12.7 decision 1)', () => {
  const answer =
    (data: Record<string, unknown>[]): Script =>
    ({ctx, vendorContextId}) => [
      {
        kind: 'message',
        messageId: crypto.randomUUID(),
        role: 'agent',
        parts: data.map(d => ({kind: 'data' as const, data: d})),
        contextId: vendorContextId,
        taskId: ctx.taskId,
      },
    ];
  const field = {id: 'pw', component: 'TextField', label: 'Password', variant: 'obscured'};
  const update = {version: 'v0.9', updateComponents: {surfaceId: 's1', components: [field]}};

  test('an option its own catalog does not declare is not matched', async () => {
    // The fixture catalog declares no TextField: `obscured` is no option of it there.
    const create = {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId: FAKE_CATALOG_ID}};
    const {pool, vendor} = await poolFor({script: answer([create, update])});
    const {record} = await drain(pool.dispatch('github', turn()));
    expect(record.outcome).toBe('completed');
    expect(vendor.requests).toHaveLength(1);
  });

  test('a later answer’s update is read against the catalog its surface was created in', async () => {
    let sends = 0;
    const create = {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId: BASIC_CATALOG_ID}};
    const script: Script = s => answer(++sends === 1 ? [create] : [update])(s);
    const {pool, vendor} = await poolFor({script});
    await drain(pool.dispatch('github', turn()));
    const {record} = await drain(pool.dispatch('github', turn()));
    // The press's answer painted the field on the basic surface: refused, repaired, refused again.
    expect(record).toMatchObject({outcome: 'failed', cause: 'credential'});
    expect(vendor.requests).toHaveLength(3);
  });
});
