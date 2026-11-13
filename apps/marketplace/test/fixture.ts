/**
 * Fixtures for the marketplace's tests: cards as agents serve them, catalog artifacts as Stellify
 * writes them with real hashes, index entries and previews as the marketplace stores them.
 */
import {
  ARTIFACT_DESCRIPTOR_FILE,
  HOST_INTERFACE_VERSION,
  artifactIdOf,
  hashArtifactFile,
  type IndexEntry,
  type PreviewDocument,
} from '@a2uiverse/sdk';
import {
  cardFor,
  cardUrlOf,
  type AgentCard,
  type CardOptions,
} from '@a2uiverse/smoke-transport/testing';

export {cardFor, cardUrlOf, type AgentCard, type CardOptions};

export type ArtifactFiles = Map<string, Uint8Array>;

export const encode = (text: string) => new TextEncoder().encode(text);

/** A card whose sign-in is an OAuth scheme, required on every request. */
export function signInCardFor(agentUrl: string, options: CardOptions = {}): AgentCard {
  return cardFor(agentUrl, {
    ...options,
    card: {
      securitySchemes: {
        signIn: {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: `${agentUrl}/oauth/authorize`,
              tokenUrl: `${agentUrl}/oauth/token`,
              scopes: {read: 'See your things'},
            },
          },
        },
      },
      security: [{signIn: ['read']}],
      ...options.card,
    },
  });
}

export interface ArtifactOptions {
  /** The schema file's content; a one-component catalog under the id by default. */
  schema?: unknown;
  hostInterface?: string;
  /** Changes the descriptor, and so the artifact's id, without changing the catalog. */
  version?: string;
}

/** The one-component schema the fixture artifact carries by default. */
export const schemaFor = (catalogId: string, components?: Record<string, unknown>) => ({
  catalogId,
  components: components ?? {
    Text: {type: 'object', properties: {text: {type: 'string'}}, required: ['text']},
  },
});

/** A catalog artifact as Stellify writes one: the entry, the schema, the descriptor listing both. */
export async function fixtureArtifact(
  catalogId: string,
  options: ArtifactOptions = {},
): Promise<ArtifactFiles> {
  const schema = options.schema ?? schemaFor(catalogId);
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

/** The id the gate gives an artifact: the hash of its descriptor's bytes. */
export const idOf = (files: ArtifactFiles) => artifactIdOf(files.get(ARTIFACT_DESCRIPTOR_FILE)!);

export const base64 = (files: ArtifactFiles) =>
  Object.fromEntries(
    [...files].map(([path, bytes]) => [path, Buffer.from(bytes).toString('base64')]),
  );

export function entryFor(
  appId: string,
  card: AgentCard,
  catalogs: Record<string, string>,
  options: {publisher?: string; versions?: string[]; retired?: string[]} = {},
): IndexEntry {
  return {
    appId,
    publisher: options.publisher ?? 'acme',
    cardUrl: cardUrlOf(card.url),
    card: card as IndexEntry['card'],
    catalogs,
    versions: options.versions ?? [card.version],
    publishedAt: '2026-10-10T00:00:00.000Z',
    retired: options.retired ?? [],
  };
}

export function previewFor(
  appId: string,
  version: string,
  catalogId: string,
  capturedBy: PreviewDocument['capturedBy'] = 'marketplace',
): PreviewDocument {
  return {
    appId,
    version,
    words: 'Hello! Show me what you can do.',
    messages: [
      {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId}},
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: 's1',
          components: [{id: 'root', component: 'Text', text: 'hi'}],
        },
      },
    ],
    capturedBy,
    capturedAt: '2026-10-10T00:00:00.000Z',
  };
}
