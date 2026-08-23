import {afterEach, describe, expect, test} from 'vitest';
import type {Message, Task, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {AgentsPool} from '../src/agentsPool/agentsPool.js';
import type {DispatchTurn} from '../src/agentsPool/types.js';
import {Registry} from '../src/registry/registry.js';
import {A2UI_PART, startFakeVendor, type FakeVendor, type Script} from './fakeVendor.js';

const vendors: FakeVendor[] = [];
afterEach(async () => {
  await Promise.all(vendors.splice(0).map(v => v.close()));
});

async function poolFor(options: Parameters<typeof startFakeVendor>[0] = {}) {
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
  const pool = new AgentsPool(registry, {defaultDeadlineMs: 30000, debugIds: false});
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

  test('a non-streaming vendor yields its single result and completes', async () => {
    const {pool} = await poolFor({streaming: false});
    const {events, record} = await drain(pool.dispatch('github', turn()));
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('task');
    expect(record.outcome).toBe('completed');
    expect(record.sawFinal).toBe(false);
  });

  test('the deadline is recorded but not enforced', async () => {
    const {pool} = await poolFor();
    const {record} = await drain(pool.dispatch('github', turn()));
    expect(record.deadlineMs).toBe(30000);
    expect(record.outcome).toBe('completed');
  });
});
