/**
 * The registry's half of `orchestratorApi` over HTTP (task-11.4 decisions 2, 10, 11), mounted on
 * the orchestrator's own port under one prefix.
 *
 * The read routes are shaped like static files, so a directory of the same layout — the registry
 * snapshot — answers them with no orchestrator: `apps.json`, the installed records; `catalogs.json`,
 * the catalog table; `artifacts/<id>/<path>`, each artifact's files under its id, served as
 * immutable content. The write routes take the write token as a bearer token: `install` — which is
 * install-over for a held id — with each catalog's files in the body as base64, and `uninstall`.
 */
import {timingSafeEqual} from 'node:crypto';
import express, {type Request, type RequestHandler, type Response, type Router} from 'express';
import type {Registry} from './registry.js';

export const REGISTRY_ROUTE_PREFIX = '/registry';

/** An artifact's files never change under its id. */
export const IMMUTABLE = 'public, max-age=31536000, immutable';

/** The largest install body: every catalog's files, base64. */
const BODY_LIMIT = '64mb';

export function registryRoutes({
  registry,
  writeToken,
}: {
  registry: Registry;
  /** The token this run issued; no write is taken before there is one. */
  writeToken: () => string | undefined;
}): Router {
  const router = express.Router();

  router.get('/apps.json', (_req, res) => {
    res.set('Cache-Control', 'no-cache').json(registry.installed());
  });
  router.get('/catalogs.json', (_req, res) => {
    res.set('Cache-Control', 'no-cache').json(registry.table());
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

  const guard: RequestHandler = (req, res, next) => {
    const token = writeToken();
    if (token === undefined || !authorized(req, token)) {
      res.status(401).json({ok: false, findings: ['the write token is missing or wrong']});
      return;
    }
    next();
  };
  const body = express.json({limit: BODY_LIMIT});

  router.post('/install', guard, body, async (req: Request, res: Response) => {
    const parsed = parseInstall(req.body);
    if (!parsed.ok) {
      res.status(400).json({ok: false, findings: parsed.findings});
      return;
    }
    const result = await registry.install(parsed.request);
    res.status(result.ok ? 200 : 422).json(result);
  });

  router.post('/uninstall', guard, body, async (req: Request, res: Response) => {
    const appId = (req.body as {appId?: unknown} | undefined)?.appId;
    if (typeof appId !== 'string') {
      res.status(400).json({ok: false, findings: ['appId: expected a string']});
      return;
    }
    const result = await registry.uninstall(appId);
    res.status(result.ok ? 200 : 404).json(result);
  });

  return router;
}

function authorized(req: Request, token: string): boolean {
  const header = req.get('authorization') ?? '';
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) return false;
  const given = Buffer.from(match[1]);
  const expected = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

type InstallParse =
  {ok: true; request: Parameters<Registry['install']>[0]} | {ok: false; findings: string[]};

/** `{appId, cardUrl, catalogs: [{files: {<path>: <base64>}}]}`, the files decoded. */
function parseInstall(body: unknown): InstallParse {
  const findings: string[] = [];
  const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
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
    request: {appId: b.appId as string, cardUrl: b.cardUrl as string, catalogs},
  };
}

/** A path inside the artifact: relative, `/`-separated, no `.` or `..` segment. */
function isSafePath(path: string): boolean {
  if (path === '' || path.startsWith('/') || path.includes('\\')) return false;
  return path.split('/').every(segment => segment !== '' && segment !== '.' && segment !== '..');
}
