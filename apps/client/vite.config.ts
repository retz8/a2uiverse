import {createReadStream, existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import type {IncomingMessage, ServerResponse} from 'node:http';
import {extname, join, normalize, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import react from '@vitejs/plugin-react';
import type {Plugin} from 'vite';
import {configDefaults, defineConfig} from 'vitest/config';
import {
  REGISTRY_SNAPSHOT_DIR,
  searchWorld,
  storeWorld,
  type RecordedStoreApp,
  type StoreWorld,
} from '@a2uiverse/registry-snapshot';

const CONTENT_TYPES: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

/** The recorded Store captures the world takes its cards and samples from (task-14.10 decision 15). */
const STORE_RECORDINGS = fileURLToPath(new URL('./recordings/store/', import.meta.url));

/** An artifact's files never change under its id. */
const IMMUTABLE = 'public, max-age=31536000, immutable';

/** Serves the files under `root` at the request's path, `cache` as each one's Cache-Control. */
function serveFiles(root: string, cache: (path: string) => string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0]!));
    const file = join(root, path);
    if (!file.startsWith(root + sep) || !existsSync(file)) return next();
    if (!statSync(file).isFile()) return next();
    res.setHeader('Content-Type', CONTENT_TYPES[extname(file)] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', cache(path));
    createReadStream(file).pipe(res);
  };
}

/** The world, from the recordings and the snapshot's table. */
function readWorld(): StoreWorld {
  const recordings = readdirSync(STORE_RECORDINGS)
    .filter(name => name.endsWith('.json'))
    .map(
      name => JSON.parse(readFileSync(join(STORE_RECORDINGS, name), 'utf8')) as RecordedStoreApp,
    );
  const table = JSON.parse(readFileSync(join(REGISTRY_SNAPSHOT_DIR, 'catalogs.json'), 'utf8'));
  return storeWorld({recordings, table});
}

/**
 * The trusted page's reads answered from the fixed world (task-14.10 decision 14), each as the
 * orchestrator answers it: the installed apps and their update states, every app's accounts, the
 * Store's listings — its index, its search, an app's entry and sample — and who is signed in to
 * Publish with their listings. Writes are no read: each test answers its own.
 */
function worldRoutes(world: StoreWorld) {
  const reads: Record<string, (url: URL) => {status: number; body: unknown}> = {
    '/registry/apps.json': () => ({status: 200, body: world.installed}),
    '/registry/updates.json': () => ({status: 200, body: world.updates}),
    '/auth/accounts.json': () => ({status: 200, body: world.accounts}),
    '/marketplace/index.json': () => ({status: 200, body: world.index}),
    '/marketplace/search': url => ({
      status: 200,
      body: {results: searchWorld(world, url.searchParams.get('q') ?? '')},
    }),
    '/marketplace/publisher.json': () => ({status: 200, body: world.publisher}),
    '/marketplace/listings.json': url => ({
      status: 200,
      body: world.index.filter(l => l.entry.publisher === url.searchParams.get('publisher')),
    }),
  };
  const notPublished = (appId: string) => ({
    status: 404,
    body: {ok: false, reason: 'not-published', findings: [`app "${appId}" is not published`]},
  });
  const appRead = (url: URL) => {
    const match = /^\/marketplace\/apps\/([^/]+)\/(entry|preview)\.json$/.exec(url.pathname);
    if (!match) return undefined;
    const appId = decodeURIComponent(match[1]!);
    const listing = world.index.find(l => l.entry.appId === appId);
    if (!listing) return notPublished(appId);
    return {status: 200, body: match[2] === 'entry' ? listing : world.previews[appId]};
  };
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.method !== 'GET') return next();
    const url = new URL(req.url ?? '/', 'http://localhost');
    const read = reads[url.pathname]?.(url) ?? appRead(url);
    if (!read) return next();
    res.statusCode = read.status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(JSON.stringify(read.body));
  };
}

/**
 * The registry snapshot over `orchestratorApi` (task-11.5 decision 11): with
 * `A2UIVERSE_REGISTRY_SNAPSHOT` set, the preview server serves the snapshot under `/registry` as
 * the orchestrator serves its registry — the table, and each artifact's files as immutable
 * content — so e2e's build, pointed at the preview's own origin, loads every catalog the way the
 * page does in life. Beside it, the fixed world the trusted page reads (task-14.10 decision 14),
 * a sample's builds served from the snapshot's artifacts under `/marketplace/artifacts`.
 */
function registrySnapshot(): Plugin {
  return {
    name: 'a2uiverse-registry-snapshot',
    configurePreviewServer(server) {
      if (!process.env.A2UIVERSE_REGISTRY_SNAPSHOT) return;
      server.middlewares.use(worldRoutes(readWorld()));
      server.middlewares.use(
        '/registry',
        serveFiles(REGISTRY_SNAPSHOT_DIR, path =>
          path.startsWith(`${sep}artifacts${sep}`) ? IMMUTABLE : 'no-cache',
        ),
      );
      server.middlewares.use(
        '/marketplace/artifacts',
        serveFiles(join(REGISTRY_SNAPSHOT_DIR, 'artifacts'), () => IMMUTABLE),
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), registrySnapshot()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    exclude: [...configDefaults.exclude, 'e2e/**', 'e2e-live/**'],
  },
});
