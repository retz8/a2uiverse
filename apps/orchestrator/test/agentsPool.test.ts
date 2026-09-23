import {afterEach, describe, expect, test, vi} from 'vitest';
import type {Message, Task, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {AgentsPool, type AgentsPoolOptions, REJECTED_VALUE} from '../src/agentsPool/agentsPool.js';
import type {Fault} from '../src/agentsPool/faults.js';
import type {DispatchTurn} from '../src/agentsPool/types.js';
import {Registry} from '../src/registry/registry.js';
import {A2UI_PART, startFakeVendor, type FakeVendor, type Script} from './fakeVendor.js';

const vendors: FakeVendor[] = [];
afterEach(async () => {
  await Promise.all(vendors.splice(0).map(v => v.close()));
});

async function poolFor(
  options: Parameters<typeof startFakeVendor>[0] = {},
  extra: Partial<AgentsPoolOptions> = {},
) {
  const vendor = await startFakeVendor(options);
  vendors.push(vendor);
  const registry = new Registry([
    {
      id: 'github',
      displayName: 'GitHub',
      agentUrl: vendor.url,
      authScheme: 'none',
      catalogId: 'cat',
      catalogPackage: 'pkg',
    },
  ]);
  const pool = new AgentsPool(registry, {hardCapMs: 30000, debugIds: false, ...extra});
  return {vendor, pool};
}

function turn(overrides: Partial<DispatchTurn> = {}): DispatchTurn {
  const message: Message = {
    kind: 'message',
    messageId: crypto.randomUUID(),
    role: 'user',
    parts: [{kind: 'text', text: 'hello'}],
    contextId: 'o-ctx',
    taskId: 'o-task',
    metadata: {a2uiClientDataModel: {v: 1}},
  };
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

    expect(events.map(e => e.kind)).toEqual(['task', 'status-update']);
    const task = events[0] as Task;
    expect(task.id).toBe('o-task');
    expect(task.contextId).toBe('o-ctx');
    expect(task.metadata?.a2uiverse).toEqual({source: 'github'});
    const final = events[1] as TaskStatusUpdateEvent;
    expect(final.taskId).toBe('o-task');
    expect(final.final).toBe(true);
    expect(final.status.message?.parts[0]).toEqual(A2UI_PART);
    expect(record.outcome).toBe('completed');
    expect(record.sawFinal).toBe(true);
    expect(record.vendorContextId).toBeDefined();
    expect(record.vendorContextId).not.toBe('o-ctx');
  });

  test('forwards parts and metadata unchanged, strips orchestrator ids, sends both A2UI extension URIs', async () => {
    const {pool, vendor} = await poolFor();
    const t = turn();
    await drain(pool.dispatch('github', t));

    const [received] = vendor.requests;
    expect(received.message.parts).toEqual(t.message.parts);
    expect(received.message.metadata).toEqual(t.message.metadata);
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
    expect(second.events.map(e => e.kind)).toEqual(['status-update']);
    expect(second.events[0].contextId).toBe('o-ctx');
  });

  test('a different client context starts a separate vendor conversation', async () => {
    const {pool, vendor} = await poolFor();
    await drain(pool.dispatch('github', turn()));
    await drain(pool.dispatch('github', turn({clientContextId: 'o-ctx-2'})));
    expect(vendor.contextIds).toHaveLength(2);
  });

  test('a vendor final status of failed is relayed verbatim and recorded as failed', async () => {
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
    expect((events[0] as TaskStatusUpdateEvent).status.state).toBe('failed');
    expect(record.outcome).toBe('failed');
    expect(record.sawFinal).toBe(true);
  });

  test('a stream that ends without a final event is recorded as failed with sawFinal=false', async () => {
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
    expect(record.sawFinal).toBe(false);
    expect(record.error).toMatch(/final/);
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
    expect(events[0].kind).toBe('task');
    expect(record.outcome).toBe('completed');
    expect(record.sawFinal).toBe(false);
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
    expect(events.at(-1)?.kind).toBe('status-update');
  });

  test('a vendor final of failed carries the vendor cause and its words', async () => {
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

  test('a broken connection and a stream with no final are unreachable, with no words', async () => {
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

describe('AgentsPool — the fault map (task 8.3 decision 14)', () => {
  const faulted = (fault: Fault) => ({faults: new Map([['github', fault]])});

  test('delay holds the stream, then forwards it whole', async () => {
    const {pool} = await poolFor({}, faulted({fault: 'delay', seconds: 0.15}));
    const started = Date.now();
    const {events, record} = await drain(pool.dispatch('github', turn({fromPlan: true})));
    expect(Date.now() - started).toBeGreaterThanOrEqual(140);
    expect(events.map(e => e.kind)).toEqual(['task', 'status-update']);
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

  test('fail ends with a vendor failed final carrying the message', async () => {
    const {pool, vendor} = await poolFor({}, faulted({fault: 'fail', message: 'Rate limited'}));
    const {events, record} = await drain(pool.dispatch('github', turn({fromPlan: true})));
    const final = events[0] as TaskStatusUpdateEvent;
    expect(final.final).toBe(true);
    expect(final.status.state).toBe('failed');
    expect(final.taskId).toBe('o-task');
    expect(record).toMatchObject({
      outcome: 'failed',
      cause: 'vendor',
      vendorMessage: 'Rate limited',
    });
    expect(vendor.requests).toHaveLength(0);
  });

  test('break forwards the first paint, then ends with no final', async () => {
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
    expect(record).toMatchObject({outcome: 'failed', cause: 'unreachable', sawFinal: false});
  });

  test('break ends with no final after a paint that rode the vendor’s final', async () => {
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
    expect(record).toMatchObject({outcome: 'failed', cause: 'unreachable', sawFinal: false});
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
    const data = (events[0] as TaskStatusUpdateEvent).status.message!.parts[0] as {
      data: {updateComponents: {components: Array<Record<string, unknown>>}};
    };
    expect(data.data.updateComponents.components).toEqual([
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
