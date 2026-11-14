/**
 * Registries for tests, built the one way the orchestrator builds one (task-11.4 decision 17): a
 * state directory, cards served by a stub fetch, apps installed through the operation, and catalog
 * artifacts packed here with real hashes.
 */
import type {AgentCard} from '@a2a-js/sdk';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {AgentCard as LegacyAgentCard} from '@a2a-js/sdk-v0_3';
import {fetchLiveCard, type LiveCard, type ServedCard} from '@a2uiverse/card';
import {
  A2UI_EXTENSION_URIS,
  ARTIFACT_DESCRIPTOR_FILE,
  HOST_INTERFACE_VERSION,
  hashArtifactFile,
} from '@a2uiverse/sdk';
import {FakeEmbedder, type Embedder} from '@a2uiverse/embedder';
import type {MarketplaceClient} from '../src/registry/marketplace.js';
import {
  Registry,
  type CardSignatureJournalEntry,
  type RegistryJournal,
} from '../src/registry/registry.js';

export type ArtifactFiles = Map<string, Uint8Array>;

const encode = (text: string) => new TextEncoder().encode(text);

/** The URL a test card is served at: its agent's URL plus the well-known path. */
export const cardUrlOf = (agentUrl: string) => `${agentUrl}/.well-known/agent-card.json`;

export interface CardOptions {
  name?: string;
  description?: string;
  /** The catalog ids the card declares under the A2UI extension; none declares nothing. */
  catalogs?: string[];
  skills?: LegacyAgentCard['skills'];
  /** Whether the agent streams, as its card says; true by default. */
  streaming?: boolean;
}

/** A card as an A2A 0.3 agent serves it, over JSON-RPC. */
export function cardFor(agentUrl: string, options: CardOptions = {}): LegacyAgentCard {
  const {catalogs} = options;
  return {
    name: options.name ?? 'Fake Vendor',
    description: options.description ?? 'a vendor for tests',
    version: '0.0.0',
    protocolVersion: '0.3.0',
    url: agentUrl,
    preferredTransport: 'JSONRPC',
    capabilities: {
      streaming: options.streaming ?? true,
      extensions: [
        {
          uri: A2UI_EXTENSION_URIS['v0.9.1'],
          ...(catalogs ? {params: {supportedCatalogIds: catalogs}} : {}),
        },
      ],
    },
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: options.skills ?? [{id: 'fake', name: 'fake', description: 'fake', tags: []}],
  };
}

export interface ArtifactOptions {
  /** The schema file's content; a one-component catalog under the id by default. */
  schema?: unknown;
  hostInterface?: string;
  /** Changes the descriptor, and so the artifact's id, without changing the catalog. */
  version?: string;
  /** More files, by path, as a pack writes its stylesheets beside the entry. */
  files?: Record<string, string>;
}

/** A catalog artifact as Stellify writes one: the entry, the schema, the descriptor listing both. */
export async function fixtureArtifact(
  catalogId: string,
  options: ArtifactOptions = {},
): Promise<ArtifactFiles> {
  const schema = options.schema ?? {
    catalogId,
    components: {
      Text: {type: 'object', properties: {text: {type: 'string'}}, required: ['text']},
    },
  };
  const files: ArtifactFiles = new Map([
    ['index.js', encode(`export const CATALOG = {id: ${JSON.stringify(catalogId)}};\n`)],
    ['catalog.json', encode(`${JSON.stringify(schema, null, 2)}\n`)],
    ...Object.entries(options.files ?? {}).map(([path, text]) => [path, encode(text)] as const),
  ]);
  const hashed: Record<string, string> = {};
  for (const [path, bytes] of files) hashed[path] = await hashArtifactFile(bytes);
  const descriptor = {
    catalogId,
    entry: 'index.js',
    schema: 'catalog.json',
    hostInterface: options.hostInterface ?? HOST_INTERFACE_VERSION,
    files: hashed,
    package: {name: 'fixture-catalog', version: options.version ?? '0.1.0'},
    packedBy: {tool: '@a2uiverse/stellify', version: '0.0.0'},
  };
  files.set(ARTIFACT_DESCRIPTOR_FILE, encode(`${JSON.stringify(descriptor, null, 2)}\n`));
  return files;
}

/**
 * Cards served by URL, each as its agent serves it, in whichever shape, through the one fetch of
 * the live card, so a signed card is checked as it is in a run (task-20.7 decision 8); a key set
 * or any other document a card names is served beside them. A URL with nothing served is
 * unreachable, and one marked hanging answers nothing inside the fetch's time limit. Mutable, so
 * a test can move an agent.
 */
export class CardServer {
  readonly cards = new Map<string, ServedCard>();
  /** What a URL other than a card's answers: a key set, by its URL. */
  readonly documents = new Map<string, unknown>();
  readonly hanging = new Set<string>();
  readonly fetched: string[] = [];
  /** The time limit each fetch was given, in the order fetched. */
  readonly limits: number[] = [];

  serve(card: LegacyAgentCard): string {
    return this.serveAt(cardUrlOf(card.url), card);
  }

  /** Whatever a card URL answers. */
  serveAt(url: string, served: ServedCard): string {
    this.cards.set(url, served);
    return url;
  }

  fetch = async (url: string, timeoutMs: number): Promise<LiveCard> => {
    this.fetched.push(url);
    this.limits.push(timeoutMs);
    return fetchLiveCard(url, {timeoutMs, fetchImpl: this.#answer});
  };

  /** What the network answers: a card, a document, nothing in time, or no connection. */
  #answer: typeof fetch = async (input, init) => {
    const url = String(input);
    const signal = init?.signal ?? undefined;
    if (this.hanging.has(url)) {
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(signal.reason));
      });
    }
    const body = this.cards.get(url) ?? this.documents.get(url);
    if (body === undefined) throw new Error(`fetch failed: ${url}`);
    return new Response(JSON.stringify(body), {headers: {'content-type': 'application/json'}});
  };
}

export interface TestApp {
  id: string;
  card: LegacyAgentCard;
  catalogs?: ArtifactFiles[];
}

export interface TestRegistry {
  registry: Registry;
  stateDir: string;
  cards: CardServer;
  journal: JournalSpy;
}

export class JournalSpy implements RegistryJournal {
  readonly entries: Parameters<RegistryJournal['registry']>[0][] = [];
  /** Each signed card's check (task-20.7 decision 12). */
  readonly signatures: CardSignatureJournalEntry[] = [];
  registry(entry: Parameters<RegistryJournal['registry']>[0]): Promise<void> {
    this.entries.push(entry);
    return Promise.resolve();
  }
  cardSignature(entry: CardSignatureJournalEntry): Promise<void> {
    this.signatures.push(entry);
    return Promise.resolve();
  }
}

/**
 * A loaded registry over a fresh state directory with every app installed through the operation,
 * its cards served; `refresh` runs the startup fetch too.
 */
export async function testRegistry(
  apps: readonly TestApp[] = [],
  options: {
    platformCard?: AgentCard;
    embedder?: Embedder;
    /** The time limit of a card fetch at boot, at the update check and at install. */
    cardTimeoutMs?: number;
    stateDir?: string;
    marketplace?: MarketplaceClient;
  } = {},
): Promise<TestRegistry> {
  const stateDir = options.stateDir ?? (await mkdtemp(join(tmpdir(), 'a2uiverse-registry-')));
  const cards = new CardServer();
  const journal = new JournalSpy();
  const registry = new Registry({
    stateDir,
    fetchCard: cards.fetch,
    ...(options.cardTimeoutMs !== undefined ? {cardTimeoutMs: options.cardTimeoutMs} : {}),
    embedder: options.embedder ?? new FakeEmbedder(),
    journal,
    ...(options.platformCard ? {platformCard: options.platformCard} : {}),
    ...(options.marketplace ? {marketplace: options.marketplace} : {}),
  });
  await registry.load();
  for (const app of apps) {
    const result = await registry.install({
      appId: app.id,
      cardUrl: cards.serve(app.card),
      catalogs: app.catalogs ?? [],
    });
    if (!result.ok) throw new Error(`install ${app.id}: ${result.findings.join('; ')}`);
  }
  return {registry, stateDir, cards, journal};
}
