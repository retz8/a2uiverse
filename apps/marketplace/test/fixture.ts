/**
 * Fixtures for the marketplace's tests: cards as agents serve them, catalog artifacts as Stellify
 * writes them with real hashes, index entries and previews as the marketplace stores them.
 */
import {
  ARTIFACT_DESCRIPTOR_FILE,
  BASIC_CATALOG_ID,
  BASIC_CATALOG_SCHEMA,
  createSchemaFormCheck,
  formatA2uiFinding,
  HOST_INTERFACE_VERSION,
  artifactIdOf,
  hashArtifactFile,
  type A2uiCatalogSchema,
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

/** The one component the fixture artifact's schema carries by default, as a v1.0 catalog writes it. */
export const TEXT_COMPONENT = {
  type: 'object',
  properties: {
    component: {const: 'Text'},
    text: {$ref: 'common_types.json#/$defs/DynamicString'},
  },
  required: ['component', 'text'],
};

/** A v1.0 catalog document under the id: one Text component by default, no functions. */
export const schemaFor = (
  catalogId: string,
  components: Record<string, unknown> = {Text: TEXT_COMPONENT},
): A2uiCatalogSchema => ({
  protocolVersion: '1.0',
  catalogId,
  components,
  $defs: {
    anyComponent: {oneOf: Object.keys(components).map(name => ({$ref: `#/components/${name}`}))},
    anyFunction: false,
  },
});

/** A catalog's document as the tests know it: the basic catalog's, else the fixture's under the id. */
export const catalogFor = (catalogId: string): A2uiCatalogSchema =>
  catalogId === BASIC_CATALOG_ID
    ? (BASIC_CATALOG_SCHEMA as A2uiCatalogSchema)
    : schemaFor(catalogId);

/**
 * A paint the tests author, held to the sdk's schema-form check as it is built (task-21.15
 * decision 7): its messages handed back, or a throw naming each place that fails.
 */
export function authored<T>(catalogId: string, messages: T[]): T[] {
  const findings = createSchemaFormCheck({catalog: catalogFor(catalogId)}).agentToRenderer(
    messages,
  );
  if (findings.length > 0) {
    throw new Error(
      `a paint the tests author fails the schema-form check: ${findings.map(formatA2uiFinding).join('; ')}`,
    );
  }
  return messages;
}

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
    messages: authored(catalogId, [
      {version: '1.0', createSurface: {surfaceId: 's1', catalogId}},
      {
        version: '1.0',
        updateComponents: {
          surfaceId: 's1',
          components: [{id: 'root', component: 'Text', text: 'hi'}],
        },
      },
    ]),
    capturedBy,
    capturedAt: '2026-10-10T00:00:00.000Z',
  };
}
