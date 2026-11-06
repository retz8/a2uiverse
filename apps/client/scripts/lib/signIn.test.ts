/**
 * The recorder's sign-in walk (task-12.12 decision 5) against a fake orchestrator and a fake agent
 * that keep the real routes' contract: the start route's cookie and redirect, its refusal of a number
 * past the vault's next, the non-interactive entry, the callback on the orchestrator's public address,
 * the vault keeping one identity as one account, the attempt's outcome, the accounts read.
 */
import {createServer, type IncomingMessage, type Server, type ServerResponse} from 'node:http';
import type {AddressInfo} from 'node:net';
import {afterEach, describe, expect, it, test} from 'vitest';
import {
  accountsFor,
  bindingCookie,
  fakeAccountOf,
  heldBeside,
  onOrchestrator,
  signIn,
  signInLine,
  withFakeAccount,
  type SignedIn,
} from './signIn';

test('a beat names its accounts, otherwise an app signs in as its one account', () => {
  expect(accountsFor('gmail')).toEqual(['you']);
  expect(accountsFor('gmail', {gmail: ['you', 'personal']})).toEqual(['you', 'personal']);
  expect(() => accountsFor('somebody-else')).toThrow(/no fake account/);
});

test('the entry is added to the sign-in address, and the return lands on the orchestrator in hand', () => {
  expect(withFakeAccount('http://localhost:11001/oauth/authorize?state=s', 'retz8')).toBe(
    'http://localhost:11001/oauth/authorize?state=s&fake_account=retz8',
  );
  expect(
    onOrchestrator(
      'https://t-10001.asse.devtunnels.ms/auth/callback?code=c&state=s',
      'http://localhost:10001',
    ),
  ).toBe('http://localhost:10001/auth/callback?code=c&state=s');
  expect(bindingCookie(['a2uiverse_signin_a1=b1; Max-Age=600; Path=/auth', 'x=y'], 'a1')).toBe(
    'a2uiverse_signin_a1=b1',
  );
  expect(bindingCookie(['x=y'], 'a1')).toBeUndefined();
});

const servers: Server[] = [];
afterEach(() => {
  for (const server of servers.splice(0)) server.close();
});

async function serve(handle: (req: IncomingMessage, res: ServerResponse, url: URL) => void) {
  const server = createServer((req, res) => handle(req, res, new URL(req.url!, 'http://x')));
  servers.push(server);
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

const json = (res: ServerResponse, body: unknown) =>
  res.writeHead(200, {'content-type': 'application/json'}).end(JSON.stringify(body));

/** An account in the fake vault: its number, the identity behind it, what it is called. */
interface HeldAccount {
  n: number;
  identity: string;
  label: string;
  lapsed?: boolean;
}

/**
 * A fake stack holding Gmail, which asks sign-in, and Shop A, which does not, on a vault as `next`
 * and `accounts` say. Gives the orchestrator's address and each sign-in the agent's return reached,
 * as `<source sent> <code>`.
 */
async function stack(next: number, accounts: HeldAccount[] = []) {
  const vault = {next, accounts: [...accounts]};
  const asked: string[] = [];
  const agent = await serve((_req, res, url) => {
    if (url.pathname === '/.well-known/agent-card.json') {
      return json(res, {url: agent, security: [{signIn: ['read']}]});
    }
    // The kit's sign-in page: the entry goes straight back with a code.
    const back = new URL(url.searchParams.get('redirect_uri')!);
    back.searchParams.set('code', `code-${url.searchParams.get('fake_account')}`);
    back.searchParams.set('state', url.searchParams.get('state')!);
    res.writeHead(302, {location: back.toString()}).end();
  });
  const open = await serve((_req, res) => json(res, {url: 'http://open', security: []}));
  const attempts = new Map<
    string,
    {sent: string; state: string; account?: HeldAccount; existing?: boolean}
  >();
  // Behind a tunnel the orchestrator's public address is not the one the script talks to.
  const publicUrl = 'https://t-10001.asse.devtunnels.ms';
  const orchestrator = await serve((req, res, url) => {
    if (url.pathname === '/.well-known/agent-card.json') return json(res, {url: publicUrl});
    if (url.pathname === '/registry/apps.json') {
      return json(res, [
        {id: 'gmail', cardUrl: `${agent}/.well-known/agent-card.json`},
        {id: 'shop-a', cardUrl: `${open}/.well-known/agent-card.json`},
      ]);
    }
    if (url.pathname === '/auth/accounts.json') {
      return json(res, [
        {
          appId: 'gmail',
          signIn: 'supported',
          accounts: vault.accounts.map(account => ({
            source: `gmail.${account.n}`,
            label: account.label,
            kind: 'oauth',
            permissions: [],
            lapsed: account.lapsed === true,
          })),
        },
        {appId: 'shop-a', signIn: 'none', accounts: []},
      ]);
    }
    if (url.pathname === '/auth/start') {
      const attempt = url.searchParams.get('attempt')!;
      const sent = url.searchParams.get('source')!;
      expect(url.searchParams.get('canvas')).toBe('canvas-1');
      // The real route: a number past the vault's next, or one it retired, is no such account.
      const number = /\.(\d+)$/.exec(sent)?.[1];
      if (number !== undefined && Number(number) !== vault.next) {
        return res.writeHead(400).end('refused');
      }
      attempts.set(attempt, {sent, state: 'pending'});
      const to = new URL(`${agent}/oauth/authorize`);
      to.searchParams.set('redirect_uri', `${publicUrl}/auth/callback`);
      to.searchParams.set('state', attempt);
      return res
        .writeHead(302, {
          location: to.toString(),
          'set-cookie': `a2uiverse_signin_${attempt}=b; Path=/auth`,
        })
        .end();
    }
    if (url.pathname === '/auth/callback') {
      const id = url.searchParams.get('state')!;
      const attempt = attempts.get(id)!;
      const code = url.searchParams.get('code')!;
      asked.push(`${attempt.sent} ${code}`);
      if (req.headers.cookie !== `a2uiverse_signin_${id}=b`) {
        attempt.state = 'failed';
        return res.writeHead(200).end('done');
      }
      // The vault's own rule: the same identity signed in twice stays one account.
      const identity = code.replace(/^code-/, '');
      const held = vault.accounts.find(account => account.identity === identity);
      attempt.existing = held !== undefined;
      attempt.account = held ?? {n: vault.next, identity, label: `${identity} label`};
      if (!held) {
        vault.next += 1;
        vault.accounts.push(attempt.account);
      }
      attempt.state = 'signedIn';
      return res.writeHead(200).end('done');
    }
    const attempt = attempts.get(url.pathname.split('/').pop()!)!;
    return json(res, {
      state: attempt.state,
      ...(attempt.account
        ? {
            source: `gmail.${attempt.account.n}`,
            label: attempt.account.label,
            existing: attempt.existing,
          }
        : {}),
    });
  });
  return {orchestrator, asked};
}

test('every account goes out under the bare app id, and the vault numbers it', async () => {
  const {orchestrator, asked} = await stack(5);

  const signedIn: SignedIn[] = await signIn(orchestrator, 'canvas-1', {gmail: ['you', 'personal']});

  expect(asked).toEqual(['gmail code-you', 'gmail code-personal']);
  expect(signedIn).toEqual([
    {source: 'gmail.5', as: 'you', label: 'you label', held: false},
    {source: 'gmail.6', as: 'personal', label: 'personal label', held: false},
  ]);
});

test('on an empty vault the first account is number 1', async () => {
  const {orchestrator} = await stack(1);

  expect(await signIn(orchestrator, 'canvas-1')).toEqual([
    {source: 'gmail.1', as: 'you', label: 'you label', held: false},
  ]);
});

test('an identity the vault holds lands on its own number, reported as held', async () => {
  const {orchestrator} = await stack(4, [{n: 2, identity: 'you', label: 'you@example.com'}]);

  expect(await signIn(orchestrator, 'canvas-1')).toEqual([
    {source: 'gmail.2', as: 'you', label: 'you@example.com', held: true},
  ]);
});

test('two named accounts signed in again land on the accounts the first run added', async () => {
  const {orchestrator, asked} = await stack(3);
  const named = {gmail: ['you', 'personal']};

  await signIn(orchestrator, 'canvas-1', named);
  const again = await signIn(orchestrator, 'canvas-1', named);

  expect(asked).toHaveLength(4);
  expect(again).toEqual([
    {source: 'gmail.3', as: 'you', label: 'you label', held: true},
    {source: 'gmail.4', as: 'personal', label: 'personal label', held: true},
  ]);
});

test('the accounts held beside the run are read from the vault, lapsed where they are', async () => {
  const {orchestrator} = await stack(5, [
    {n: 2, identity: 'work', label: 'work@example.com', lapsed: true},
    {n: 3, identity: 'home', label: 'home@example.com'},
    {n: 4, identity: 'you', label: 'you@example.com'},
  ]);

  const signedIn = await signIn(orchestrator, 'canvas-1');

  expect(await heldBeside(orchestrator, signedIn)).toEqual([
    {source: 'gmail.2', label: 'work@example.com', lapsed: true},
    {source: 'gmail.3', label: 'home@example.com', lapsed: false},
  ]);
});

test('the sign-in line says held or added, and names what the vault holds besides', () => {
  const line = signInLine(
    [
      {source: 'gmail.4', as: 'you', label: 'you@example.com', held: true},
      {source: 'gmail.5', as: 'personal', label: '', held: false},
    ],
    [
      {source: 'gmail.2', label: 'work@example.com', lapsed: true},
      {source: 'gmail.3', label: 'home@example.com', lapsed: false},
    ],
  );

  expect(line).toContain('gmail.4 as you (you@example.com), held');
  expect(line).toContain('gmail.5 as personal, added');
  expect(line).toContain('gmail.2 (work@example.com), lapsed');
  expect(line).toContain('gmail.3 (home@example.com)');
  expect(line).not.toContain('gmail.3 (home@example.com), lapsed');
});

test('the sign-in line names no held account when the vault holds only what the run signed in', () => {
  const alone = signInLine([{source: 'gmail.1', as: 'you', label: '', held: false}], []);
  expect(alone).not.toMatch(/also/);
  expect(signInLine([], [])).toContain('no app asks sign-in');
});

describe('the direct side pairs a slot with the account the hub signed in for it', () => {
  const hub = (source: string, as: string): SignedIn => ({source, as, label: '', held: false});

  it('assumes no number: one account per app is whatever source the hub answered', () => {
    expect(fakeAccountOf('github.4', [hub('github.4', 'retz8')])).toBe('retz8');
  });

  it('pairs the i-th source reported for an app with the i-th account named for it', () => {
    const signedIn = [hub('calendar.2', 'you'), hub('gmail.7', 'you'), hub('gmail.9', 'personal')];
    const named = {gmail: ['you', 'personal']};
    expect(fakeAccountOf('gmail.7', signedIn, named)).toBe('you');
    expect(fakeAccountOf('gmail.9', signedIn, named)).toBe('personal');
  });

  it('gives an app on a key its key, not the digest the hub’s result names it by', () => {
    expect(fakeAccountOf('shop-b.2', [hub('shop-b.2', 'key 1a2b3c4d')])).toBe(
      'northlight-demo-key-4f7c2a',
    );
  });

  it('pairs nothing with an account the run did not sign in', () => {
    expect(fakeAccountOf('github.3', [hub('github.4', 'retz8')])).toBeUndefined();
  });

  it('pairs nothing with an app that asks no sign-in', () => {
    expect(fakeAccountOf('shop-a', [hub('github.4', 'retz8')])).toBeUndefined();
  });
});
