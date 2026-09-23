import {createServer, type Server} from 'node:http';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import type {Message, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {ClientFactory, type Client} from '@a2a-js/sdk/client';
import type {Express} from 'express';
import {buildOrchestrator} from '../src/app.js';
import {A2UI_EXTENSION_URI_V091} from '../src/agentCard.js';
import type {PlanRecord} from '../src/journal/types.js';
import type {LayoutSurface} from '../src/planner/document.js';
import type {Planner} from '../src/planner/planner.js';
import {FakeEmbedder} from './fakeEmbedder.js';
import {FakePlanner, layoutFor, MalformedPlanner, ThrowingPlanner} from './fakePlanner.js';
import {bestPriceView, decline, FakeSynthesizer, HeldSynthesizer} from './fakeSynthesizer.js';
import {defaultEntries} from '../src/registry/entries.js';
import type {SynthesisCall, SynthesisModel} from '../src/synthesizer/synthesizer.js';
import {SYNTHESIS_KEY, type SynthesisPayload} from '@a2uiverse/sdk';
import type {Synthesis} from '../src/synthesizer/document.js';
import {startFakeVendor, type FakeVendor, type Script} from './fakeVendor.js';
import type {FaultMap} from '../src/agentsPool/faults.js';

const APPS = ['github', 'gmail', 'calendar'] as const;
type AppId = (typeof APPS)[number];

let dir: string;
let vendors: Partial<Record<AppId, FakeVendor>> = {};
let server: Server | undefined;
/** Every gate a test made, opened at teardown so a failed test leaves no press hanging. */
let gates: Array<() => void> = [];

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'a2uiverse-orch-'));
});
afterEach(async () => {
  for (const open of gates) open();
  gates = [];
  await new Promise<void>(resolve => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
  for (const vendor of Object.values(vendors)) await vendor.close().catch(() => {});
  vendors = {};
  await rm(dir, {recursive: true, force: true});
});

/** A layout with one slot per app, in the given order, stacked in a column. */
const planFor = (apps: readonly AppId[]): LayoutSurface => layoutFor(apps);

async function boot(
  options: {
    scripts?: Partial<Record<AppId, Script>>;
    planner?: Planner;
    synthesizer?: SynthesisModel;
    closeAfterInit?: AppId[];
    softDeadlineMs?: number;
    hardCapMs?: number;
    faults?: FaultMap;
  } = {},
) {
  // Every hardcoded entry the test does not fake is pointed at a port nothing listens on: left
  // at its default, it answers its card whenever a dev bed is up on this machine, and the
  // shortlist — and so the test — changes with what else is running (task-7.9).
  const agentUrls: Record<string, string> = Object.fromEntries(
    defaultEntries().map(entry => [entry.id, 'http://127.0.0.1:1']),
  );
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
      synthesizerModelId: 'test-model',
      synthesizerEffort: 'low',
      softDeadlineMs: options.softDeadlineMs ?? 10_000,
      hardCapMs: options.hardCapMs ?? 300_000,
      faults: options.faults ?? new Map(),
      agentsDir: undefined,
    },
    overrides: {
      embedder: new FakeEmbedder(),
      planner: options.planner ?? new FakePlanner(() => planFor(APPS)),
      ...(options.synthesizer ? {synthesisModel: options.synthesizer} : {}),
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
    if (c.component === 'Slot') states[c.source as string] = c.state as string;
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

/** A layout with the synthesis slot first, then one slot per app (task-4.4 decision 6). */
const planWithSynthesis = (apps: readonly AppId[]): LayoutSurface =>
  layoutFor(apps, {merged: 'Compare across both.'});

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
    expect(slotStates(paints.at(-1)!)['shell']).not.toBe('failed');
  });

  test('logs one line per inbound request and one when the turn closes, with kind, task, size and outcome (task 5.7)', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const {client} = await boot();
      const events = await collect(client, utterance('my day at a glance'));
      const taskId = (events[0] as {id: string}).id;
      // The client's stream ends on the final status; the closing line lands a tick later.
      await new Promise(resolve => setTimeout(resolve, 100));
      const lines = log.mock.calls.map(c => String(c[0]));
      expect(lines.some(l => l.includes(`← utterance task=${taskId}`) && /\d+ bytes/.test(l))).toBe(
        true,
      );
      expect(
        lines.some(l => l.includes(`✓ utterance task=${taskId} completed`) && /\d+ ms/.test(l)),
      ).toBe(true);
    } finally {
      log.mockRestore();
    }
  });

  test('serves the card with the A2UI extension and the platform’s skills at the configured base URL', async () => {
    const {client, url} = await boot();
    const card = await client.getAgentCard();
    expect(card.url).toBe(url);
    expect(card.capabilities.extensions?.map(e => e.uri)).toEqual([A2UI_EXTENSION_URI_V091]);
    expect(card.skills.map(s => s.id)).toEqual([
      'palette',
      'platform',
      'canvas',
      'installed-apps',
      'find-and-install',
    ]);
  });

  test('the Planner is handed the conversation and a shortlist carrying the platform’s card (phase-6 decision 1)', async () => {
    const planner = new FakePlanner();
    const {client} = await boot({planner});
    const [first] = await collect(client, utterance('what apps do I have?'));
    expect(planner.calls).toHaveLength(1);
    expect(planner.calls[0]!.conversationId).toBe(first.contextId);
    const ids = planner.calls[0]!.shortlist.map(e => e.record.id).sort();
    expect(ids).toEqual(['calendar', 'github', 'gmail', 'shell']);
    const shell = planner.calls[0]!.shortlist.find(e => e.record.id === 'shell')!;
    expect(shell.card.skills.map(s => s.id)).toContain('installed-apps');
    expect(shell.record.catalogPackage).toBe('@a2uiverse/shell-catalog');
  });

  test('a message received twice runs once: the second is refused, nothing dispatched again (task-7.9)', async () => {
    // The client re-sends a request that got no answer through the tunnel, under the same
    // message id. Were the first only slow, a second run would repeat a vendor's write.
    const planner = new FakePlanner();
    const {client} = await boot({planner});
    const message = utterance('what apps do I have?');
    const first = await collect(client, message);
    expect((first.at(-1) as TaskStatusUpdateEvent).status.state).toBe('completed');
    expect(planner.calls).toHaveLength(1);

    const second = await collect(client, {...message, contextId: first[0]!.contextId!});
    const final = second.at(-1) as TaskStatusUpdateEvent;
    expect(final.final).toBe(true);
    expect(final.status.state).toBe('failed');
    expect(planner.calls).toHaveLength(1);
    expect(await journalLines(1)).toHaveLength(1);
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
      github: 'pending',
      gmail: 'pending',
      calendar: 'pending',
    });
    // Every vendor slot is wrapped in an Attribution holding it as child (task-6.4 decision 3).
    const painted = (
      firstPaint.find(d => d.updateComponents)!.updateComponents as {
        components: Array<Record<string, unknown>>;
      }
    ).components;
    for (const appId of APPS) {
      expect(painted).toContainEqual({
        id: `attribution-slot-${appId}`,
        component: 'Attribution',
        displayName: expect.any(String),
        appId,
        child: `slot-${appId}`,
      });
    }
    expect(painted.find(c => c.id === 'root')!.children).toEqual(
      APPS.map(appId => `attribution-slot-${appId}`),
    );

    // Every fragment event carries source + role, no slot, and namespaced surfaceIds.
    const fragmentEvents = events.filter(e => stampOf(e)?.role === 'fragment');
    expect(fragmentEvents.length).toBeGreaterThanOrEqual(3);
    const createdSurfaces = new Set<string>();
    for (const event of fragmentEvents) {
      const stamp = stampOf(event)!;
      expect(stamp).not.toHaveProperty('slot');
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
    expect(last['gmail']).toBe('failed');
    expect(last['github']).toBe('pending');
    expect(last['calendar']).toBe('pending');
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
    expect(last['calendar']).toBe('collapsed');
    expect(last['github']).toBe('pending');
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

  test('a shell action on the shell surface is journaled and nothing else: no dispatch, no paint (task-6.5 decisions 5–6)', async () => {
    const {client} = await boot();
    const [first] = await collect(client, utterance('my day'));
    const before = Object.fromEntries(APPS.map(appId => [appId, vendors[appId]!.requests.length]));
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
              name: 'openStore',
              surfaceId: 'shell:main',
              sourceComponentId: 'gap-flight',
              timestamp: 't',
              context: {query: 'flight booking'},
            },
          },
        },
      ],
    };
    const events = await collect(client, action);

    for (const appId of APPS) expect(vendors[appId]!.requests.length).toBe(before[appId]);
    expect(events.flatMap(a2uiDatas)).toEqual([]);
    expect((events.at(-1) as TaskStatusUpdateEvent).status.state).toBe('completed');
    const lines = await journalLines(2);
    expect(lines.find(l => l.kind === 'action')).toMatchObject({
      kind: 'action',
      descriptor: 'openStore on surface shell:main in shell',
      payload: {query: 'flight booking'},
      dispatch: [],
      outcome: 'completed',
    });
  });

  test('a name outside the shell’s closed action set on the shell surface is a failed turn', async () => {
    const {client} = await boot();
    const [first] = await collect(client, utterance('my day'));
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
              name: 'installApp',
              surfaceId: 'shell:main',
              sourceComponentId: 'x',
              timestamp: 't',
              context: {},
            },
          },
        },
      ],
    };
    const events = await collect(client, action);
    const final = events.at(-1) as TaskStatusUpdateEvent;
    expect(final.status.state).toBe('failed');
    const said = final.status.message?.parts.find(p => p.kind === 'text');
    expect(said && 'text' in said ? said.text : '').toContain('unknown shell action: installApp');
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
    expect(last['gmail']).toBe('failed');
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

  test('both attempts refused is a broken turn: the final names the findings, the journal keeps the attempts (task-6.4 decision 6)', async () => {
    const {client} = await boot({planner: new MalformedPlanner()});
    const events = await collect(client, utterance('anything'));
    const final = events.at(-1) as TaskStatusUpdateEvent;
    expect(final.status.state).toBe('failed');
    const said = final.status.message?.parts.find(p => p.kind === 'text');
    expect(said && 'text' in said ? said.text : '').toContain('refused 2 times');
    expect(said && 'text' in said ? said.text : '').toContain('no <layout-surface> block');
    expect(shellPaints(events)).toHaveLength(0);
    const [line] = await journalLines(1);
    expect(line.outcome).toBe('failed');
    expect(line.plan).toMatchObject({outcome: 'malformed'});
    expect((line.plan as PlanRecord).attempts).toHaveLength(2);
  });

  test('a platform answer dispatches nothing: the data model and tree paint, then the final (phase-6 decision 2)', async () => {
    const answer: LayoutSurface = {
      dispatch: [],
      tree: {
        components: [
          {id: 'root', component: 'Column', children: ['line']},
          {id: 'line', component: 'Text', text: {path: '/answer'}},
        ],
      },
      dataModel: {answer: 'Three apps are installed.'},
    };
    const {client} = await boot({planner: new FakePlanner(answer)});
    const events = await collect(client, utterance('what apps do I have?'));
    for (const appId of APPS) expect(vendors[appId]!.requests).toHaveLength(0);
    expect(events.some(e => stampOf(e)?.role === 'fragment')).toBe(false);
    const [paint, ...rest] = shellPaints(events);
    expect(rest).toHaveLength(0);
    expect(paint!.map(d => Object.keys(d)[1])).toEqual([
      'createSurface',
      'updateDataModel',
      'updateComponents',
    ]);
    expect(paint![1]!.updateDataModel).toEqual({
      surfaceId: 'shell:main',
      value: {answer: 'Three apps are installed.'},
    });
    const final = events.at(-1) as TaskStatusUpdateEvent;
    expect(final.final).toBe(true);
    expect(final.status.state).toBe('completed');
    const [line] = await journalLines(1);
    expect(line.dispatch).toEqual([]);
    expect(line.synthesis).toBeUndefined();
    expect((line.plan as PlanRecord).layoutSurface).toEqual(answer);
  });

  test('a capability gap dispatches nothing and paints the gap slot as authored (phase-6 decision 6)', async () => {
    const {client} = await boot({
      planner: new FakePlanner(layoutFor([], {gaps: ['flight booking']})),
    });
    const events = await collect(client, utterance('book me a flight'));
    for (const appId of APPS) expect(vendors[appId]!.requests).toHaveLength(0);
    const [paint] = shellPaints(events);
    const components = (
      paint!.find(d => d.updateComponents)!.updateComponents as {
        components: Array<Record<string, unknown>>;
      }
    ).components;
    expect(components).toEqual([
      {id: 'root', component: 'Column', children: ['gap-0']},
      {id: 'gap-0', component: 'Slot', gap: 'flight booking'},
    ]);
    expect((events.at(-1) as TaskStatusUpdateEvent).status.state).toBe('completed');
  });

  test('journals one line per fan-out turn: plan, non-null embedding, all dispatches, namespaced surfaces', async () => {
    const {client} = await boot();
    await collect(client, utterance('my day at a glance'));

    const [line] = await journalLines(1);
    expect(line.kind).toBe('utterance');
    expect(line.descriptor).toBe('my day at a glance');
    expect(line.outcome).toBe('completed');
    const plan = line.plan as PlanRecord;
    expect(plan.outcome).toBe('planned');
    expect(plan.layoutSurface!.dispatch).toHaveLength(3);
    expect(plan.attempts).toHaveLength(1);
    expect(plan.toolCalls).toEqual([]);
    expect(plan.planMs).toBeGreaterThanOrEqual(0);
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

function synthesisEvents(events: AnyEvent[]) {
  return events.filter(e => e.metadata?.[SYNTHESIS_KEY] !== undefined);
}

function payloadOf(event: AnyEvent): SynthesisPayload {
  return event.metadata![SYNTHESIS_KEY] as SynthesisPayload;
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

describe('synthesis (tasks 4.4, 5.4)', () => {
  const planner = () => new FakePlanner(() => planWithSynthesis(['github', 'gmail']));
  const scripts = () => ({github: shopScript(camerasA), gmail: shopScript(camerasB)});

  test('after every source resolves, the model-authored view is painted into the synthesis slot with its payload', async () => {
    const synthesizer = new FakeSynthesizer();
    const {client} = await boot({planner: planner(), synthesizer, scripts: scripts()});
    const events = await collect(client, utterance('compare camera prices'));

    // The Synthesizer saw the Planner's request and both sources by surface, in one call.
    expect(synthesizer.calls).toHaveLength(1);
    const {input, prompt} = synthesizer.calls[0]!;
    expect(input.request).toBe('Compare across both.');
    expect(input.sources.map(s => s.surface).sort()).toEqual(['github:s1', 'gmail:s1']);
    expect(input.sources.find(s => s.surface === 'github:s1')?.displayName).toBe('GitHub');
    expect(prompt).toContain('Compare across both.');
    expect(input.previous).toBeUndefined();

    // Vendor data events carry no generations on the stamp.
    const dataEvent = events.find(
      e => stampOf(e)?.source === 'github' && a2uiDatas(e).some(d => d.updateDataModel),
    );
    expect(stampOf(dataEvent!)).not.toHaveProperty('generations');

    // The synthesis surface: a fragment of the shell in the synthesis slot, the tree painted
    // verbatim, the derived model and sorts beside the stamp.
    const [paint, ...rest] = synthesisEvents(events);
    expect(rest).toHaveLength(0);
    expect(stampOf(paint!)).toEqual({source: 'shell', role: 'fragment'});
    const payload = payloadOf(paint!);
    expect(payload.dataModel.rows).toHaveLength(2);
    expect(payload.sorts[0]).toMatchObject({path: '/rows', key: '/best'});
    expect(paint!.metadata!.a2uiverseWiring).toBeUndefined();
    const datas = a2uiDatas(paint!);
    expect(datas[0]).toMatchObject({createSurface: {surfaceId: 'shell:synthesis'}});
    const painted = (datas[1]!.updateComponents as {components: unknown[]}).components;
    expect(painted).toEqual(bestPriceView(synthesizer.calls[0]!).tree.components);

    // It paints after the last source and before the final; the slot is left to the client.
    expect(events.indexOf(paint!)).toBeLessThan(events.length - 1);
    expect(slotStates(shellPaints(events).at(-1)!)['shell']).toBe('pending');

    // The journal: the accepted document, its note, the one attempt, the dead air.
    const [line] = await journalLines(1);
    const synthesis = line.synthesis as {
      outcome: string;
      note: string;
      synthesizeDataModel: Synthesis;
      attempts: {text: string; errors: string[]}[];
      deadAirMs: unknown;
    };
    expect(synthesis.outcome).toBe('synthesized');
    expect(synthesis.note).toBe('');
    expect(synthesis.synthesizeDataModel.tree.components[0]).toMatchObject({id: 'root'});
    expect(synthesis.attempts).toHaveLength(1);
    expect(synthesis.attempts[0]!.text).toContain('<synthesize-data-model>');
    expect(synthesis.attempts[0]!.errors).toEqual([]);
    expect(typeof synthesis.deadAirMs).toBe('number');
  });

  test('a decline collapses the synthesis slot and sends no payload', async () => {
    const synthesizer = new FakeSynthesizer(decline('nothing joinable'));
    const {client} = await boot({planner: planner(), synthesizer, scripts: scripts()});
    const events = await collect(client, utterance('compare'));
    expect(synthesisEvents(events)).toHaveLength(0);
    expect(slotStates(shellPaints(events).at(-1)!)['shell']).toBe('collapsed');
    // The reason reaches the canvas as the shell's words in the synthesis slot, before the collapse.
    const spoken = events.findIndex(
      e =>
        e.kind === 'status-update' &&
        e.status.message?.parts.some(p => p.kind === 'text' && p.text === 'nothing joinable'),
    );
    expect(spoken).toBeGreaterThanOrEqual(0);
    expect(stampOf(events[spoken])).toEqual({
      source: 'shell',
      role: 'fragment',
    });
    const collapsedAt = events.findIndex(
      e => stampOf(e)?.role === 'shell' && slotStates(a2uiDatas(e))['shell'] === 'collapsed',
    );
    expect(collapsedAt).toBeGreaterThan(spoken);
    const [line] = await journalLines(1);
    expect(line.synthesis).toMatchObject({outcome: 'declined', reason: 'nothing joinable'});
    expect((line.synthesis as {attempts: unknown[]}).attempts).toHaveLength(1);
  });

  test('a refused answer is retried once with its errors; the corrected answer paints', async () => {
    const synthesizer = new FakeSynthesizer([
      call => {
        const bad = bestPriceView(call);
        (bad.dataModel.rows as Array<{best: {op: string}}>)[0]!.best.op = 'median';
        return bad;
      },
      bestPriceView,
    ]);
    const {client} = await boot({planner: planner(), synthesizer, scripts: scripts()});
    const events = await collect(client, utterance('compare'));
    expect(synthesizer.calls).toHaveLength(2);
    expect(synthesizer.calls[1]!.prompt).toContain("operator 'median'");
    expect(synthesisEvents(events)).toHaveLength(1);
    const [line] = await journalLines(1);
    const synthesis = line.synthesis as {outcome: string; attempts: {errors: string[]}[]};
    expect(synthesis.outcome).toBe('synthesized');
    expect(synthesis.attempts.map(a => a.errors.length)).toEqual([1, 0]);
  });

  test('malformed after the retry behaves as a decline, journaled apart with both attempts', async () => {
    const synthesizer = new FakeSynthesizer(call => {
      const bad = bestPriceView(call);
      (bad.dataModel.rows as Array<{best: {op: string}}>)[0]!.best.op = 'median';
      return bad;
    });
    const {client} = await boot({planner: planner(), synthesizer, scripts: scripts()});
    const events = await collect(client, utterance('compare'));
    expect(synthesizer.calls).toHaveLength(2);
    expect(synthesisEvents(events)).toHaveLength(0);
    expect(slotStates(shellPaints(events).at(-1)!)['shell']).toBe('collapsed');
    const [line] = await journalLines(1);
    expect(line.synthesis).toMatchObject({outcome: 'malformed'});
    expect((line.synthesis as {reason: string}).reason).toContain('median');
    expect((line.synthesis as {attempts: unknown[]}).attempts).toHaveLength(2);
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
    expect(slotStates(shellPaints(events).at(-1)!)['shell']).toBe('collapsed');
    const [line] = await journalLines(1);
    expect(line.synthesis).toMatchObject({outcome: 'skipped', attempts: []});
  });

  test('a scalar edit and a reorder leave every key resolving — no re-synthesis; a dropped element does', async () => {
    // The property the phase is built on (task-5.10 decision 4): refs select by key, so a
    // repaint that moves elements around re-points nothing. Only a ref that stops resolving
    // — an element that left the list — reopens the merged view.
    const synthesizer = new FakeSynthesizer();
    const github = shopScript(camerasA, n =>
      n === 1
        ? {path: '/note', value: 'scalar only'}
        : n === 2
          ? {path: '/items', value: [camerasA[1], camerasA[0]]}
          : {path: '/items', value: [camerasA[0]]},
    );
    const {client} = await boot({
      planner: planner(),
      synthesizer,
      scripts: {github, gmail: shopScript(camerasB)},
    });
    const first = await collect(client, utterance('compare camera prices'));
    const contextId = first[0]!.contextId!;
    expect(synthesizer.calls).toHaveLength(1);
    const firstDocument = bestPriceView(synthesizer.calls[0]!);

    const scalar = await collect(client, actionOn('github:s1', contextId));
    expect(synthesizer.calls).toHaveLength(1);
    expect(synthesisEvents(scalar)).toHaveLength(0);

    const reorder = await collect(client, actionOn('github:s1', contextId));
    const reordered = reorder.find(e => a2uiDatas(e).some(d => d.updateDataModel))!;
    expect(stampOf(reordered)).not.toHaveProperty('generations');
    expect(synthesizer.calls).toHaveLength(1);
    expect(synthesisEvents(reorder)).toHaveLength(0);

    const drill = await collect(client, actionOn('github:s1', contextId));
    expect(synthesizer.calls).toHaveLength(2);
    const again = synthesizer.calls[1]!;
    expect(again.input.previous).toEqual(firstDocument);
    const gone = (camerasA[1] as {id: string}).id;
    expect(again.input.changes!.absent.map(r => r.pointer)).toEqual([
      `/items[id="${gone}"]/id`,
      `/items[id="${gone}"]/price`,
    ]);
    expect(again.input.changes!.absent.every(r => r.surface === 'github:s1')).toBe(true);
    expect(again.prompt).toContain('The user is looking at your previous view');
    expect(again.prompt).toContain('- these refs no longer resolve:');
    const [repaint] = synthesisEvents(drill);
    expect(repaint).toBeDefined();
    const final = drill.at(-1) as TaskStatusUpdateEvent;
    expect(final.final).toBe(true);
    const lines = await journalLines(4);
    expect(lines[3]!.synthesis).toMatchObject({outcome: 'synthesized'});
  });

  test('a source the view reads nothing from fires a re-synthesis when it paints again, told which (task-7.9)', async () => {
    // The document reads GitHub alone: the other source is dispatched, arrived, and unread.
    const githubOnly = (call: SynthesisCall): Synthesis => {
      const document = bestPriceView(call);
      for (const row of document.dataModel.rows as Array<{best: {args: Array<{surface: string}>}}>)
        row.best.args = row.best.args.filter(ref => ref.surface === 'github:s1');
      return document;
    };
    const synthesizer = new FakeSynthesizer([githubOnly, githubOnly]);
    const gmail = shopScript(camerasB, () => ({path: '/note', value: 'painted again'}));
    const {client} = await boot({
      planner: planner(),
      synthesizer,
      scripts: {github: shopScript(camerasA), gmail},
    });
    const first = await collect(client, utterance('compare camera prices'));
    const contextId = first[0]!.contextId!;
    expect(synthesizer.calls).toHaveLength(1);

    const repainted = await collect(client, actionOn('gmail:s1', contextId));
    expect(synthesizer.calls).toHaveLength(2);
    const again = synthesizer.calls[1]!;
    expect(again.input.changes).toEqual({
      absent: [],
      appeared: [],
      unheld: [],
      repainted: ['gmail:s1'],
    });
    expect(again.prompt).toContain('- these sources painted again, and your view reads nothing');
    expect(synthesisEvents(repainted)).toHaveLength(1);

    // Accepted again over what it now holds: the same paint a second time fires nothing.
    await collect(client, actionOn('gmail:s1', contextId));
    expect(synthesizer.calls).toHaveLength(2);
  });

  test('a fact that stops holding fires nothing; an entry that appears fires a re-synthesis told what appeared (task-7.6 decisions 13–15)', async () => {
    const named = (items: Array<{id: string; price: number}>, name: string) =>
      items.map((item, i) => (i === 0 ? {...item, name} : item));
    const githubItems = named(camerasA, 'Lumen X100');
    const x300 = {id: 'x300', price: 1499};
    const github = shopScript(githubItems, n =>
      n === 1
        ? {path: '/items/0/name', value: 'Verity A7'}
        : {path: '/items', value: [...githubItems, x300]},
    );
    const claimed = (call: SynthesisCall): Synthesis => {
      const document = bestPriceView(call);
      (document.dataModel.rows as Array<Record<string, unknown>>)[0]!.match = {
        'same name': {
          op: 'equal',
          args: [
            {surface: 'github:s1', pointer: '/items[id="x100"]/name'},
            {surface: 'gmail:s1', pointer: '/items[id="x100"]/name'},
          ],
        },
      };
      return document;
    };
    // The re-synthesis leaves the new camera out: the other store does not carry it.
    const synthesizer = new FakeSynthesizer([claimed, call => call.input.previous!]);
    const {client} = await boot({
      planner: planner(),
      synthesizer,
      scripts: {github, gmail: shopScript(named(camerasB, 'Lumen X100'))},
    });
    const first = await collect(client, utterance('compare camera prices'));
    const contextId = first[0]!.contextId!;
    expect(synthesizer.calls).toHaveLength(1);

    // The matched name changes: the client marks the value broken; the orchestrator calls no one.
    const renamed = await collect(client, actionOn('github:s1', contextId));
    expect(synthesizer.calls).toHaveLength(1);
    expect(synthesisEvents(renamed)).toHaveLength(0);

    // A new camera appears in the list the view reads, and the name comes back with it.
    const grown = await collect(client, actionOn('github:s1', contextId));
    expect(synthesizer.calls).toHaveLength(2);
    const again = synthesizer.calls[1]!;
    expect(again.input.changes).toEqual({
      absent: [],
      appeared: [{surface: 'github:s1', pointer: '/items[id="x300"]'}],
      unheld: [],
      repainted: [],
    });
    expect(again.prompt).toContain('- these entries appeared:');
    expect(synthesisEvents(grown)).toHaveLength(1);
    const lines = await journalLines(3);
    expect(lines[2]!.synthesis).toMatchObject({
      outcome: 'synthesized',
      changes: {appeared: [{surface: 'github:s1', pointer: '/items[id="x300"]'}]},
    });

    // Accepted again, the watch now holds x300: the same list repainted fires nothing.
    await collect(client, actionOn('github:s1', contextId));
    expect(synthesizer.calls).toHaveLength(2);
  });
});

/** The Slot components of a shell paint, by source. */
function slotsOf(paint: Array<Record<string, unknown>>): Record<string, Record<string, unknown>> {
  const update = paint.find(d => d.updateComponents) ?? {};
  const components =
    (update.updateComponents as {components?: Array<Record<string, unknown>>})?.components ?? [];
  return Object.fromEntries(
    components.filter(c => c.component === 'Slot').map(c => [c.source as string, c]),
  );
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** The same script, answering only after `ms`; a Task first, so the vendor's task id is known. */
function after(ms: number, script: Script): Script {
  return async function* (s) {
    yield {
      kind: 'task' as const,
      id: s.ctx.taskId,
      contextId: s.vendorContextId,
      status: {state: 'submitted' as const},
    };
    await wait(ms);
    for await (const event of script({...s, firstTurn: true})) {
      if (event.kind !== 'task') yield event;
    }
  };
}

/** A vendor that ends its task failed, with words or without. */
function failing(words?: string): Script {
  return ({ctx, vendorContextId}) => [
    {
      kind: 'status-update',
      taskId: ctx.taskId,
      contextId: vendorContextId,
      final: true,
      status: {
        state: 'failed',
        ...(words
          ? {
              message: {
                kind: 'message' as const,
                messageId: crypto.randomUUID(),
                role: 'agent' as const,
                parts: [{kind: 'text' as const, text: words}],
                contextId: vendorContextId,
                taskId: ctx.taskId,
              },
            }
          : {}),
      },
    },
  ];
}

function textsIn(events: AnyEvent[]): string[] {
  return events.flatMap(e => {
    const parts =
      e.kind === 'message'
        ? e.parts
        : e.kind === 'task' || e.kind === 'status-update'
          ? (e.status.message?.parts ?? [])
          : [];
    return parts.flatMap(p => (p.kind === 'text' ? [p.text] : []));
  });
}

describe('late arrival and failure (task 8.3)', () => {
  const three = ['github', 'gmail', 'calendar'] as const;

  test('the soft deadline releases the synthesis over what arrived; the straggler mounts free inside the turn', async () => {
    const synthesizer = new FakeSynthesizer();
    const {client} = await boot({
      planner: new FakePlanner(() => layoutFor(three, {merged: 'Compare.'})),
      synthesizer,
      scripts: {
        github: shopScript(camerasA),
        gmail: shopScript(camerasB),
        calendar: after(600, shopScript(camerasA)),
      },
      softDeadlineMs: 100,
    });
    const events = await collect(client, utterance('compare'));
    expect(synthesizer.calls).toHaveLength(1);
    expect(synthesizer.calls[0]!.input.sources.map(s => s.appId).sort()).toEqual([
      'github',
      'gmail',
    ]);
    expect(synthesizer.calls[0]!.input.missing).toEqual([
      {appId: 'calendar', displayName: 'Google Calendar', state: 'loading'},
    ]);
    // The merge lands before the straggler; the straggler's fragment still arrives in the turn.
    const merged = events.findIndex(e => e.metadata?.[SYNTHESIS_KEY] !== undefined);
    const late = events.findIndex(
      e => stampOf(e)?.source === 'calendar' && a2uiDatas(e).some(d => d.createSurface),
    );
    expect(merged).toBeGreaterThan(-1);
    expect(late).toBeGreaterThan(merged);
    expect((events.at(-1) as TaskStatusUpdateEvent).final).toBe(true);
    const [line] = await journalLines(1);
    expect(line.synthesis).toMatchObject({
      outcome: 'synthesized',
      release: {by: 'soft-deadline'},
      sources: ['github', 'gmail'],
      missing: [{appId: 'calendar', state: 'loading'}],
    });
    expect(line.deadlines).toEqual({softMs: 100, capMs: 300_000});
  });

  test('under a join the home source is waited for, never on the soft deadline', async () => {
    const synthesizer = new FakeSynthesizer();
    const {client} = await boot({
      planner: new FakePlanner(() =>
        layoutFor(three, {
          merged: 'Join.',
          join: {home: 'calendar', nouns: {github: 'PRs', gmail: 'threads', calendar: 'events'}},
        }),
      ),
      synthesizer,
      scripts: {
        github: shopScript(camerasA),
        gmail: shopScript(camerasB),
        calendar: after(400, shopScript(camerasA)),
      },
      softDeadlineMs: 50,
    });
    await collect(client, utterance('join'));
    expect(synthesizer.calls).toHaveLength(1);
    expect(synthesizer.calls[0]!.input.sources.map(s => s.appId).sort()).toEqual([
      'calendar',
      'github',
      'gmail',
    ]);
    const [line] = await journalLines(1);
    expect(line.synthesis).toMatchObject({release: {by: 'home'}});
  });

  test('the hard cap fails the slot with timeout; the answer past it is held, never relayed', async () => {
    const {client} = await boot({
      planner: new FakePlanner(() => layoutFor(['github', 'gmail'])),
      scripts: {gmail: after(500, shopScript(camerasB))},
      hardCapMs: 150,
    });
    const events = await collect(client, utterance('everything'));
    const gmail = slotsOf(shellPaints(events).at(-1)!)['gmail']!;
    expect(gmail).toMatchObject({state: 'failed', failure: {cause: 'timeout'}});
    expect(
      events.some(e => stampOf(e)?.source === 'gmail' && a2uiDatas(e).some(d => d.createSurface)),
    ).toBe(false);
    // The line closes when the held answer has arrived: it says when.
    const [line] = await journalLines(1);
    const record = (line.dispatch as Array<Record<string, unknown>>).find(
      d => d.appId === 'gmail',
    )!;
    expect(record.cappedAt).toBeDefined();
    expect(record.heldAt).toBeDefined();
    expect(record.outcome).toBe('completed');
  });

  test('a failed vendor’s cause and words ride on its Slot, and nowhere else', async () => {
    const {client} = await boot({
      planner: new FakePlanner(() => layoutFor(['github', 'gmail'])),
      scripts: {gmail: failing('Rate limited — try again in a minute.')},
    });
    const events = await collect(client, utterance('everything'));
    expect(slotsOf(shellPaints(events).at(-1)!)['gmail']).toMatchObject({
      state: 'failed',
      failure: {cause: 'vendor', message: 'Rate limited — try again in a minute.'},
    });
    expect(textsIn(events)).not.toContain('Rate limited — try again in a minute.');
    const [line] = await journalLines(1);
    expect(
      (line.dispatch as Array<Record<string, unknown>>).find(d => d.appId === 'gmail'),
    ).toMatchObject({cause: 'vendor', vendorMessage: 'Rate limited — try again in a minute.'});
  });

  test('a vendor down is unreachable, with no words', async () => {
    const {client} = await boot({closeAfterInit: ['gmail']});
    const events = await collect(client, utterance('everything'));
    const gmail = slotsOf(shellPaints(events).at(-1)!)['gmail']!;
    expect(gmail).toMatchObject({state: 'failed', failure: {cause: 'unreachable'}});
    expect(gmail.failure).not.toHaveProperty('message');
  });

  test('the fault map reaches a vendor failure without the vendor being asked', async () => {
    const {client} = await boot({
      planner: new FakePlanner(() => layoutFor(['github', 'gmail'])),
      faults: new Map([['gmail', {fault: 'fail', message: 'boom'}]]),
    });
    const events = await collect(client, utterance('everything'));
    expect(slotsOf(shellPaints(events).at(-1)!)['gmail']).toMatchObject({
      failure: {cause: 'vendor', message: 'boom'},
    });
    expect(vendors.gmail!.requests).toHaveLength(0);
  });

  test('a failed home source collapses the merge at once, with no call, in the shell’s words', async () => {
    const synthesizer = new FakeSynthesizer();
    const {client} = await boot({
      planner: new FakePlanner(() =>
        layoutFor(three, {
          merged: 'Join.',
          join: {home: 'gmail', nouns: {github: 'PRs', gmail: 'threads', calendar: 'events'}},
        }),
      ),
      synthesizer,
      scripts: {github: shopScript(camerasA), gmail: failing(), calendar: shopScript(camerasB)},
    });
    const events = await collect(client, utterance('join'));
    expect(synthesizer.calls).toHaveLength(0);
    const slots = slotsOf(shellPaints(events).at(-1)!);
    expect(slots['shell']).toMatchObject({
      state: 'collapsed',
      collapse: {cause: 'home', home: 'Gmail threads'},
    });
    expect(slots['gmail']).toMatchObject({state: 'failed', noun: 'Gmail threads'});
    const [line] = await journalLines(1);
    expect(line.synthesis).toMatchObject({outcome: 'home', collapse: 'home', attempts: []});
  });

  test('too few arrivals collapse the merge naming who answered', async () => {
    const {client} = await boot({
      planner: new FakePlanner(() => planWithSynthesis(['github', 'gmail'])),
      scripts: {github: shopScript(camerasA)},
      closeAfterInit: ['gmail'],
    });
    const events = await collect(client, utterance('compare'));
    expect(slotsOf(shellPaints(events).at(-1)!)['shell']).toMatchObject({
      state: 'collapsed',
      collapse: {cause: 'few', answered: ['GitHub']},
    });
  });

  test('a decline paints its reason on the slot; a malformed merge says it couldn’t be made', async () => {
    const scripts = {github: shopScript(camerasA), gmail: shopScript(camerasB)};
    const declined = await boot({
      planner: new FakePlanner(() => planWithSynthesis(['github', 'gmail'])),
      synthesizer: new FakeSynthesizer(decline('No price lines up.')),
      scripts,
    });
    const declinedEvents = await collect(declined.client, utterance('compare'));
    expect(slotsOf(shellPaints(declinedEvents).at(-1)!)['shell']).toMatchObject({
      state: 'collapsed',
      declined: {reason: 'No price lines up.'},
    });
  });

  test('the merge that could not be made collapses to the shell’s line', async () => {
    const {client} = await boot({
      planner: new FakePlanner(() => planWithSynthesis(['github', 'gmail'])),
      synthesizer: new FakeSynthesizer('no block at all'),
      scripts: {github: shopScript(camerasA), gmail: shopScript(camerasB)},
    });
    const events = await collect(client, utterance('compare'));
    expect(slotsOf(shellPaints(events).at(-1)!)['shell']).toMatchObject({
      state: 'collapsed',
      collapse: {cause: 'unmade'},
    });
  });

  test('the column marks and the join nouns are painted from plan time', async () => {
    const {client} = await boot({
      planner: new FakePlanner(() =>
        layoutFor(['github', 'gmail'], {
          merged: 'Join.',
          columns: ['PR', 'Latest mail'],
          columnSources: ['github', 'gmail'],
          join: {home: 'github', nouns: {github: 'PRs', gmail: 'threads'}},
        }),
      ),
      synthesizer: new FakeSynthesizer(decline('x')),
    });
    const events = await collect(client, utterance('join'));
    const first = slotsOf(shellPaints(events)[0]!);
    expect(first['shell']).toMatchObject({
      columns: ['PR', 'Latest mail'],
      columnSources: ['github', 'gmail'],
    });
    expect(first['github']).toMatchObject({noun: 'GitHub PRs'});
    expect(first['gmail']).toMatchObject({noun: 'Gmail threads'});
  });

  test('a new utterance ends the turn before it: cancelled, its vendor told, journaled superseded', async () => {
    const {client} = await boot({
      planner: new FakePlanner(() => layoutFor(['github', 'gmail'])),
      scripts: {gmail: after(1_500, shopScript(camerasB))},
    });
    const contextId = crypto.randomUUID();
    const firstTurn = collect(client, utterance('first', contextId));
    await wait(200);
    await collect(client, utterance('second', contextId));
    const events = await firstTurn;
    expect((events.at(-1) as TaskStatusUpdateEvent).status.state).toBe('canceled');
    for (let i = 0; i < 100 && !vendors.gmail!.methods.includes('tasks/cancel'); i++) {
      await wait(10);
    }
    expect(vendors.gmail!.methods).toContain('tasks/cancel');
    const lines = await journalLines(2);
    expect(lines.find(l => l.superseded)).toMatchObject({outcome: 'cancelled'});
  });

  test('a late arrival stays out of the merge until a press includes it: an unrelated action re-synthesizes nothing', async () => {
    const synthesizer = new FakeSynthesizer();
    const {client} = await boot({
      planner: new FakePlanner(() => layoutFor(three, {merged: 'Compare.'})),
      synthesizer,
      scripts: {
        github: shopScript(camerasA),
        gmail: shopScript(camerasB),
        calendar: after(300, shopScript(camerasA)),
      },
      softDeadlineMs: 50,
    });
    const events = await collect(client, utterance('compare'));
    expect(synthesizer.calls).toHaveLength(1);
    await collect(client, actionOn('github:s1', events[0]!.contextId!));
    expect(synthesizer.calls).toHaveLength(1);
  });

  test('a paint the client could not draw fails its slot invalid; a home source’s takes the merge down', async () => {
    const synthesizer = new FakeSynthesizer();
    const {client} = await boot({
      planner: new FakePlanner(() =>
        layoutFor(['github', 'gmail'], {
          merged: 'Join.',
          join: {home: 'github', nouns: {github: 'PRs', gmail: 'threads'}},
        }),
      ),
      synthesizer,
      scripts: {github: shopScript(camerasA), gmail: shopScript(camerasB)},
    });
    const [first] = await collect(client, utterance('join'));
    const report = (surfaceId: string): Message => ({
      kind: 'message',
      messageId: crypto.randomUUID(),
      role: 'user',
      contextId: first!.contextId,
      parts: [
        {
          kind: 'data',
          data: {
            version: 'v0.9',
            error: {code: 'VALIDATION_FAILED', surfaceId, path: '/', message: 'bad'},
          },
        },
      ],
    });
    const events = await collect(client, report('github:s1'));
    const slots = slotsOf(shellPaints(events).at(-1)!);
    expect(slots['github']).toMatchObject({state: 'failed', failure: {cause: 'invalid'}});
    expect(slots['shell']).toMatchObject({
      state: 'collapsed',
      collapse: {cause: 'home', home: 'GitHub PRs'},
    });
    expect(synthesizer.calls).toHaveLength(1);
  });
});

/** A gate the test opens by hand. */
function gate(): {opened: Promise<void>; open: () => void} {
  let open!: () => void;
  const opened = new Promise<void>(resolve => (open = resolve));
  gates.push(open);
  return {opened, open};
}

/** The same script, each press on it answered only once `opened` resolves. */
function pressHeld(opened: Promise<void>, script: Script): Script {
  return async function* (s) {
    if (!s.firstTurn) await opened;
    for await (const event of script(s)) yield event;
  };
}

/** A turn's events as they arrive, and the whole of them once it ends. */
function streamOf(client: Client, message: Message) {
  const events: AnyEvent[] = [];
  const done = (async () => {
    for await (const e of client.sendMessageStream({message})) events.push(e);
    return events;
  })();
  return {events, done};
}

async function until(check: () => boolean, what: string) {
  const deadline = Date.now() + 5_000;
  while (!check()) {
    if (Date.now() > deadline) throw new Error(`never: ${what}`);
    await wait(10);
  }
}

const arrivedIn = (events: AnyEvent[], source: string) =>
  events.some(e => stampOf(e)?.source === source && a2uiDatas(e).some(d => d.updateDataModel));

const itemsOf = (call: SynthesisCall, appId: string) =>
  (call.input.sources.find(s => s.appId === appId)?.data as {items: unknown[]}).items;

describe('quiescence (task 8.10)', () => {
  const three = ['github', 'gmail', 'calendar'] as const;

  test('a press holds the first merge past the soft deadline; it lands once, over what the fragment then shows', async () => {
    const press = gate();
    const synthesizer = new FakeSynthesizer();
    const {client} = await boot({
      planner: new FakePlanner(() => layoutFor(three, {merged: 'Compare.'})),
      synthesizer,
      scripts: {
        github: pressHeld(
          press.opened,
          shopScript(camerasA, () => ({path: '/items', value: [camerasA[0]]})),
        ),
        gmail: shopScript(camerasB),
        calendar: after(3_000, shopScript(camerasA)),
      },
      softDeadlineMs: 300,
    });
    const contextId = crypto.randomUUID();
    const turn = streamOf(client, utterance('compare', contextId));
    await until(
      () => arrivedIn(turn.events, 'github') && arrivedIn(turn.events, 'gmail'),
      'both arrived',
    );
    const action = streamOf(client, actionOn('github:s1', contextId));
    await until(() => vendors.github!.requests.length === 2, 'the press reached GitHub');

    // Well past the soft deadline, the press still out: nothing is made.
    await wait(700);
    expect(synthesizer.calls).toHaveLength(0);

    press.open();
    await action.done;
    const events = await turn.done;
    expect(synthesizer.calls).toHaveLength(1);
    expect(itemsOf(synthesizer.calls[0]!, 'github')).toEqual([camerasA[0]]);
    expect(synthesisEvents(events)).toHaveLength(1);
    const lines = await journalLines(2);
    const line = lines.find(l => l.turnId === events[0]!.id)!;
    expect(line.synthesis).toMatchObject({release: {by: 'soft-deadline'}});
    const waited = (line.synthesis as {waited: Array<{appId: string; ms: number}>}).waited;
    expect(waited.map(w => w.appId)).toEqual(['github']);
    expect(waited[0]!.ms).toBeGreaterThan(300);
  });

  test('a merge in the making never lands before the press is answered; an answer that changes nothing lets it land as made', async () => {
    const press = gate();
    const made = gate();
    const synthesizer = new HeldSynthesizer([made.opened]);
    const {client} = await boot({
      planner: new FakePlanner(() => planWithSynthesis(['github', 'gmail'])),
      synthesizer,
      scripts: {
        github: pressHeld(
          press.opened,
          shopScript(camerasA, () => ({path: '/items', value: camerasA})),
        ),
        gmail: shopScript(camerasB),
      },
    });
    const contextId = crypto.randomUUID();
    const turn = streamOf(client, utterance('compare', contextId));
    await until(() => synthesizer.calls.length === 1, 'the merge is being made');
    const action = streamOf(client, actionOn('github:s1', contextId));
    await until(() => vendors.github!.requests.length === 2, 'the press reached GitHub');

    made.open();
    await wait(300);
    expect(synthesisEvents(turn.events)).toHaveLength(0);

    press.open();
    await action.done;
    const events = await turn.done;
    expect(synthesizer.calls).toHaveLength(1);
    expect(synthesisEvents(events)).toHaveLength(1);
  });

  test('a press whose answer changes the fragment throws the merge in the making away; it is made again once, after', async () => {
    const made = gate();
    const synthesizer = new HeldSynthesizer([made.opened]);
    const {client} = await boot({
      planner: new FakePlanner(() => planWithSynthesis(['github', 'gmail'])),
      synthesizer,
      scripts: {
        github: shopScript(camerasA, () => ({path: '/items', value: [camerasA[0]]})),
        gmail: shopScript(camerasB),
      },
    });
    const contextId = crypto.randomUUID();
    const turn = streamOf(client, utterance('compare', contextId));
    await until(() => synthesizer.calls.length === 1, 'the merge is being made');
    const action = await collect(client, actionOn('github:s1', contextId));
    made.open();
    const events = await turn.done;

    expect(synthesizer.calls).toHaveLength(2);
    expect(synthesizer.calls[0]!.signal?.aborted).toBe(true);
    expect(itemsOf(synthesizer.calls[1]!, 'github')).toEqual([camerasA[0]]);
    expect(synthesizer.calls[1]!.input.previous).toBeUndefined();
    expect(synthesisEvents([...events, ...action])).toHaveLength(1);
    const lines = await journalLines(2);
    const line = lines.find(l => l.turnId === events[0]!.id)!;
    expect(line.synthesis).toMatchObject({
      outcome: 'synthesized',
      thrownAway: [{changed: ['github:s1']}],
    });
  });

  test('one merge in the making at a time: a press during a rebuild throws it away, and it is made once after both', async () => {
    const rebuild = gate();
    const gmailPress = gate();
    const synthesizer = new HeldSynthesizer([undefined, rebuild.opened]);
    const {client} = await boot({
      planner: new FakePlanner(() => planWithSynthesis(['github', 'gmail'])),
      synthesizer,
      scripts: {
        github: shopScript(camerasA, () => ({path: '/items', value: [camerasA[0]]})),
        gmail: pressHeld(
          gmailPress.opened,
          shopScript(camerasB, () => ({path: '/items', value: [camerasB[0]]})),
        ),
      },
    });
    const contextId = crypto.randomUUID();
    await collect(client, utterance('compare', contextId));
    expect(synthesizer.calls).toHaveLength(1);

    const first = streamOf(client, actionOn('github:s1', contextId));
    await until(() => synthesizer.calls.length === 2, 'the rebuild is being made');
    const second = streamOf(client, actionOn('gmail:s1', contextId));
    await until(() => vendors.gmail!.requests.length === 2, 'the press reached Gmail');
    gmailPress.open();
    const events = [...(await first.done), ...(await second.done)];

    expect(synthesizer.calls).toHaveLength(3);
    expect(synthesizer.calls[1]!.signal?.aborted).toBe(true);
    const absent = synthesizer.calls[2]!.input.changes!.absent.map(r => r.surface);
    expect(new Set(absent)).toEqual(new Set(['github:s1', 'gmail:s1']));
    expect(synthesisEvents(events)).toHaveLength(1);
  });

  test('a press in a fragment the merge does not read neither holds it nor throws it away', async () => {
    const rebuild = gate();
    const calendarPress = gate();
    const calendarShop = shopScript(camerasA, () => ({path: '/items', value: []}));
    const synthesizer = new HeldSynthesizer([undefined, rebuild.opened]);
    const {client} = await boot({
      planner: new FakePlanner(() => layoutFor(three, {merged: 'Compare.'})),
      synthesizer,
      scripts: {
        github: shopScript(camerasA, () => ({path: '/items', value: [camerasA[0]]})),
        gmail: shopScript(camerasB),
        // Arrives after the merge, so the merge does not read it.
        calendar: async function* (s) {
          await (s.firstTurn ? wait(300) : calendarPress.opened);
          for await (const event of calendarShop(s)) yield event;
        },
      },
      softDeadlineMs: 50,
    });
    const contextId = crypto.randomUUID();
    await collect(client, utterance('compare', contextId));
    expect(synthesizer.calls[0]!.input.sources.map(s => s.appId).sort()).toEqual([
      'github',
      'gmail',
    ]);

    const calendar = streamOf(client, actionOn('calendar:s1', contextId));
    await until(() => vendors.calendar!.requests.length === 2, 'the press reached Calendar');
    const github = streamOf(client, actionOn('github:s1', contextId));
    await until(() => synthesizer.calls.length === 2, 'the rebuild is being made');
    rebuild.open();
    expect(synthesisEvents(await github.done)).toHaveLength(1);
    expect(calendar.events.some(e => e.kind === 'status-update' && e.final)).toBe(false);

    calendarPress.open();
    await calendar.done;
    expect(synthesizer.calls).toHaveLength(2);
    expect(synthesizer.calls[1]!.signal?.aborted).toBe(false);
  });

  test('a source failing while the merge is made does not throw it away; it leaves the merge as it would once landed', async () => {
    const made = gate();
    const synthesizer = new HeldSynthesizer([made.opened]);
    const {client} = await boot({
      planner: new FakePlanner(() => layoutFor(three, {merged: 'Compare.'})),
      synthesizer,
      scripts: {
        github: shopScript(camerasA, () => ({path: '/items', value: [camerasA[0]]})),
        gmail: shopScript(camerasB),
        calendar: shopScript(camerasA),
      },
    });
    const contextId = crypto.randomUUID();
    const turn = streamOf(client, utterance('compare', contextId));
    await until(() => synthesizer.calls.length === 1, 'the merge is being made');
    await collect(client, {
      kind: 'message',
      messageId: crypto.randomUUID(),
      role: 'user',
      contextId,
      parts: [
        {
          kind: 'data',
          data: {
            version: 'v0.9',
            error: {code: 'VALIDATION_FAILED', surfaceId: 'gmail:s1', path: '/', message: 'bad'},
          },
        },
      ],
    });
    made.open();
    const events = await turn.done;
    expect(synthesisEvents(events)).toHaveLength(1);
    expect(synthesizer.calls).toHaveLength(1);
    const lines = await journalLines(2);
    const line = lines.find(l => l.turnId === events[0]!.id)!;
    expect(line.synthesis).toMatchObject({outcome: 'synthesized'});
    expect(line.synthesis).not.toHaveProperty('thrownAway');

    // The next rebuild runs over the merge's own set, Gmail no longer in it.
    await collect(client, actionOn('github:s1', contextId));
    expect(synthesizer.calls).toHaveLength(2);
    expect(synthesizer.calls[1]!.input.sources.map(s => s.appId).sort()).toEqual([
      'calendar',
      'github',
    ]);
  });

  test('a source arriving while the first merge waits on a press joins it, with no Include', async () => {
    const press = gate();
    const synthesizer = new FakeSynthesizer();
    const {client} = await boot({
      planner: new FakePlanner(() => layoutFor(three, {merged: 'Compare.'})),
      synthesizer,
      scripts: {
        github: pressHeld(press.opened, shopScript(camerasA)),
        gmail: shopScript(camerasB),
        calendar: after(1_000, shopScript(camerasA)),
      },
      softDeadlineMs: 400,
    });
    const contextId = crypto.randomUUID();
    const turn = streamOf(client, utterance('compare', contextId));
    await until(
      () => arrivedIn(turn.events, 'github') && arrivedIn(turn.events, 'gmail'),
      'both arrived',
    );
    const action = streamOf(client, actionOn('github:s1', contextId));
    await until(() => arrivedIn(turn.events, 'calendar'), 'the straggler arrived');
    expect(synthesizer.calls).toHaveLength(0);
    press.open();
    await action.done;
    await turn.done;

    expect(synthesizer.calls).toHaveLength(1);
    const {input} = synthesizer.calls[0]!;
    expect(input.sources.map(s => s.appId).sort()).toEqual(['calendar', 'github', 'gmail']);
    expect(input.missing).toBeUndefined();
  });
});
