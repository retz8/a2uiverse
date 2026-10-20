/**
 * The update on the canvas (task 15.5), end to end over a running orchestrator, a fake Store and
 * fake vendors installed from it: the update check before every dispatch, the catch after a
 * refused paint, the update tile painted from the update state and its publisher, Update then the
 * slot's Retry, and the update tile in the merge as a sign-in's.
 */
import {createServer, type Server} from 'node:http';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import type {AgentCard, Message} from '@a2a-js/sdk';
import type {AgentExecutionEvent} from '@a2a-js/sdk/server';
import {ClientFactory, type Client} from '@a2a-js/sdk/client';
import type {Express} from 'express';
import {operationData} from '@a2uiverse/sdk';
import {FakeEmbedder} from '@a2uiverse/embedder';
import {buildOrchestrator, type Orchestrator} from '../src/app.js';
import {startFakeMarketplace, type FakeMarketplace} from './fakeMarketplace.js';
import {FakePlanner, layoutFor} from './fakePlanner.js';
import {FakeSynthesizer} from './fakeSynthesizer.js';
import {FAKE_CATALOG_ID, startFakeVendor, type FakeVendor, type Script} from './fakeVendor.js';
import {fixtureArtifact} from './registryFixture.js';

const CAT_2 = 'cat2';
const A2UI_V091_URI = 'https://a2ui.org/a2a-extension/a2ui/v0.9.1';

let dir: string;
let server: Server | undefined;
let marketplace: FakeMarketplace | undefined;
let vendors: Record<string, FakeVendor> = {};

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'a2uiverse-update-'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  vi.restoreAllMocks();
  await new Promise<void>(resolve => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
  for (const vendor of Object.values(vendors)) await vendor.close().catch(() => {});
  vendors = {};
  await marketplace?.close();
  marketplace = undefined;
  await rm(dir, {recursive: true, force: true});
});

/** What a vendor paints in: changed by the test as the agent moves. */
interface Painting {
  catalog: string;
}

/** A vendor painting one surface in whatever catalog `painting` names, every request alike. */
function paintsIn(painting: Painting): Script {
  return ({ctx, vendorContextId}) => [
    {
      kind: 'status-update',
      taskId: ctx.taskId,
      contextId: vendorContextId,
      final: true,
      status: {
        state: 'completed',
        message: {
          kind: 'message',
          messageId: randomUUID(),
          role: 'agent',
          parts: [
            {
              kind: 'data',
              data: {
                version: 'v0.9',
                createSurface: {surfaceId: 's1', catalogId: painting.catalog},
              },
            },
          ],
          contextId: vendorContextId,
          taskId: ctx.taskId,
        },
      },
    } as AgentExecutionEvent,
  ];
}

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** The agent's live card moved to `catalogs` at `version`, in place: the card it serves now. */
function move(vendor: FakeVendor, catalogs: string[], version = '1.0.0'): AgentCard {
  vendor.card.version = version;
  const a2ui = vendor.card.capabilities.extensions!.find(e => e.uri === A2UI_V091_URI)!;
  a2ui.params = {supportedCatalogIds: catalogs};
  return copy(vendor.card);
}

interface Boot {
  client: Client;
  orchestrator: Orchestrator;
  painting: Record<string, Painting>;
  /** The Store publishing the app's card as it serves it now, with `catalogs` handed. */
  publish(appId: string, catalogs: string[], versions?: string[]): Promise<void>;
}

async function boot(options: {
  apps: Record<string, {card?: Partial<AgentCard>}>;
  plan: () => ReturnType<typeof layoutFor>;
  synthesizer?: FakeSynthesizer;
}): Promise<Boot> {
  marketplace = await startFakeMarketplace();
  const painting: Record<string, Painting> = {};
  for (const [appId, app] of Object.entries(options.apps)) {
    painting[appId] = {catalog: FAKE_CATALOG_ID};
    vendors[appId] = await startFakeVendor({
      name: appId === 'shop' ? 'Shop B' : 'GitHub',
      script: paintsIn(painting[appId]),
      ...(app.card ? {card: app.card} : {}),
    });
  }
  const publish = async (appId: string, catalogs: string[], versions?: string[]) => {
    const vendor = vendors[appId]!;
    await marketplace!.publish(appId, {
      card: copy(vendor.card),
      cardUrl: `${vendor.url}/.well-known/agent-card.json`,
      publisher: 'Northlight',
      catalogs: await Promise.all(catalogs.map(id => fixtureArtifact(id))),
      ...(versions ? {versions} : {}),
    });
  };
  const ready: {app?: Express} = {};
  server = createServer((req, res) => ready.app!(req, res));
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  const base = `http://127.0.0.1:${address.port}`;
  const orchestrator = buildOrchestrator({
    config: {
      port: address.port,
      baseUrl: base,
      stateDir: dir,
      debugIds: false,
      googleApiKey: undefined,
      plannerModelId: 'test-model',
      plannerEffort: 'low',
      shortlistCap: 5,
      synthesizerModelId: 'test-model',
      synthesizerEffort: 'low',
      softDeadlineMs: 10_000,
      hardCapMs: 300_000,
      heartbeatMs: 30_000,
      faults: new Map(),
      marketplaceUrl: marketplace.url,
      marketplaceTimeoutMs: 2_000,
    },
    overrides: {
      embedder: new FakeEmbedder(),
      planner: new FakePlanner(options.plan),
      ...(options.synthesizer ? {synthesisModel: options.synthesizer} : {}),
      stepQuietMs: 0,
    },
  });
  await orchestrator.init();
  ready.app = orchestrator.app;
  for (const appId of Object.keys(options.apps)) {
    await publish(appId, [FAKE_CATALOG_ID]);
    const installed = await orchestrator.registry.installFromMarketplace(appId);
    if (!installed.ok) throw new Error(`install ${appId}: ${installed.findings.join('; ')}`);
  }
  const client = await new ClientFactory().createFromUrl(base);
  return {client, orchestrator, painting, publish};
}

function utterance(text: string): Message {
  return {
    kind: 'message',
    messageId: randomUUID(),
    role: 'user',
    parts: [{kind: 'text', text}],
    metadata: {a2uiClientDataModel: {version: 'v0.9', surfaces: {}}},
  };
}

function retry(source: string, contextId: string): Message {
  return {
    kind: 'message',
    messageId: randomUUID(),
    role: 'user',
    contextId,
    parts: [{kind: 'data', data: operationData({kind: 'retry', sources: [source]}, 'v0.9')}],
  };
}

function action(source: string, contextId: string): Message {
  return {
    kind: 'message',
    messageId: randomUUID(),
    role: 'user',
    contextId,
    parts: [
      {
        kind: 'data',
        data: {
          version: 'v0.9',
          action: {name: 'open', surfaceId: `${source}:s1`, sourceComponentId: 'b', context: {}},
        },
      },
    ],
    metadata: {a2uiClientDataModel: {version: 'v0.9', surfaces: {}}},
  };
}

async function collect(client: Client, message: Message) {
  const events = [];
  for await (const e of client.sendMessageStream({message})) events.push(e);
  return events;
}
type AnyEvent = Awaited<ReturnType<typeof collect>>[number];

const contextOf = (events: AnyEvent[]) => events.find(e => e.contextId)!.contextId!;

/** Each shell paint's Slot components, by source, in stream order. */
function slotPaints(events: AnyEvent[]): Array<Record<string, Record<string, unknown>>> {
  return events.flatMap(e => {
    if (e.kind !== 'status-update' || e.final) return [];
    const stamp = e.metadata?.a2uiverse as {role?: string} | undefined;
    if (stamp?.role !== 'shell') return [];
    return (e.status.message?.parts ?? []).flatMap(p => {
      const update =
        p.kind === 'data'
          ? (p.data.updateComponents as {components?: Array<Record<string, unknown>>} | undefined)
          : undefined;
      if (!update?.components) return [];
      return [
        Object.fromEntries(
          update.components
            .filter(c => c.component === 'Slot' && typeof c.source === 'string')
            .map(c => [(c.content === 'shell' ? 'shell' : c.source) as string, c]),
        ),
      ];
    });
  });
}
const lastSlot = (events: AnyEvent[], source: string) =>
  slotPaints(events)
    .reverse()
    .find(paint => paint[source])?.[source];

/** The journal's dispatch records for `source`, once `count` of them are written. */
async function dispatchRecords(source: string, count: number) {
  let records: Record<string, unknown>[] = [];
  await vi.waitFor(async () => {
    const text = await readFile(join(dir, 'intent-journal.jsonl'), 'utf8').catch(() => '');
    records = text
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line) as {dispatch?: Record<string, unknown>[]})
      .flatMap(line => line.dispatch ?? [])
      .filter(record => record.source === source);
    expect(records.length).toBeGreaterThanOrEqual(count);
  });
  return records;
}

const shopOnly = () => layoutFor(['shop']);

describe('the update check before the call (task-15.5 decisions 1, 2, 5, 6, 8, 12)', () => {
  test('the Store holding a version the app can paint in: the update tile, the update state and its publisher on the slot, the agent never called', async () => {
    const {client, orchestrator, publish} = await boot({apps: {shop: {}}, plan: shopOnly});
    move(vendors.shop!, [CAT_2]);
    await publish('shop', [CAT_2], ['0.0.0', '1.0.0']);
    await orchestrator.registry.refreshCards();

    const events = await collect(client, utterance('camera prices'));
    expect(slotPaints(events)[0]!.shop).toMatchObject({state: 'pending'});
    expect(lastSlot(events, 'shop')).toMatchObject({
      state: 'update',
      update: {
        state: 'update-required',
        installedVersion: '0.0.0',
        publishedVersion: '1.0.0',
        newScopes: [],
        publisher: 'Northlight',
      },
    });
    expect(vendors.shop!.requests).toEqual([]);
    const [record] = await dispatchRecords('shop', 1);
    expect(record).toMatchObject({
      outcome: 'failed',
      update: {case: 'catalogs', state: {state: 'update-required'}, line: 'update'},
    });
  });

  test('the Store holding nothing the app can paint in: the waiting line, its publisher named, the change reported', async () => {
    const {client, orchestrator} = await boot({apps: {shop: {}}, plan: shopOnly});
    move(vendors.shop!, [CAT_2]);
    await orchestrator.registry.refreshCards();
    const reports = marketplace!.reports.length;

    const events = await collect(client, utterance('camera prices'));
    expect(lastSlot(events, 'shop')).toMatchObject({
      state: 'update',
      update: {state: 'ahead-of-store', publisher: 'Northlight'},
    });
    await vi.waitFor(() => expect(marketplace!.reports.slice(reports)).toEqual(['shop']));
  });

  test('Update, then the slot’s Retry: the request sent again, painted in the app as it now is', async () => {
    const {client, orchestrator, painting, publish} = await boot({
      apps: {shop: {}},
      plan: shopOnly,
    });
    move(vendors.shop!, [CAT_2]);
    painting.shop!.catalog = CAT_2;
    await publish('shop', [CAT_2], ['0.0.0', '1.0.0']);
    await orchestrator.registry.refreshCards();
    const canvas = contextOf(await collect(client, utterance('camera prices')));

    const updated = await orchestrator.registry.installFromMarketplace('shop');
    expect(updated.ok).toBe(true);
    const events = await collect(client, retry('shop', canvas));
    expect(slotPaints(events)[0]!.shop).toMatchObject({state: 'pending'});
    expect(slotPaints(events)[0]!.shop!.update).toBeUndefined();
    expect(vendors.shop!.requests).toHaveLength(1);
    expect(JSON.stringify(events)).toContain(CAT_2);
  });

  test('an app asking sign-in that cannot paint in what it is installed with takes the update tile first, not the sign-in (decision 2)', async () => {
    const {client, orchestrator, publish} = await boot({
      apps: {
        shop: {
          card: {
            securitySchemes: {key: {type: 'apiKey', in: 'header', name: 'X-Key'}},
            security: [{key: []}],
          },
        },
      },
      plan: () => layoutFor(['shop.1']),
    });
    move(vendors.shop!, [CAT_2]);
    await publish('shop', [CAT_2], ['0.0.0', '1.0.0']);
    await orchestrator.registry.refreshCards();

    const events = await collect(client, utterance('camera prices'));
    expect(slotPaints(events)[0]!['shop.1']).toMatchObject({state: 'pending'});
    expect(slotPaints(events)[0]!['shop.1']!.authority).toBeUndefined();
    expect(lastSlot(events, 'shop.1')).toMatchObject({
      state: 'update',
      update: {state: 'update-required'},
    });
  });

  test('a press inside a fragment the update check stops: the update tile, the press kept, Update’s Retry sending it again (decisions 1, 9)', async () => {
    const {client, orchestrator, painting, publish} = await boot({
      apps: {shop: {}},
      plan: shopOnly,
    });
    const canvas = contextOf(await collect(client, utterance('camera prices')));
    expect(vendors.shop!.requests).toHaveLength(1);

    move(vendors.shop!, [CAT_2]);
    painting.shop!.catalog = CAT_2;
    await publish('shop', [CAT_2], ['0.0.0', '1.0.0']);
    await orchestrator.registry.refreshCards();
    const pressed = await collect(client, action('shop', canvas));
    expect(lastSlot(pressed, 'shop')).toMatchObject({state: 'update'});
    expect(vendors.shop!.requests).toHaveLength(1);

    await orchestrator.registry.installFromMarketplace('shop');
    await collect(client, retry('shop', canvas));
    expect(vendors.shop!.requests).toHaveLength(2);
    expect(vendors.shop!.requests[1]!.message.parts).toEqual([
      expect.objectContaining({
        kind: 'data',
        data: expect.objectContaining({action: expect.anything()}),
      }),
    ]);
  });
});

describe('the catch after the call (task-15.5 decisions 4, 12)', () => {
  test('the agent moved since the run fetched its card: the card fetched again names the change, the update tile', async () => {
    const {client, orchestrator, painting} = await boot({apps: {shop: {}}, plan: shopOnly});
    move(vendors.shop!, [CAT_2]);
    painting.shop!.catalog = CAT_2;

    const events = await collect(client, utterance('camera prices'));
    expect(vendors.shop!.requests).toHaveLength(1);
    expect(JSON.stringify(events)).not.toContain(CAT_2);
    expect(lastSlot(events, 'shop')).toMatchObject({
      state: 'update',
      update: {state: 'ahead-of-store', publisher: 'Northlight'},
    });
    expect(orchestrator.registry.card('shop')).toMatchObject({version: '1.0.0'});
    const [record] = await dispatchRecords('shop', 1);
    expect(record).toMatchObject({
      outcome: 'failed',
      cause: 'catalog',
      catalogId: CAT_2,
      refetched: 'changed',
      update: {case: 'catalogs', line: 'waiting'},
    });
  });

  test('a card that names no change: today’s tile, the catalog cause, no Retry', async () => {
    const {client, painting} = await boot({apps: {shop: {}}, plan: shopOnly});
    painting.shop!.catalog = 'urn:other';

    const events = await collect(client, utterance('camera prices'));
    expect(lastSlot(events, 'shop')).toMatchObject({
      state: 'failed',
      failure: {cause: 'catalog', catalogId: 'urn:other'},
    });
    const [record] = await dispatchRecords('shop', 1);
    expect(record).toMatchObject({cause: 'catalog', refetched: 'unchanged'});
    expect(record.update).toBeUndefined();
  });
});

describe('the update tile in the merge (task-15.5 decision 10)', () => {
  test('it resolves at once: the merge collapses over the source that answered, and the Retry after the update brings it back', async () => {
    const synthesizer = new FakeSynthesizer();
    const {client, orchestrator, painting, publish} = await boot({
      apps: {shop: {}, github: {}},
      plan: () => layoutFor(['github', 'shop'], {merged: 'Compare.'}),
      synthesizer,
    });
    move(vendors.shop!, [CAT_2]);
    painting.shop!.catalog = CAT_2;
    await publish('shop', [CAT_2], ['0.0.0', '1.0.0']);
    await orchestrator.registry.refreshCards();

    const turn = await collect(client, utterance('compare'));
    expect(lastSlot(turn, 'shop')).toMatchObject({state: 'update'});
    expect(lastSlot(turn, 'shell')).toMatchObject({state: 'collapsed', collapse: {cause: 'few'}});
    expect(synthesizer.calls).toHaveLength(0);

    await orchestrator.registry.installFromMarketplace('shop');
    const pressed = await collect(client, retry('shop', contextOf(turn)));
    expect(slotPaints(pressed)[0]!.shell).toMatchObject({state: 'collapsed', retrying: ['shop']});
    expect(synthesizer.calls[0]!.input.sources.map(s => s.source).sort()).toEqual([
      'github',
      'shop',
    ]);
  });
});
