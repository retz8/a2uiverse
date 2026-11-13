/**
 * An in-process A2A 1.0 agent for tests (task-20.3 decision 20): the server of `@a2a-js/sdk`
 * 1.x, with its A2A 0.3 layer on, so one agent answers both A2A versions over JSON-RPC, each at a
 * path of its own. Scripted: the test supplies the events each turn emits, in the A2A SDK's
 * in-memory shapes. Records what it received so tests assert on the wire — which interface a
 * request reached, the words, the capabilities, the credential.
 *
 * It serves its card in A2A 1.0's JSON, as Python's `a2a-sdk` server does. The A2A SDK's own card
 * handler serves the in-memory form, whose sign-in schemes its own reader drops.
 */
import {randomUUID} from 'node:crypto';
import {createServer, type Server} from 'node:http';
import express, {type NextFunction, type Request, type Response} from 'express';
import {AgentCard, Role, TaskState, type Message, type Part, type Task} from '@a2a-js/sdk';
import {
  DefaultRequestHandler,
  InMemoryTaskStore,
  type AgentExecutionEvent,
  type AgentExecutor,
  type ExecutionEventBus,
  type RequestContext,
} from '@a2a-js/sdk/server';
import {jsonRpcHandler, UserBuilder} from '@a2a-js/sdk/server/express';
import {A2UI_EXTENSION_URIS} from '@a2uiverse/sdk';
import {authRequiredBody, cardUrlOf, type RequirementShape} from './fakeAgent.js';

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

export interface ReceivedRequestV1 {
  /** The A2A version of the interface the request reached, by the path it came in on. */
  reached: FakeA2aVersion;
  /** The `A2A-Version` header the caller sent. */
  a2aVersion: string | undefined;
  /** The JSON-RPC method called. */
  method: string;
  /** The message as the wire carried it, when the request carried one. */
  message: Record<string, unknown> | undefined;
  /** Every request header, lower-cased, so a test sees the credential as it rode. */
  headers: Record<string, string>;
}

export interface FakeAgentV1 {
  url: string;
  cardUrl: string;
  interfaces: FakeInterfaceUrls;
  /** The card the agent runs on, as the A2A SDK holds it. */
  card: AgentCard;
  /** The card as the card URL answers it. */
  served: unknown;
  requests: ReceivedRequestV1[];
  /** How many connections to the agent are open: a stream a caller left counts none. */
  connections(): Promise<number>;
  close(): Promise<void>;
}

export interface FakeAgentV1Options {
  /** The card it runs on, for the addresses it listens on. */
  card: (interfaces: FakeInterfaceUrls) => AgentCard;
  script: ScriptV1;
  /** What the card URL answers, in place of the card in A2A 1.0's JSON. */
  serve?: (card: AgentCard) => unknown;
  /** Whether a JSON-RPC request is let in; refused, it is answered 401. */
  admit?: (request: Request) => boolean;
}

const PATHS: Record<FakeA2aVersion, string> = {'1.0': '/a2a/v1', '0.3': '/a2a/v0_3'};

export interface CardV1Options {
  name?: string;
  description?: string;
  version?: string;
  /** The A2A versions its JSON-RPC interfaces are listed at, in the card's order. */
  order?: FakeA2aVersion[];
  /** The catalog ids the card declares under the A2UI extension; none declares nothing. */
  catalogs?: string[];
  skills?: {id: string; name: string; description: string; tags: string[]; examples?: string[]}[];
  /** Card fields beyond the defaults, in A2A 1.0's JSON — `securitySchemes`, `securityRequirements`. */
  card?: Record<string, unknown>;
}

/** A card as an A2A 1.0 agent holds it: JSON-RPC at the A2A versions `order` lists. */
export function cardForV1(interfaces: FakeInterfaceUrls, options: CardV1Options = {}): AgentCard {
  const {catalogs} = options;
  return AgentCard.fromJSON({
    name: options.name ?? 'Fake Agent',
    description: options.description ?? 'an agent for tests',
    version: options.version ?? '0.1.0',
    supportedInterfaces: (options.order ?? ['1.0']).map(version => ({
      url: interfaces[version],
      protocolBinding: 'JSONRPC',
      protocolVersion: version,
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

export async function startFakeAgentV1(options: FakeAgentV1Options): Promise<FakeAgentV1> {
  const {script} = options;
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
  const interfaces: FakeInterfaceUrls = {
    '1.0': `${url}${PATHS['1.0']}`,
    '0.3': `${url}${PATHS['0.3']}`,
  };
  const card = options.card(interfaces);
  const served = options.serve ? options.serve(card) : AgentCard.toJSON(card);

  const requestHandler = new DefaultRequestHandler(card, new InMemoryTaskStore(), executor);
  app.get('/.well-known/agent-card.json', (_req: Request, res: Response) => {
    res.json(served);
  });
  for (const version of ['1.0', '0.3'] as const) {
    app.use(PATHS[version], (req: Request, res: Response, next: NextFunction) => {
      const body = req.body as
        {method?: string; params?: {message?: Record<string, unknown>}} | undefined;
      if (typeof body?.method !== 'string') return next();
      if (options.admit && !options.admit(req)) {
        res.status(401).set('WWW-Authenticate', 'Bearer error="invalid_token"').json({});
        return;
      }
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') headers[key] = value;
      }
      requests.push({
        reached: version,
        a2aVersion: req.header('A2A-Version'),
        method: body.method,
        message: body.params?.message,
        headers,
      });
      next();
    });
    app.use(
      PATHS[version],
      jsonRpcHandler({
        requestHandler,
        userBuilder: UserBuilder.noAuthentication,
        legacyCompat: {enabled: true},
      }),
    );
  }
  server.on('request', app);

  return {
    url,
    cardUrl: cardUrlOf(url),
    interfaces,
    card,
    served,
    requests,
    connections: () =>
      new Promise<number>((resolve, reject) =>
        server.getConnections((err, count) => (err ? reject(err) : resolve(count))),
      ),
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close(err => (err ? reject(err) : resolve()));
      }),
  };
}
