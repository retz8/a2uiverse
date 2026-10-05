/**
 * An in-process A2A vendor agent for tests, built on the same SDK server
 * pieces the orchestrator uses. Scripted: the test supplies the events each
 * turn emits. Records what it received so tests can assert on the wire.
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

export interface ScriptContext {
  ctx: RequestContext;
  /** The vendor's own conversation id for this turn (minted on first sight). */
  vendorContextId: string;
  /** True when this is the first turn of that conversation (a real agent emits a Task then). */
  firstTurn: boolean;
}

export type Script = (
  s: ScriptContext,
) => AgentExecutionEvent[] | AsyncIterable<AgentExecutionEvent>;

export interface ReceivedRequest {
  extensionsHeader: string | undefined;
  message: Message;
  /** The `Authorization` header it carried, when it carried one. */
  authorization?: string;
  /** The `X-Api-Key` header it carried, when it carried one. */
  apiKey?: string;
}

export interface FakeVendor {
  url: string;
  requests: ReceivedRequest[];
  /** Every JSON-RPC method called on it, in order — `message/stream`, `tasks/cancel`, … */
  methods: string[];
  /** Conversation ids the fake minted, in order. */
  contextIds: string[];
  close(): Promise<void>;
}

export interface FakeVendorOptions {
  streaming?: boolean;
  extensionUris?: string[];
  script?: Script;
  name?: string;
  description?: string;
  skills?: AgentCard['skills'];
  /**
   * The catalog ids its card declares under the A2UI v0.9.1 extension (task 11.4): `cat`, the
   * catalog the default script paints in, unless a test says otherwise; empty declares none.
   */
  catalogs?: string[];
  /** Card fields beyond the defaults — `securitySchemes`, `security` (task 12.5). */
  card?: Partial<AgentCard>;
  /** Whether a JSON-RPC request is let in; refused, it is answered 401 (task 12.5). */
  admit?: (request: Request) => boolean;
}

/** The catalog the default script paints in. */
export const FAKE_CATALOG_ID = 'cat';
const A2UI_V091_URI = 'https://a2ui.org/a2a-extension/a2ui/v0.9.1';

export const A2UI_PART = {
  kind: 'data' as const,
  data: {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId: FAKE_CATALOG_ID}},
};

/** Default script: mimics a2ui-github's deterministic agent. */
export const deterministicScript: Script = ({ctx, vendorContextId, firstTurn}) => {
  const events: AgentExecutionEvent[] = [];
  if (firstTurn) {
    const task: Task = {
      kind: 'task',
      id: ctx.taskId,
      contextId: vendorContextId,
      status: {state: 'submitted'},
      history: [{...ctx.userMessage, contextId: vendorContextId, taskId: ctx.taskId}],
    };
    events.push(task);
  }
  events.push({
    kind: 'status-update',
    taskId: ctx.taskId,
    contextId: vendorContextId,
    final: true,
    status: {
      state: 'completed',
      message: {
        kind: 'message',
        messageId: randomUUID(),
        role: 'agent',
        parts: [A2UI_PART],
        contextId: vendorContextId,
        taskId: ctx.taskId,
      },
    },
  });
  return events;
};

export async function startFakeVendor(options: FakeVendorOptions = {}): Promise<FakeVendor> {
  const {
    streaming = true,
    extensionUris = ['https://a2ui.org/a2a-extension/a2ui/v0.9'],
    script = deterministicScript,
    catalogs = [FAKE_CATALOG_ID],
  } = options;
  const requests: ReceivedRequest[] = [];
  const methods: string[] = [];
  const contextIds: string[] = [];
  // The SDK hands each turn a contextId: the client's if it sent one, else a fresh uuid.
  // A "first turn" is one whose contextId we have not seen before.
  const seen = new Set<string>();

  const executor: AgentExecutor = {
    async execute(ctx: RequestContext, bus: ExecutionEventBus) {
      const firstTurn = !seen.has(ctx.contextId);
      if (firstTurn) {
        seen.add(ctx.contextId);
        contextIds.push(ctx.contextId);
      }
      try {
        const out = script({ctx, vendorContextId: ctx.contextId, firstTurn});
        for await (const event of out) bus.publish(event);
      } finally {
        bus.finished();
      }
    },
    async cancelTask() {},
  };

  const card: AgentCard = {
    name: options.name ?? 'Fake Vendor',
    description: options.description ?? 'scripted vendor for tests',
    version: '0.0.0',
    protocolVersion: '0.3.0',
    url: 'http://127.0.0.1:0',
    preferredTransport: 'JSONRPC',
    capabilities: {
      streaming,
      extensions: [
        ...extensionUris.filter(uri => uri !== A2UI_V091_URI).map(uri => ({uri})),
        {uri: A2UI_V091_URI, params: {supportedCatalogIds: catalogs}},
      ],
    },
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: options.skills ?? [{id: 'fake', name: 'fake', description: 'fake', tags: []}],
    ...options.card,
  };

  const server: Server = createServer();
  const app = express();
  // Parse once here; the SDK's own express.json() skips already-parsed bodies.
  app.use(express.json());
  app.use((req: Request, res: Response, next: NextFunction) => {
    const body = req.body as {method?: string; params?: {message?: Message}} | undefined;
    if (typeof body?.method === 'string') methods.push(body.method);
    if (typeof body?.method === 'string' && options.admit && !options.admit(req)) {
      res.status(401).set('WWW-Authenticate', 'Bearer error="invalid_token"').json({});
      return;
    }
    const message = body?.params?.message;
    if (message) {
      const authorization = req.header('authorization');
      const apiKey = req.header('x-api-key');
      requests.push({
        extensionsHeader: req.header(HTTP_EXTENSION_HEADER),
        message,
        ...(authorization ? {authorization} : {}),
        ...(apiKey ? {apiKey} : {}),
      });
    }
    next();
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('fake vendor: no port');
  const url = `http://127.0.0.1:${address.port}`;
  card.url = url;

  const requestHandler = new DefaultRequestHandler(card, new InMemoryTaskStore(), executor);
  app.use('/.well-known/agent-card.json', agentCardHandler({agentCardProvider: requestHandler}));
  app.use('/', jsonRpcHandler({requestHandler, userBuilder: UserBuilder.noAuthentication}));
  server.on('request', app);

  return {
    url,
    requests,
    methods,
    contextIds,
    close: () =>
      new Promise<void>((resolve, reject) => server.close(err => (err ? reject(err) : resolve()))),
  };
}
