/**
 * An in-process A2A 1.0 agent for tests (task-20.3 decision 20; task-20.5 decision 15): the
 * server of `@a2a-js/sdk` 1.x, with its A2A 0.3 layer on, so one agent answers both A2A versions
 * on all three bindings — JSON-RPC at a path for each version, HTTP+JSON at one path, gRPC on a
 * port of its own — the six paths. Scripted: the test supplies the events each turn emits, in the
 * A2A SDK's in-memory shapes. Records what it received so tests assert on the wire — which
 * binding and which A2A version a request reached, the words, the capabilities, the credential.
 *
 * It serves its card in A2A 1.0's JSON, as Python's `a2a-sdk` server does. The A2A SDK's own card
 * handler serves the in-memory form, whose sign-in schemes its own reader drops.
 */
import {randomUUID} from 'node:crypto';
import {createServer, type Server} from 'node:http';
import express, {type NextFunction, type Request, type Response} from 'express';
import * as grpc from '@grpc/grpc-js';
import {AgentCard, Message, Role, TaskState, type Part, type Task} from '@a2a-js/sdk';
import {
  DefaultRequestHandler,
  InMemoryTaskStore,
  type AgentExecutionEvent,
  type AgentExecutor,
  type ExecutionEventBus,
  type RequestContext,
} from '@a2a-js/sdk/server';
import {jsonRpcHandler, restHandler, UserBuilder} from '@a2a-js/sdk/server/express';
import {A2AService, grpcService} from '@a2a-js/sdk/server/grpc';
import {LegacyA2AService, legacyGrpcService} from '@a2a-js/sdk/compat/v0_3/server/grpc';
import {A2UI_EXTENSION_URIS} from '@a2uiverse/sdk';
import {
  authRequiredBody,
  cardUrlOf,
  guardedGrpcService,
  headersOf,
  recordingHandler,
  type AdmitRequest,
  type FakeBinding,
  type RequirementShape,
} from './fakeAgent.js';

export type {AgentExecutionEvent, RequestContext};

export interface ScriptContextV1 {
  ctx: RequestContext;
  /** True on the first turn of a conversation: a real agent emits a task then. */
  firstTurn: boolean;
}

export type ScriptV1 = (
  s: ScriptContextV1,
) => AgentExecutionEvent[] | AsyncIterable<AgentExecutionEvent>;

/** The A2A versions the fake answers, as its interfaces name them. */
export type FakeA2aVersion = '1.0' | '0.3';

/** Where the fake answers each A2A version over JSON-RPC. */
export type FakeInterfaceUrls = Record<FakeA2aVersion, string>;

/** One of the six paths: a binding at an A2A version. */
export interface FakePath {
  binding: FakeBinding;
  version: FakeA2aVersion;
}

/** Where the fake answers on each binding: JSON-RPC at a URL for each version. */
export interface FakeBindingUrls {
  JSONRPC: FakeInterfaceUrls;
  'HTTP+JSON': string;
  /** A bare `host:port`, as the A2A SDK's own sample agent writes it. */
  GRPC: string;
}

export interface ReceivedRequestV1 {
  /** The binding of the interface the request reached. */
  binding: FakeBinding;
  /** The A2A version of the interface the request reached. */
  reached: FakeA2aVersion;
  /** The `A2A-Version` header the caller sent, or its gRPC metadata entry. */
  a2aVersion: string | undefined;
  /** The method called: JSON-RPC's, the HTTP+JSON path's last segment, or gRPC's. */
  method: string;
  /**
   * The message the request carried: as the wire carried it on JSON-RPC and HTTP+JSON; on gRPC as
   * the server decoded it, in the A2A SDK's shape for the version reached.
   */
  message: Record<string, unknown> | undefined;
  /** Every request header or gRPC metadata entry, lower-cased, so a test sees the credential. */
  headers: Record<string, string>;
}

export interface FakeAgentV1 {
  url: string;
  cardUrl: string;
  /** JSON-RPC's two interfaces. */
  interfaces: FakeInterfaceUrls;
  urls: FakeBindingUrls;
  /** The card the agent runs on, as the A2A SDK holds it. */
  card: AgentCard;
  /** The card as the card URL answers it now. */
  served: unknown;
  /** Where the agent serves its key set (task-20.7): the URL a signed card's `jku` names. */
  keySetUrl: string;
  /** What the card URL answers from now on, a signed card among them. */
  serveCard(served: unknown): void;
  /** What the key set's URL answers from now on; `hang` answers nothing. */
  serveKeySet(keySet: unknown): void;
  requests: ReceivedRequestV1[];
  /** How many HTTP connections to the agent are open: a stream a caller left counts none. */
  connections(): Promise<number>;
  close(): Promise<void>;
}

export interface FakeAgentV1Options {
  /** The card it runs on, for the addresses it listens on. */
  card: (urls: FakeBindingUrls) => AgentCard;
  script: ScriptV1;
  /**
   * What the card URL answers, in place of the card in A2A 1.0's JSON: a signed card is made here,
   * its `jku` the agent's own `keySetUrl`.
   */
  serve?: (card: AgentCard, at: {keySetUrl: string}) => unknown;
  /** What the key set's URL answers; nothing is served there by default. */
  keySet?: unknown;
  /**
   * Whether a request is let in; refused, it is answered as the binding asks sign-in — HTTP 401,
   * or the gRPC status `UNAUTHENTICATED`.
   */
  admit?: (request: AdmitRequest) => boolean;
}

const PATHS: Record<FakeA2aVersion, string> = {'1.0': '/a2a/v1', '0.3': '/a2a/v0_3'};
const KEY_SET_PATH = '/.well-known/jwks.json';
const REST_PATH = '/rest';

/** Where the fake answers `path`. */
export function urlOf(urls: FakeBindingUrls, {binding, version}: FakePath): string {
  return binding === 'JSONRPC' ? urls.JSONRPC[version] : urls[binding];
}

export interface CardV1Options {
  name?: string;
  description?: string;
  version?: string;
  /** The A2A versions its JSON-RPC interfaces are listed at, in the card's order. */
  order?: FakeA2aVersion[];
  /** The paths it lists, in the card's order, in place of `order`. */
  paths?: FakePath[];
  /** The catalog ids the card declares under the A2UI extension; none declares nothing. */
  catalogs?: string[];
  skills?: {id: string; name: string; description: string; tags: string[]; examples?: string[]}[];
  /** Card fields beyond the defaults, in A2A 1.0's JSON — `securitySchemes`, `securityRequirements`. */
  card?: Record<string, unknown>;
}

/** A card as an A2A 1.0 agent holds it: the paths `paths` lists, else JSON-RPC at `order`. */
export function cardForV1(urls: FakeBindingUrls, options: CardV1Options = {}): AgentCard {
  const {catalogs} = options;
  const paths =
    options.paths ??
    (options.order ?? ['1.0']).map((version): FakePath => ({binding: 'JSONRPC', version}));
  return AgentCard.fromJSON({
    name: options.name ?? 'Fake Agent',
    description: options.description ?? 'an agent for tests',
    version: options.version ?? '0.1.0',
    supportedInterfaces: paths.map(path => ({
      url: urlOf(urls, path),
      protocolBinding: path.binding,
      protocolVersion: path.version,
    })),
    capabilities: {
      streaming: true,
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
    ...options.card,
  });
}

const part = (content: Part['content']): Part => ({
  content,
  metadata: undefined,
  filename: '',
  mediaType: '',
});

/** A text part. */
export const textPartV1 = (text: string): Part => part({$case: 'text', value: text});

/** How a data part is marked: its part metadata, and its own `mediaType`. */
export interface PartMarksV1 {
  metadata?: Record<string, unknown>;
  mediaType?: string;
}

/** A data part, unmarked unless `marks` says otherwise. */
export const dataPartV1 = (data: unknown, marks: PartMarksV1 = {}): Part => ({
  ...part({$case: 'data', value: data}),
  metadata: marks.metadata,
  mediaType: marks.mediaType ?? '',
});

/** One surface, `s1`, created in `catalogId` and drawn as one component carrying `text`. */
export const paintPartsV1 = (
  catalogId: string,
  {component = 'Text', text = 'hi'}: {component?: string; text?: string} = {},
): Part[] => [
  dataPartV1({version: 'v0.9', createSurface: {surfaceId: 's1', catalogId}}),
  dataPartV1({
    version: 'v0.9',
    updateComponents: {surfaceId: 's1', components: [{id: 'root', component, text}]},
  }),
];

/** The task a real agent emits on the first turn of a conversation. */
export const firstTurnTaskV1 = (ctx: RequestContext): AgentExecutionEvent => ({
  kind: 'task',
  data: {
    id: ctx.taskId,
    contextId: ctx.contextId,
    status: {state: TaskState.TASK_STATE_SUBMITTED, message: undefined, timestamp: undefined},
    artifacts: [],
    history: [],
    metadata: undefined,
  } satisfies Task,
});

/** A status update moving the task to `state`, its status message carrying `parts`. */
export const statusUpdateV1 = (
  ctx: RequestContext,
  state: TaskState,
  parts: Part[],
): AgentExecutionEvent => ({
  kind: 'statusUpdate',
  data: {
    taskId: ctx.taskId,
    contextId: ctx.contextId,
    status: {
      state,
      message: {
        messageId: randomUUID(),
        contextId: ctx.contextId,
        taskId: ctx.taskId,
        role: Role.ROLE_AGENT,
        parts,
        metadata: undefined,
        extensions: [],
        referenceTaskIds: [],
      } satisfies Message,
      timestamp: undefined,
    },
    metadata: undefined,
  },
});

/** An artifact update carrying `parts`: where the platform reads no A2UI. */
export const artifactUpdateV1 = (ctx: RequestContext, parts: Part[]): AgentExecutionEvent => ({
  kind: 'artifactUpdate',
  data: {
    taskId: ctx.taskId,
    contextId: ctx.contextId,
    artifact: {
      artifactId: randomUUID(),
      name: '',
      description: '',
      parts,
      metadata: undefined,
      extensions: [],
    },
    append: false,
    lastChunk: true,
    metadata: undefined,
  },
});

/**
 * Moves the task to auth-required, naming `scheme` and `scopes` in the shape of `shape`, and
 * holds its stream open from there, as A2A 1.0 asks of an agent that waits for a credential: the
 * script never ends, so nothing closes the stream but the caller leaving it.
 */
export const authRequiredScriptV1 = (
  scheme: string,
  scopes: string[],
  shape: RequirementShape = '1.0',
): ScriptV1 =>
  async function* ({ctx, firstTurn}) {
    if (firstTurn) yield firstTurnTaskV1(ctx);
    yield statusUpdateV1(ctx, TaskState.TASK_STATE_AUTH_REQUIRED, [
      textPartV1('Please sign in.'),
      dataPartV1(authRequiredBody(shape, scheme, scopes)),
    ]);
    await new Promise<never>(() => {});
  };

/** Answers `parts` on a completed task. */
export const completingScriptV1 =
  (parts: Part[]): ScriptV1 =>
  ({ctx, firstTurn}) => [
    ...(firstTurn ? [firstTurnTaskV1(ctx)] : []),
    statusUpdateV1(ctx, TaskState.TASK_STATE_COMPLETED, parts),
  ];

/** Answers with the parts of the message it received, as the executor holds them. */
export const echoScriptV1: ScriptV1 = ({ctx, firstTurn}) => [
  ...(firstTurn ? [firstTurnTaskV1(ctx)] : []),
  statusUpdateV1(ctx, TaskState.TASK_STATE_COMPLETED, ctx.userMessage.parts),
];

export async function startFakeAgentV1(options: FakeAgentV1Options): Promise<FakeAgentV1> {
  const {script, admit} = options;
  const requests: ReceivedRequestV1[] = [];
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
  const urls: FakeBindingUrls = {
    JSONRPC: {'1.0': `${url}${PATHS['1.0']}`, '0.3': `${url}${PATHS['0.3']}`},
    'HTTP+JSON': `${url}${REST_PATH}`,
    GRPC: `127.0.0.1:${grpcPort}`,
  };
  const card = options.card(urls);
  const keySetUrl = `${url}${KEY_SET_PATH}`;
  let served = options.serve ? await options.serve(card, {keySetUrl}) : AgentCard.toJSON(card);
  let keySet: unknown = options.keySet;

  const requestHandler = new DefaultRequestHandler(card, new InMemoryTaskStore(), executor);
  app.get('/.well-known/agent-card.json', (_req: Request, res: Response) => {
    res.json(served);
  });
  app.get(KEY_SET_PATH, (_req: Request, res: Response) => {
    if (keySet === 'hang') return;
    if (keySet === undefined) res.status(404).end();
    else res.json(keySet);
  });
  /** Records a request on an HTTP binding, and answers 401 to one `admit` refuses. */
  const gate =
    (binding: FakeBinding, reachedOf: (req: Request) => FakeA2aVersion) =>
    (req: Request, res: Response, next: NextFunction) => {
      const body = req.body as
        | {method?: string; params?: {message?: Record<string, unknown>}; message?: unknown}
        | undefined;
      const method =
        binding === 'JSONRPC'
          ? body?.method
          : req.method === 'POST'
            ? req.path.split('/').pop()
            : undefined;
      if (typeof method !== 'string') return next();
      if (admit && !admit(req)) {
        res.status(401).set('WWW-Authenticate', 'Bearer error="invalid_token"').json({});
        return;
      }
      const message = binding === 'JSONRPC' ? body?.params?.message : body?.message;
      requests.push({
        binding,
        reached: reachedOf(req),
        a2aVersion: req.header('A2A-Version'),
        method,
        message:
          typeof message === 'object' && message !== null
            ? (message as Record<string, unknown>)
            : undefined,
        headers: headersOf(req.headers),
      });
      next();
    };
  for (const version of ['1.0', '0.3'] as const) {
    app.use(
      PATHS[version],
      gate('JSONRPC', () => version),
    );
    app.use(
      PATHS[version],
      jsonRpcHandler({
        requestHandler,
        userBuilder: UserBuilder.noAuthentication,
        legacyCompat: {enabled: true},
      }),
    );
  }
  // The A2A 0.3 layer answers HTTP+JSON under `/v1`, the paths A2A 0.3 names.
  app.use(
    REST_PATH,
    gate('HTTP+JSON', req => (req.path.startsWith('/v1/') ? '0.3' : '1.0')),
    restHandler({
      requestHandler,
      userBuilder: UserBuilder.noAuthentication,
      legacyCompat: {enabled: true},
    }),
  );
  server.on('request', app);
  // A gRPC call's method and metadata, then its message as the server decoded it, written in
  // A2A 1.0's JSON whichever version the call reached.
  const userBuilder = UserBuilder.noAuthentication;
  for (const version of ['1.0', '0.3'] as const) {
    let called = {method: '', metadata: {} as Record<string, string>};
    const handler = recordingHandler(requestHandler, message =>
      requests.push({
        binding: 'GRPC',
        reached: version,
        a2aVersion: called.metadata['a2a-version'],
        method: called.method,
        message: Message.toJSON(message as Message) as Record<string, unknown>,
        headers: called.metadata,
      }),
    );
    const guard = {
      ...(admit ? {admit} : {}),
      onCall: (method: string, metadata: Record<string, string>) => (called = {method, metadata}),
    };
    if (version === '1.0') {
      grpcServer.addService(
        A2AService,
        guardedGrpcService(grpcService({requestHandler: handler, userBuilder}), guard),
      );
    } else {
      grpcServer.addService(
        LegacyA2AService,
        guardedGrpcService(legacyGrpcService({requestHandler: handler, userBuilder}), guard),
      );
    }
  }

  return {
    url,
    cardUrl: cardUrlOf(url),
    interfaces: urls.JSONRPC,
    urls,
    card,
    get served() {
      return served;
    },
    keySetUrl,
    serveCard: next => {
      served = next;
    },
    serveKeySet: next => {
      keySet = next;
    },
    requests,
    connections: () =>
      new Promise<number>((resolve, reject) =>
        server.getConnections((err, count) => (err ? reject(err) : resolve(count))),
      ),
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close(err => (err ? reject(err) : resolve())),
      );
      grpcServer.forceShutdown();
    },
  };
}
