/**
 * The marketplace's HTTP surface (task-13.2 decision 11; task-13.3 decision 11), at the root of
 * its port. The reads are shaped like static files, so a directory of the same layout answers
 * them with no marketplace: `index.json`, `apps/<appId>/entry.json`, `apps/<appId>/preview.json`,
 * `artifacts/<artifactId>/<path>`. Search takes its words on `q`. The writes: `claim` with no
 * token; `publish` and `unpublish` with the publisher's token as a bearer token; `report`, a nudge
 * taken from anyone and answered at once. Every refusal body is the sdk's `{ok: false, findings}`.
 */
import {join} from 'node:path';
import express, {type Request, type RequestHandler, type Response, type Router} from 'express';
import {
  readClaimRequest,
  readPublishRequest,
  readReportRequest,
  readUnpublishRequest,
  SEARCH_QUERY_PARAM,
} from '@a2uiverse/sdk';
import {logLine} from './log.js';
import type {Marketplace} from './marketplace.js';
import {ARTIFACTS_DIR} from './store.js';

/** An artifact's files never change under its id. */
export const IMMUTABLE = 'public, max-age=31536000, immutable';

/** The largest publish body: every catalog's files, base64, and the captured preview. */
const BODY_LIMIT = '64mb';

const refusal = (findings: string[]) => ({ok: false, findings});

export function marketplaceRoutes({marketplace}: {marketplace: Marketplace}): Router {
  const router = express.Router();

  router.get('/index.json', (_req, res) => {
    res.set('Cache-Control', 'no-cache').json(marketplace.entries());
  });
  router.get('/apps/:appId/entry.json', (req, res) => {
    const entry = marketplace.entry(req.params.appId);
    res.set('Cache-Control', 'no-cache');
    if (!entry) {
      res.status(404).json(refusal([`app ${JSON.stringify(req.params.appId)} is not published`]));
      return;
    }
    res.json(entry);
  });
  router.get('/apps/:appId/preview.json', (req, res) => {
    const preview = marketplace.preview(req.params.appId);
    res.set('Cache-Control', 'no-cache');
    if (!preview) {
      res.status(404).json(refusal([`app ${JSON.stringify(req.params.appId)} is not published`]));
      return;
    }
    res.json(preview);
  });
  router.use(
    `/${ARTIFACTS_DIR}`,
    express.static(join(marketplace.publicDir, ARTIFACTS_DIR), {
      dotfiles: 'ignore',
      index: false,
      redirect: false,
      fallthrough: false,
      setHeaders: res => res.setHeader('Cache-Control', IMMUTABLE),
    }),
  );
  router.get('/search', async (req, res) => {
    const words = req.query[SEARCH_QUERY_PARAM];
    if (typeof words !== 'string' || words.trim() === '') {
      res.status(400).json(refusal([`${SEARCH_QUERY_PARAM}: expected the words to search for`]));
      return;
    }
    res.set('Cache-Control', 'no-cache').json(await marketplace.search(words));
  });

  const body = express.json({limit: BODY_LIMIT});

  router.post('/claim', body, async (req: Request, res: Response) => {
    const read = readClaimRequest(req.body);
    if (!read.ok) {
      res.status(400).json(refusal(read.errors));
      return;
    }
    const result = await marketplace.claim(read.value.publisher);
    if (!result.ok) {
      res.status(result.kind === 'taken' ? 409 : 422).json(refusal(result.findings));
      return;
    }
    logLine(`claimed ${result.publisher}`);
    res.status(201).json({publisher: result.publisher, token: result.token});
  });

  // The publisher's token, as a bearer token; none a publisher holds the hash of answers 401.
  const guard: RequestHandler = async (req, res, next) => {
    const match = /^Bearer (.+)$/.exec(req.get('authorization') ?? '');
    const publisher = match ? await marketplace.publisherOf(match[1]) : undefined;
    if (!publisher) {
      res.status(401).json(refusal(['the publisher token is missing or wrong']));
      return;
    }
    res.locals.publisher = publisher.name;
    next();
  };

  router.post('/publish', guard, body, async (req: Request, res: Response) => {
    const read = readPublishRequest(req.body);
    if (!read.ok) {
      res.status(400).json(refusal(read.errors));
      return;
    }
    const publisher = res.locals.publisher as string;
    const result = await marketplace.publish(publisher, read.value);
    if (!result.ok) {
      logLine(
        `refused ${publisher}'s publish of ${read.value.appId}: ${result.findings.join('; ')}`,
      );
      res.status(result.kind === 'forbidden' ? 403 : 422).json(refusal(result.findings));
      return;
    }
    logLine(`${result.summary} (by ${publisher})`);
    res.json(result);
  });

  router.post('/unpublish', guard, body, async (req: Request, res: Response) => {
    const read = readUnpublishRequest(req.body);
    if (!read.ok) {
      res.status(400).json(refusal(read.errors));
      return;
    }
    const publisher = res.locals.publisher as string;
    const result = await marketplace.unpublish(publisher, read.value.appId);
    if (!result.ok) {
      res.status(result.kind === 'forbidden' ? 403 : 404).json(refusal(result.findings));
      return;
    }
    logLine(`unpublished ${result.appId} (by ${publisher})`);
    res.json(result);
  });

  router.post('/report', body, (req: Request, res: Response) => {
    const read = readReportRequest(req.body);
    if (!read.ok) {
      res.status(400).json(refusal(read.errors));
      return;
    }
    // Accepted at once (task-13.3 decision 10); the marketplace verifies the nudge itself after.
    void marketplace.report(read.value.appId).then(() => {
      const flag = marketplace.entry(read.value.appId)?.aheadOfStore;
      if (flag) logLine(`${read.value.appId} is ahead of the Store: ${describeFlag(flag)}`);
    });
    res.status(202).end();
  });

  return router;
}

export function describeFlag(flag: {catalogIds: string[]; version?: string}): string {
  const parts = [];
  if (flag.catalogIds.length > 0) parts.push(`catalogs ${flag.catalogIds.join(', ')}`);
  if (flag.version !== undefined) parts.push(`version ${flag.version}`);
  return parts.join(' and ');
}
