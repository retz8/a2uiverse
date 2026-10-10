/**
 * An in-process A2A agent for tests, built on the same SDK server pieces the roster's agents use,
 * modelled on the orchestrator's fake vendor. Scripted: the test supplies the events each turn
 * emits. Records what it received so tests can assert on the wire.
 */
import {createServer, type Server} from 'node:http';
import {randomUUID} from 'node:crypto';
import express, {type Request, type Response, type NextFunction} from 'express';
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
import {authRequiredData} from '@a2uiverse/sdk';
import {cardFor, signInCardFor, type CardOptions} from './fixture.js';

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
  authorization?: string;
}

export interface FakeAgent {
  url: string;
  cardUrl: string;
  card: AgentCard;
  requests: ReceivedRequest[];
  close(): Promise<void>;
}

export interface FakeAgentOptions extends CardOptions {
  script?: Script;
  /** The card requires sign-in (an OAuth scheme on every request). */
  signIn?: boolean;
  /** Whether a JSON-RPC request is let in; refused, it is answered 401. */
  admit?: (request: Request) => boolean;
  /** Serve no card: the well-known path answers 404. */
  noCard?: boolean;
}

/** The catalog the default script paints in. */
export const FAKE_CATALOG_ID = 'https://example.com/fake/catalog.json';

export const paintParts = (catalogId: string, text = 'hi') => [
  {kind: 'data' as const, data: {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId}}},
  {
    kind: 'data' as const,
    data: {
      version: 'v0.9',
      updateComponents: {
        surfaceId: 's1',
        components: [{id: 'root', component: 'Text', text}],
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
  (catalogId = FAKE_CATALOG_ID, text = 'hi'): Script =>
  ({ctx, firstTurn}) => [
    ...(firstTurn ? [firstTurnTask(ctx)] : []),
    finalUpdate(ctx, 'completed', paintParts(catalogId, text)),
  ];

/** Paints, then the credential input the bar refuses. */
export const credentialScript =
  (catalogId = FAKE_CATALOG_ID): Script =>
  ({ctx}) => [
    finalUpdate(ctx, 'completed', [
      {kind: 'data', data: {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId}}},
      {
        kind: 'data',
        data: {
          version: 'v0.9',
          updateComponents: {
            surfaceId: 's1',
            components: [{id: 'root', component: 'Text', text: 'Enter it', password: ''}],
          },
        },
      },
    ]),
  ];

/** Ends the task as `auth-required`, naming `scheme`. */
export const authRequiredScript =
  (scheme = 'signIn', scopes = ['read']): Script =>
  ({ctx}) => [
    finalUpdate(ctx, 'auth-required', [
      {kind: 'text', text: 'Please sign in.'},
      {kind: 'data', data: authRequiredData({security: [{[scheme]: scopes}]})},
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
  const {script = paintingScript(), catalogs = [FAKE_CATALOG_ID]} = options;
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
      const authorization = req.header('authorization');
      requests.push({
        extensionsHeader: req.header(HTTP_EXTENSION_HEADER),
        message,
        ...(authorization ? {authorization} : {}),
      });
    }
    next();
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('fake agent: no port');
  const url = `http://127.0.0.1:${address.port}`;
  const cardOptions = {...options, catalogs};
  const card = options.signIn ? signInCardFor(url, cardOptions) : cardFor(url, cardOptions);

  const requestHandler = new DefaultRequestHandler(card, new InMemoryTaskStore(), executor);
  if (!options.noCard) {
    app.use('/.well-known/agent-card.json', agentCardHandler({agentCardProvider: requestHandler}));
  }
  app.use('/', jsonRpcHandler({requestHandler, userBuilder: UserBuilder.noAuthentication}));
  server.on('request', app);

  return {
    url,
    cardUrl: `${url}/.well-known/agent-card.json`,
    card,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close(err => (err ? reject(err) : resolve()));
      }),
  };
}
