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
}

export interface FakeVendor {
  url: string;
  requests: ReceivedRequest[];
  /** Conversation ids the fake minted, in order. */
  contextIds: string[];
  close(): Promise<void>;
}

export interface FakeVendorOptions {
  streaming?: boolean;
  extensionUris?: string[];
  script?: Script;
  name?: string;
}

export const A2UI_PART = {
  kind: 'data' as const,
  data: {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId: 'cat'}},
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
  } = options;
  const requests: ReceivedRequest[] = [];
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
    description: 'scripted vendor for tests',
    version: '0.0.0',
    protocolVersion: '0.3.0',
    url: 'http://127.0.0.1:0',
    preferredTransport: 'JSONRPC',
    capabilities: {streaming, extensions: extensionUris.map(uri => ({uri}))},
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: [{id: 'fake', name: 'fake', description: 'fake', tags: []}],
  };

  const server: Server = createServer();
  const app = express();
  // Parse once here; the SDK's own express.json() skips already-parsed bodies.
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const message = (req.body as {params?: {message?: Message}} | undefined)?.params?.message;
    if (message) requests.push({extensionsHeader: req.header(HTTP_EXTENSION_HEADER), message});
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
    contextIds,
    close: () =>
      new Promise<void>((resolve, reject) => server.close(err => (err ? reject(err) : resolve()))),
  };
}
