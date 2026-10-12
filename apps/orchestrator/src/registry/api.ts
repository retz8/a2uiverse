/**
 * The registry's half of `orchestratorApi` over HTTP (task-11.4 decisions 2, 10, 11), mounted on
 * the orchestrator's own port under one prefix.
 *
 * The read routes are shaped like static files, so a directory of the same layout — the registry
 * snapshot — answers them with no orchestrator: `apps.json`, the installed records, each with
 * whether this run holds its card (task-14.8 decision 2); `catalogs.json`,
 * the catalog table; `artifacts/<id>/<path>`, each artifact's files under its id, served as
 * immutable content. The write routes pass the write guard — from an allowed browser origin, or
 * with the write token (task-14.3 decision 1): `install` — which is install-over for a held id —
 * with each catalog's files in the body as base64, or with the app id alone, resolved through the
 * marketplace (task-13.5 decision 2); and `uninstall`, answering what became of each account's
 * access (task-14.3 decision 12). `updates.json` runs the update check and answers each installed
 * app's state (task-13.5 decision 8), no token.
 */
import express, {type Request, type RequestHandler, type Response, type Router} from 'express';
import {callerOf} from '../writeGuard.js';
import type {Registry} from './registry.js';
import type {UpdateCheck} from './updates.js';

export const REGISTRY_ROUTE_PREFIX = '/registry';

/** An artifact's files never change under its id. */
export const IMMUTABLE = 'public, max-age=31536000, immutable';

/** The largest install body: every catalog's files, base64. */
const BODY_LIMIT = '64mb';

export function registryRoutes({
  registry,
  guard,
  updates,
}: {
  registry: Registry;
  /** The write guard: the JSON content type, then an allowed origin or the write token. */
  guard: RequestHandler;
  /** The update check `updates.json` runs (task-13.5 decision 8). */
  updates: UpdateCheck;
}): Router {
  const router = express.Router();

  // Each record says whether this run holds its app's card — reached at startup, or by a check
  // since — so the App Library can say an app couldn't be reached (task-14.8 decision 2).
  router.get('/apps.json', (_req, res) => {
    res
      .set('Cache-Control', 'no-cache')
      .json(
        registry
          .installed()
          .map(record => ({...record, reachable: registry.card(record.id) !== null})),
      );
  });
  router.get('/catalogs.json', (_req, res) => {
    res.set('Cache-Control', 'no-cache').json(registry.table());
  });
  // The check's one side effect — a newer build of a marketplace app installing itself — is the
  // registry converging to what it reaches anyway, so a GET runs it and answers the states after.
  router.get('/updates.json', async (_req, res) => {
    const outcome = await updates.check();
    res.set('Cache-Control', 'no-cache').json(outcome.states);
  });
  router.use(
    '/artifacts',
    express.static(registry.artifactsDir, {
      dotfiles: 'ignore',
      index: false,
      redirect: false,
      fallthrough: false,
      setHeaders: res => res.setHeader('Cache-Control', IMMUTABLE),
    }),
  );

  const body = express.json({limit: BODY_LIMIT});

  router.post('/install', guard, body, async (req: Request, res: Response) => {
    const parsed = parseInstall(req.body);
    if (!parsed.ok) {
      res.status(400).json({ok: false, findings: parsed.findings});
      return;
    }
    const by = callerOf(res);
    const result =
      parsed.kind === 'marketplace'
        ? await registry.installFromMarketplace(parsed.appId, {by})
        : await registry.install({...parsed.request, by});
    res.status(result.ok ? 200 : 422).json(result);
  });

  router.post('/uninstall', guard, body, async (req: Request, res: Response) => {
    const appId = (req.body as {appId?: unknown} | undefined)?.appId;
    if (typeof appId !== 'string') {
      res.status(400).json({ok: false, findings: ['appId: expected a string']});
      return;
    }
    const result = await registry.uninstall(appId, {by: callerOf(res)});
    res.status(result.ok ? 200 : 404).json(result);
  });

  return router;
}

type InstallParse =
  | {ok: true; kind: 'local'; request: Parameters<Registry['install']>[0]}
  | {ok: true; kind: 'marketplace'; appId: string}
  | {ok: false; findings: string[]};

export const MIXED_INSTALL_BODY =
  'an install names a card URL and its artifacts, or the app id alone';

/**
 * `{appId, cardUrl, catalogs: [{files: {<path>: <base64>}}]}`, the files decoded — or `{appId}`
 * alone, the marketplace path (task-13.5 decision 2). A body with one of the local path's two
 * fields and not the other mixes the shapes and is refused.
 */
function parseInstall(body: unknown): InstallParse {
  const findings: string[] = [];
  const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  if (b.cardUrl === undefined && b.catalogs === undefined) {
    if (typeof b.appId !== 'string') return {ok: false, findings: ['appId: expected a string']};
    return {ok: true, kind: 'marketplace', appId: b.appId};
  }
  if (b.cardUrl === undefined || b.catalogs === undefined) {
    return {ok: false, findings: [MIXED_INSTALL_BODY]};
  }
  if (typeof b.appId !== 'string') findings.push('appId: expected a string');
  if (typeof b.cardUrl !== 'string') findings.push('cardUrl: expected a string');
  if (!Array.isArray(b.catalogs)) findings.push('catalogs: expected a list');
  const catalogs: Map<string, Uint8Array>[] = [];
  for (const [i, catalog] of (Array.isArray(b.catalogs) ? b.catalogs : []).entries()) {
    const files = (catalog as {files?: unknown} | null)?.files;
    if (typeof files !== 'object' || files === null || Array.isArray(files)) {
      findings.push(`catalogs[${i}].files: expected a map of path to base64`);
      continue;
    }
    const decoded = new Map<string, Uint8Array>();
    for (const [path, content] of Object.entries(files)) {
      if (typeof content !== 'string' || !isSafePath(path)) {
        findings.push(
          `catalogs[${i}].files[${JSON.stringify(path)}]: expected a relative path to base64`,
        );
        continue;
      }
      decoded.set(path, new Uint8Array(Buffer.from(content, 'base64')));
    }
    catalogs.push(decoded);
  }
  if (findings.length > 0) return {ok: false, findings};
  return {
    ok: true,
    kind: 'local',
    request: {appId: b.appId as string, cardUrl: b.cardUrl as string, catalogs},
  };
}

/** A path inside the artifact: relative, `/`-separated, no `.` or `..` segment. */
function isSafePath(path: string): boolean {
  if (path === '' || path.startsWith('/') || path.includes('\\')) return false;
  return path.split('/').every(segment => segment !== '' && segment !== '.' && segment !== '..');
}
