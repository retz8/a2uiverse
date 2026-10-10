/**
 * A scripted marketplace for Stellify's tests (task-13.4 decision 13): the sdk's routes over
 * `node:http`, each write answered as the test scripts it, every request recorded so the tests
 * assert what went on the wire — the claim body, the bearer token, each artifact's files, the
 * preview beside them. The reads serve what the test put in: entries at `index.json`, artifact
 * files under their id.
 */
import {createServer, type Server} from 'node:http';
import {
  ARTIFACT_DESCRIPTOR_FILE,
  artifactIdOf,
  mintPublisherToken,
  type IndexEntry,
} from '@a2uiverse/sdk';

export interface Received {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface Answer {
  status: number;
  body: unknown;
}

export interface FakeMarketplaceOptions {
  claim?: (body: unknown) => Answer;
  publish?: (body: unknown, token: string | undefined) => Answer;
  unpublish?: (body: unknown, token: string | undefined) => Answer;
  entries?: IndexEntry[];
  /** Artifacts served under their id: each a map of path to bytes, the descriptor among them. */
  artifacts?: ReadonlyMap<string, Uint8Array>[];
}

export interface FakeMarketplace {
  url: string;
  requests: Received[];
  entries: IndexEntry[];
  token: string;
  close(): Promise<void>;
}

const json = (status: number, body: unknown): Answer => ({status, body});

export async function startFakeMarketplace(
  options: FakeMarketplaceOptions = {},
): Promise<FakeMarketplace> {
  const token = mintPublisherToken();
  const requests: Received[] = [];
  const entries = options.entries ?? [];
  const artifacts = new Map<string, ReadonlyMap<string, Uint8Array>>();
  for (const files of options.artifacts ?? []) {
    artifacts.set(await artifactIdOf(files.get(ARTIFACT_DESCRIPTOR_FILE)!), files);
  }
  const claim =
    options.claim ??
    ((body: unknown) => json(201, {publisher: (body as {publisher: string}).publisher, token}));
  const publish =
    options.publish ??
    ((body: unknown, given: string | undefined) =>
      given === token
        ? json(200, {
            ok: true,
            appId: (body as {appId: string}).appId,
            version: '0.1.0',
            summary: `published ${(body as {appId: string}).appId} · card 0.1.0 · catalog sha256-xxxxxxxx…`,
            notes: ['app id "star" is now acme’s'],
          })
        : json(401, {ok: false, findings: ['the publisher token is missing or wrong']}));
  const unpublish =
    options.unpublish ??
    ((body: unknown, given: string | undefined) =>
      given === token
        ? json(200, {ok: true, appId: (body as {appId: string}).appId})
        : json(401, {ok: false, findings: ['the publisher token is missing or wrong']}));

  const server: Server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const raw = Buffer.concat(chunks).toString('utf8');
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers[key] = value;
    }
    let body: unknown = undefined;
    if (raw !== '') {
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw;
      }
    }
    const url = new URL(req.url ?? '/', 'http://fake');
    const path = url.pathname.replace(/^\//, '');
    requests.push({method: req.method ?? '', path, headers, body});
    const bearer = /^Bearer (.+)$/.exec(headers.authorization ?? '')?.[1];
    const answer = (a: Answer) => {
      res.writeHead(a.status, {'content-type': 'application/json'});
      res.end(JSON.stringify(a.body));
    };
    if (req.method === 'GET' && path === 'index.json') return answer(json(200, entries));
    const artifact = /^artifacts\/([^/]+)\/(.+)$/.exec(path);
    if (req.method === 'GET' && artifact) {
      const files = artifacts.get(artifact[1]!);
      const bytes = files?.get(artifact[2]!);
      if (!bytes) return answer(json(404, {ok: false, findings: ['not found']}));
      res.writeHead(200, {'content-type': 'application/octet-stream'});
      res.end(Buffer.from(bytes));
      return;
    }
    if (req.method === 'POST' && path === 'claim') return answer(claim(body));
    if (req.method === 'POST' && path === 'publish') return answer(publish(body, bearer));
    if (req.method === 'POST' && path === 'unpublish') return answer(unpublish(body, bearer));
    answer(json(404, {ok: false, findings: [`no route ${req.method} /${path}`]}));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('fake marketplace: no port');
  return {
    url: `http://127.0.0.1:${address.port}`,
    requests,
    entries,
    token,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close(err => (err ? reject(err) : resolve()));
      }),
  };
}

/** An entry as the marketplace lists it, for a test that scripts `index.json`. */
export function entryFor(
  appId: string,
  options: {
    publisher?: string;
    version?: string;
    catalogs?: Record<string, string>;
    retired?: string[];
    aheadOfStore?: IndexEntry['aheadOfStore'];
    versions?: string[];
  } = {},
): IndexEntry {
  const version = options.version ?? '0.1.0';
  return {
    appId,
    publisher: options.publisher ?? 'acme',
    cardUrl: `http://127.0.0.1:1/${appId}/.well-known/agent-card.json`,
    card: {name: appId, description: 'an app', url: `http://127.0.0.1:1/${appId}`, version},
    catalogs: options.catalogs ?? {},
    versions: options.versions ?? [version],
    publishedAt: '2026-10-10T00:00:00.000Z',
    retired: options.retired ?? [],
    ...(options.aheadOfStore ? {aheadOfStore: options.aheadOfStore} : {}),
  };
}
