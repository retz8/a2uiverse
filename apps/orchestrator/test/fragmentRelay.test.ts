import {TaskState, type Part} from '@a2a-js/sdk';
import {describe, expect, test} from 'vitest';
import {shellPart} from '@a2uiverse/sdk';
import {agentMessage, dataOf, dataPart, textPart} from '../src/a2a/parts.js';
import {partsOf, workingUpdate, type WireEvent} from '../src/a2a/wire.js';
import type {VendorEvent} from '../src/agentsPool/relay.js';
import {composeFragment, retask, withoutFailureWords} from '../src/composition/fragmentRelay.js';

const ctx = {source: 'github', taskId: 't1'};

/** A vendor's status update as the pool relays it: the orchestrator's ids, the source stamped. */
function statusUpdate(
  parts: Part[],
  state: TaskState = TaskState.TASK_STATE_COMPLETED,
  stamp: Record<string, unknown> = {source: 'github'},
): VendorEvent {
  return {
    payload: {
      $case: 'statusUpdate',
      value: {
        taskId: 't1',
        contextId: 'c1',
        status: {
          state,
          message: {...agentMessage(parts, {contextId: 'c1', taskId: 't1'}), messageId: 'm1'},
          timestamp: undefined,
        },
        metadata: {a2uiverse: stamp},
      },
    },
  };
}

const a2uiPart = (op: Record<string, unknown>) => dataPart({version: 'v0.9', ...op});

/** The state a composed event names; an artifact update names none. */
const stateOf = (event: WireEvent) =>
  event.kind === 'statusUpdate' ? event.data.status?.state : undefined;

describe('composeFragment', () => {
  test('namespaces surfaceId on all four ops', () => {
    const event = statusUpdate([
      a2uiPart({createSurface: {surfaceId: 's1', catalogId: 'cat'}}),
      a2uiPart({updateComponents: {surfaceId: 's1', components: []}}),
      a2uiPart({updateDataModel: {surfaceId: 's1', path: '/', value: {}}}),
      a2uiPart({deleteSurface: {surfaceId: 's1'}}),
    ]);
    const datas = partsOf(composeFragment(event, ctx)).map(p => dataOf(p) ?? {});
    expect((datas[0].createSurface as {surfaceId: string}).surfaceId).toBe('github:s1');
    expect((datas[1].updateComponents as {surfaceId: string}).surfaceId).toBe('github:s1');
    expect((datas[2].updateDataModel as {surfaceId: string}).surfaceId).toBe('github:s1');
    expect((datas[3].deleteSurface as {surfaceId: string}).surfaceId).toBe('github:s1');
  });

  test('a bare list in data is namespaced entry by entry, its other entries as written (task-20.4 decision 3)', () => {
    const unspoken = {version: 'v0.8', beginRendering: {surfaceId: 's1'}};
    const event = statusUpdate([
      dataPart([
        {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId: 'cat'}},
        {note: {surfaceId: 's1'}},
        unspoken,
        {version: 'v0.9', deleteSurface: {surfaceId: 's2'}},
      ]),
    ]);
    const [part] = partsOf(composeFragment(event, ctx));
    expect(part.content).toEqual({
      $case: 'data',
      value: [
        {version: 'v0.9', createSurface: {surfaceId: 'github:s1', catalogId: 'cat'}},
        {note: {surfaceId: 's1'}},
        unspoken,
        {version: 'v0.9', deleteSurface: {surfaceId: 'github:s2'}},
      ],
    });
  });

  test('an object holding a messages list is not read: relayed as written (task-20.4 decision 3)', () => {
    const wrapped = dataPart({
      messages: [{version: 'v0.9', createSurface: {surfaceId: 's1', catalogId: 'cat'}}],
    });
    const [part] = partsOf(composeFragment(statusUpdate([wrapped]), ctx));
    expect(part).toBe(wrapped);
  });

  test("an agent's part keeps its form and its marks, its surface id alone rewritten (task-20.4 decision 6)", () => {
    const marks = {
      metadata: {mimeType: 'application/json+a2ui', other: 1},
      mediaType: 'application/a2ui+json',
    };
    const event = statusUpdate([
      {...a2uiPart({createSurface: {surfaceId: 's1', catalogId: 'cat'}}), ...marks},
      {...dataPart({paintMeta: {surfaceId: 's1', title: 'Open PRs'}}), ...marks},
    ]);
    const [create, meta] = partsOf(composeFragment(event, ctx));
    expect(create).toEqual({
      ...a2uiPart({createSurface: {surfaceId: 'github:s1', catalogId: 'cat'}}),
      ...marks,
    });
    expect(meta).toEqual({
      ...dataPart({paintMeta: {surfaceId: 'github:s1', title: 'Open PRs'}}),
      ...marks,
    });
  });

  test('leaves non-A2UI parts untouched by reference and never mutates the original', () => {
    const text = textPart('hello');
    const other = dataPart({note: {surfaceId: 's1'}});
    const original = statusUpdate([text, other, a2uiPart({deleteSurface: {surfaceId: 's1'}})]);
    const snapshot = structuredClone(original);
    const parts = partsOf(composeFragment(original, ctx));
    expect(parts[0]).toBe(text);
    expect(parts[1]).toBe(other);
    expect(original).toEqual(snapshot);
  });

  test.each([
    ['the older string', {metadata: {mimeType: 'application/json+a2ui-shell'}}],
    ['the new string in both fields', {...shellPart({}), content: undefined}],
    ['no mark', {}],
  ])(
    'namespaces the surface a paintMeta titles, as the client sees it, read by its key under %s; its title, kind and mark kept (task 10.9; task-20.4 decisions 2, 6)',
    (_name, marks) => {
      const body = {paintMeta: {surfaceId: 'run-detail', title: 'Run 812', kind: 'question'}};
      const paintMeta: Part = {...dataPart(body), ...marks, content: {$case: 'data', value: body}};
      const [part] = partsOf(composeFragment(statusUpdate([paintMeta]), ctx));
      expect(part).toEqual({
        ...paintMeta,
        content: {
          $case: 'data',
          value: {paintMeta: {surfaceId: 'github:run-detail', title: 'Run 812', kind: 'question'}},
        },
      });
      expect(dataOf(paintMeta)).toEqual(body);
    },
  );

  test('demotes every state a vendor names to working, terminal or interrupted, parts intact (task-20.1 decision 6)', () => {
    for (const state of [
      TaskState.TASK_STATE_COMPLETED,
      TaskState.TASK_STATE_FAILED,
      TaskState.TASK_STATE_CANCELED,
      TaskState.TASK_STATE_REJECTED,
      TaskState.TASK_STATE_INPUT_REQUIRED,
      TaskState.TASK_STATE_AUTH_REQUIRED,
    ]) {
      const out = composeFragment(
        statusUpdate([a2uiPart({createSurface: {surfaceId: 's1', catalogId: 'cat'}})], state),
        ctx,
      );
      expect(out.kind).toBe('statusUpdate');
      expect(stateOf(out)).toBe(TaskState.TASK_STATE_WORKING);
      expect(partsOf(out)).toHaveLength(1);
    }
  });

  test('a vendor’s task becomes a working status update carrying its status message (task-20.1 decision 6)', () => {
    const message = agentMessage([a2uiPart({createSurface: {surfaceId: 's1', catalogId: 'cat'}})], {
      contextId: 'c1',
      taskId: 't1',
    });
    const out = composeFragment(
      {
        payload: {
          $case: 'task',
          value: {
            id: 't1',
            contextId: 'c1',
            status: {state: TaskState.TASK_STATE_COMPLETED, message, timestamp: undefined},
            artifacts: [],
            history: [message],
            metadata: {a2uiverse: {source: 'github'}},
          },
        },
      },
      ctx,
    );
    expect(out.kind).toBe('statusUpdate');
    expect(out.data).toMatchObject({taskId: 't1', contextId: 'c1'});
    expect(stateOf(out)).toBe(TaskState.TASK_STATE_WORKING);
    expect(dataOf(partsOf(out)[0])).toEqual({
      version: 'v0.9',
      createSurface: {surfaceId: 'github:s1', catalogId: 'cat'},
    });
    expect(out.data.metadata?.a2uiverse).toEqual({source: 'github', role: 'fragment'});
  });

  test('a vendor’s bare message becomes a working status update of the orchestrator’s task, carrying that message (task-20.1 decision 6)', () => {
    const message = {
      ...agentMessage([textPart('Looking…')], {contextId: 'c1'}),
      metadata: {a2uiverse: {source: 'github'}},
    };
    const out = composeFragment({payload: {$case: 'message', value: message}}, ctx);
    expect(out.kind).toBe('statusUpdate');
    expect(out.data).toMatchObject({taskId: 't1', contextId: 'c1'});
    expect(stateOf(out)).toBe(TaskState.TASK_STATE_WORKING);
    expect(partsOf(out)).toEqual(message.parts);
    expect(out.data.metadata?.a2uiverse).toEqual({source: 'github', role: 'fragment'});
  });

  test('an artifact update is relayed as it is, its parts unread and its stamp given the role (task-20.1 decision 6; task-20.4 decision 4)', () => {
    const out = composeFragment(
      {
        payload: {
          $case: 'artifactUpdate',
          value: {
            taskId: 't1',
            contextId: 'c1',
            artifact: {
              artifactId: 'a1',
              name: 'report',
              description: '',
              parts: [a2uiPart({updateDataModel: {surfaceId: 's1', value: {}}})],
              metadata: undefined,
              extensions: [],
            },
            append: true,
            lastChunk: false,
            metadata: {a2uiverse: {source: 'github'}},
          },
        },
      },
      {...ctx, builds: {cat: 'sha256-aaa'}},
    );
    expect(out.kind).toBe('artifactUpdate');
    expect(out.data).toMatchObject({
      taskId: 't1',
      contextId: 'c1',
      append: true,
      lastChunk: false,
      artifact: {artifactId: 'a1', name: 'report'},
      // No A2UI is read from an artifact, so the stamp names no build.
      metadata: {a2uiverse: {source: 'github', role: 'fragment'}},
    });
    expect((out.data.metadata?.a2uiverse as {builds?: unknown}).builds).toBeUndefined();
    if (out.kind !== 'artifactUpdate') return;
    expect(out.data.artifact?.parts).toEqual([
      a2uiPart({updateDataModel: {surfaceId: 's1', value: {}}}),
    ]);
    expect(partsOf(out)).toEqual([]);
  });

  test('stamp gains role while keeping source and existing keys', () => {
    const event = statusUpdate([], TaskState.TASK_STATE_COMPLETED, {
      source: 'github',
      vendorTaskId: 'vt',
    });
    const out = composeFragment(event, ctx);
    expect(out.data.metadata?.a2uiverse).toEqual({
      source: 'github',
      vendorTaskId: 'vt',
      role: 'fragment',
    });
  });
});

test('the stamp carries source and role, and no generations', () => {
  const out = composeFragment(statusUpdate([], TaskState.TASK_STATE_WORKING), {
    source: 'shop-a',
    taskId: 't1',
  });
  expect(out.data.metadata?.a2uiverse).toEqual({source: 'shop-a', role: 'fragment'});
});

describe('the builds on the stamp (task-15.6 decision 2)', () => {
  const builds = {'https://shop.example/catalog/v1': 'a1b2'};
  const shop = {source: 'shop-a', taskId: 't1'};

  test('an event carrying A2UI names the build of each of the app’s catalogs', () => {
    const create = statusUpdate([
      a2uiPart({createSurface: {surfaceId: 's1', catalogId: 'https://shop.example/catalog/v1'}}),
    ]);
    const change = statusUpdate([a2uiPart({updateComponents: {surfaceId: 's1', components: []}})]);
    for (const event of [create, change]) {
      expect(composeFragment(event, {...shop, builds}).data.metadata?.a2uiverse).toEqual({
        source: 'shop-a',
        role: 'fragment',
        builds,
      });
    }
  });

  test('an event with no A2UI names none', () => {
    const prose = statusUpdate([textPart('Looking…')], TaskState.TASK_STATE_WORKING);
    expect(composeFragment(prose, {...shop, builds}).data.metadata?.a2uiverse).toEqual({
      source: 'shop-a',
      role: 'fragment',
    });
  });

  test('an app with no catalog of its own names none', () => {
    const event = statusUpdate([a2uiPart({deleteSurface: {surfaceId: 's1'}})]);
    expect(composeFragment(event, {...shop, builds: {}}).data.metadata?.a2uiverse).toEqual({
      source: 'shop-a',
      role: 'fragment',
    });
  });
});

describe('withoutFailureWords (task-8.3 decision 6)', () => {
  const words = textPart('The mail server is down.');
  const data = a2uiPart({deleteSurface: {surfaceId: 's1'}});

  test('an event naming a failed state loses its words and keeps its data parts, `final` unread', () => {
    for (const state of [
      TaskState.TASK_STATE_FAILED,
      TaskState.TASK_STATE_CANCELED,
      TaskState.TASK_STATE_REJECTED,
    ]) {
      const out = withoutFailureWords(statusUpdate([words, data], state));
      expect(out.payload?.$case).toBe('statusUpdate');
      const parts =
        out.payload?.$case === 'statusUpdate' ? out.payload.value.status?.message?.parts : [];
      expect(parts).toEqual([data]);
    }
  });

  test('an event naming any other state keeps its words', () => {
    for (const state of [TaskState.TASK_STATE_WORKING, TaskState.TASK_STATE_COMPLETED]) {
      const event = statusUpdate([words, data], state);
      expect(withoutFailureWords(event)).toBe(event);
    }
  });
});

describe('retask', () => {
  test('moves an event onto another task, its parts and stamp untouched (task-8.4 decision 15)', () => {
    const event = workingUpdate(
      {taskId: 'plan', contextId: 'ctx'},
      {
        parts: [dataPart({version: 'v0.9', createSurface: {surfaceId: 'gmail:s1'}})],
        metadata: {a2uiverse: {source: 'gmail', role: 'fragment'}},
      },
    );
    const moved = retask(event, 'retry');
    expect(moved.data.taskId).toBe('retry');
    expect(moved.kind === 'statusUpdate' && moved.data.status?.message?.taskId).toBe('retry');
    expect(partsOf(moved)).toBe(partsOf(event));
    expect(moved.data.metadata).toEqual(event.data.metadata);
    expect(event.data.taskId).toBe('plan');
  });
});
