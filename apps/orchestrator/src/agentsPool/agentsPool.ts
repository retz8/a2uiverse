import {randomUUID} from 'node:crypto';
import {elapsedMs, logLine} from '../log.js';
import type {Part, TaskState, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {
  ClientFactory,
  DefaultAgentCardResolver,
  JsonRpcTransportFactory,
  ServiceParameters,
  withA2AExtensions,
  type Client,
} from '@a2a-js/sdk/client';
import type {FailureCause} from '@a2uiverse/shell-catalog/schema';
import {A2UI_EXTENSION_URI_V09, A2UI_EXTENSION_URI_V091} from '../agentCard.js';
import type {Registry} from '../registry/registry.js';
import {InMemoryVendorContextMap, type VendorContextMap} from './contextMap.js';
import type {Fault, FaultMap} from './faults.js';
import {prepareOutgoing, relayEvent, type VendorEvent} from './relay.js';
import type {DispatchHandle, DispatchOutcome, DispatchRecord, DispatchTurn} from './types.js';

export interface AgentsPoolOptions {
  /** The hard cap (task-8.3 decision 2): from dispatch to `capped`; the dispatch runs on past it. */
  hardCapMs: number;
  debugIds: boolean;
  /** The dev-only fault map (task-8.3 decision 14). */
  faults?: FaultMap;
  contexts?: VendorContextMap;
  fetchImpl?: typeof fetch;
}

/** The final states that end a vendor's task as a failure it declared itself. */
export const FAILED_STATES: ReadonlySet<TaskState> = new Set(['failed', 'canceled', 'rejected']);
const TERMINAL_STATES: ReadonlySet<TaskState> = new Set([...FAILED_STATES, 'completed']);

/**
 * A2A connections to vendor agents (SPEC §10). Dispatch unit `(endpoint,
 * credential)`; credential is a placeholder until M8. Transparent streaming relay, the hard cap
 * per dispatch, the cause of a failure, A2A's cancel sent to a vendor whose dispatch is aborted,
 * and the dev-only fault map. Knows nothing of plans or slots.
 */
export class AgentsPool {
  readonly #registry: Registry;
  readonly #options: AgentsPoolOptions;
  readonly #contexts: VendorContextMap;
  readonly #clients = new Map<string, Promise<Client>>();
  // Keyed by client task id; a fan-out turn holds several handles under one key.
  readonly #inflight = new Map<string, Set<DispatchHandle>>();

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
      deadlineMs: this.#options.hardCapMs,
    };
    const startedAt = Date.now();
    logLine(`→ ${appId} task=${turn.clientTaskId}`);
    const controller = new AbortController();
    if (turn.signal) {
      if (turn.signal.aborted) controller.abort();
      else turn.signal.addEventListener('abort', () => controller.abort(), {once: true});
    }

    let resolveDone!: (r: DispatchRecord) => void;
    const done = new Promise<DispatchRecord>(resolve => (resolveDone = resolve));
    let resolveCapped!: () => void;
    const capped = new Promise<void>(resolve => (resolveCapped = resolve));
    let ended = false;
    // The cap does not end the dispatch: the slot fails and the stream runs on, what arrives
    // after it held by the consumer (task-8.3 decision 2).
    const capTimer = setTimeout(() => {
      if (ended) return;
      record.cappedAt = new Date().toISOString();
      logLine(`⏱ ${appId} task=${turn.clientTaskId} hard cap ${this.#options.hardCapMs} ms`);
      resolveCapped();
    }, this.#options.hardCapMs);
    capTimer.unref?.();

    let handles = this.#inflight.get(turn.clientTaskId);
    if (!handles) this.#inflight.set(turn.clientTaskId, (handles = new Set()));
    const registered = handles;
    // The stream body runs only once iterated, so `handle` exists by the time finish fires.
    const finish = (outcome: DispatchOutcome, failure?: {error: string; cause: FailureCause}) => {
      ended = true;
      clearTimeout(capTimer);
      record.outcome = outcome;
      if (failure) {
        record.error = failure.error;
        record.cause = failure.cause;
      }
      record.endedAt = new Date().toISOString();
      logLine(
        `← ${appId} task=${turn.clientTaskId} ${outcome}${failure ? ` (${failure.error})` : ''} ${elapsedMs(startedAt)} ms`,
      );
      registered.delete(handle);
      if (registered.size === 0) this.#inflight.delete(turn.clientTaskId);
      resolveDone(record);
    };

    const handle: DispatchHandle = {
      events: this.#stream(appId, turn, record, controller, finish),
      done,
      record,
      capped,
      cancel: () => {
        if (ended || controller.signal.aborted) return;
        controller.abort();
        this.#cancelVendor(appId, record);
      },
    };
    registered.add(handle);
    return handle;
  }

  cancel(clientTaskId: string): void {
    for (const handle of this.#inflight.get(clientTaskId) ?? []) handle.cancel();
  }

  async *#stream(
    appId: string,
    turn: DispatchTurn,
    record: DispatchRecord,
    controller: AbortController,
    finish: (outcome: DispatchOutcome, failure?: {error: string; cause: FailureCause}) => void,
  ): AsyncGenerator<VendorEvent> {
    const relayCtx = {
      taskId: turn.clientTaskId,
      contextId: turn.clientContextId,
      appId,
      debugIds: this.#options.debugIds,
    };
    const fault = this.#faultFor(appId, turn);
    if (fault) record.fault = fault.fault;
    let finalState: TaskState | undefined;
    let finalMessage: string | undefined;
    // A non-streaming vendor answers with one Task in a terminal state and no final update.
    let terminalTaskState: TaskState | undefined;
    let broke = false;
    try {
      if (fault?.seconds) await sleep(fault.seconds * 1000, controller.signal);
      if (fault?.fault === 'hang') await sleep(Infinity, controller.signal);
      if (fault?.fault === 'refuse') throw new Error('connection refused (fault map)');
      if (fault?.fault === 'fail') {
        const event = failedFinal(fault.message);
        record.sawFinal = true;
        finalState = 'failed';
        finalMessage = fault.message;
        yield relayEvent(event, relayCtx);
      } else {
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
        let injected = false;
        for await (const event of client.sendMessageStream(params, options)) {
          this.#learnIds(event, appId, turn, record);
          if (event.kind === 'message') {
            record.sawFinal = true;
          } else if (event.kind === 'status-update' && event.final) {
            record.sawFinal = true;
            finalState = event.status.state;
            finalMessage = textOf(event.status.message?.parts);
          } else if (event.kind === 'task' && TERMINAL_STATES.has(event.status.state)) {
            terminalTaskState = event.status.state;
            finalMessage = textOf(event.status.message?.parts);
          }
          let out: VendorEvent = event;
          if (fault?.fault === 'invalid' && !injected) {
            const swapped = withRejectedProp(event);
            injected = swapped !== event;
            out = swapped;
          }
          yield relayEvent(out, relayCtx);
          // The first paint forwarded, then no final — even where the vendor's paint rode its final,
          // which the relay has already demoted (task 8.6: the deterministic roster paints that way).
          if (fault?.fault === 'break' && carriesA2ui(event)) {
            record.sawFinal = false;
            broke = true;
            break;
          }
        }
      }
      const endState = record.sawFinal ? finalState : terminalTaskState;
      if (broke || (!record.sawFinal && !terminalTaskState)) {
        finish('failed', {
          error: `stream ended without a final event${broke ? ' (fault map)' : ''}`,
          cause: 'unreachable',
        });
      } else if (endState && FAILED_STATES.has(endState)) {
        if (finalMessage) record.vendorMessage = finalMessage;
        finish('failed', {error: `vendor ended the task as ${endState}`, cause: 'vendor'});
      } else {
        finish('completed');
      }
    } catch (err) {
      if (controller.signal.aborted) finish('cancelled');
      else
        finish('failed', {
          error: err instanceof Error ? err.message : String(err),
          cause: 'unreachable',
        });
    }
  }

  /** The plan's dispatch of a faulted source, or every dispatch of it when the fault says so. */
  #faultFor(appId: string, turn: DispatchTurn): Fault | undefined {
    const fault = this.#options.faults?.get(appId);
    return fault && (turn.fromPlan || fault.every) ? fault : undefined;
  }

  /**
   * A2A's cancel for an aborted dispatch (task-8.3 decision 4): closing the stream alone leaves
   * the vendor working on. Fire and forget; a vendor that refuses is logged, never fatal.
   */
  #cancelVendor(appId: string, record: DispatchRecord): void {
    const id = record.vendorTaskId;
    if (!id || record.fault === 'fail' || record.fault === 'hang' || record.fault === 'refuse')
      return;
    const app = this.#registry.get(appId);
    void this.#connect(app.agentUrl)
      .then(client => client.cancelTask({id}))
      .then(
        () => logLine(`✗ ${appId} task=${record.clientTaskId} cancel sent`),
        err =>
          logLine(
            `✗ ${appId} task=${record.clientTaskId} cancel refused (${err instanceof Error ? err.message : String(err)})`,
          ),
      );
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

/** The text parts of a status message, joined: the vendor's own words. */
function textOf(parts: Part[] | undefined): string | undefined {
  const text = (parts ?? [])
    .flatMap(part => (part.kind === 'text' ? [part.text.trim()] : []))
    .filter(Boolean)
    .join('\n');
  return text === '' ? undefined : text;
}

/** Waits `ms`, or forever for `Infinity`; rejects when the dispatch is aborted. */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Error('aborted'));
    const timer = Number.isFinite(ms) ? setTimeout(resolve, ms) : undefined;
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new Error('aborted'));
      },
      {once: true},
    );
  });
}

/** The `fail` fault's answer: a vendor final ending the task failed, the fault's words on it. */
function failedFinal(message: string | undefined): TaskStatusUpdateEvent {
  const taskId = randomUUID();
  const contextId = randomUUID();
  return {
    kind: 'status-update',
    taskId,
    contextId,
    final: true,
    status: {
      state: 'failed',
      ...(message
        ? {
            message: {
              kind: 'message',
              messageId: randomUUID(),
              role: 'agent',
              parts: [{kind: 'text', text: message}],
              contextId,
              taskId,
            },
          }
        : {}),
    },
  };
}

const A2UI_OPS = ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface'];

function partsOfEvent(event: VendorEvent): Part[] {
  if (event.kind === 'message') return event.parts;
  if (event.kind === 'artifact-update') return event.artifact.parts;
  return event.status.message?.parts ?? [];
}

function isA2ui(data: Record<string, unknown>): boolean {
  return typeof data.version === 'string' && A2UI_OPS.some(op => op in data);
}

function carriesA2ui(event: VendorEvent): boolean {
  return partsOfEvent(event).some(part => part.kind === 'data' && isA2ui(part.data));
}

/** The props the `invalid` fault breaks: every catalog types them, none as a number. */
const BREAKABLE_PROPS = ['children', 'child', 'text'] as const;

/** The value the `invalid` fault gives the prop. */
export const REJECTED_VALUE = 0;

/**
 * The `invalid` fault: the first `updateComponents` in the event with the first component carrying
 * `children`, `child` or `text` given a number for it — a value its catalog rejects, so the update
 * fails validation, the client cannot draw the paint and reports it at the turn's end. The same
 * event back when it carries none.
 */
function withRejectedProp(event: VendorEvent): VendorEvent {
  let swapped = false;
  const swap = (parts: Part[]): Part[] =>
    parts.map(part => {
      if (swapped || part.kind !== 'data') return part;
      const update = part.data.updateComponents as {components?: unknown} | undefined;
      const components = update?.components;
      if (!Array.isArray(components)) return part;
      const index = components.findIndex(c =>
        BREAKABLE_PROPS.some(prop => typeof c === 'object' && c !== null && prop in c),
      );
      if (index < 0) return part;
      const component = components[index] as Record<string, unknown>;
      const prop = BREAKABLE_PROPS.find(p => p in component)!;
      swapped = true;
      return {
        ...part,
        data: {
          ...part.data,
          updateComponents: {
            ...update,
            components: components.map((c, i) =>
              i === index ? {...component, [prop]: REJECTED_VALUE} : c,
            ),
          },
        },
      };
    });
  if (event.kind === 'message') {
    const parts = swap(event.parts);
    return swapped ? {...event, parts} : event;
  }
  if (event.kind === 'artifact-update') return event;
  const message = event.status.message;
  if (!message) return event;
  const parts = swap(message.parts);
  return swapped ? {...event, status: {...event.status, message: {...message, parts}}} : event;
}
