/**
 * Registries for tests, built the one way the orchestrator builds one (task-11.4 decision 17): a
 * state directory, cards served by a stub fetch, apps installed through the operation, and catalog
 * artifacts packed here with real hashes.
 */
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {AgentCard} from '@a2a-js/sdk';
import {
  A2UI_EXTENSION_URI,
  ARTIFACT_DESCRIPTOR_FILE,
  HOST_INTERFACE_VERSION,
  hashArtifactFile,
} from '@a2uiverse/sdk';
import {FakeEmbedder, type Embedder} from '@a2uiverse/embedder';
import {Registry, type RegistryJournal} from '../src/registry/registry.js';

export type ArtifactFiles = Map<string, Uint8Array>;

const encode = (text: string) => new TextEncoder().encode(text);

/** The URL a test card is served at: its agent's URL plus the well-known path. */
export const cardUrlOf = (agentUrl: string) => `${agentUrl}/.well-known/agent-card.json`;

export interface CardOptions {
  name?: string;
  description?: string;
  /** The catalog ids the card declares under the A2UI extension; none declares nothing. */
  catalogs?: string[];
  skills?: AgentCard['skills'];
  /** Whether the agent streams, as its card says; true by default. */
  streaming?: boolean;
}

export function cardFor(agentUrl: string, options: CardOptions = {}): AgentCard {
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
          uri: A2UI_EXTENSION_URI,
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

/** Cards served by URL; a URL with no card is unreachable. Mutable, so a test can move an agent. */
export class CardServer {
  readonly cards = new Map<string, AgentCard>();
  readonly fetched: string[] = [];

  serve(card: AgentCard): string {
    const url = cardUrlOf(card.url);
    this.cards.set(url, card);
    return url;
  }

  resolve = async (url: string): Promise<AgentCard> => {
    this.fetched.push(url);
    const card = this.cards.get(url);
    if (!card) throw new Error(`fetch failed: ${url}`);
    return card;
  };
}

export interface TestApp {
  id: string;
  card: AgentCard;
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
  registry(entry: Parameters<RegistryJournal['registry']>[0]): Promise<void> {
    this.entries.push(entry);
    return Promise.resolve();
  }
}

/**
 * A loaded registry over a fresh state directory with every app installed through the operation,
 * its cards served; `refresh` runs the startup fetch too.
 */
export async function testRegistry(
  apps: readonly TestApp[] = [],
  options: {platformCard?: AgentCard; embedder?: Embedder; stateDir?: string} = {},
): Promise<TestRegistry> {
  const stateDir = options.stateDir ?? (await mkdtemp(join(tmpdir(), 'a2uiverse-registry-')));
  const cards = new CardServer();
  const journal = new JournalSpy();
  const registry = new Registry({
    stateDir,
    resolveCard: cards.resolve,
    embedder: options.embedder ?? new FakeEmbedder(),
    journal,
    ...(options.platformCard ? {platformCard: options.platformCard} : {}),
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
