/**
 * An agent's renderer function call on the canvas (task-21.14 decisions 6 to 9), against a
 * scripted stream: run in its place in the stream, against the staging processor when the surface
 * it names is still staged and against the live one otherwise, and answered at once — while the
 * stream that carried it is still open — on a stream beside the turn, carrying the call's id as
 * received. A call waits behind a held batch; a call whose catalog cannot load gets the release's
 * own error, the slot untouched; an agent's call is never the person's gesture, so a function
 * that needs one is refused and nothing opens; an answer goes out while a press runs on its
 * source; and a component's `callAgentFunction` is sent on as the release emits it.
 */
import {afterEach, describe, expect, it, vi} from 'vitest';
import {z} from 'zod';
import {TaskState, type SendMessageRequest} from '@a2a-js/sdk';
import {
  Catalog,
  createFunctionImplementation,
  type AgentToRendererMessage,
} from '@a2ui/web_core/v1_0';
import {basicCatalog} from '@a2ui/web_core/catalogs/basic/v1';
import type {ReactCatalogComponent} from '@a2ui/react';
import {BASIC_CATALOG_ID} from '@a2uiverse/sdk';
import type {A2AMessageSender} from '../a2a/client';
import {dataOf, dataPart, statusUpdateEvent, type A2AStreamEventData} from '../a2a/messages';
import {COMPOSED_BEAT} from '../beats/syntheticBeats';
import {clientCatalogs, resolveCatalog, type ResolvedCatalog} from '../catalogs/clientCatalogs';
import type {BuildSource} from '../catalogs/loader';
import {createCanvasWiring} from './createCanvasWiring';

const GMAIL = 'urn:catalog:gmail';
const LAYOUT = COMPOSED_BEAT.turns[0]!.batches[0]!.messages;

const msg = (m: Record<string, unknown>): AgentToRendererMessage =>
  ({version: '1.0', ...m}) as unknown as AgentToRendererMessage;

const event = (
  messages: AgentToRendererMessage[],
  stamp?: Record<string, unknown>,
  final = false,
): A2AStreamEventData =>
  statusUpdateEvent({
    taskId: 't1',
    contextId: 'ctx-1',
    state: final ? TaskState.TASK_STATE_COMPLETED : TaskState.TASK_STATE_WORKING,
    parts: messages.map(dataPart),
    ...(stamp ? {metadata: {a2uiverse: stamp}} : {}),
  });

/** A function an agent may call: the greeting, read from the surface's data. */
const greet = createFunctionImplementation(
  {
    name: 'greet',
    returnType: 'string',
    schema: z.object({name: z.string()}),
    allowedCallers: 'rendererOrAgent',
  },
  ({name}) => `Hello, ${name}`,
);

/** A function an agent may call that needs the person's gesture. */
const launch = createFunctionImplementation(
  {
    name: 'launch',
    returnType: 'void',
    schema: z.object({}),
    allowedCallers: 'rendererOrAgent',
    requiresUserActivation: true,
  },
  () => {
    window.open('https://example.test');
  },
);

/** Gmail's catalog: the basic components, and the two functions above beside the basic ones. */
const gmailBuild = () =>
  resolveCatalog(
    new Catalog<ReactCatalogComponent>(
      GMAIL,
      basicCatalog.protocolVersion,
      [...basicCatalog.components.values()],
      [...basicCatalog.functions.values(), greet, launch],
    ),
    undefined,
    'sha256-gmail',
  );

const fragment = (surfaceId: string, name: string, catalogId = GMAIL) => [
  msg({createSurface: {surfaceId, catalogId, sendDataModel: true}}),
  msg({
    updateComponents: {
      surfaceId,
      components: [{id: 'root', component: 'Text', text: {'@path': '/name'}}],
    },
  }),
  msg({updateDataModel: {surfaceId, value: {name}}}),
];

const call = (functionCallId: string, callFunction: Record<string, unknown>, surfaceId?: string) =>
  msg({
    callRendererFunction: {...(surfaceId ? {surfaceId} : {}), functionCallId, callFunction},
  });

const greetCall = (id: string, surfaceId?: string) =>
  call(id, {'@call': 'greet', catalogId: GMAIL, args: {name: {'@path': '/name'}}}, surfaceId);

/** A stream the test plays event by event, holding it open until it is told to end. */
function script() {
  const queue: A2AStreamEventData[] = [];
  let wake: (() => void) | undefined;
  let ended = false;
  const stream = async function* () {
    for (;;) {
      while (queue.length > 0) yield queue.shift()!;
      if (ended) return;
      await new Promise<void>(resolve => (wake = resolve));
    }
  };
  const nudge = () => {
    const w = wake;
    wake = undefined;
    w?.();
  };
  return {
    stream,
    push: (...events: A2AStreamEventData[]) => {
      queue.push(...events);
      nudge();
    },
    end: () => {
      ended = true;
      nudge();
    },
  };
}

/**
 * A canvas over the client's own catalogs and Gmail's, each turn answered by the next script,
 * every other request — a press, an answer — by the stream `beside` gives, empty unless it does.
 */
function canvasWith({
  turns,
  load = () => Promise.resolve(gmailBuild()),
  beside,
}: {
  turns: ReturnType<typeof script>[];
  load?: (catalogId: string) => Promise<ResolvedCatalog>;
  beside?: (params: SendMessageRequest) => AsyncGenerator<A2AStreamEventData> | undefined;
}) {
  const own = clientCatalogs();
  const sent: SendMessageRequest[] = [];
  let turn = 0;
  const client: A2AMessageSender = {
    sendMessageStream(params) {
      sent.push(params);
      const isTurn = params.message?.parts[0]?.content?.$case === 'text';
      if (isTurn) return turns[turn++]!.stream();
      return beside?.(params) ?? (async function* () {})();
    },
  };
  const held = new Map<string, ResolvedCatalog>();
  const ownOf = (catalogId: string) => own.find(c => c.id === catalogId);
  const builds: BuildSource = {
    held: catalogId => ownOf(catalogId) ?? held.get(catalogId),
    load: catalogId =>
      ownOf(catalogId)
        ? Promise.resolve(ownOf(catalogId)!)
        : load(catalogId).then(build => {
            held.set(catalogId, build);
            return build;
          }),
    build: artifact => [...held.values()].find(b => b.build === artifact),
  };
  const wiring = createCanvasWiring({
    client,
    catalogs: own.map(c => c.catalog),
    loader: {builds},
  });
  /** Each function message the canvas sent an agent, in order. */
  const answers = () =>
    sent.flatMap(params =>
      (params.message?.parts ?? []).flatMap(part => {
        const data = dataOf(part);
        return data && ('rendererFunctionResponse' in data || 'callAgentFunction' in data)
          ? [{data, contextId: params.message!.contextId}]
          : [];
      }),
    );
  return {wiring, sent, answers};
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('an agent’s renderer function call', () => {
  it('on a live surface is answered at once, with its id as received, while the stream is open', async () => {
    const turn = script();
    const {wiring, answers} = canvasWith({turns: [turn]});
    const asked = wiring.sendUtterance('what needs my attention');
    turn.push(
      event(LAYOUT, {source: 'shell', role: 'shell'}),
      event(fragment('gmail:inbox', 'Ada'), {source: 'gmail', role: 'fragment'}),
      event([greetCall('gmail:call-1', 'gmail:inbox')], {source: 'gmail', role: 'fragment'}),
    );
    await vi.waitFor(() => expect(answers()).toHaveLength(1));
    expect(answers()[0]).toEqual({
      data: {
        version: '1.0',
        rendererFunctionResponse: {functionCallId: 'gmail:call-1', value: 'Hello, Ada'},
      },
      contextId: 'ctx-1',
    });
    turn.end();
    await asked;
  });

  it('on a surface still staged runs against the staging processor', async () => {
    const first = script();
    const {wiring, answers} = canvasWith({turns: [first]});
    const one = wiring.sendUtterance('show me Ada');
    first.push(event(fragment('plain:a', 'Ada', BASIC_CATALOG_ID)), event([], undefined, true));
    first.end();
    await one;
    const runtime = wiring.viewed()!;
    // An action's answer over the occupied stage streams into staging until its turn ends.
    const turn = runtime.runner.begin({
      kind: 'surface-action',
      payload: {
        action: {
          name: 'next',
          surfaceId: 'plain:a',
          sourceComponentId: 'root',
          timestamp: '2026-11-28T00:00:00Z',
          context: {},
        },
      },
    });
    turn.apply([...fragment('plain:b', 'Grace'), greetCall('gmail:call-2', 'plain:b')]);
    await vi.waitFor(() => expect(answers()).toHaveLength(1));
    expect(answers()[0]!.data).toEqual({
      version: '1.0',
      rendererFunctionResponse: {functionCallId: 'gmail:call-2', value: 'Hello, Grace'},
    });
    expect(runtime.processor.model.getSurface('plain:b')).toBeUndefined();
    turn.end();
    await vi.waitFor(() => expect(runtime.processor.model.getSurface('plain:b')).toBeDefined());
    // The swap draws the staged paint; it does not call again.
    expect(answers()).toHaveLength(1);
  });

  it('naming no surface runs against the live processor', async () => {
    const turn = script();
    const {wiring, answers} = canvasWith({turns: [turn]});
    const asked = wiring.sendUtterance('hello');
    turn.push(
      event([call('gmail:call-3', {'@call': 'greet', catalogId: GMAIL, args: {name: 'Lin'}})], {
        source: 'gmail',
        role: 'fragment',
      }),
    );
    await vi.waitFor(() => expect(answers()).toHaveLength(1));
    expect(answers()[0]!.data).toEqual({
      version: '1.0',
      rendererFunctionResponse: {functionCallId: 'gmail:call-3', value: 'Hello, Lin'},
    });
    turn.end();
    await asked;
  });

  it('behind a held batch waits its turn, its catalog loaded first', async () => {
    let release!: () => void;
    const turn = script();
    const {wiring, answers} = canvasWith({
      turns: [turn],
      load: () =>
        new Promise(resolve => {
          release = () => resolve(gmailBuild());
        }),
    });
    const asked = wiring.sendUtterance('what needs my attention');
    turn.push(
      event(LAYOUT, {source: 'shell', role: 'shell'}),
      event(fragment('gmail:inbox', 'Ada'), {source: 'gmail', role: 'fragment'}),
      event([greetCall('gmail:call-4', 'gmail:inbox')], {source: 'gmail', role: 'fragment'}),
    );
    await vi.waitFor(() => expect(release).toBeDefined());
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(answers()).toEqual([]);
    release();
    await vi.waitFor(() => expect(answers()).toHaveLength(1));
    expect(answers()[0]!.data).toMatchObject({
      rendererFunctionResponse: {functionCallId: 'gmail:call-4', value: 'Hello, Ada'},
    });
    turn.end();
    await asked;
  });

  it('whose catalog cannot load is answered with the release’s error, the slot untouched', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const turn = script();
    const {wiring, answers, sent} = canvasWith({
      turns: [turn],
      load: () => Promise.reject(new Error('the entry threw')),
    });
    const asked = wiring.sendUtterance('what needs my attention');
    turn.push(
      event(LAYOUT, {source: 'shell', role: 'shell'}),
      event([greetCall('gmail:call-5')], {source: 'gmail', role: 'fragment'}),
    );
    await vi.waitFor(() => expect(answers()).toHaveLength(1));
    expect(answers()[0]!.data).toEqual({
      version: '1.0',
      rendererFunctionResponse: {
        functionCallId: 'gmail:call-5',
        error: {code: 'INVALID_FUNCTION_CALL', message: `Catalog not found: ${GMAIL}`},
      },
    });
    // Nothing reported against the slot: no error part was sent.
    const errors = sent.flatMap(p => p.message!.parts.flatMap(part => dataOf(part)?.error ?? []));
    expect(errors).toEqual([]);
    const runtime = wiring.viewed()!;
    expect(runtime.store.getState().slotStates.get('gmail')).not.toBe('failed');
    turn.end();
    await asked;
  });

  it('is never the person’s gesture: openUrl and a function needing one are refused, nothing opened', async () => {
    const opened = vi.spyOn(window, 'open').mockImplementation(() => null);
    const turn = script();
    const {wiring, answers} = canvasWith({turns: [turn]});
    const asked = wiring.sendUtterance('open it');
    turn.push(
      event(fragment('gmail:inbox', 'Ada'), {source: 'gmail', role: 'fragment'}),
      event(
        [
          call(
            'gmail:call-6',
            {'@call': 'openUrl', catalogId: BASIC_CATALOG_ID, args: {url: 'https://example.test'}},
            'gmail:inbox',
          ),
          call('gmail:call-7', {'@call': 'launch', catalogId: GMAIL, args: {}}, 'gmail:inbox'),
        ],
        {source: 'gmail', role: 'fragment'},
      ),
    );
    await vi.waitFor(() => expect(answers()).toHaveLength(2));
    const [openUrl, gesture] = answers().map(
      a =>
        (a.data.rendererFunctionResponse as {functionCallId: string; error?: {message: string}})!,
    );
    expect(openUrl!.functionCallId).toBe('gmail:call-6');
    expect(openUrl!.error).toBeDefined();
    expect(gesture!.functionCallId).toBe('gmail:call-7');
    expect(gesture!.error?.message).toMatch(/requires user activation/);
    expect(opened).not.toHaveBeenCalled();
    turn.end();
    await asked;
  });

  it('is answered while a press runs on its source, beside the press', async () => {
    const press = script();
    const turn = script();
    const {wiring, answers} = canvasWith({
      turns: [turn],
      beside: params => {
        const data = dataOf(params.message!.parts[0]!);
        return data && 'operation' in data ? press.stream() : undefined;
      },
    });
    const asked = wiring.sendUtterance('what needs my attention');
    turn.push(
      event(LAYOUT, {source: 'shell', role: 'shell'}),
      event(fragment('gmail:inbox', 'Ada'), {source: 'gmail', role: 'fragment'}),
      event([], {source: 'gmail', role: 'fragment', settled: true}),
      event([], {source: 'shell', role: 'shell'}, true),
    );
    turn.end();
    await asked;
    const runtime = wiring.viewed()!;
    // The reader's Retry on Gmail, its stream still open.
    const pressing = runtime.press({kind: 'retry', sources: ['gmail']});
    await vi.waitFor(() => expect(runtime.store.getState().presses).toHaveLength(1));
    press.push(
      event([greetCall('gmail:call-8', 'gmail:inbox')], {source: 'gmail', role: 'fragment'}),
    );
    await vi.waitFor(() => expect(answers()).toHaveLength(1));
    expect(answers()[0]!.data).toMatchObject({
      rendererFunctionResponse: {functionCallId: 'gmail:call-8', value: 'Hello, Ada'},
    });
    expect(runtime.store.getState().presses).toHaveLength(1);
    press.end();
    await pressing;
  });
});

describe('a component’s agent function call', () => {
  it('is sent on as the release emits it', async () => {
    const turn = script();
    const {wiring, answers} = canvasWith({turns: [turn]});
    const asked = wiring.sendUtterance('show me Ada');
    turn.push(
      event(fragment('gmail:inbox', 'Ada'), {source: 'gmail', role: 'fragment'}),
      event([], undefined, true),
    );
    turn.end();
    await asked;
    const runtime = wiring.viewed()!;
    // The hub refuses it and the release times it out; what matters here is that it was sent on.
    void runtime.processor
      .callAgentFunction(
        'gmail:inbox',
        {'@call': 'lookUp', args: {}},
        {functionCallId: 'call-9', timeoutMs: 50},
      )
      .catch(() => {});
    await vi.waitFor(() => expect(answers()).toHaveLength(1));
    expect(answers()[0]).toEqual({
      data: {
        version: '1.0',
        callAgentFunction: {
          surfaceId: 'gmail:inbox',
          functionCallId: 'call-9',
          callFunction: {'@call': 'lookUp', args: {}},
        },
      },
      contextId: 'ctx-1',
    });
  });
});
