import {join} from 'node:path';
import cors from 'cors';
import express, {type Express} from 'express';
import {TransformersEmbedder, type Embedder} from '@a2uiverse/embedder';
import {marketplaceRoutes} from './api.js';
import {cardFetcher, type FetchCard} from './cardFetch.js';
import type {Config} from './config.js';
import {Marketplace} from './marketplace.js';
import {a2aSmokeRunner, type SmokeRunner} from './smoke.js';

/** localhost, 127.0.0.1 on any port, and VS Code dev tunnels (tunnel-environment.md). */
export const ORIGIN_RE =
  /^(https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?|https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.devtunnels\.ms)$/;

export interface MarketplaceApp {
  app: Express;
  marketplace: Marketplace;
  /**
   * Boot step, run before listen (task-13.3 decisions 9, 15): the served subtree read and
   * verified — a damaged one throws — the index regenerated, every card embedded.
   */
  init(): Promise<void>;
  /** The live-card refresh, run in the background after listen (decision 9). */
  refresh(): Promise<void>;
}

/** Injection seams so tests run with no model download and no network of their own. */
export interface MarketplaceOverrides {
  embedder?: Embedder;
  fetchCard?: FetchCard;
  smoke?: SmokeRunner;
}

/** Wires the marketplace: the store, the embedder, the card fetch and the smoke transport behind the routes. */
export function buildMarketplace({
  config,
  overrides,
}: {
  config: Config;
  overrides?: MarketplaceOverrides;
}): MarketplaceApp {
  const embedder =
    overrides?.embedder ?? new TransformersEmbedder({cacheDir: join(config.stateDir, 'models')});
  const marketplace = new Marketplace({
    stateDir: config.stateDir,
    embedder,
    fetchCard: overrides?.fetchCard ?? cardFetcher({timeoutMs: config.cardTimeoutMs}),
    smoke: overrides?.smoke ?? a2aSmokeRunner(),
    smokeTimeoutMs: config.smokeTimeoutMs,
  });
  const app = express();
  app.use(
    cors({
      origin: (origin, callback) => callback(null, !origin || ORIGIN_RE.test(origin)),
      credentials: true,
    }),
  );
  app.use('/', marketplaceRoutes({marketplace}));
  return {
    app,
    marketplace,
    init: () => marketplace.load(),
    refresh: () => marketplace.refreshCards(),
  };
}
