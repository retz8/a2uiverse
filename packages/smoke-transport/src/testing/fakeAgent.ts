/**
 * An in-process A2A 0.3 agent for tests (task-20.2 decision 1; task-20.5 decision 15): the server
 * of `@a2a-js/sdk` 0.3.14, which this package keeps under an alias for this file alone, on all
 * three bindings — JSON-RPC at its URL, HTTP+JSON under `/rest`, gRPC on a port of its own.
 * Scripted: the test supplies the events each turn emits, in A2A 0.3's shapes. Records what it
 * received so tests assert on the wire — the binding, the words, the capabilities, the extension
 * header, the credential. The marketplace's suite and Stellify's stand their own cards and paints
 * on it.
 */
import {randomUUID} from 'node:crypto';
import {createServer, type IncomingHttpHeaders, type Server} from 'node:http';
import express, {type NextFunction, type Request, type Response} from 'express';
import * as grpc from '@grpc/grpc-js';
import {HTTP_EXTENSION_HEADER, type AgentCard, type Message, type Task} from '@a2a-js/sdk-v0_3';
import {
  DefaultRequestHandler,
  InMemoryTaskStore,
  type AgentExecutionEvent,
  type AgentExecutor,
  type ExecutionEventBus,
  type RequestContext,
} from '@a2a-js/sdk-v0_3/server';
import {
  agentCardHandler,
  jsonRpcHandler,
  restHandler,
  UserBuilder,
} from '@a2a-js/sdk-v0_3/server/express';
import {A2AService, grpcService} from '@a2a-js/sdk-v0_3/server/grpc';
import {A2UI_EXTENSION_URIS} from '@a2uiverse/sdk';

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

/** The three standard bindings, as A2A names them. */
export type FakeBinding = 'JSONRPC' | 'HTTP+JSON' | 'GRPC';

/** A request as `admit` judges it. */
export interface AdmitRequest {
  /** A header, or a gRPC metadata entry, by its name whatever its case. */
  header(name: string): string | undefined;
}

export interface ReceivedRequest {
  /** The binding the request came in on. */
  binding: FakeBinding;
  /** The `X-A2A-Extensions` header, or its gRPC metadata entry. */
  extensionsHeader: string | undefined;
  /** The message as the server decoded it, in A2A 0.3's JSON, whichever binding carried it. */
  message: Message;
  /** Every request header or gRPC metadata entry, lower-cased, so a test sees the credential. */
  headers: Record<string, string>;
}

/** Where the fake answers on each binding. */
export type FakeUrls = Record<FakeBinding, string>;

export interface FakeAgent {
  /** Its JSON-RPC URL. */
  url: string;
  urls: FakeUrls;
  cardUrl: string;
  card: AgentCard;
  requests: ReceivedRequest[];
  close(): Promise<void>;
}

export interface FakeAgentOptions {
  /** The card it serves, for its JSON-RPC URL and, on another binding, where it answers. */
  card: (agentUrl: string, urls: FakeUrls) => AgentCard;
  script: Script;
  /**
   * Whether a request is let in; refused, it is answered as the binding asks sign-in — HTTP 401,
   * or the gRPC status `UNAUTHENTICATED`.
   */
  admit?: (request: AdmitRequest) => boolean;
  /** Serve no card: the well-known path answers 404. */
  noCard?: boolean;
}

/** The URL a card is served at: its agent's URL plus the well-known path. */
export const cardUrlOf = (agentUrl: string) => `${agentUrl}/.well-known/agent-card.json`;

/** HTTP headers lower-cased, each one string. */
export function headersOf(headers: IncomingHttpHeaders): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') out[key.toLowerCase()] = value;
  }
  return out;
}

/** gRPC metadata as headers: each plain entry, its key lower-cased. */
function metadataOf(metadata: grpc.Metadata): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata.getMap())) {
    if (typeof value === 'string') out[key.toLowerCase()] = value;
  }
  return out;
}

type AnyHandler = (...args: unknown[]) => unknown;

/**
 * A gRPC service's implementation with each call judged by `admit` first, a call refused answered
 * with the status `UNAUTHENTICATED`, and its metadata handed to `onCall` as headers.
 */
export function guardedGrpcService<T extends object>(
  implementation: T,
  {
    admit,
    onCall,
  }: {
    admit?: (request: AdmitRequest) => boolean;
    onCall: (method: string, metadata: Record<string, string>) => void;
  },
): T {
  const refusal = {code: grpc.status.UNAUTHENTICATED, details: 'sign in first'};
  const guarded: Record<string, unknown> = {};
  for (const [method, handler] of Object.entries(implementation)) {
    if (typeof handler !== 'function') continue;
    guarded[method] = (
      call: {metadata: grpc.Metadata; emit(event: 'error', err: object): void},
      callback?: (err: object | null) => void,
    ) => {
      const metadata = metadataOf(call.metadata);
      if (admit && !admit({header: name => metadata[name.toLowerCase()]})) {
        if (callback) return callback(refusal);
        return call.emit('error', refusal);
      }
      onCall(method, metadata);
      return (handler as AnyHandler)(call, callback);
    };
  }
  return guarded as T;
}

/**
 * The request handler with the message of each send handed to `onMessage` first, as the server
 * decoded it into the handler's own shape.
 */
export function recordingHandler<T extends object>(
  handler: T,
  onMessage: (message: unknown) => void,
): T {
  return new Proxy(handler, {
    get(target, property, receiver) {
      const value: unknown = Reflect.get(target, property, receiver);
      if (
        typeof value !== 'function' ||
        (property !== 'sendMessage' && property !== 'sendMessageStream')
      ) {
        return typeof value === 'function' ? value.bind(target) : value;
      }
      return (params: {message?: unknown}, ...rest: unknown[]) => {
        onMessage(params.message);
        return (value as AnyHandler).call(target, params, ...rest);
      };
    },
  });
}

export interface CardOptions {
  name?: string;
  description?: string;
  version?: string;
  /**
   * The bindings it lists and where, in the card's order: the first as its `url` and
   * `preferredTransport`, the rest as `additionalInterfaces`. JSON-RPC at the agent's URL alone
   * when absent.
   */
  transports?: Array<{transport: FakeBinding; url: string}>;
  /** The catalog ids the card declares under the A2UI extension; none declares nothing. */
  catalogs?: string[];
  /** The card's extension entries written out, in place of the one v0.9.1 entry `catalogs` makes. */
  extensions?: NonNullable<AgentCard['capabilities']['extensions']>;
  skills?: AgentCard['skills'];
  streaming?: boolean;
  /** Card fields beyond the defaults — `securitySchemes`, `security`. */
  card?: Partial<AgentCard>;
}

/** A card as an A2A 0.3 agent serves it: over JSON-RPC, or the bindings `transports` lists. */
export function cardFor(agentUrl: string, options: CardOptions = {}): AgentCard {
  const {catalogs} = options;
  const [preferred, ...additional] = options.transports ?? [{transport: 'JSONRPC', url: agentUrl}];
  return {
    name: options.name ?? 'Fake Agent',
    description: options.description ?? 'an agent for tests',
    version: options.version ?? '0.1.0',
    protocolVersion: '0.3.0',
    url: preferred!.url,
    preferredTransport: preferred!.transport,
    ...(additional.length > 0 ? {additionalInterfaces: additional} : {}),
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

/** The A2A version whose requirement shape an auth-required request is written in. */
export type RequirementShape = '1.0' | '0.3';

/**
 * The body of an auth-required request naming `scheme` and `scopes`: `securityRequirements` in
 * A2A 1.0's requirement shape, or `security` in A2A 0.3's.
 */
export const authRequiredBody = (
  shape: RequirementShape,
  scheme: string,
  scopes: string[],
): Record<string, unknown> =>
  shape === '1.0'
    ? {securityRequirements: [{schemes: {[scheme]: {list: scopes}}}]}
    : {security: [{[scheme]: scopes}]};

/** Ends the task as `auth-required`, naming `scheme` and `scopes` in the shape of `shape`. */
export const authRequiredScript =
  (scheme: string, scopes: string[], shape: RequirementShape = '0.3'): Script =>
  ({ctx}) => [
    finalUpdate(ctx, 'auth-required', [
      {kind: 'text', text: 'Please sign in.'},
      {kind: 'data', data: authRequiredBody(shape, scheme, scopes)},
    ]),
  ];

/** An artifact update carrying `parts`: where the platform reads no A2UI. */
export const artifactUpdate = (
  ctx: RequestContext,
  parts: Message['parts'],
): AgentExecutionEvent => ({
  kind: 'artifact-update',
  taskId: ctx.taskId,
  contextId: ctx.contextId,
  artifact: {artifactId: randomUUID(), parts},
});

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
  const {script, admit} = options;
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
  // Who called, set as a call comes in on any binding; its message is recorded once the server
  // has decoded it, from the request handler.
  let called: {binding: FakeBinding; headers: Record<string, string>} = {
    binding: 'JSONRPC',
    headers: {},
  };
  /** Answers 401 to an HTTP request `admit` refuses, and names the binding of one let in. */
  const gate = (binding: FakeBinding) => (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as {method?: string} | undefined;
    const sent = binding === 'JSONRPC' ? typeof body?.method === 'string' : req.method === 'POST';
    if (sent && admit && !admit(req)) {
      res.status(401).set('WWW-Authenticate', 'Bearer error="invalid_token"').json({});
      return;
    }
    if (sent) called = {binding, headers: headersOf(req.headers)};
    next();
  };
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('fake agent: no port');
  const url = `http://127.0.0.1:${address.port}`;
  const grpcServer = new grpc.Server();
  const grpcPort = await new Promise<number>((resolve, reject) =>
    grpcServer.bindAsync('127.0.0.1:0', grpc.ServerCredentials.createInsecure(), (err, port) =>
      err ? reject(err) : resolve(port),
    ),
  );
  const urls: FakeUrls = {
    JSONRPC: url,
    'HTTP+JSON': `${url}${REST_PATH}`,
    GRPC: `127.0.0.1:${grpcPort}`,
  };
  const card = options.card(url, urls);

  const requestHandler = recordingHandler(
    new DefaultRequestHandler(card, new InMemoryTaskStore(), executor),
    message =>
      requests.push({
        binding: called.binding,
        extensionsHeader: called.headers[HTTP_EXTENSION_HEADER.toLowerCase()],
        message: message as Message,
        headers: called.headers,
      }),
  );
  if (!options.noCard) {
    app.use('/.well-known/agent-card.json', agentCardHandler({agentCardProvider: requestHandler}));
  }
  app.use(
    REST_PATH,
    gate('HTTP+JSON'),
    restHandler({requestHandler, userBuilder: UserBuilder.noAuthentication}),
  );
  app.use(
    '/',
    gate('JSONRPC'),
    jsonRpcHandler({requestHandler, userBuilder: UserBuilder.noAuthentication}),
  );
  server.on('request', app);
  grpcServer.addService(
    A2AService,
    guardedGrpcService(grpcService({requestHandler, userBuilder: UserBuilder.noAuthentication}), {
      ...(admit ? {admit} : {}),
      onCall: (_method, metadata) => (called = {binding: 'GRPC', headers: metadata}),
    }),
  );

  return {
    url,
    urls,
    cardUrl: cardUrlOf(url),
    card,
    requests,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close(err => (err ? reject(err) : resolve())),
      );
      grpcServer.forceShutdown();
    },
  };
}

const REST_PATH = '/rest';
