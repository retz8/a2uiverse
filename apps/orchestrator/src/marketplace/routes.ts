/**
 * The marketplace's half of `orchestratorApi` over HTTP (SPEC §10; phase-14 decisions 3, 5–7;
 * task 14.4), mounted on the orchestrator's own port under one prefix: the browser knows one
 * address. The reads mirror the marketplace's own layout, each listing annotated with what only the
 * orchestrator holds:
 *
 * - `GET  index.json` — every published app, `[{entry, installed, update?}]`.
 * - `GET  search?q=<words>` — `{results: [{entry, score, installed, update?}]}`, the marketplace's
 *   matches in its order.
 * - `GET  apps/<appId>/entry.json` — one app, `{entry, installed, update?}`.
 * - `GET  apps/<appId>/preview.json` — its captured preview.
 * - `GET  artifacts/<artifactId>/<path>` — an artifact's files: from the registry when it holds the
 *   artifact, else from the marketplace, checked as install checks them; immutable either way.
 * - `GET  publisher.json` — who is signed in to Publish, the held token asked about each time.
 * - `GET  listings.json?publisher=<name>` — that publisher's listings, each app's live card read
 *   again first, its drift from the Store shown at once and reported where the Store's flag
 *   differs (task-14.11 decision 38).
 *
 * `installed` is the registry's at the read; `update` is the app's state as last computed, never a
 * check run here (decision 1). A read the marketplace cannot answer says why: the marketplace
 * unreached (503), the app not published (404), or an answer that does not read (502); an index
 * entry or a search result that does not read is left out and logged, the rest kept (decision 3).
 *
 * The publisher's writes pass the write guard (decision 16): `claim`, `sign-in`, `sign-out`,
 * `publish` and `unpublish`, the bodies and the marketplace's answers relayed as the publisher
 * module says.
 */
import {extname, join} from 'node:path';
import express, {type Request, type RequestHandler, type Response, type Router} from 'express';
import {
  aheadOfStore,
  SEARCH_QUERY_PARAM,
  type CardWithExtensions,
  type Drift,
  type IndexEntry,
  type UpdateState,
} from '@a2uiverse/sdk';
import {logLine} from '../log.js';
import {LIVE_CARD_TIMEOUT_MS, withTimeout} from '../timeout.js';
import type {DroppedEntry, MarketplaceClient} from '../registry/marketplace.js';
import type {Registry, ResolveCard} from '../registry/registry.js';
import {IMMUTABLE} from '../registry/api.js';
import type {UpdateCheck} from '../registry/updates.js';
import {callerOf} from '../writeGuard.js';
import type {ArtifactRelay} from './artifacts.js';
import type {Publisher, PublisherAnswer} from './publisher.js';

export const MARKETPLACE_ROUTE_PREFIX = '/marketplace';

/** The largest publish body: every catalog's files, base64, and the captured preview. */
const PUBLISH_BODY_LIMIT = '64mb';
const BODY_LIMIT = '16kb';

/** One listing as the Store reads it: the entry, whether the app is installed, its state as last computed. */
export interface StoreListing {
  entry: IndexEntry;
  installed: boolean;
  update?: UpdateState;
}

/** Why a read has no answer: the page words each. */
export type StoreReadReason = 'unreached' | 'not-published' | 'malformed';

const STATUS: Record<StoreReadReason, number> = {
  unreached: 503,
  'not-published': 404,
  malformed: 502,
};

export function marketplaceRoutes({
  registry,
  marketplace,
  updates,
  artifacts,
  publisher,
  resolveCard,
  guard,
}: {
  registry: Registry;
  marketplace: MarketplaceClient;
  updates: UpdateCheck;
  artifacts: ArtifactRelay;
  publisher: Publisher;
  /** Fetches an app's live card, as the registry does. */
  resolveCard: ResolveCard;
  /** The write guard: the JSON content type, then an allowed origin or the write token. */
  guard: RequestHandler;
}): Router {
  const router = express.Router();

  const listing = (entry: IndexEntry): StoreListing => {
    const installed = registry.installed().some(record => record.id === entry.appId);
    const update = installed ? updates.last(entry.appId) : undefined;
    return {entry, installed, ...(update ? {update} : {})};
  };
  const refuse = (res: Response, reason: StoreReadReason, findings: string[]) => {
    res.status(STATUS[reason]).json({ok: false, reason, findings});
  };
  const unreached = (res: Response, why: string) =>
    refuse(res, 'unreached', [
      `the marketplace at ${marketplace.url} could not be reached: ${why}`,
    ]);
  const logDropped = (dropped: DroppedEntry[]) => {
    for (const {at, errors} of dropped) {
      logLine(`left out the marketplace's ${at}, which does not read: ${errors.join('; ')}`);
    }
  };

  router.get('/index.json', async (_req, res) => {
    const read = await marketplace.index();
    if (read.kind === 'unreached') return unreached(res, read.reason);
    if (read.kind === 'malformed') return refuse(res, 'malformed', read.errors);
    logDropped(read.dropped);
    res.set('Cache-Control', 'no-cache').json(read.entries.map(listing));
  });

  router.get('/search', async (req, res) => {
    const words = req.query[SEARCH_QUERY_PARAM];
    if (typeof words !== 'string' || words.trim() === '') {
      res
        .status(400)
        .json({ok: false, findings: [`${SEARCH_QUERY_PARAM}: expected the words to search for`]});
      return;
    }
    const read = await marketplace.search(words);
    if (read.kind === 'unreached') return unreached(res, read.reason);
    if (read.kind === 'malformed') return refuse(res, 'malformed', read.errors);
    logDropped(read.dropped);
    res.set('Cache-Control', 'no-cache').json({
      results: read.results.map(({entry, score}) => ({...listing(entry), score})),
    });
  });

  router.get('/apps/:appId/entry.json', async (req, res) => {
    const read = await marketplace.entry(req.params.appId);
    res.set('Cache-Control', 'no-cache');
    if (read.kind === 'unreached') return unreached(res, read.reason);
    if (read.kind === 'malformed') return refuse(res, 'malformed', read.errors);
    if (read.kind === 'not-published') {
      return refuse(res, 'not-published', [`${req.params.appId} is not published`]);
    }
    res.json(listing(read.entry));
  });

  router.get('/apps/:appId/preview.json', async (req, res) => {
    const read = await marketplace.preview(req.params.appId);
    res.set('Cache-Control', 'no-cache');
    if (read.kind === 'unreached') return unreached(res, read.reason);
    if (read.kind === 'malformed') return refuse(res, 'malformed', read.errors);
    if (read.kind === 'not-published') {
      return refuse(res, 'not-published', [`${req.params.appId} is not published`]);
    }
    res.json(read.preview);
  });

  router.get('/artifacts/:artifactId/*path', async (req, res) => {
    const {artifactId} = req.params;
    const path = (req.params.path as unknown as string[]).join('/');
    if (!isSafePath(path)) {
      res.status(404).end();
      return;
    }
    // A held artifact is the same bytes under the same id: served from the registry.
    if (registry.holdsArtifact(artifactId)) {
      res.sendFile(
        path,
        {
          root: join(registry.artifactsDir, artifactId),
          dotfiles: 'deny',
          headers: {'Cache-Control': IMMUTABLE},
        },
        err => {
          if (err && !res.headersSent) res.status(404).end();
        },
      );
      return;
    }
    const relayed = await artifacts.file(artifactId, path);
    switch (relayed.kind) {
      case 'file':
        // Typed by the file's extension: a path with a folder in it is no media type of its own.
        res
          .set('Cache-Control', IMMUTABLE)
          .type(extname(path) || 'application/octet-stream')
          .send(Buffer.from(relayed.bytes));
        return;
      case 'not-found':
        res.status(404).end();
        return;
      case 'unreached':
        return unreached(res, relayed.reason);
      case 'mismatch':
        logLine(`refused the marketplace's artifact file: ${relayed.reason}`);
        return refuse(res, 'malformed', [relayed.reason]);
    }
  });

  router.get('/publisher.json', async (_req, res) => {
    res.set('Cache-Control', 'no-store').json(await publisher.status());
  });

  /**
   * An entry with its app's drift as the live card shows it now, through the sdk's drift function
   * the marketplace runs; where that differs from the Store's flag the marketplace is sent the
   * report, so its own flag catches up for every reader. A card that does not answer in time or
   * does not read leaves the Store's flag.
   */
  const withLiveDrift = async (entry: IndexEntry): Promise<IndexEntry> => {
    let card: CardWithExtensions & {version?: unknown};
    try {
      card = (await withTimeout(resolveCard(entry.cardUrl), LIVE_CARD_TIMEOUT_MS)) as typeof card;
    } catch {
      return entry;
    }
    if (typeof card.version !== 'string') return entry;
    const drift = aheadOfStore(entry, card as CardWithExtensions & {version: string});
    if (!drift.ok) return entry;
    const {aheadOfStore: flagged, ...rest} = entry;
    if (sameDrift(flagged, drift.value)) return entry;
    void marketplace.report(entry.appId).catch((err: unknown) => {
      console.error(`marketplace: the report of ${entry.appId} failed:`, (err as Error).message);
    });
    return drift.value
      ? {...rest, aheadOfStore: {...drift.value, seenAt: new Date().toISOString()}}
      : rest;
  };

  router.get('/listings.json', async (req, res) => {
    const name = req.query.publisher;
    if (typeof name !== 'string' || name === '') {
      res.status(400).json({ok: false, findings: ['publisher: expected the publisher’s name']});
      return;
    }
    const read = await marketplace.index();
    if (read.kind === 'unreached') return unreached(res, read.reason);
    if (read.kind === 'malformed') return refuse(res, 'malformed', read.errors);
    logDropped(read.dropped);
    const mine = read.entries.filter(entry => entry.publisher === name);
    const checked = await Promise.all(mine.map(withLiveDrift));
    res.set('Cache-Control', 'no-cache').json(checked.map(listing));
  });

  const small = express.json({limit: BODY_LIMIT});
  const answer = (res: Response, {status, body}: PublisherAnswer) => {
    if (body === undefined) res.status(status).end();
    else res.status(status).json(body);
  };

  router.post('/claim', guard, small, async (req: Request, res: Response) => {
    answer(res, await publisher.claim(req.body, callerOf(res)));
  });
  router.post('/sign-in', guard, small, async (req: Request, res: Response) => {
    answer(res, await publisher.signIn(req.body, callerOf(res)));
  });
  router.post('/sign-out', guard, small, async (_req: Request, res: Response) => {
    answer(res, await publisher.signOut(callerOf(res)));
  });
  router.post(
    '/publish',
    guard,
    express.json({limit: PUBLISH_BODY_LIMIT}),
    async (req: Request, res: Response) => {
      answer(res, await publisher.publish(req.body, callerOf(res)));
    },
  );
  router.post('/unpublish', guard, small, async (req: Request, res: Response) => {
    answer(res, await publisher.unpublish(req.body, callerOf(res)));
  });

  return router;
}

/** Whether the Store's flag says what the live card shows: both none, or the same version and ids. */
function sameDrift(flagged: Drift | undefined, now: Drift | undefined): boolean {
  if (flagged === undefined || now === undefined) return flagged === now;
  return (
    flagged.version === now.version &&
    flagged.catalogIds.length === now.catalogIds.length &&
    flagged.catalogIds.every((id, i) => now.catalogIds[i] === id)
  );
}

/** A path inside the artifact: relative, `/`-separated, no `.` or `..` segment. */
function isSafePath(path: string): boolean {
  if (path === '' || path.startsWith('/') || path.includes('\\')) return false;
  return path.split('/').every(segment => segment !== '' && segment !== '.' && segment !== '..');
}
