import type {TaskState} from '@a2a-js/sdk';
import {
  ClientFactory,
  DefaultAgentCardResolver,
  JsonRpcTransportFactory,
  ServiceParameters,
  withA2AExtensions,
  type Client,
} from '@a2a-js/sdk/client';
import {A2UI_EXTENSION_URI_V09, A2UI_EXTENSION_URI_V091} from '../agentCard.js';
import type {Registry} from '../registry/registry.js';
import {InMemoryVendorContextMap, type VendorContextMap} from './contextMap.js';
import {prepareOutgoing, relayEvent, type VendorEvent} from './relay.js';
import type {DispatchHandle, DispatchOutcome, DispatchRecord, DispatchTurn} from './types.js';

export interface AgentsPoolOptions {
  defaultDeadlineMs: number;
  debugIds: boolean;
  contexts?: VendorContextMap;
  fetchImpl?: typeof fetch;
}

const FAILED_STATES: ReadonlySet<TaskState> = new Set(['failed', 'canceled', 'rejected']);
const TERMINAL_STATES: ReadonlySet<TaskState> = new Set([...FAILED_STATES, 'completed']);

/**
 * A2A connections to vendor agents (SPEC §10). Dispatch unit `(endpoint,
 * credential)`; credential is a placeholder until M8. M0: one dispatch per
 * turn, transparent streaming relay.
 */
export class AgentsPool {
  readonly #registry: Registry;
  readonly #options: AgentsPoolOptions;
  readonly #contexts: VendorContextMap;
  readonly #clients = new Map<string, Promise<Client>>();
  readonly #inflight = new Map<string, DispatchHandle>();

  constructor(registry: Registry, options: AgentsPoolOptions) {
    this.#registry = registry;
    this.#options = options;
    this.#contexts = options.contexts ?? new InMemoryVendorContextMap();
  }

  dispatch(appId: string, turn: DispatchTurn): DispatchHandle {
    const record: DispatchRecord = {
      appId,
      clientContextId: turn.clientContextId,
      clientTaskId: turn.clientTaskId,
      startedAt: new Date().toISOString(),
      outcome: 'failed',
      sawFinal: false,
      deadlineMs: this.#options.defaultDeadlineMs,
    };
    const controller = new AbortController();
    if (turn.signal) {
      if (turn.signal.aborted) controller.abort();
      else turn.signal.addEventListener('abort', () => controller.abort(), {once: true});
    }

    let resolveDone!: (r: DispatchRecord) => void;
    const done = new Promise<DispatchRecord>(resolve => (resolveDone = resolve));
    const finish = (outcome: DispatchOutcome, error?: string) => {
      record.outcome = outcome;
      if (error !== undefined) record.error = error;
      record.endedAt = new Date().toISOString();
      this.#inflight.delete(turn.clientTaskId);
      resolveDone(record);
    };

    const handle: DispatchHandle = {
      events: this.#stream(appId, turn, record, controller, finish),
      done,
      cancel: () => controller.abort(),
    };
    this.#inflight.set(turn.clientTaskId, handle);
    return handle;
  }

  cancel(clientTaskId: string): void {
    this.#inflight.get(clientTaskId)?.cancel();
  }

  async *#stream(
    appId: string,
    turn: DispatchTurn,
    record: DispatchRecord,
    controller: AbortController,
    finish: (outcome: DispatchOutcome, error?: string) => void,
  ): AsyncGenerator<VendorEvent> {
    const relayCtx = {
      taskId: turn.clientTaskId,
      contextId: turn.clientContextId,
      appId,
      debugIds: this.#options.debugIds,
    };
    let finalState: TaskState | undefined;
    // A non-streaming vendor answers with one Task in a terminal state and no final update.
    let terminalTaskState: TaskState | undefined;
    try {
      const app = this.#registry.get(appId);
      const client = await this.#connect(app.agentUrl);
      const vendorContextId = this.#contexts.get(turn.clientContextId, appId);
      const params = prepareOutgoing(turn.message, vendorContextId);
      const options = {
        signal: controller.signal,
        serviceParameters: ServiceParameters.create(
          withA2AExtensions(A2UI_EXTENSION_URI_V091, A2UI_EXTENSION_URI_V09),
        ),
      };
      for await (const event of client.sendMessageStream(params, options)) {
        this.#learnIds(event, appId, turn, record);
        if (event.kind === 'message') {
          record.sawFinal = true;
        } else if (event.kind === 'status-update' && event.final) {
          record.sawFinal = true;
          finalState = event.status.state;
        } else if (event.kind === 'task' && TERMINAL_STATES.has(event.status.state)) {
          terminalTaskState = event.status.state;
        }
        yield relayEvent(event, relayCtx);
      }
      const endState = record.sawFinal ? finalState : terminalTaskState;
      if (!record.sawFinal && !terminalTaskState) {
        finish('failed', 'stream ended without a final event');
      } else if (endState && FAILED_STATES.has(endState)) {
        finish('failed', `vendor ended the task as ${endState}`);
      } else {
        finish('completed');
      }
    } catch (err) {
      if (controller.signal.aborted) finish('cancelled');
      else finish('failed', err instanceof Error ? err.message : String(err));
    }
  }

  #learnIds(event: VendorEvent, appId: string, turn: DispatchTurn, record: DispatchRecord): void {
    const contextId = event.contextId;
    if (contextId && !record.vendorContextId) {
      record.vendorContextId = contextId;
      this.#contexts.set(turn.clientContextId, appId, contextId);
    }
    const taskId = event.kind === 'task' ? event.id : event.taskId;
    if (taskId && !record.vendorTaskId) record.vendorTaskId = taskId;
  }

  #connect(agentUrl: string): Promise<Client> {
    let pending = this.#clients.get(agentUrl);
    if (!pending) {
      const fetchImpl = this.#options.fetchImpl;
      const factory = new ClientFactory({
        transports: [new JsonRpcTransportFactory(fetchImpl ? {fetchImpl} : undefined)],
        cardResolver: new DefaultAgentCardResolver(fetchImpl ? {fetchImpl} : undefined),
      });
      pending = factory.createFromUrl(agentUrl).catch(err => {
        this.#clients.delete(agentUrl);
        throw err;
      });
      this.#clients.set(agentUrl, pending);
    }
    return pending;
  }
}
