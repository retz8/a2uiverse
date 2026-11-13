/**
 * An in-process A2A 0.3 agent for tests (task-20.2 decision 1): the server of `@a2a-js/sdk`
 * 0.3.14, which this package keeps under an alias for this file alone. Scripted: the test
 * supplies the events each turn emits, in A2A 0.3's shapes. Records what it received so tests
 * assert on the wire — the words, the capabilities, the extension header, the credential. The
 * marketplace's suite and Stellify's stand their own cards and paints on it.
 */
import {randomUUID} from 'node:crypto';
import {createServer, type Server} from 'node:http';
import express, {type NextFunction, type Request, type Response} from 'express';
import {HTTP_EXTENSION_HEADER, type AgentCard, type Message, type Task} from '@a2a-js/sdk-v0_3';
import {
  DefaultRequestHandler,
  InMemoryTaskStore,
  type AgentExecutionEvent,
  type AgentExecutor,
  type ExecutionEventBus,
  type RequestContext,
} from '@a2a-js/sdk-v0_3/server';
import {agentCardHandler, jsonRpcHandler, UserBuilder} from '@a2a-js/sdk-v0_3/server/express';
import {A2UI_EXTENSION_URIS, authRequiredData} from '@a2uiverse/sdk';

/** The 0.3 shapes a test's script and card are written in. */
export type {AgentCard, AgentExecutionEvent, Message, RequestContext, Task};

/** A task state as A2A 0.3 spells it. */
export type TaskState = Task['status']['state'];

export interface ScriptContext {
  ctx: RequestContext;
  /** True on the first turn of a conversation: a real agent emits a task then. */
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

export interface FakeAgentOptions {
  /** The card it serves, for the URL it listens on. */
  card: (agentUrl: string) => AgentCard;
  script: Script;
  /** Whether a JSON-RPC request is let in; refused, it is answered 401. */
  admit?: (request: Request) => boolean;
  /** Serve no card: the well-known path answers 404. */
  noCard?: boolean;
}

/** The URL a card is served at: its agent's URL plus the well-known path. */
export const cardUrlOf = (agentUrl: string) => `${agentUrl}/.well-known/agent-card.json`;

export interface CardOptions {
  name?: string;
  description?: string;
  version?: string;
  /** The catalog ids the card declares under the A2UI extension; none declares nothing. */
  catalogs?: string[];
  /** The card's extension entries written out, in place of the one v0.9.1 entry `catalogs` makes. */
  extensions?: NonNullable<AgentCard['capabilities']['extensions']>;
  skills?: AgentCard['skills'];
  streaming?: boolean;
  /** Card fields beyond the defaults — `securitySchemes`, `security`. */
  card?: Partial<AgentCard>;
}

/** A card as an A2A 0.3 agent serves it, over JSON-RPC. */
export function cardFor(agentUrl: string, options: CardOptions = {}): AgentCard {
  const {catalogs} = options;
  return {
    name: options.name ?? 'Fake Agent',
    description: options.description ?? 'an agent for tests',
    version: options.version ?? '0.1.0',
    protocolVersion: '0.3.0',
    url: agentUrl,
    preferredTransport: 'JSONRPC',
    capabilities: {
      streaming: options.streaming ?? true,
      extensions: options.extensions ?? [
        {
          uri: A2UI_EXTENSION_URIS['v0.9.1'],
          ...(catalogs ? {params: {supportedCatalogIds: catalogs}} : {}),
        },
      ],
    },
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: options.skills ?? [{id: 'fake', name: 'fake', description: 'fake', tags: []}],
    ...options.card,
  };
}

/** One surface, `s1`, created in `catalogId` and drawn as one component carrying `text`. */
export const paintParts = (
  catalogId: string,
  {component = 'Text', text = 'hi'}: {component?: string; text?: string} = {},
): Message['parts'] => [
  {kind: 'data', data: {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId}}},
  {
    kind: 'data',
    data: {
      version: 'v0.9',
      updateComponents: {surfaceId: 's1', components: [{id: 'root', component, text}]},
    },
  },
];

/** The task a real agent emits on the first turn of a conversation. */
export const firstTurnTask = (ctx: RequestContext): Task => ({
  kind: 'task',
  id: ctx.taskId,
  contextId: ctx.contextId,
  status: {state: 'submitted'},
  history: [{...ctx.userMessage, contextId: ctx.contextId, taskId: ctx.taskId}],
});

/** A status update moving the task to `state`, its status message carrying `parts`. */
export const statusUpdate = (
  ctx: RequestContext,
  state: TaskState,
  parts: Message['parts'],
  final: boolean,
): AgentExecutionEvent => ({
  kind: 'status-update',
  taskId: ctx.taskId,
  contextId: ctx.contextId,
  final,
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

/** A status update marked `final`. */
export const finalUpdate = (
  ctx: RequestContext,
  state: TaskState,
  parts: Message['parts'],
): AgentExecutionEvent => statusUpdate(ctx, state, parts, true);

/** Answers `parts` on a completed task, as the deterministic roster does. */
export const completingScript =
  (parts: Message['parts']): Script =>
  ({ctx, firstTurn}) => [
    ...(firstTurn ? [firstTurnTask(ctx)] : []),
    finalUpdate(ctx, 'completed', parts),
  ];

/** Ends the task as `auth-required`, naming `scheme` and `scopes`. */
export const authRequiredScript =
  (scheme: string, scopes: string[]): Script =>
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

/**
 * Answers `parts` on a working task, then moves through `states` with no update marked final and
 * closes the stream: upstream's restaurant finder ends its answers on `input-required` this way.
 */
export const unmarkedScript =
  (states: TaskState[], parts: Message['parts']): Script =>
  ({ctx, firstTurn}) => [
    ...(firstTurn ? [firstTurnTask(ctx)] : []),
    statusUpdate(ctx, 'working', parts, false),
    ...states.map(state => statusUpdate(ctx, state, [], false)),
  ];

/** Emits a task, still submitted, and closes the stream. */
export const submittedOnlyScript: Script = ({ctx}) => [firstTurnTask(ctx)];

/** Never answers. */
export const hangingScript: Script = () => ({
  [Symbol.asyncIterator]: () => ({next: () => new Promise(() => {})}),
});

export async function startFakeAgent(options: FakeAgentOptions): Promise<FakeAgent> {
  const {script} = options;
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
  const card = options.card(url);

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
