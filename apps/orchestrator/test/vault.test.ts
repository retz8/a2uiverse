/**
 * The AuthVault (task 12.5) over a fake authorization server and fake vendors whose cards ask
 * sign-in: the card checked before dispatch, the sign-in routes and their protection, the header
 * on the wire, refresh, the agent's requests for more access, the merge, key accounts, uninstall,
 * and no secret in the journal or the logs.
 */
import {createServer, type Server} from 'node:http';
import {mkdtemp, readFile, rm, stat} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import type {AgentCard, Message} from '@a2a-js/sdk';
import type {AgentExecutionEvent} from '@a2a-js/sdk/server';
import {ClientFactory, type Client} from '@a2a-js/sdk/client';
import type {Express, Request} from 'express';
import {clientSessionMetadata, operationData} from '@a2uiverse/sdk';
import {buildOrchestrator, JOURNAL_FILE, type Orchestrator} from '../src/app.js';
import {VAULT_FILE} from '../src/vault/store.js';
import {FakeEmbedder} from '@a2uiverse/embedder';
import {nowhere} from './fakeMarketplace.js';
import {FakePlanner, layoutFor} from './fakePlanner.js';
import {startFakeAuthServer, type FakeAuthServer} from './fakeAuthServer.js';
import {
  deterministicScript,
  FAKE_CATALOG_ID,
  startFakeVendor,
  type FakeVendor,
  type Script,
} from './fakeVendor.js';
import {fixtureArtifact} from './registryFixture.js';

let dir: string;
let auth: FakeAuthServer;
let vendors: FakeVendor[] = [];
let server: Server | undefined;
let logged: string[] = [];

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'a2uiverse-vault-'));
  auth = await startFakeAuthServer();
  logged = [];
  for (const method of ['log', 'error', 'warn', 'info'] as const) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      logged.push(args.map(String).join(' '));
    });
  }
  vi.spyOn(process.stdout, 'write').mockImplementation(chunk => {
    logged.push(String(chunk));
    return true;
  });
});
afterEach(async () => {
  vi.restoreAllMocks();
  await new Promise<void>(resolve => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
  for (const vendor of vendors) await vendor.close().catch(() => {});
  vendors = [];
  await auth.close();
  await rm(dir, {recursive: true, force: true});
});

const WORDS = {read: 'See your orders', write: 'Change your orders'};

function oauthCard(): Partial<AgentCard> {
  return {
    securitySchemes: {
      signIn: {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: `${auth.url}/authorize`,
            tokenUrl: `${auth.url}/token`,
            scopes: WORDS,
          },
        },
        oauth2MetadataUrl: `${auth.url}/.well-known/oauth-authorization-server`,
      },
    },
    security: [{signIn: ['read']}],
  };
}

const bearerOf = (req: Request) => (req.header('authorization') ?? '').replace(/^Bearer /, '');

/** A vendor that lets in only a live token from the fake server, carrying `need` scopes. */
function admitsTokens(need: string[] = ['read']) {
  return (req: Request) => {
    const scopes = auth.scopesOf(bearerOf(req));
    return scopes !== undefined && need.every(scope => scopes.includes(scope));
  };
}

interface Boot {
  base: string;
  client: Client;
  orchestrator: Orchestrator;
}

async function boot(options: {
  apps: Record<
    string,
    {script?: Script; card?: Partial<AgentCard>; admit?: (req: Request) => boolean}
  >;
  plan: () => ReturnType<typeof layoutFor>;
}): Promise<Boot> {
  const urls: Record<string, string> = {};
  for (const [appId, app] of Object.entries(options.apps)) {
    const vendor = await startFakeVendor({
      name: appId === 'shop' ? 'Shop' : appId,
      ...(app.script ? {script: app.script} : {}),
      ...(app.card ? {card: app.card} : {}),
      ...(app.admit ? {admit: app.admit} : {}),
    });
    vendors.push(vendor);
    urls[appId] = vendor.url;
  }
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
      // No marketplace in these sign-ins: the boot's check finds it unreached and goes on.
      marketplaceUrl: await nowhere(),
      marketplaceTimeoutMs: 2_000,
    },
    overrides: {
      embedder: new FakeEmbedder(),
      planner: new FakePlanner(options.plan),
      stepQuietMs: 0,
    },
  });
  await orchestrator.init();
  ready.app = orchestrator.app;
  const artifact = await fixtureArtifact(FAKE_CATALOG_ID);
  for (const [appId, url] of Object.entries(urls)) {
    const installed = await orchestrator.registry.install({
      appId,
      cardUrl: `${url}/.well-known/agent-card.json`,
      catalogs: [artifact],
    });
    if (!installed.ok) throw new Error(`install ${appId}: ${installed.findings.join('; ')}`);
  }
  const client = await new ClientFactory().createFromUrl(base);
  return {base, client, orchestrator};
}

function utterance(text: string, session = 'page-1'): Message {
  return {
    kind: 'message',
    messageId: crypto.randomUUID(),
    role: 'user',
    parts: [{kind: 'text', text}],
    metadata: {
      a2uiClientDataModel: {version: 'v0.9', surfaces: {}},
      ...clientSessionMetadata(session),
    },
  };
}

function press(
  kind: 'retry' | 'dismiss' | 'useAccount',
  source: string,
  contextId: string,
): Message {
  return {
    kind: 'message',
    messageId: crypto.randomUUID(),
    role: 'user',
    contextId,
    parts: [{kind: 'data', data: operationData({kind, sources: [source]}, 'v0.9')}],
    metadata: clientSessionMetadata('page-1'),
  };
}

function action(source: string, contextId: string): Message {
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
          action: {name: 'close', surfaceId: `${source}:s1`, sourceComponentId: 'b', context: {}},
        },
      },
    ],
    metadata: {
      a2uiClientDataModel: {version: 'v0.9', surfaces: {}},
      ...clientSessionMetadata('page-1'),
    },
  };
}

async function collect(client: Client, message: Message) {
  const events = [];
  for await (const e of client.sendMessageStream({message})) events.push(e);
  return events;
}
type AnyEvent = Awaited<ReturnType<typeof collect>>[number];

function contextOf(events: AnyEvent[]): string {
  return events.find(e => e.contextId)!.contextId!;
}

/** The components of the last shell paint. */
function lastShell(events: AnyEvent[]): Array<Record<string, unknown>> {
  const paints = events.flatMap(e => {
    if (e.kind !== 'status-update' || e.final) return [];
    const stamp = e.metadata?.a2uiverse as {role?: string} | undefined;
    if (stamp?.role !== 'shell') return [];
    return (e.status.message?.parts ?? []).flatMap(p => {
      const update =
        p.kind === 'data'
          ? (p.data.updateComponents as {components?: unknown[]} | undefined)
          : undefined;
      return update?.components ? [update.components as Array<Record<string, unknown>>] : [];
    });
  });
  return paints.at(-1) ?? [];
}

const slotOf = (events: AnyEvent[], source: string) =>
  lastShell(events).find(c => c.component === 'Slot' && c.source === source);
const attributionOf = (events: AnyEvent[], source: string) =>
  lastShell(events).find(c => c.component === 'Attribution' && c.source === source);

/** The browser's side of a sign-in: the popup's start, the server, the callback, the poll. */
async function signIn(
  base: string,
  canvas: string,
  source: string,
  options: {attempt?: string; dropCookie?: boolean; extra?: string} = {},
) {
  const attempt = options.attempt ?? randomBytes(16).toString('base64url');
  const start = await fetch(
    `${base}/auth/start?attempt=${attempt}&canvas=${encodeURIComponent(canvas)}&source=${source}${options.extra ?? ''}`,
    {redirect: 'manual'},
  );
  if (start.status !== 302) return {attempt, start, outcome: undefined};
  const cookie = (start.headers.get('set-cookie') ?? '').split(';')[0]!;
  const authorize = await fetch(start.headers.get('location')!, {redirect: 'manual'});
  const callback = await fetch(authorize.headers.get('location')!, {
    redirect: 'manual',
    headers: options.dropCookie ? {} : {cookie},
  });
  const outcome = (await (await fetch(`${base}/auth/attempts/${attempt}`)).json()) as {
    state: string;
    source?: string;
    reason?: string;
    label?: string;
    app?: string;
    existing?: boolean;
  };
  return {attempt, start, authorize, callback, outcome, cookie};
}

function authRequired(security: unknown[] | undefined): Script {
  return ({ctx, vendorContextId}) => [
    {
      kind: 'status-update',
      taskId: ctx.taskId,
      contextId: vendorContextId,
      final: true,
      status: {
        state: 'auth-required',
        message: {
          kind: 'message',
          messageId: crypto.randomUUID(),
          role: 'agent',
          parts: [
            {kind: 'text', text: 'More access is needed.'},
            ...(security ? [{kind: 'data' as const, data: {security}}] : []),
          ],
          contextId: vendorContextId,
          taskId: ctx.taskId,
        },
      },
    } as AgentExecutionEvent,
  ];
}

function sequence(...scripts: Script[]): Script {
  let n = 0;
  return s => scripts[Math.min(n++, scripts.length - 1)]!(s);
}

const shopOnly = () => layoutFor(['shop.1']);

/** The journal's sign-in lines, once `expected` is among them: lines are written as they come. */
async function signInLinesWith(expected: object): Promise<Record<string, unknown>[]> {
  let lines: Record<string, unknown>[] = [];
  await vi.waitFor(async () => {
    const journal = await readFile(join(dir, JOURNAL_FILE), 'utf8');
    lines = journal
      .trim()
      .split('\n')
      .map(line => JSON.parse(line) as Record<string, unknown>)
      .filter(line => line.kind === 'signIn');
    expect(lines).toContainEqual(expect.objectContaining(expected));
  });
  return lines;
}

describe('before dispatch and the sign-in', () => {
  test('a card the vault cannot meet takes the full tile at first paint, and its agent is not called', async () => {
    const {client} = await boot({
      apps: {shop: {card: oauthCard(), admit: admitsTokens()}},
      plan: shopOnly,
    });
    const events = await collect(client, utterance('my orders'));
    expect(slotOf(events, 'shop.1')).toMatchObject({
      state: 'authority',
      authority: {cause: 'signIn', scopes: ['See your orders']},
    });
    expect(slotOf(events, 'shop.1')!.authority).not.toHaveProperty('quiet');
    expect(vendors[0]!.requests).toHaveLength(0);
  });

  test('signed in, the resume press dispatches with the header, the account labelled from the ID token', async () => {
    const {base, client, orchestrator} = await boot({
      apps: {shop: {card: oauthCard(), admit: admitsTokens()}},
      plan: shopOnly,
    });
    const canvas = contextOf(await collect(client, utterance('my orders')));
    const {outcome, callback} = await signIn(base, canvas, 'shop.1');
    expect(outcome).toEqual({
      state: 'signedIn',
      source: 'shop.1',
      label: 'ada@example.com',
      app: orchestrator.registry.displayName('shop'),
      existing: false,
    });
    expect(await callback!.text()).toContain("You're signed in");
    expect(orchestrator.vault.accountsOf('shop')).toEqual([{n: 1, label: 'ada@example.com'}]);
    // The vault asked openid itself beside the card's scopes, with PKCE and a nonce.
    const asked = auth.authorizations[0]!;
    expect(asked.get('scope')).toBe('openid read');
    expect(asked.get('code_challenge_method')).toBe('S256');
    expect(asked.get('nonce')).toBeTruthy();
    expect(asked.get('login_hint')).toBeNull();

    const events = await collect(client, press('retry', 'shop.1', canvas));
    expect(vendors[0]!.requests).toHaveLength(1);
    expect(vendors[0]!.requests[0]!.authorization).toMatch(/^Bearer /);
    expect(slotOf(events, 'shop.1')).toMatchObject({state: 'pending'});
    const file = await stat(join(dir, VAULT_FILE));
    expect(file.mode & 0o777).toBe(0o600);
  });

  test('the full tile once per app per page-load session, then the quiet line', async () => {
    const {client} = await boot({apps: {shop: {card: oauthCard()}}, plan: shopOnly});
    await collect(client, utterance('my orders', 'page-1'));
    const again = await collect(client, utterance('my orders again', 'page-1'));
    const reloaded = await collect(client, utterance('my orders', 'page-2'));
    expect(slotOf(again, 'shop.1')).toMatchObject({authority: {cause: 'signIn', quiet: true}});
    expect(slotOf(reloaded, 'shop.1')!.authority).not.toHaveProperty('quiet');
  });

  test('forged sign-ins are refused: no cookie, a reused attempt, a canvas not held; no scope taken from the address', async () => {
    const {base, client, orchestrator} = await boot({
      apps: {shop: {card: oauthCard()}},
      plan: shopOnly,
    });
    const canvas = contextOf(await collect(client, utterance('my orders')));
    const noCookie = await signIn(base, canvas, 'shop.1', {dropCookie: true});
    expect(await noCookie.callback!.text()).toContain("didn't finish");
    // Pending, it names the app already: the client says the add-account window at once (task-12.13
    // decision 21).
    expect(noCookie.outcome).toEqual({
      state: 'pending',
      app: orchestrator.registry.displayName('shop'),
    });

    const reused = await fetch(
      `${base}/auth/start?attempt=${noCookie.attempt}&canvas=${canvas}&source=shop.1`,
      {redirect: 'manual'},
    );
    expect(reused.status).toBe(400);
    const elsewhere = await signIn(base, 'not-a-canvas', 'shop.1');
    expect(elsewhere.start.status).toBe(400);

    const scoped = await signIn(base, canvas, 'shop.1', {extra: '&scope=write'});
    expect(scoped.outcome!.state).toBe('signedIn');
    expect(auth.authorizations.at(-1)!.get('scope')).toBe('openid read');

    const wrongState = await fetch(`${base}/auth/callback?state=nope&code=x`);
    expect(await wrongState.text()).toContain("didn't finish");
  });

  test('the callback arriving again for a sign-in that finished says so, and exchanges nothing twice', async () => {
    // A stalled request the tunnel delivers late, or the window reloaded (task 12.12).
    const {base, client} = await boot({apps: {shop: {card: oauthCard()}}, plan: shopOnly});
    const canvas = contextOf(await collect(client, utterance('my orders')));
    const {authorize, cookie, outcome} = await signIn(base, canvas, 'shop.1');
    expect(outcome!.state).toBe('signedIn');
    const issued = auth.issued.length;
    const back = authorize!.headers.get('location')!;
    const again = await fetch(back, {redirect: 'manual', headers: {cookie}});
    expect(await again.text()).toContain("You're signed in");
    expect(auth.issued).toHaveLength(issued);
    // Another browser's copy of the address is still no binding.
    const foreign = await fetch(back, {redirect: 'manual'});
    expect(await foreign.text()).toContain("didn't finish");
  });

  test('a sign-in for an account already signed in ends signed in at once, the window saying so', async () => {
    const {base, client} = await boot({apps: {shop: {card: oauthCard()}}, plan: shopOnly});
    const canvas = contextOf(await collect(client, utterance('my orders')));
    await signIn(base, canvas, 'shop.1');
    const attempt = randomBytes(16).toString('base64url');
    const start = await fetch(
      `${base}/auth/start?attempt=${attempt}&canvas=${encodeURIComponent(canvas)}&source=shop.1`,
      {redirect: 'manual'},
    );
    expect(start.status).toBe(200);
    expect(await start.text()).toContain("You're signed in");
    expect(auth.authorizations).toHaveLength(1);
    const outcome = await (await fetch(`${base}/auth/attempts/${attempt}`)).json();
    expect(outcome).toMatchObject({
      state: 'signedIn',
      source: 'shop.1',
      label: 'ada@example.com',
      existing: true,
    });
  });

  test('dynamic registration is made once per server and kept; a server taking metadata documents gets ours', async () => {
    const {base, client, orchestrator} = await boot({
      apps: {shop: {card: oauthCard()}},
      plan: shopOnly,
    });
    const canvas = contextOf(await collect(client, utterance('my orders')));
    await signIn(base, canvas, 'shop.1');
    await orchestrator.vault.markAgain('shop.1', 'test');
    await signIn(base, canvas, 'shop.1');
    expect(auth.registered).toHaveLength(1);
    const vault = JSON.parse(await readFile(join(dir, VAULT_FILE), 'utf8'));
    expect(Object.values(vault.registrations)).toHaveLength(1);

    auth.documents = true;
    await orchestrator.vault.markAgain('shop.1', 'test');
    await signIn(base, canvas, 'shop.1');
    expect(auth.authorizations.at(-1)!.get('client_id')).toBe(`${base}/auth/client.json`);
    const document = await (await fetch(`${base}/auth/client.json`)).json();
    expect(document).toMatchObject({
      client_id: `${base}/auth/client.json`,
      redirect_uris: [`${base}/auth/callback`],
      token_endpoint_auth_method: 'none',
    });
  });
});

describe('schemes and accounts', () => {
  test('a card offering only schemes the vault cannot do is not supported here; its sign-in does not start', async () => {
    const basic: Partial<AgentCard> = {
      securitySchemes: {basic: {type: 'http', scheme: 'basic'}},
      security: [{basic: []}],
    };
    const {base, client} = await boot({apps: {shop: {card: basic}}, plan: shopOnly});
    const events = await collect(client, utterance('my orders'));
    expect(slotOf(events, 'shop.1')).toMatchObject({
      state: 'authority',
      authority: {cause: 'unsupported'},
    });
    expect(vendors[0]!.requests).toHaveLength(0);
    const started = await signIn(base, contextOf(events), 'shop.1');
    expect(started.start.status).toBe(400);
  });

  test('the first usable alternative in the card’s order is followed', async () => {
    const card = oauthCard();
    card.securitySchemes = {
      basic: {type: 'http', scheme: 'basic'},
      ...card.securitySchemes,
    };
    card.security = [{basic: []}, {signIn: ['read']}];
    const {client} = await boot({apps: {shop: {card}}, plan: shopOnly});
    const events = await collect(client, utterance('my orders'));
    expect(slotOf(events, 'shop.1')).toMatchObject({
      authority: {cause: 'signIn', scopes: ['See your orders']},
    });
  });

  test('add-account: the bare app id signs in the next account with no hint; the same account twice is one; install-over keeps them', async () => {
    const {base, client, orchestrator} = await boot({
      apps: {shop: {card: oauthCard(), admit: admitsTokens()}},
      plan: shopOnly,
    });
    const canvas = contextOf(await collect(client, utterance('my orders')));
    await signIn(base, canvas, 'shop.1');
    // The same account, through add-account on the bare app id: one account still, said held.
    const same = await signIn(base, canvas, 'shop');
    expect(same.outcome).toMatchObject({
      state: 'signedIn',
      source: 'shop.1',
      label: 'ada@example.com',
      existing: true,
    });
    expect(auth.authorizations.at(-1)!.get('login_hint')).toBeNull();
    // Another account: the next ordinal, labelled from its own ID token.
    auth.account = {sub: 'sub-bob', email: 'bob@example.com'};
    const other = await signIn(base, canvas, 'shop');
    expect(other.outcome).toMatchObject({
      state: 'signedIn',
      source: 'shop.2',
      label: 'bob@example.com',
      existing: false,
    });
    // The next account named outright still signs in as the one after.
    auth.account = {sub: 'sub-cy', email: 'cy@example.com'};
    const third = await signIn(base, canvas, 'shop.3');
    expect(third.outcome).toMatchObject({state: 'signedIn', source: 'shop.3', existing: false});
    expect(orchestrator.vault.accountsOf('shop')).toEqual([
      {n: 1, label: 'ada@example.com'},
      {n: 2, label: 'bob@example.com'},
      {n: 3, label: 'cy@example.com'},
    ]);
    const artifact = await fixtureArtifact(FAKE_CATALOG_ID);
    const over = await orchestrator.registry.install({
      appId: 'shop',
      cardUrl: `${vendors[0]!.url}/.well-known/agent-card.json`,
      catalogs: [artifact],
    });
    expect(over.ok).toBe(true);
    expect(orchestrator.vault.accountsOf('shop')).toHaveLength(3);
  });
});

describe('the account choice (task 12.6)', () => {
  test('a chosen account whose sign-in ran out takes "sign in again" in the choice’s place; a live one is dispatched with its header', async () => {
    let plan: () => ReturnType<typeof layoutFor> = shopOnly;
    const {base, client, orchestrator} = await boot({
      apps: {shop: {card: oauthCard(), admit: admitsTokens()}},
      plan: () => plan(),
    });
    const canvas = contextOf(await collect(client, utterance('my orders')));
    await signIn(base, canvas, 'shop.1');
    auth.account = {sub: 'sub-bob', email: 'bob@example.com'};
    await signIn(base, canvas, 'shop.2');
    await orchestrator.vault.markAgain('shop.2', 'test');
    plan = () => ({
      dispatch: [{chooseAccount: 'shop', request: 'Cancel my last order.'}],
      tree: {components: [{id: 'root', component: 'Slot', chooseAccount: 'shop'}]},
      dataModel: {},
    });

    const asked = contextOf(await collect(client, utterance('cancel my last order')));
    const ran = await collect(client, press('useAccount', 'shop.2', asked));
    expect(slotOf(ran, 'shop.2')).toMatchObject({state: 'authority', authority: {cause: 'again'}});
    expect(vendors[0]!.requests).toHaveLength(0);

    const live = contextOf(await collect(client, utterance('cancel my last order')));
    const sent = await collect(client, press('useAccount', 'shop.1', live));
    expect(slotOf(sent, 'shop.1')).toMatchObject({
      state: 'pending',
      label: 'Shop · ada@example.com',
    });
    expect(vendors[0]!.requests).toHaveLength(1);
    expect(vendors[0]!.requests[0]!.authorization).toMatch(/^Bearer /);
  });
});

describe('on the wire', () => {
  test('a token nearly expired is refreshed before the dispatch, the new one on the wire', async () => {
    auth.expiresIn = 30;
    const {base, client} = await boot({
      apps: {shop: {card: oauthCard(), admit: admitsTokens()}},
      plan: shopOnly,
    });
    const canvas = contextOf(await collect(client, utterance('my orders')));
    await signIn(base, canvas, 'shop.1');
    await collect(client, press('retry', 'shop.1', canvas));
    expect(auth.refreshes).toBe(1);
    expect(vendors[0]!.requests).toHaveLength(1);
  });

  test('a 401 is answered with one refresh and one resend', async () => {
    let refuseFirst = true;
    const {base, client} = await boot({
      apps: {
        shop: {
          card: oauthCard(),
          admit: req => {
            if (refuseFirst) {
              refuseFirst = false;
              return false;
            }
            return admitsTokens()(req);
          },
        },
      },
      plan: shopOnly,
    });
    const canvas = contextOf(await collect(client, utterance('my orders')));
    await signIn(base, canvas, 'shop.1');
    const events = await collect(client, press('retry', 'shop.1', canvas));
    expect(auth.refreshes).toBe(1);
    expect(vendors[0]!.requests).toHaveLength(1);
    expect(slotOf(events, 'shop.1')).toMatchObject({state: 'pending'});
  });

  test('concurrent refusals of one account share one refresh', async () => {
    const {base, client, orchestrator} = await boot({
      apps: {shop: {card: oauthCard()}},
      plan: shopOnly,
    });
    const canvas = contextOf(await collect(client, utterance('my orders')));
    await signIn(base, canvas, 'shop.1');
    const prepared = await orchestrator.vault.prepare('shop.1');
    const sent = prepared && 'headers' in prepared ? prepared.headers : {};
    const [a, b] = await Promise.all([
      orchestrator.vault.unauthorized('shop.1', sent),
      orchestrator.vault.unauthorized('shop.1', sent),
    ]);
    expect(auth.refreshes).toBe(1);
    expect(a).toEqual(b);
  });

  test('a refresh the server refuses makes the account sign in again, kept with its label', async () => {
    const {base, client, orchestrator} = await boot({
      apps: {shop: {card: oauthCard(), admit: admitsTokens()}},
      plan: shopOnly,
    });
    const canvas = contextOf(await collect(client, utterance('my orders')));
    await signIn(base, canvas, 'shop.1');
    auth.endAll();
    const events = await collect(client, press('retry', 'shop.1', canvas));
    expect(slotOf(events, 'shop.1')).toMatchObject({
      state: 'authority',
      authority: {cause: 'again'},
    });
    expect(orchestrator.vault.accountsOf('shop')).toEqual([{n: 1, label: 'ada@example.com'}]);
    // Signing in again replaces its tokens, bound to the account.
    const again = await signIn(base, canvas, 'shop.1');
    expect(again.outcome).toMatchObject({state: 'signedIn', source: 'shop.1'});
    expect(auth.authorizations.at(-1)!.get('login_hint')).toBe('sub-ada');
  });

  test('signing in again to a server that lost the account re-binds it, said on the outcome; one already held is refused (task-12.13 decision 24)', async () => {
    const {base, client, orchestrator} = await boot({
      apps: {shop: {card: oauthCard(), admit: admitsTokens()}},
      plan: shopOnly,
    });
    const canvas = contextOf(await collect(client, utterance('my orders')));
    await signIn(base, canvas, 'shop.1');
    auth.endAll();
    await collect(client, press('retry', 'shop.1', canvas));
    auth.forgets = true;
    auth.account = {sub: 'sub-ada-again', email: 'ada.new@example.com'};
    const again = await signIn(base, canvas, 'shop.1');
    expect(again.outcome).toMatchObject({
      state: 'signedIn',
      source: 'shop.1',
      label: 'ada.new@example.com',
      rebound: true,
    });
    expect(orchestrator.vault.accountsOf('shop')).toEqual([{n: 1, label: 'ada.new@example.com'}]);
    expect(
      await signInLinesWith({event: 'signedIn', source: 'shop.1', rebound: true}),
    ).toBeTruthy();

    // A second account, then the first's sign-in again comes back as it: refused.
    auth.account = {sub: 'sub-bob', email: 'bob@example.com'};
    await signIn(base, canvas, 'shop', {});
    auth.endAll();
    await collect(client, press('retry', 'shop.1', canvas));
    const twice = await signIn(base, canvas, 'shop.1');
    expect(twice.outcome).toMatchObject({state: 'failed', reason: 'that account is already added'});
  });
});

describe("the agent's requests for more access", () => {
  test('before any paint: the tile asks for more access, with only the missing scopes (task-12.13 decision 50)', async () => {
    const {base, client} = await boot({
      apps: {
        shop: {
          card: oauthCard(),
          admit: admitsTokens(),
          script: authRequired([{signIn: ['write']}]),
        },
      },
      plan: shopOnly,
    });
    const canvas = contextOf(await collect(client, utterance('my orders')));
    await signIn(base, canvas, 'shop.1');
    const events = await collect(client, press('retry', 'shop.1', canvas));
    expect(slotOf(events, 'shop.1')).toMatchObject({
      state: 'authority',
      authority: {cause: 'more', quiet: true, scopes: ['Change your orders']},
    });
  });

  test('an account held short of what the card now requires: the tile asks for more access (task-12.13 decision 50)', async () => {
    const card = oauthCard();
    const {base, client, orchestrator} = await boot({
      apps: {shop: {card, admit: admitsTokens()}},
      plan: shopOnly,
    });
    const canvas = contextOf(await collect(client, utterance('my orders', 'page-1')));
    await signIn(base, canvas, 'shop.1');
    // The card's requirement grows, installed over: the account holds read alone.
    (card.security![0]!.signIn as string[]).push('write');
    const over = await orchestrator.registry.install({
      appId: 'shop',
      cardUrl: `${vendors[0]!.url}/.well-known/agent-card.json`,
      catalogs: [await fixtureArtifact(FAKE_CATALOG_ID)],
    });
    expect(over.ok).toBe(true);
    const events = await collect(client, utterance('my orders', 'page-2'));
    expect(slotOf(events, 'shop.1')).toMatchObject({
      state: 'authority',
      authority: {cause: 'more', scopes: ['Change your orders']},
    });
  });

  test('after a paint: the chip on the attribution row, Not now drops it, Allow sends the press again', async () => {
    const {base, client} = await boot({
      apps: {
        shop: {
          card: oauthCard(),
          admit: admitsTokens(),
          script: sequence(
            deterministicScript,
            authRequired([{signIn: ['write']}]),
            authRequired([{signIn: ['write']}]),
            deterministicScript,
          ),
        },
      },
      plan: shopOnly,
    });
    const canvas = contextOf(await collect(client, utterance('my orders')));
    await signIn(base, canvas, 'shop.1');
    await collect(client, press('retry', 'shop.1', canvas));

    const asked = await collect(client, action('shop.1', canvas));
    expect(attributionOf(asked, 'shop.1')).toMatchObject({
      escalation: {scopes: ['Change your orders']},
    });
    expect(asked.at(-1)).toMatchObject({status: {state: 'completed'}});

    await signInLinesWith({
      event: 'escalationRequested',
      appId: 'shop',
      source: 'shop.1',
      scopes: ['write'],
      valid: true,
    });

    const dismissed = await collect(client, press('dismiss', 'shop.1', canvas));
    expect(attributionOf(dismissed, 'shop.1')).not.toHaveProperty('escalation');
    await signInLinesWith({event: 'notNow', appId: 'shop', source: 'shop.1', scopes: ['write']});

    await collect(client, action('shop.1', canvas));
    const escalated = await signIn(base, canvas, 'shop.1');
    expect(escalated.outcome).toMatchObject({state: 'signedIn', source: 'shop.1', existing: true});
    const authorization = auth.authorizations.at(-1)!;
    expect(authorization.get('login_hint')).toBe('sub-ada');
    expect(authorization.get('scope')).toBe('openid write');

    const resumed = await collect(client, press('retry', 'shop.1', canvas));
    expect(attributionOf(resumed, 'shop.1')).not.toHaveProperty('escalation');
    const last = vendors[0]!.requests.at(-1)!;
    expect(last.message.parts[0]).toMatchObject({kind: 'data', data: {action: {name: 'close'}}});
    expect(auth.scopesOf(last.authorization!.replace('Bearer ', ''))).toEqual(
      expect.arrayContaining(['read', 'write']),
    );
  });

  test('a later press in the fragment drops the request the earlier press left: no chip, journaled superseded, nothing held to send again (task-12.13 decision 39)', async () => {
    const {base, client} = await boot({
      apps: {
        shop: {
          card: oauthCard(),
          admit: admitsTokens(),
          script: sequence(
            deterministicScript,
            authRequired([{signIn: ['write']}]),
            deterministicScript,
          ),
        },
      },
      plan: shopOnly,
    });
    const canvas = contextOf(await collect(client, utterance('my orders')));
    await signIn(base, canvas, 'shop.1');
    await collect(client, press('retry', 'shop.1', canvas));
    const asked = await collect(client, action('shop.1', canvas));
    expect(attributionOf(asked, 'shop.1')).toMatchObject({
      escalation: {scopes: ['Change your orders']},
    });

    const later = await collect(client, action('shop.1', canvas));
    expect(attributionOf(later, 'shop.1')).not.toHaveProperty('escalation');
    await signInLinesWith({
      event: 'superseded',
      appId: 'shop',
      source: 'shop.1',
      scopes: ['write'],
    });
    const requests = vendors[0]!.requests.length;
    const refused = await collect(client, press('dismiss', 'shop.1', canvas));
    expect(refused.at(-1)).toMatchObject({status: {state: 'failed'}});
    expect(vendors[0]!.requests).toHaveLength(requests);
  });

  test('a key the card does not declare fails the slot; a request naming nothing is a 401', async () => {
    const {base, client} = await boot({
      apps: {
        shop: {
          card: oauthCard(),
          admit: admitsTokens(),
          script: sequence(
            authRequired([{signIn: ['delete']}]),
            authRequired(undefined),
            deterministicScript,
          ),
        },
      },
      plan: shopOnly,
    });
    const canvas = contextOf(await collect(client, utterance('my orders')));
    await signIn(base, canvas, 'shop.1');
    const invalid = await collect(client, press('retry', 'shop.1', canvas));
    expect(slotOf(invalid, 'shop.1')).toMatchObject({state: 'failed', failure: {cause: 'invalid'}});
    await signInLinesWith({
      event: 'escalationRequested',
      appId: 'shop',
      source: 'shop.1',
      scopes: ['delete'],
      valid: false,
      reason: 'the card declares no scope delete',
    });
    const unnamed = await collect(client, press('retry', 'shop.1', canvas));
    expect(auth.refreshes).toBe(1);
    expect(slotOf(unnamed, 'shop.1')).toMatchObject({state: 'pending'});
  });
});

describe('the merge, key accounts, uninstall, secrets', () => {
  test('a home source needing sign-in resolves at once: the merge collapses, the other source dispatched', async () => {
    const {client} = await boot({
      apps: {shop: {card: oauthCard()}, mart: {}},
      plan: () =>
        layoutFor(['shop.1', 'mart'], {
          merged: 'Compare orders',
          join: {home: 'shop.1', entity: 'order', nouns: {'shop.1': 'orders', mart: 'orders'}},
        }),
    });
    const events = await collect(client, utterance('compare my orders'));
    expect(slotOf(events, 'shop.1')).toMatchObject({state: 'authority'});
    const merged = lastShell(events).find(c => c.component === 'Slot' && c.source === 'shell');
    expect(merged).toMatchObject({state: 'collapsed', collapse: {cause: 'home'}});
    expect(vendors[1]!.requests).toHaveLength(1);
  });

  test('a key on the token page: the description plain, the post from our own origin, the same key one account', async () => {
    const keyCard: Partial<AgentCard> = {
      securitySchemes: {
        key: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Api-Key',
          description: 'Find your key under <b>Settings</b> → Keys. https://evil.example',
        },
      },
      security: [{key: []}],
      documentationUrl: 'https://shop.example/help',
    };
    const {base, client, orchestrator} = await boot({
      apps: {shop: {card: keyCard, admit: req => req.header('x-api-key') === 'demo-key'}},
      plan: shopOnly,
    });
    const first = await collect(client, utterance('my orders'));
    // A key says Connect (task-12.13 decision 30).
    expect(slotOf(first, 'shop.1')).toMatchObject({authority: {cause: 'connect', scopes: []}});
    const canvas = contextOf(first);

    const pasteKey = async (origin: string, key: string) => {
      const attempt = randomBytes(16).toString('base64url');
      const start = await fetch(
        `${base}/auth/start?attempt=${attempt}&canvas=${canvas}&source=shop.1`,
        {
          redirect: 'manual',
        },
      );
      const cookie = (start.headers.get('set-cookie') ?? '').split(';')[0]!;
      const page = await fetch(new URL(start.headers.get('location')!, base), {headers: {cookie}});
      const posted = await fetch(`${base}/auth/key`, {
        method: 'POST',
        headers: {cookie, origin, 'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({attempt, key}).toString(),
      });
      return {page: await page.text(), policy: page.headers.get('referrer-policy'), posted};
    };

    const forged = await pasteKey('https://evil.example', 'attacker-key');
    expect(forged.posted.status).toBe(403);
    // A dev tunnel hands the form on with Origin rewritten to the local address (task-12.13
    // decision 29): past the origin check, refused here only for want of a bound attempt.
    const tunnelled = await fetch(`${base}/auth/key`, {
      method: 'POST',
      headers: {
        origin: `http://localhost:${new URL(base).port}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({attempt: 'none', key: 'x'}).toString(),
    });
    expect(tunnelled.status).toBe(400);
    const {page, policy, posted} = await pasteKey(new URL(base).origin, 'demo-key');
    // A browser sends the form's Origin only under a policy that keeps it same-origin (Fetch §3.2).
    expect(policy).toBe('same-origin');
    expect(page).toContain('From Shop:');
    expect(page).toContain('&lt;b&gt;Settings&lt;/b&gt;');
    expect(page).not.toContain('href="https://evil.example');
    expect(page).toContain("Open Shop's help page");
    // A key says connected, and the window says it closes (task-12.13 decisions 30, 31).
    const ended = await posted.text();
    expect(ended).toContain("You're connected to Shop");
    expect(ended).toContain('This window closes in');
    expect(ended).toContain('Close now');
    expect(orchestrator.vault.accountsOf('shop')).toEqual([{n: 1, label: 'Shop account 1'}]);

    await collect(client, press('retry', 'shop.1', canvas));
    expect(vendors[0]!.requests.at(-1)!.apiKey).toBe('demo-key');
  });

  test('uninstall revokes each account where the server advertises it; the journal and the logs hold no secret', async () => {
    const {base, client, orchestrator} = await boot({
      apps: {
        shop: {card: oauthCard(), admit: admitsTokens(), script: sequence(deterministicScript)},
      },
      plan: shopOnly,
    });
    const canvas = contextOf(await collect(client, utterance('my orders')));
    const signedIn = await signIn(base, canvas, 'shop.1');
    await collect(client, press('retry', 'shop.1', canvas));
    const uninstalled = await orchestrator.registry.uninstall('shop');
    expect(uninstalled.ok).toBe(true);
    expect(auth.revoked).toHaveLength(1);
    expect(orchestrator.vault.accountsOf('shop')).toEqual([]);

    // The journal's lines are written as they come; the last one lands just after.
    let journal = '';
    await vi.waitFor(async () => {
      journal = await readFile(join(dir, JOURNAL_FILE), 'utf8');
      const lines = journal
        .trim()
        .split('\n')
        .map(line => JSON.parse(line));
      expect(lines.filter(line => line.kind === 'signIn').map(line => line.event)).toEqual(
        expect.arrayContaining(['started', 'signedIn', 'revoked']),
      );
    });
    const secrets = [...auth.issued, signedIn.cookie!.split('=')[1]!];
    for (const secret of secrets) {
      expect(journal).not.toContain(secret);
      expect(logged.join('\n')).not.toContain(secret);
    }
  });
});
