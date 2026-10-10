/**
 * A marketplace for the orchestrator's tests (task-13.5 decision 13): the sdk's static layout served
 * from memory — `index.json`, `apps/<appId>/entry.json`, `artifacts/<artifactId>/<path>` — and the
 * report route recording what arrives. The test writes the entries; nothing is published through a
 * smoke test. Every read is recorded so a test can assert which files an install fetched.
 */
import {createServer, type Server} from 'node:http';
import express from 'express';
import type {AgentCard} from '@a2a-js/sdk';
import {
  ARTIFACT_DESCRIPTOR_FILE,
  artifactIdOf,
  validateArtifactDescriptor,
  type IndexEntry,
} from '@a2uiverse/sdk';

export type ArtifactFiles = Map<string, Uint8Array>;

export interface PublishOptions {
  /** The card as published; the live one is whatever the card URL serves. */
  card: AgentCard;
  /** What the marketplace fetched the live card from, and what the registry stores. */
  cardUrl: string;
  catalogs?: ArtifactFiles[];
  publisher?: string;
  /** Every version published, in order; the card's alone unless given. */
  versions?: string[];
  retired?: string[];
  aheadOfStore?: IndexEntry['aheadOfStore'];
}

export interface FakeMarketplace {
  url: string;
  /** Every GET path answered, in order. */
  requests: string[];
  /** Every app id reported, in order. */
  reports: string[];
  /** Writes an entry and its artifacts, as a publish would; returns the entry. */
  publish(appId: string, options: PublishOptions): Promise<IndexEntry>;
  /** Replaces an entry with whatever a test wants served — a malformed one included. */
  serveEntry(appId: string, body: unknown): void;
  unpublish(appId: string): void;
  entry(appId: string): IndexEntry | undefined;
  /** When set, every read answers 500: the marketplace is up but not well. */
  failing: boolean;
  close(): Promise<void>;
}

/** An address nothing listens on: a port just freed, outside the fetch spec's bad-ports list. */
export async function nowhere(): Promise<string> {
  const probe = createServer();
  await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve));
  const address = probe.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  await new Promise<void>(resolve => probe.close(() => resolve()));
  return `http://127.0.0.1:${address.port}`;
}

export async function startFakeMarketplace(): Promise<FakeMarketplace> {
  const entries = new Map<string, unknown>();
  const artifacts = new Map<string, ArtifactFiles>();
  const requests: string[] = [];
  const reports: string[] = [];
  const state = {failing: false};

  const app = express();
  app.use((req, _res, next) => {
    if (req.method === 'GET') requests.push(req.path);
    next();
  });
  app.use((_req, res, next) => {
    if (state.failing) {
      res.status(500).end();
      return;
    }
    next();
  });
  app.get('/index.json', (_req, res) => {
    res.set('Cache-Control', 'no-cache').json([...entries.values()]);
  });
  app.get('/apps/:appId/entry.json', (req, res) => {
    const entry = entries.get(req.params.appId);
    if (!entry) {
      res.status(404).json({ok: false, findings: ['not published']});
      return;
    }
    res.set('Cache-Control', 'no-cache').json(entry);
  });
  app.get('/artifacts/:artifactId/*path', (req, res) => {
    const files = artifacts.get(req.params.artifactId);
    const path = (req.params.path as unknown as string[]).join('/');
    const bytes = files?.get(path);
    if (!bytes) {
      res.status(404).end();
      return;
    }
    res.set('Cache-Control', 'public, max-age=31536000, immutable').send(Buffer.from(bytes));
  });
  app.post('/report', express.json(), (req, res) => {
    reports.push((req.body as {appId: string}).appId);
    res.status(202).end();
  });

  const server: Server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  const url = `http://127.0.0.1:${address.port}`;

  return {
    url,
    requests,
    reports,
    get failing() {
      return state.failing;
    },
    set failing(value: boolean) {
      state.failing = value;
    },
    async publish(appId, options) {
      const catalogs: Record<string, string> = {};
      for (const files of options.catalogs ?? []) {
        const descriptorBytes = files.get(ARTIFACT_DESCRIPTOR_FILE)!;
        const id = await artifactIdOf(descriptorBytes);
        const descriptor = validateArtifactDescriptor(
          JSON.parse(new TextDecoder().decode(descriptorBytes)),
        );
        if (!descriptor.ok) throw new Error(descriptor.errors.join('; '));
        catalogs[descriptor.value.catalogId] = id;
        artifacts.set(id, files);
      }
      const entry: IndexEntry = {
        appId,
        publisher: options.publisher ?? 'tests',
        cardUrl: options.cardUrl,
        card: options.card as IndexEntry['card'],
        catalogs,
        versions: options.versions ?? [options.card.version],
        publishedAt: new Date().toISOString(),
        retired: options.retired ?? [],
        ...(options.aheadOfStore ? {aheadOfStore: options.aheadOfStore} : {}),
      };
      entries.set(appId, entry);
      return entry;
    },
    serveEntry(appId, body) {
      entries.set(appId, body);
    },
    unpublish(appId) {
      entries.delete(appId);
    },
    entry(appId) {
      return entries.get(appId) as IndexEntry | undefined;
    },
    close: () => new Promise<void>(resolve => server.close(() => resolve())),
  };
}
