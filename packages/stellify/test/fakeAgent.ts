/**
 * An in-process A2A agent for Stellify's tests, a copy of the marketplace's: built on the same
 * SDK server pieces the roster's agents use, scripted per turn, recording what it received so the
 * tests assert on the wire — the words, the capabilities, the extension header, the credential.
 */
import {randomUUID} from 'node:crypto';
import {createServer, type Server} from 'node:http';
import express, {type NextFunction, type Request, type Response} from 'express';
import {HTTP_EXTENSION_HEADER, type AgentCard, type Message, type Task} from '@a2a-js/sdk';
import {
  DefaultRequestHandler,
  InMemoryTaskStore,
  type AgentExecutionEvent,
  type AgentExecutor,
  type ExecutionEventBus,
  type RequestContext,
} from '@a2a-js/sdk/server';
import {agentCardHandler, jsonRpcHandler, UserBuilder} from '@a2a-js/sdk/server/express';
import {A2UI_EXTENSION_URI, authRequiredData} from '@a2uiverse/sdk';

/** The fixture catalog's id, what the default script paints in. */
export const STAR_CATALOG_ID = 'https://example.com/star/catalog.json';

export interface ScriptContext {
  ctx: RequestContext;
  firstTurn: boolean;
}

export type Script = (
  s: ScriptContext,
) => AgentExecutionEvent[] | AsyncIterable<AgentExecutionEvent>;

export interface ReceivedRequest {
  extensionsHeader: string | undefined;
  message: Message;
  /** Every request header, lower-cased, so a test sees the credential as it rode. */
  headers: Record<string, string>;
}

export interface FakeAgent {
  url: string;
  cardUrl: string;
  card: AgentCard;
  requests: ReceivedRequest[];
  close(): Promise<void>;
}

/** Which sign-in the card declares, required on every request. */
export type SignIn = 'oauth' | 'bearer' | 'apiKey' | 'unsupported';

export interface FakeAgentOptions {
  name?: string;
  version?: string;
  /** The catalog ids the card declares under the A2UI extension; none declares nothing. */
  catalogs?: string[];
  skills?: AgentCard['skills'];
  script?: Script;
  signIn?: SignIn;
  /** Whether a JSON-RPC request is let in; refused, it is answered 401. */
  admit?: (request: Request) => boolean;
  /** Serve no card: the well-known path answers 404. */
  noCard?: boolean;
}

export const cardUrlOf = (agentUrl: string) => `${agentUrl}/.well-known/agent-card.json`;

export function cardFor(agentUrl: string, options: FakeAgentOptions = {}): AgentCard {
  const {catalogs} = options;
  const base: AgentCard = {
    name: options.name ?? 'Star Agent',
    description: 'an agent for tests',
    version: options.version ?? '0.1.0',
    protocolVersion: '0.3.0',
    url: agentUrl,
    preferredTransport: 'JSONRPC',
    capabilities: {
      streaming: true,
      extensions: [
        {
          uri: A2UI_EXTENSION_URI,
          ...(catalogs ? {params: {supportedCatalogIds: catalogs}} : {}),
        },
      ],
    },
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: options.skills ?? [{id: 'star', name: 'star', description: 'star', tags: []}],
  };
  return {...base, ...securityFor(agentUrl, options.signIn)};
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

export const paintParts = (catalogId: string, text = 'hi') => [
  {kind: 'data' as const, data: {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId}}},
  {
    kind: 'data' as const,
    data: {
      version: 'v0.9',
      updateComponents: {
        surfaceId: 's1',
        components: [{id: 'root', component: 'StarText', text}],
      },
    },
  },
];

const firstTurnTask = (ctx: RequestContext): Task => ({
  kind: 'task',
  id: ctx.taskId,
  contextId: ctx.contextId,
  status: {state: 'submitted'},
  history: [{...ctx.userMessage, contextId: ctx.contextId, taskId: ctx.taskId}],
});

const finalUpdate = (
  ctx: RequestContext,
  state: Task['status']['state'],
  parts: Message['parts'],
): AgentExecutionEvent => ({
  kind: 'status-update',
  taskId: ctx.taskId,
  contextId: ctx.contextId,
  final: true,
  status: {
    state,
    message: {
      kind: 'message',
      messageId: randomUUID(),
      role: 'agent',
      parts,
      contextId: ctx.contextId,
      taskId: ctx.taskId,
    },
  },
});

/** Paints one surface in `catalogId` and completes, as the deterministic roster does. */
export const paintingScript =
  (catalogId = STAR_CATALOG_ID, text = 'hi'): Script =>
  ({ctx, firstTurn}) => [
    ...(firstTurn ? [firstTurnTask(ctx)] : []),
    finalUpdate(ctx, 'completed', paintParts(catalogId, text)),
  ];

/** Paints a component the catalog does not have. */
export const invalidPaintScript =
  (catalogId = STAR_CATALOG_ID): Script =>
  ({ctx}) => [
    finalUpdate(ctx, 'completed', [
      {kind: 'data', data: {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId}}},
      {
        kind: 'data',
        data: {
          version: 'v0.9',
          updateComponents: {
            surfaceId: 's1',
            components: [{id: 'root', component: 'Nope', text: 'x'}],
          },
        },
      },
    ]),
  ];

/** Ends the task as `auth-required`, naming `scheme`. */
export const authRequiredScript =
  (scheme = 'signIn', scopes = ['write']): Script =>
  ({ctx}) => [
    finalUpdate(ctx, 'auth-required', [
      {kind: 'text', text: 'Please sign in.'},
      {kind: 'data', data: {...authRequiredData({security: [{[scheme]: scopes}]})}},
    ]),
  ];

/** Ends the task as failed, in its own words. */
export const failedScript: Script = ({ctx}) => [
  finalUpdate(ctx, 'failed', [{kind: 'text', text: 'boom'}]),
];

/** Emits a task and nothing final. */
export const noFinalScript: Script = ({ctx}) => [firstTurnTask(ctx)];

/** Never answers. */
export const hangingScript: Script = () => ({
  [Symbol.asyncIterator]: () => ({next: () => new Promise(() => {})}),
});

export async function startFakeAgent(options: FakeAgentOptions = {}): Promise<FakeAgent> {
  const {script = paintingScript(), catalogs = [STAR_CATALOG_ID]} = options;
  const requests: ReceivedRequest[] = [];
  const seen = new Set<string>();

  const executor: AgentExecutor = {
    async execute(ctx: RequestContext, bus: ExecutionEventBus) {
      const firstTurn = !seen.has(ctx.contextId);
      seen.add(ctx.contextId);
      try {
        for await (const event of script({ctx, firstTurn})) bus.publish(event);
      } finally {
        bus.finished();
      }
    },
    async cancelTask() {},
  };

  const server: Server = createServer();
  const app = express();
  app.use(express.json());
  app.use((req: Request, res: Response, next: NextFunction) => {
    const body = req.body as {method?: string; params?: {message?: Message}} | undefined;
    if (typeof body?.method === 'string' && options.admit && !options.admit(req)) {
      res.status(401).set('WWW-Authenticate', 'Bearer error="invalid_token"').json({});
      return;
    }
    const message = body?.params?.message;
    if (message) {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') headers[key] = value;
      }
      requests.push({extensionsHeader: req.header(HTTP_EXTENSION_HEADER), message, headers});
    }
    next();
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('fake agent: no port');
  const url = `http://127.0.0.1:${address.port}`;
  const card = cardFor(url, {...options, catalogs});

  const requestHandler = new DefaultRequestHandler(card, new InMemoryTaskStore(), executor);
  if (!options.noCard) {
    app.use('/.well-known/agent-card.json', agentCardHandler({agentCardProvider: requestHandler}));
  }
  app.use('/', jsonRpcHandler({requestHandler, userBuilder: UserBuilder.noAuthentication}));
  server.on('request', app);

  return {
    url,
    cardUrl: cardUrlOf(url),
    card,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close(err => (err ? reject(err) : resolve()));
      }),
  };
}
