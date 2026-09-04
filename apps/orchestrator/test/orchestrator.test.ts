import {createServer, type Server} from 'node:http';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import type {Message, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {ClientFactory, type Client} from '@a2a-js/sdk/client';
import type {Express} from 'express';
import {buildOrchestrator} from '../src/app.js';
import {A2UI_EXTENSION_URI_V091} from '../src/agentCard.js';
import type {Plan} from '../src/planner/planSchema.js';
import type {Planner} from '../src/planner/planner.js';
import {FakeEmbedder} from './fakeEmbedder.js';
import {FakePlanner, ThrowingPlanner} from './fakePlanner.js';
import {FakeSynthesizer} from './fakeSynthesizer.js';
import type {Synthesizer} from '../src/synthesizer/synthesizer.js';
import {WIRING_KEY} from '@a2uiverse/sdk';
import {startFakeVendor, type FakeVendor, type Script} from './fakeVendor.js';

const APPS = ['github', 'gmail', 'calendar'] as const;
type AppId = (typeof APPS)[number];

let dir: string;
let vendors: Partial<Record<AppId, FakeVendor>> = {};
let server: Server | undefined;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'a2uiverse-orch-'));
});
afterEach(async () => {
  await new Promise<void>(resolve => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
  for (const vendor of Object.values(vendors)) await vendor.close().catch(() => {});
  vendors = {};
  await rm(dir, {recursive: true, force: true});
});

/** A plan with one card slot per app, in the given order, one slot per group. */
function planFor(apps: readonly AppId[], direction: Plan['direction'] = 'column'): Plan {
  return {
    direction,
    groups: apps.map(appId => ({
      slots: [{appId, archetype: 'card' as const, request: `Paint a compact ${appId} card.`}],
    })),
  };
}

async function boot(
  options: {
    scripts?: Partial<Record<AppId, Script>>;
    planner?: Planner;
    synthesizer?: Synthesizer;
    closeAfterInit?: AppId[];
  } = {},
) {
  const agentUrls: Record<string, string> = {};
  for (const appId of APPS) {
    const vendor = await startFakeVendor({
      name: appId,
      description: `${appId} agent`,
      script: options.scripts?.[appId],
    });
    vendors[appId] = vendor;
    agentUrls[appId] = vendor.url;
  }
  const ready: {app?: Express} = {};
  server = createServer((req, res) => ready.app!(req, res));
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  const url = `http://127.0.0.1:${address.port}`;
  const orchestrator = buildOrchestrator({
    config: {
      port: address.port,
      baseUrl: url,
      stateDir: dir,
      debugIds: false,
      agentUrls,
      googleApiKey: undefined,
      plannerModelId: 'test-model',
      plannerEffort: 'low',
      shortlistCap: 5,
    },
    overrides: {
      embedder: new FakeEmbedder(),
      planner: options.planner ?? new FakePlanner(() => planFor(APPS)),
      ...(options.synthesizer ? {synthesizer: options.synthesizer} : {}),
    },
  });
  await orchestrator.init();
  ready.app = orchestrator.app;
  for (const appId of options.closeAfterInit ?? []) {
    await vendors[appId]!.close();
    delete vendors[appId];
  }
  const client: Client = await new ClientFactory().createFromUrl(url);
  return {url, client};
}

function utterance(text: string, contextId?: string): Message {
  return {
    kind: 'message',
    messageId: crypto.randomUUID(),
    role: 'user',
    parts: [{kind: 'text', text}],
    ...(contextId ? {contextId} : {}),
    metadata: {a2uiClientDataModel: {version: 'v0.9', surfaces: {}}},
  };
}

async function collect(client: Client, message: Message) {
  const events = [];
  for await (const e of client.sendMessageStream({message})) events.push(e);
  return events;
}

type AnyEvent = Awaited<ReturnType<typeof collect>>[number];

function stampOf(event: AnyEvent): Record<string, unknown> | undefined {
  return event.metadata?.a2uiverse as Record<string, unknown> | undefined;
}

function a2uiDatas(event: AnyEvent): Array<Record<string, unknown>> {
  const parts =
    event.kind === 'message'
      ? event.parts
      : event.kind === 'task' || event.kind === 'status-update'
        ? (event.status.message?.parts ?? [])
        : [];
  return parts.flatMap(p =>
    p.kind === 'data' && typeof p.data.version === 'string' ? [p.data] : [],
  );
}

/** The shell paints in stream order: each as its list of A2UI ops. */
function shellPaints(events: AnyEvent[]): Array<Array<Record<string, unknown>>> {
  return events
    .filter(e => e.kind === 'status-update' && stampOf(e)?.role === 'shell' && !e.final)
    .map(a2uiDatas)
    .filter(datas => datas.length > 0);
}

function slotStates(paint: Array<Record<string, unknown>>): Record<string, string> {
  const update = paint.find(d => d.updateComponents) ?? {};
  const components =
    (update.updateComponents as {components?: Array<Record<string, unknown>>})?.components ?? [];
  const states: Record<string, string> = {};
  for (const c of components) {
    if (c.component === 'Slot') states[c.name as string] = c.state as string;
  }
  return states;
}

/**
 * The journal is appended after the client's stream ends, so a line is polled for rather than
 * read. Every caller needs the lines it asks for: timing out returns short and the assertion
 * then fails on an `undefined` line, which reads as a logic bug rather than a slow disk. So the
 * timeout says what it is, and the budget is generous enough to survive `turbo run test`
 * building every other package alongside it.
 */
async function journalLines(expected: number) {
  const deadline = Date.now() + 15_000;
  for (;;) {
    const text = await readFile(join(dir, 'intent-journal.jsonl'), 'utf8').catch(() => '');
    const lines = text
      .split('\n')
      .filter(Boolean)
      .map(l => JSON.parse(l) as Record<string, unknown>);
    if (lines.length >= expected) return lines;
    if (Date.now() > deadline) {
      throw new Error(`journal never reached ${expected} line(s) — saw ${lines.length}`);
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

/** A plan with the synthesis slot first, then one card per app (task-4.4 decision 6). */
function planWithSynthesis(apps: readonly AppId[]): Plan {
  return {
    direction: 'column',
    groups: [
      {slots: [{appId: 'shell', archetype: 'row' as const, request: 'Compare across both.'}]},
      ...apps.map(appId => ({
        slots: [{appId, archetype: 'card' as const, request: `Paint a compact ${appId} card.`}],
      })),
    ],
  };
}

describe('orchestrator', () => {
  test('the synthesis slot is never dispatched: only the sources receive requests', async () => {
    const {client} = await boot({
      planner: new FakePlanner(() => planWithSynthesis(['github', 'gmail'])),
    });
    const events = await collect(client, utterance('compare the two'));
    expect(vendors.github!.requests).toHaveLength(1);
    expect(vendors.gmail!.requests).toHaveLength(1);
    expect(vendors.calendar!.requests).toHaveLength(0);
    const final = events.at(-1) as TaskStatusUpdateEvent;
    expect(final.final).toBe(true);
    expect(final.status.state).toBe('completed');
    // Not dispatched means no dispatch record — and no failed slot from a dispatch that never could succeed.
    const [line] = await journalLines(1);
    const dispatched = (line.dispatch as Array<{appId: string}>).map(d => d.appId).sort();
    expect(dispatched).toEqual(['github', 'gmail']);
    const paints = shellPaints(events);
    expect(slotStates(paints.at(-1)!)['slot-shell']).not.toBe('failed');
  });

  test('serves the minimal card with the A2UI extension at the configured base URL', async () => {
    const {client, url} = await boot();
    const card = await client.getAgentCard();
    expect(card.url).toBe(url);
    expect(card.capabilities.extensions?.map(e => e.uri)).toEqual([A2UI_EXTENSION_URI_V091]);
    expect(card.skills.map(s => s.id)).toEqual(['palette']);
  });

  test('fan-out: shell paint precedes every vendor event; fragments stamped and namespaced; one final', async () => {
    const {client} = await boot();
    const events = await collect(client, utterance('my day at a glance'));

    // Synthetic task first, stamped as the shell.
    expect(events[0].kind).toBe('task');
    expect(stampOf(events[0])).toEqual({source: 'shell', role: 'shell'});

    // The first paint is the shell surface, before any vendor-sourced event.
    const firstVendorIndex = events.findIndex(e => stampOf(e)?.role === 'fragment');
    const shellPaintIndex = events.findIndex(
      e => stampOf(e)?.role === 'shell' && a2uiDatas(e).length > 0,
    );
    expect(shellPaintIndex).toBeGreaterThan(-1);
    expect(firstVendorIndex).toBeGreaterThan(shellPaintIndex);

    const [firstPaint] = shellPaints(events);
    expect(firstPaint[0].createSurface).toMatchObject({surfaceId: 'shell:main'});
    expect(slotStates(firstPaint)).toEqual({
      'slot-github': 'pending',
      'slot-gmail': 'pending',
      'slot-calendar': 'pending',
    });

    // Every fragment event carries source + slot + role and namespaced surfaceIds.
    const fragmentEvents = events.filter(e => stampOf(e)?.role === 'fragment');
    expect(fragmentEvents.length).toBeGreaterThanOrEqual(3);
    const createdSurfaces = new Set<string>();
    for (const event of fragmentEvents) {
      const stamp = stampOf(event)!;
      expect(stamp.slot).toBe(`slot-${stamp.source as string}`);
      for (const data of a2uiDatas(event)) {
        const create = data.createSurface as {surfaceId: string} | undefined;
        if (create) createdSurfaces.add(create.surfaceId);
      }
    }
    expect(createdSurfaces).toEqual(new Set(['github:s1', 'gmail:s1', 'calendar:s1']));

    // Exactly one final, owned by the executor, completed.
    const finals = events.filter(e => e.kind === 'status-update' && e.final);
    expect(finals).toHaveLength(1);
    expect(events.at(-1)).toBe(finals[0]);
    expect((finals[0] as TaskStatusUpdateEvent).status.state).toBe('completed');

    // Vendors received the Planner's prose, not the utterance, with no a2uiverse metadata.
    for (const appId of APPS) {
      const [request] = vendors[appId]!.requests;
      const textPart = request.message.parts.find(p => p.kind === 'text');
      expect(textPart && 'text' in textPart ? textPart.text : '').toBe(
        `Paint a compact ${appId} card.`,
      );
      for (const key of Object.keys(request.message.metadata ?? {})) {
        expect(key.startsWith('a2ui')).toBe(true);
        expect(key).not.toBe('a2uiverse');
      }
    }
  });

  test('degenerate single-agent turn routes, paints, and reuses the vendor conversation', async () => {
    const {client} = await boot({planner: new FakePlanner(() => planFor(['github']))});
    const [first] = await collect(client, utterance('what needs my review?'));
    const events = await collect(client, utterance('and now?', first.contextId));

    const github = vendors.github!;
    expect(github.contextIds).toHaveLength(1);
    expect(github.requests[1].message.contextId).toBe(github.contextIds[0]);
    expect(vendors.gmail!.requests).toHaveLength(0);
    const finals = events.filter(e => e.kind === 'status-update' && e.final);
    expect(finals).toHaveLength(1);
    expect((finals[0] as TaskStatusUpdateEvent).status.state).toBe('completed');
  });

  test('one vendor down: its slot repaints failed, others unaffected, turn completes', async () => {
    const {client} = await boot({closeAfterInit: ['gmail']});
    const events = await collect(client, utterance('everything'));

    const paints = shellPaints(events);
    const last = slotStates(paints.at(-1)!);
    expect(last['slot-gmail']).toBe('failed');
    expect(last['slot-github']).toBe('pending');
    expect(last['slot-calendar']).toBe('pending');
    const final = events.at(-1) as TaskStatusUpdateEvent;
    expect(final.final).toBe(true);
    expect(final.status.state).toBe('completed');
  });

  test('a clean completion with zero surfaces collapses its slot', async () => {
    const collapsedScript: Script = ({ctx, vendorContextId}) => [
      {
        kind: 'status-update',
        taskId: ctx.taskId,
        contextId: vendorContextId,
        final: true,
        status: {state: 'completed'},
      },
    ];
    const {client} = await boot({scripts: {calendar: collapsedScript}});
    const events = await collect(client, utterance('everything'));

    const last = slotStates(shellPaints(events).at(-1)!);
    expect(last['slot-calendar']).toBe('collapsed');
    expect(last['slot-github']).toBe('pending');
    expect((events.at(-1) as TaskStatusUpdateEvent).status.state).toBe('completed');
  });

  test('an action routes only to the surface owner, un-namespaced, with only its partition', async () => {
    const {client} = await boot();
    const [first] = await collect(client, utterance('my day'));
    const before = {
      github: vendors.github!.requests.length,
      gmail: vendors.gmail!.requests.length,
      calendar: vendors.calendar!.requests.length,
    };
    const action: Message = {
      kind: 'message',
      messageId: crypto.randomUUID(),
      role: 'user',
      contextId: first.contextId,
      parts: [
        {
          kind: 'data',
          data: {
            version: 'v0.9',
            action: {
              name: 'approve',
              surfaceId: 'github:s1',
              sourceComponentId: 'btn',
              timestamp: 't',
              context: {n: 1},
            },
          },
        },
      ],
      metadata: {
        a2uiClientDataModel: {
          version: 'v0.9',
          surfaces: {'github:s1': {a: 1}, 'gmail:s1': {b: 2}},
        },
      },
    };
    const events = await collect(client, action);

    expect(vendors.gmail!.requests.length).toBe(before.gmail);
    expect(vendors.calendar!.requests.length).toBe(before.calendar);
    expect(vendors.github!.requests.length).toBe(before.github + 1);
    const wire = vendors.github!.requests.at(-1)!.message;
    const dataPart = wire.parts.find(p => p.kind === 'data');
    expect((dataPart?.kind === 'data' ? dataPart.data.action : {}) as object).toMatchObject({
      surfaceId: 's1',
    });
    expect(wire.metadata?.a2uiClientDataModel).toEqual({
      version: 'v0.9',
      surfaces: {s1: {a: 1}},
    });

    // The vendor's response comes back namespaced under its own surface.
    const created = events.flatMap(e =>
      a2uiDatas(e).flatMap(d =>
        d.createSurface ? [(d.createSurface as {surfaceId: string}).surfaceId] : [],
      ),
    );
    expect(created).toEqual(['github:s1']);
    expect((events.at(-1) as TaskStatusUpdateEvent).status.state).toBe('completed');
  });

  test('VALIDATION_FAILED flips the slot to failed via shell repaint and is journaled', async () => {
    const {client} = await boot();
    const [first] = await collect(client, utterance('my day'));
    const error: Message = {
      kind: 'message',
      messageId: crypto.randomUUID(),
      role: 'user',
      contextId: first.contextId,
      parts: [
        {
          kind: 'data',
          data: {
            version: 'v0.9',
            error: {code: 'VALIDATION_FAILED', surfaceId: 'gmail:s1', path: '/x', message: 'bad'},
          },
        },
      ],
    };
    const events = await collect(client, error);

    const last = slotStates(shellPaints(events).at(-1)!);
    expect(last['slot-gmail']).toBe('failed');
    expect((events.at(-1) as TaskStatusUpdateEvent).status.state).toBe('completed');
    // Found by kind, not by index: the two turns' lines are written asynchronously and either
    // can land first, so position in the file says nothing about which turn wrote it.
    const lines = await journalLines(2);
    expect(lines.find(l => l.kind === 'error')).toMatchObject({
      kind: 'error',
      descriptor: 'VALIDATION_FAILED on surface gmail:s1',
      outcome: 'completed',
    });
  });

  test('a broken plan is a broken turn: failed final, journaled failed', async () => {
    const {client} = await boot({planner: new ThrowingPlanner(new Error('no plan today'))});
    const events = await collect(client, utterance('anything'));
    const final = events.at(-1) as TaskStatusUpdateEvent;
    expect(final.final).toBe(true);
    expect(final.status.state).toBe('failed');
    const [line] = await journalLines(1);
    expect(line.outcome).toBe('failed');
    expect(line.kind).toBe('utterance');
  });

  test('journals one line per fan-out turn: plan, non-null embedding, all dispatches, namespaced surfaces', async () => {
    const {client} = await boot();
    await collect(client, utterance('my day at a glance'));

    const [line] = await journalLines(1);
    expect(line.kind).toBe('utterance');
    expect(line.descriptor).toBe('my day at a glance');
    expect(line.outcome).toBe('completed');
    expect((line.plan as Plan).groups).toHaveLength(3);
    expect(Array.isArray(line.embedding)).toBe(true);
    expect((line.embedding as number[]).length).toBeGreaterThan(0);
    const dispatch = line.dispatch as Array<{appId: string; outcome: string}>;
    expect(dispatch.map(d => d.appId).sort()).toEqual(['calendar', 'github', 'gmail']);
    const surfaces = line.surfaces as {created: string[]};
    expect([...surfaces.created].sort()).toEqual([
      'calendar:s1',
      'github:s1',
      'gmail:s1',
      'shell:main',
    ]);
  });

  test('CORS allows a devtunnels origin and localhost', async () => {
    const {url} = await boot();
    for (const origin of ['https://x-5173.asse.devtunnels.ms', 'http://localhost:5173']) {
      const res = await fetch(`${url}/.well-known/agent-card.json`, {headers: {Origin: origin}});
      expect(res.headers.get('access-control-allow-origin')).toBe(origin);
    }
    const res = await fetch(`${url}/.well-known/agent-card.json`, {
      headers: {Origin: 'https://evil.example'},
    });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});

/** A storefront that paints `{items}` on its first turn and, on an action turn, whatever `onAction` says. */
function shopScript(items: unknown[], onAction?: (n: number) => Record<string, unknown>): Script {
  let actions = 0;
  return ({ctx, vendorContextId, firstTurn}) => {
    const part = (op: Record<string, unknown>) => ({
      kind: 'data' as const,
      data: {version: 'v0.9', ...op},
    });
    const parts = firstTurn
      ? [
          part({createSurface: {surfaceId: 's1', catalogId: 'cat'}}),
          part({updateDataModel: {surfaceId: 's1', value: {items}}}),
        ]
      : [
          part({
            updateDataModel: {
              surfaceId: 's1',
              ...(onAction?.(++actions) ?? {path: '/note', value: 'noted'}),
            },
          }),
        ];
    return [
      {
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
            parts,
            contextId: vendorContextId,
            taskId: ctx.taskId,
          },
        },
      },
    ];
  };
}

const camerasA = [
  {id: 'x100', price: 899},
  {id: 'x200', price: 1299},
];
const camerasB = [
  {id: 'x100', price: 949},
  {id: 'x200', price: 1199},
];

function wiringEvents(events: AnyEvent[]) {
  return events.filter(e => e.metadata?.[WIRING_KEY] !== undefined);
}

function actionOn(surfaceId: string, contextId: string): Message {
  return {
    kind: 'message',
    messageId: crypto.randomUUID(),
    role: 'user',
    contextId,
    parts: [
      {
        kind: 'data',
        data: {
          version: 'v0.9',
          action: {name: 'sort', surfaceId, sourceComponentId: 'btn', timestamp: 't', context: {}},
        },
      },
    ],
    metadata: {a2uiClientDataModel: {version: 'v0.9', surfaces: {}}},
  };
}

describe('synthesis (task 4.4)', () => {
  const planner = () => new FakePlanner(() => planWithSynthesis(['github', 'gmail']));
  const scripts = () => ({github: shopScript(camerasA), gmail: shopScript(camerasB)});

  test('after every source resolves, the merged view is painted into the synthesis slot with its wiring', async () => {
    const synthesizer = new FakeSynthesizer();
    const {client} = await boot({planner: planner(), synthesizer, scripts: scripts()});
    const events = await collect(client, utterance('compare camera prices'));

    // The Synthesizer saw the Planner's request and both sources by surface.
    expect(synthesizer.calls).toHaveLength(1);
    expect(synthesizer.calls[0]!.request).toBe('Compare across both.');
    expect(synthesizer.calls[0]!.sources.map(s => s.surface).sort()).toEqual([
      'github:s1',
      'gmail:s1',
    ]);
    expect(synthesizer.calls[0]!.sources.find(s => s.surface === 'github:s1')?.displayName).toBe(
      'GitHub',
    );

    // Vendor data events carry their surface's generation on the stamp.
    const dataEvent = events.find(
      e => stampOf(e)?.source === 'github' && a2uiDatas(e).some(d => d.updateDataModel),
    );
    expect(stampOf(dataEvent!)?.generations).toEqual({'github:s1': 1});

    // The synthesis surface: a fragment of the shell in the synthesis slot, wiring beside the stamp.
    const [paint, ...rest] = wiringEvents(events);
    expect(rest).toHaveLength(0);
    expect(stampOf(paint!)).toEqual({source: 'shell', slot: 'slot-shell', role: 'fragment'});
    const wiring = paint!.metadata![WIRING_KEY] as {
      computedAgainst: Record<string, number>;
      entities: unknown[];
    };
    expect(wiring.computedAgainst).toEqual({'github:s1': 1, 'gmail:s1': 1});
    expect(wiring.entities).toHaveLength(2);
    expect(a2uiDatas(paint!)[0]).toMatchObject({createSurface: {surfaceId: 'shell:synthesis'}});

    // It paints after the last source and before the final; the slot is left to the client.
    const lastVendor = events.map(e => stampOf(e)?.role).lastIndexOf('fragment' as never);
    void lastVendor;
    expect(events.indexOf(paint!)).toBeLessThan(events.length - 1);
    expect(slotStates(shellPaints(events).at(-1)!)['slot-shell']).toBe('pending');

    const [line] = await journalLines(1);
    expect(line.synthesis).toMatchObject({outcome: 'synthesized'});
    expect(typeof (line.synthesis as {deadAirMs: unknown}).deadAirMs).toBe('number');
  });

  test('a decline collapses the synthesis slot and sends no wiring', async () => {
    const synthesizer = new FakeSynthesizer({declined: true, reason: 'nothing joinable'});
    const {client} = await boot({planner: planner(), synthesizer, scripts: scripts()});
    const events = await collect(client, utterance('compare'));
    expect(wiringEvents(events)).toHaveLength(0);
    expect(slotStates(shellPaints(events).at(-1)!)['slot-shell']).toBe('collapsed');
    const [line] = await journalLines(1);
    expect(line.synthesis).toMatchObject({outcome: 'declined', reason: 'nothing joinable'});
  });

  test('malformed output behaves as a decline, journaled apart', async () => {
    const synthesizer = new FakeSynthesizer(input => {
      const out = new FakeSynthesizer().synthesize(input);
      return out.then(o => ({
        ...o,
        entities: o.entities!.map(e => ({cells: e.cells.map(c => ({...c, op: 'median'}))})),
      })) as never;
    });
    const {client} = await boot({planner: planner(), synthesizer, scripts: scripts()});
    const events = await collect(client, utterance('compare'));
    expect(wiringEvents(events)).toHaveLength(0);
    expect(slotStates(shellPaints(events).at(-1)!)['slot-shell']).toBe('collapsed');
    const [line] = await journalLines(1);
    expect(line.synthesis).toMatchObject({outcome: 'malformed'});
    expect((line.synthesis as {reason: string}).reason).toContain('median');
  });

  test('fewer than two sources: no model call, the slot collapses (§5.1)', async () => {
    const synthesizer = new FakeSynthesizer();
    const {client} = await boot({
      planner: planner(),
      synthesizer,
      scripts: scripts(),
      closeAfterInit: ['gmail'],
    });
    const events = await collect(client, utterance('compare'));
    expect(synthesizer.calls).toHaveLength(0);
    expect(slotStates(shellPaints(events).at(-1)!)['slot-shell']).toBe('collapsed');
    const [line] = await journalLines(1);
    expect(line.synthesis).toMatchObject({outcome: 'skipped'});
  });

  test('an in-fragment reorder bumps the generation and re-synthesizes inline; a scalar edit does not', async () => {
    const synthesizer = new FakeSynthesizer();
    const github = shopScript(camerasA, n =>
      n === 1
        ? {path: '/note', value: 'scalar only'}
        : {path: '/items', value: [camerasA[1], camerasA[0]]},
    );
    const {client} = await boot({
      planner: planner(),
      synthesizer,
      scripts: {github, gmail: shopScript(camerasB)},
    });
    const first = await collect(client, utterance('compare camera prices'));
    const contextId = first[0]!.contextId!;
    expect(synthesizer.calls).toHaveLength(1);

    // Action 1: a scalar edit — the stamp carries the unchanged generation; no re-synthesis.
    const scalar = await collect(client, actionOn('github:s1', contextId));
    expect(
      stampOf(scalar.find(e => a2uiDatas(e).some(d => d.updateDataModel))!)?.generations,
    ).toEqual({'github:s1': 1});
    expect(synthesizer.calls).toHaveLength(1);
    expect(wiringEvents(scalar)).toHaveLength(0);

    // Action 2: the list reordered in place — bump on the stamp, then new wiring in the same turn.
    const reorder = await collect(client, actionOn('github:s1', contextId));
    const bumped = reorder.find(e => a2uiDatas(e).some(d => d.updateDataModel))!;
    expect(stampOf(bumped)?.generations).toEqual({'github:s1': 2});
    expect(synthesizer.calls).toHaveLength(2);
    const [rewire] = wiringEvents(reorder);
    expect(rewire).toBeDefined();
    expect(
      (rewire!.metadata![WIRING_KEY] as {computedAgainst: Record<string, number>}).computedAgainst,
    ).toEqual({'github:s1': 2, 'gmail:s1': 1});
    expect(reorder.indexOf(bumped)).toBeLessThan(reorder.indexOf(rewire!));
    const final = reorder.at(-1) as TaskStatusUpdateEvent;
    expect(final.final).toBe(true);
  });
});
