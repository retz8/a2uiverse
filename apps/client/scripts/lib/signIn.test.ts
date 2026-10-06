/**
 * The recorder's sign-in walk (task-12.12 decision 5) against a fake orchestrator and a fake agent
 * that keep the real routes' contract: the start route's cookie and redirect, the non-interactive
 * entry, the callback on the orchestrator's public address, the attempt's outcome.
 */
import {createServer, type IncomingMessage, type Server, type ServerResponse} from 'node:http';
import type {AddressInfo} from 'node:net';
import {afterEach, expect, test} from 'vitest';
import {
  accountsFor,
  bindingCookie,
  onOrchestrator,
  signIn,
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

test('every app asking sign-in is signed in through the start route, the entry and the callback', async () => {
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
  const attempts = new Map<string, {source: string; binding: string; state: string}>();
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
    if (url.pathname === '/auth/start') {
      const attempt = url.searchParams.get('attempt')!;
      expect(url.searchParams.get('canvas')).toBe('canvas-1');
      attempts.set(attempt, {
        source: url.searchParams.get('source')!,
        binding: 'b',
        state: 'pending',
      });
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
      const attempt = attempts.get(url.searchParams.get('state')!)!;
      const bound = req.headers.cookie === `a2uiverse_signin_${url.searchParams.get('state')}=b`;
      asked.push(`${attempt.source} ${url.searchParams.get('code')}`);
      attempt.state = bound ? 'signedIn' : 'failed';
      return res.writeHead(200).end('done');
    }
    const id = url.pathname.split('/').pop()!;
    const attempt = attempts.get(id)!;
    return json(res, {
      state: attempt.state,
      source: attempt.source,
      label: `${attempt.source} label`,
    });
  });

  const signedIn: SignedIn[] = await signIn(orchestrator, 'canvas-1', {gmail: ['you', 'personal']});

  expect(asked).toEqual(['gmail.1 code-you', 'gmail.2 code-personal']);
  expect(signedIn).toEqual([
    {source: 'gmail.1', as: 'you', label: 'gmail.1 label'},
    {source: 'gmail.2', as: 'personal', label: 'gmail.2 label'},
  ]);
});
