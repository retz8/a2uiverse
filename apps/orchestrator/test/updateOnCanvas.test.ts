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
import type {Message} from '@a2a-js/sdk';
import {ClientFactory, type Client} from '@a2a-js/sdk/client';
import {
  clientMessage,
  collect,
  contextOf,
  dataPart,
  datasOf,
  endsTurn,
  isStatusUpdate,
  stampOf,
  textPart,
  type WireEvent,
} from './privateWire.js';
import type {Express} from 'express';
import {operationData} from '@a2uiverse/sdk';
import {FakeEmbedder} from '@a2uiverse/embedder';
import {buildOrchestrator, type Orchestrator} from '../src/app.js';
import {startFakeMarketplace, type FakeMarketplace} from './fakeMarketplace.js';
import {FakePlanner, layoutFor} from './fakePlanner.js';
import {FakeSynthesizer} from './fakeSynthesizer.js';
import {
  FAKE_CATALOG_ID,
  startFakeVendor,
  type AgentCard,
  type AgentExecutionEvent,
  type FakeVendor,
  type Script,
} from './fakeVendor.js';
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
  /** Words alone in place of the paint, as an agent offered no catalog it holds answers. */
  noUi?: string;
}

/**
 * A vendor painting one surface in whatever catalog `painting` names, every request alike — or
 * answering in words alone when `painting` says so.
 */
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
          parts:
            painting.noUi !== undefined
              ? [{kind: 'text', text: painting.noUi}]
              : [
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
      anthropicApiKey: undefined,
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
  return clientMessage([textPart(text)], {
    metadata: {a2uiClientDataModel: {version: 'v0.9', surfaces: {}}},
  });
}

function retry(source: string, contextId: string): Message {
  return clientMessage([dataPart(operationData({kind: 'retry', sources: [source]}, 'v0.9'))], {
    contextId,
  });
}

function action(source: string, contextId: string): Message {
  return clientMessage(
    [
      dataPart({
        version: 'v0.9',
        action: {name: 'open', surfaceId: `${source}:s1`, sourceComponentId: 'b', context: {}},
      }),
    ],
    {contextId, metadata: {a2uiClientDataModel: {version: 'v0.9', surfaces: {}}}},
  );
}

type AnyEvent = WireEvent;

/** Each shell paint's Slot components, by source, in stream order. */
function slotPaints(events: AnyEvent[]): Array<Record<string, Record<string, unknown>>> {
  return events.flatMap(e => {
    if (!isStatusUpdate(e) || endsTurn(e)) return [];
    if (stampOf(e)?.role !== 'shell') return [];
    return datasOf(e).flatMap(data => {
      const update = data.updateComponents as
        {components?: Array<Record<string, unknown>>} | undefined;
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
    const turn = await collect(client, utterance('camera prices'));
    const canvas = contextOf(turn);
    const tile = lastSlot(turn, 'shop')!;
    expect(tile).toMatchObject({state: 'update'});

    const updated = await orchestrator.registry.installFromMarketplace('shop');
    expect(updated.ok).toBe(true);
    const events = await collect(client, retry('shop', canvas));
    // The pending repaint keeps the update line until the answer lands (task-15.8 decision 2).
    expect(slotPaints(events)[0]!.shop).toMatchObject({state: 'pending', update: tile.update});
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

    // The update keeps the catalog the pressed surface was drawn in.
    move(vendors.shop!, [FAKE_CATALOG_ID, CAT_2]);
    await publish('shop', [FAKE_CATALOG_ID, CAT_2], ['0.0.0', '1.0.0']);
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

  test('an update that dropped the catalog a kept press’s surface was drawn in: the Retry sends the plan’s request, painted afresh (task-15.11 decision 41)', async () => {
    const {client, orchestrator, painting, publish} = await boot({
      apps: {shop: {}},
      plan: shopOnly,
    });
    const canvas = contextOf(await collect(client, utterance('camera prices')));

    move(vendors.shop!, [CAT_2]);
    painting.shop!.catalog = CAT_2;
    await publish('shop', [CAT_2], ['0.0.0', '1.0.0']);
    await orchestrator.registry.refreshCards();
    await collect(client, action('shop', canvas));

    await orchestrator.registry.installFromMarketplace('shop');
    const events = await collect(client, retry('shop', canvas));
    expect(vendors.shop!.requests).toHaveLength(2);
    // The plan's request, as the turn first sent it.
    expect(vendors.shop!.requests[1]!.message.parts).toEqual(
      vendors.shop!.requests[0]!.message.parts,
    );
    expect(JSON.stringify(events)).toContain(CAT_2);
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

  test('the agent moved and answers with no UI: the card fetched again names the change, the update tile; a Retry stopped before the call (task-15.11 decision 5)', async () => {
    const {client, orchestrator, painting} = await boot({apps: {shop: {}}, plan: shopOnly});
    move(vendors.shop!, [CAT_2], '1.1.0');
    painting.shop!.noUi = "Shop B has changed and can't show this here.";

    const turn = await collect(client, utterance('camera prices'));
    expect(vendors.shop!.requests).toHaveLength(1);
    expect(lastSlot(turn, 'shop')).toMatchObject({
      state: 'update',
      update: {state: 'ahead-of-store', publisher: 'Northlight'},
    });
    expect(orchestrator.registry.card('shop')).toMatchObject({version: '1.1.0'});
    const [record] = await dispatchRecords('shop', 1);
    expect(record).toMatchObject({
      outcome: 'failed',
      refetched: 'changed',
      update: {case: 'catalogs', line: 'waiting'},
    });
    expect(record.cause).toBeUndefined();

    const pressed = await collect(client, retry('shop', contextOf(turn)));
    expect(vendors.shop!.requests).toHaveLength(1);
    expect(lastSlot(pressed, 'shop')).toMatchObject({state: 'update'});
  });

  test('Check again fetches the card again: an agent moved back to what the Store holds is called, and paints (task-16.11)', async () => {
    const {client, orchestrator} = await boot({apps: {shop: {}}, plan: shopOnly});
    move(vendors.shop!, [CAT_2], '1.1.0');
    await orchestrator.registry.refreshCards();
    const turn = await collect(client, utterance('camera prices'));
    expect(lastSlot(turn, 'shop')).toMatchObject({
      state: 'update',
      update: {state: 'ahead-of-store'},
    });
    expect(vendors.shop!.requests).toEqual([]);

    move(vendors.shop!, [FAKE_CATALOG_ID], '0.0.0');
    const pressed = await collect(client, retry('shop', contextOf(turn)));
    expect(orchestrator.registry.card('shop')).toMatchObject({version: '0.0.0'});
    expect(vendors.shop!.requests).toHaveLength(1);
    expect(lastSlot(pressed, 'shop')).not.toMatchObject({state: 'update'});
    expect(JSON.stringify(pressed)).toContain(FAKE_CATALOG_ID);
  });

  test('an answer with no UI from an app that has not changed rests on its words, as before', async () => {
    const {client, painting} = await boot({apps: {shop: {}}, plan: shopOnly});
    painting.shop!.noUi = 'Nothing to show for that.';

    const events = await collect(client, utterance('camera prices'));
    expect(lastSlot(events, 'shop')).toMatchObject({state: 'collapsed'});
    const [record] = await dispatchRecords('shop', 1);
    expect(record).toMatchObject({outcome: 'completed', refetched: 'unchanged'});
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

describe('an installed app the platform cannot reach (task-20.3 decision 13)', () => {
  /** The agent's live card listing a binding of its own alone, in place; `back` restores JSON-RPC. */
  const onlyUnspoken = (vendor: FakeVendor) => {
    vendor.card.preferredTransport = 'ACME-RPC';
  };
  const back = (vendor: FakeVendor) => {
    vendor.card.preferredTransport = 'JSONRPC';
  };

  test('its slot takes the failure tile under a cause of its own, the agent never called, the dispatch journaled', async () => {
    const {client, orchestrator} = await boot({apps: {shop: {}}, plan: shopOnly});
    onlyUnspoken(vendors.shop!);
    await orchestrator.registry.refreshCards();

    const events = await collect(client, utterance('camera prices'));
    expect(lastSlot(events, 'shop')).toMatchObject({
      state: 'failed',
      failure: {cause: 'interface'},
    });
    expect(vendors.shop!.requests).toEqual([]);
    const [record] = await dispatchRecords('shop', 1);
    expect(record).toMatchObject({
      outcome: 'failed',
      cause: 'interface',
      error:
        'the card lists no interface A2UIVerse speaks: it lists ACME-RPC at A2A 0.3.0; A2UIVerse speaks JSONRPC, HTTP+JSON and GRPC at A2A 0.3 and 1.x',
    });
    expect(record).not.toHaveProperty('a2aVersion');
    // The app stays installed and routed: the Router ranks it and the plan dispatched it.
    expect(orchestrator.registry.list().map(app => app.id)).toEqual(['shop']);
    expect(orchestrator.registry.routable().some(app => app.record.id === 'shop')).toBe(true);
  });

  test('an app asking sign-in is asked none: the failure tile, not the authority tile, from first paint', async () => {
    const {client, orchestrator} = await boot({
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
    onlyUnspoken(vendors.shop!);
    await orchestrator.registry.refreshCards();

    const events = await collect(client, utterance('camera prices'));
    expect(slotPaints(events)[0]!['shop.1']).toMatchObject({state: 'pending'});
    for (const paint of slotPaints(events)) expect(paint['shop.1']?.authority).toBeUndefined();
    expect(lastSlot(events, 'shop.1')).toMatchObject({
      state: 'failed',
      failure: {cause: 'interface'},
    });
    expect(vendors.shop!.requests).toEqual([]);
  });

  test('its update is not judged either: an app that also cannot paint in what it is installed with takes the failure tile', async () => {
    const {client, orchestrator} = await boot({apps: {shop: {}}, plan: shopOnly});
    move(vendors.shop!, [CAT_2], '1.1.0');
    onlyUnspoken(vendors.shop!);
    await orchestrator.registry.refreshCards();
    const events = await collect(client, utterance('camera prices'));
    expect(lastSlot(events, 'shop')).toMatchObject({
      state: 'failed',
      failure: {cause: 'interface'},
    });
  });

  test('Retry fetches the live card again first: an agent listing an interface the platform speaks again is called, and paints', async () => {
    const {client, orchestrator} = await boot({apps: {shop: {}}, plan: shopOnly});
    onlyUnspoken(vendors.shop!);
    await orchestrator.registry.refreshCards();
    const turn = await collect(client, utterance('camera prices'));
    expect(lastSlot(turn, 'shop')).toMatchObject({failure: {cause: 'interface'}});
    expect(orchestrator.registry.liveUnreachable('shop')).toBe(true);

    back(vendors.shop!);
    const pressed = await collect(client, retry('shop', contextOf(turn)));
    expect(orchestrator.registry.liveUnreachable('shop')).toBe(false);
    expect(vendors.shop!.requests).toHaveLength(1);
    expect(lastSlot(pressed, 'shop')).not.toMatchObject({state: 'failed'});
    expect(JSON.stringify(pressed)).toContain(FAKE_CATALOG_ID);
  });

  test('a Retry while the card still lists nothing the platform speaks fails the same way, the agent still not called', async () => {
    const {client, orchestrator} = await boot({apps: {shop: {}}, plan: shopOnly});
    onlyUnspoken(vendors.shop!);
    await orchestrator.registry.refreshCards();
    const turn = await collect(client, utterance('camera prices'));
    const pressed = await collect(client, retry('shop', contextOf(turn)));
    expect(lastSlot(pressed, 'shop')).toMatchObject({
      state: 'failed',
      failure: {cause: 'interface'},
    });
    expect(vendors.shop!.requests).toEqual([]);
  });
});
