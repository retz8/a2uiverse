/**
 * Stellify's in-process A2A 0.3 agent for tests: the shared package's fake agent, with the cards
 * and the paints Stellify's suite previews — the star fixture catalog, and each sign-in a card
 * can declare.
 */
import {
  authRequiredScript as sharedAuthRequiredScript,
  cardFor as sharedCardFor,
  completingScript,
  finalUpdate,
  firstTurnTask,
  paintParts,
  startFakeAgent as startSharedFakeAgent,
  statusUpdate,
  unmarkedScript as sharedUnmarkedScript,
  type AgentCard,
  type CardOptions,
  type FakeAgent,
  type FakeAgentOptions as SharedFakeAgentOptions,
  type Script,
  type TaskState,
} from '@a2uiverse/smoke-transport/testing';
import {readFileSync} from 'node:fs';
import {
  BASIC_CATALOG_ID,
  BASIC_CATALOG_SCHEMA,
  createSchemaFormCheck,
  formatA2uiFinding,
  type A2uiCatalogSchema,
} from '@a2uiverse/sdk';

export {
  cardUrlOf,
  failedScript,
  hangingScript,
  submittedOnlyScript,
} from '@a2uiverse/smoke-transport/testing';
export type {FakeAgent, Script};

/** The fixture catalog's id, what the default script paints in. */
export const STAR_CATALOG_ID = 'https://example.com/star/catalog.json';

/** The fixture catalog's v1.0 document, as the star-catalog package carries it. */
const STAR_SCHEMA = JSON.parse(
  readFileSync(
    new URL('./fixtures/star-catalog/catalogs/v1.0/catalog.json', import.meta.url),
    'utf8',
  ),
) as A2uiCatalogSchema;

/**
 * A paint the tests author, held to the sdk's schema-form check as it is built (task-21.15
 * decision 7), in the star catalog or the basic one: its messages handed back, or a throw naming
 * each place that fails. A paint in another catalog is written to be refused, and not held.
 */
export function authored<T>(catalogId: string, messages: T[]): T[] {
  const catalog =
    catalogId === STAR_CATALOG_ID
      ? STAR_SCHEMA
      : catalogId === BASIC_CATALOG_ID
        ? (BASIC_CATALOG_SCHEMA as A2uiCatalogSchema)
        : undefined;
  if (!catalog) return messages;
  const findings = createSchemaFormCheck({catalog}).agentToRenderer(messages);
  if (findings.length > 0) {
    throw new Error(
      `a paint the tests author fails the schema-form check: ${findings.map(formatA2uiFinding).join('; ')}`,
    );
  }
  return messages;
}

/** Which sign-in the card declares, required on every request. */
export type SignIn = 'oauth' | 'bearer' | 'apiKey' | 'unsupported';

export interface FakeAgentOptions extends Pick<
  CardOptions,
  'name' | 'version' | 'catalogs' | 'extensions' | 'skills'
> {
  script?: Script;
  signIn?: SignIn;
  /** Whether a JSON-RPC request is let in; refused, it is answered 401. */
  admit?: SharedFakeAgentOptions['admit'];
  /** Serve no card: the well-known path answers 404. */
  noCard?: boolean;
}

export function cardFor(agentUrl: string, options: FakeAgentOptions = {}): AgentCard {
  return sharedCardFor(agentUrl, {
    name: options.name ?? 'Star Agent',
    skills: options.skills ?? [{id: 'star', name: 'star', description: 'star', tags: []}],
    ...(options.version === undefined ? {} : {version: options.version}),
    ...(options.catalogs === undefined ? {} : {catalogs: options.catalogs}),
    ...(options.extensions === undefined ? {} : {extensions: options.extensions}),
    card: securityFor(agentUrl, options.signIn),
  });
}

function securityFor(agentUrl: string, signIn: SignIn | undefined): Partial<AgentCard> {
  switch (signIn) {
    case undefined:
      return {};
    case 'oauth':
      return {
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
      };
    case 'bearer':
      return {
        securitySchemes: {token: {type: 'http', scheme: 'bearer', description: 'Paste a token'}},
        security: [{token: []}],
      };
    case 'apiKey':
      return {
        securitySchemes: {key: {type: 'apiKey', in: 'header', name: 'X-Star-Key'}},
        security: [{key: []}],
      };
    case 'unsupported':
      return {
        securitySchemes: {key: {type: 'apiKey', in: 'query', name: 'key'}},
        security: [{key: []}],
      };
  }
}

const starParts = (catalogId: string, text = 'hi') => {
  const parts = paintParts(catalogId, {component: 'StarText', text});
  authored(
    catalogId,
    parts.map(part => (part.kind === 'data' ? part.data : undefined)),
  );
  return parts;
};

/** Paints one surface in `catalogId` and completes, as the deterministic roster does. */
export const paintingScript = (catalogId = STAR_CATALOG_ID, text = 'hi'): Script =>
  completingScript(starParts(catalogId, text));

/**
 * Streams its tree as it writes it, a model-mode agent's way: the root half-written in one update,
 * its text missing, and whole in the next; then completes with no parts. Every message but the
 * half-written copy passes the schema-form check.
 */
export const streamedScript =
  (catalogId = STAR_CATALOG_ID): Script =>
  ({ctx, firstTurn}) => {
    const copy = (text?: string) => ({
      kind: 'data' as const,
      data: {
        version: '1.0',
        updateComponents: {
          surfaceId: 's1',
          components: [{id: 'root', component: 'StarText', ...(text ? {text} : {})}],
        },
      },
    });
    const create = {
      kind: 'data' as const,
      data: {version: '1.0', createSurface: {surfaceId: 's1', catalogId}},
    };
    authored(catalogId, [create.data, copy('hi').data]);
    return [
      ...(firstTurn ? [firstTurnTask(ctx)] : []),
      statusUpdate(ctx, 'working', [create, copy()], false),
      statusUpdate(ctx, 'working', [copy('hi')], false),
      finalUpdate(ctx, 'completed', []),
    ];
  };

/** Paints a component the catalog does not have: written to be refused, so held to no check. */
export const invalidPaintScript = (catalogId = STAR_CATALOG_ID): Script =>
  completingScript(paintParts(catalogId, {component: 'Nope', text: 'x'}));

/** Ends the task as `auth-required`, naming `scheme`. */
export const authRequiredScript = (scheme = 'signIn', scopes = ['write']): Script =>
  sharedAuthRequiredScript(scheme, scopes);

/**
 * Paints in `catalogId`, then moves through `states` with no update marked final and closes the
 * stream: upstream's restaurant finder ends its answers on `input-required` this way.
 */
export const unmarkedScript = (states: TaskState[], catalogId = STAR_CATALOG_ID): Script =>
  sharedUnmarkedScript(states, starParts(catalogId));

export function startFakeAgent(options: FakeAgentOptions = {}): Promise<FakeAgent> {
  const {script = paintingScript(), catalogs = [STAR_CATALOG_ID], admit, noCard} = options;
  return startSharedFakeAgent({
    script,
    card: url => cardFor(url, {...options, catalogs}),
    ...(admit ? {admit} : {}),
    ...(noCard ? {noCard} : {}),
  });
}
