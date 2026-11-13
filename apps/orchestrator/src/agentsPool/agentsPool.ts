import {randomUUID} from 'node:crypto';
import {elapsedMs, logLine} from '../log.js';
import {TaskState, taskStateToJSON, type Message, type Part} from '@a2a-js/sdk';
import {
  ClientFactory,
  DefaultAgentCardResolver,
  JsonRpcTransportFactory,
  ServiceParameters,
  withA2AExtensions,
  type Client,
} from '@a2a-js/sdk/client';
import type {FailureCause} from '@a2uiverse/shell-catalog/schema';
import {
  A2UI_CLIENT_CAPABILITIES_KEY,
  A2UI_EXTENSION_URIS,
  clientCapabilities,
  describePaintOutside,
  paintOutside,
  parseSourceId,
  readAuthRequired,
  type AuthRequired,
  type CatalogIdsByVersion,
  type CredentialFinding,
  type PaintOutside,
} from '@a2uiverse/sdk';
import {agentMessage, dataOf, textOf, textPart, withData} from '../a2a/parts.js';
import type {Registry} from '../registry/registry.js';
import type {Refetched, UpdateCase, UpdateFinding} from '../registry/updateTile.js';
import type {AppRecord} from '../registry/types.js';
import type {Prepared, Request as AuthorityRequest} from '../vault/vault.js';
import {InMemoryVendorContextMap, type VendorContextMap} from './contextMap.js';
import {
  continueUrlOf,
  createdIn,
  credentialIn,
  repairOf,
  takeDown,
  withCredentialField,
  type CreatedSurface,
} from './credentialBar.js';
import type {Fault, FaultMap} from './faults.js';
import {
  idsOf,
  partsOf,
  prepareOutgoing,
  relayEvent,
  stateOf,
  statusOf,
  withParts,
  type VendorEvent,
} from './relay.js';
import type {DispatchHandle, DispatchOutcome, DispatchRecord, DispatchTurn} from './types.js';

export interface AgentsPoolOptions {
  /** The hard cap (task-8.3 decision 2): from dispatch to `capped`; the dispatch runs on past it. */
  hardCapMs: number;
  debugIds: boolean;
  /** The dev-only fault map (task-8.3 decision 14). */
  faults?: FaultMap;
  contexts?: VendorContextMap;
  fetchImpl?: typeof fetch;
  /** The vault (task 12.5): the header a dispatch carries, and what a refusal asks. */
  credentials?: Credentials;
  /** The update check (task 15.5): whether the app can paint in what it is installed with. */
  updates?: UpdateGate;
}

/** The update on the canvas as the AgentsPool reaches it (task 15.5). */
export interface UpdateGate {
  /** The live card held names nothing in the entitlement: judged before the sign-in. */
  catalogsChanged(appId: string): boolean;
  /** The account falls short of the live card where the installed one is met: after the sign-in. */
  permissionChanged(source: string): boolean;
  /** What the slot's update tile is drawn from; none when the app is not installed. */
  finding(appId: string, why: UpdateCase): Promise<UpdateFinding | undefined>;
  /** After a paint refused outside the entitlement, or a call ended with no UI: the live card fetched again. */
  refetched(appId: string): Promise<Refetched>;
}

/** The vault as the AgentsPool reaches it. */
export interface Credentials {
  /** The header a dispatch to the source carries; undefined when its card asks nothing. */
  prepare(source: string): Promise<Prepared | undefined>;
  /** A 401 to `sent`: renewed headers to send again once, or the authority needed. */
  unauthorized(source: string, sent: Record<string, string>): Promise<Prepared>;
  /** A second refusal: the account signs in again. */
  markAgain(source: string, reason: string): Promise<void>;
  /** An in-task `auth-required`, read against the installed card. */
  requested(source: string, request: AuthRequired | undefined): AuthorityRequest;
}

/** A vendor answered 401: thrown from inside the A2A client's fetch, so it reaches the dispatch. */
export class UnauthorizedError extends Error {
  constructor() {
    super('the agent refused the request: 401');
  }
}

/** The states that end a vendor's task as a failure it declared itself. */
export const FAILED_STATES: ReadonlySet<TaskState> = new Set([
  TaskState.TASK_STATE_FAILED,
  TaskState.TASK_STATE_CANCELED,
  TaskState.TASK_STATE_REJECTED,
]);
/**
 * The states an agent's answer ends on (task-20.1 decision 2): the terminal ones, and the
 * interrupted ones, where the task waits on the person.
 */
const ENDED_STATES: ReadonlySet<TaskState> = new Set([
  ...FAILED_STATES,
  TaskState.TASK_STATE_COMPLETED,
  TaskState.TASK_STATE_INPUT_REQUIRED,
  TaskState.TASK_STATE_AUTH_REQUIRED,
]);

/**
 * A2A connections to vendor agents (SPEC §10). Dispatch unit `(endpoint, credential)`, by source —
 * the app and the account (task-12.4): the endpoint is the app's, the vendor conversation the
 * source's own; the credential is a placeholder until the vault lands (task 12.5). Transparent streaming relay, the hard cap
 * per dispatch, the cause of a failure, A2A's cancel sent to a vendor whose dispatch is aborted,
 * and the dev-only fault map. Knows nothing of plans or slots.
 */
export class AgentsPool {
  readonly #registry: Registry;
  readonly #options: AgentsPoolOptions;
  readonly #contexts: VendorContextMap;
  readonly #clients = new Map<string, Promise<Client>>();
  /** The app each dispatch was sent to, as the registry held it then: what its cancel reaches. */
  readonly #sentTo = new WeakMap<DispatchRecord, AppRecord>();
  // Keyed by client task id; a fan-out turn holds several handles under one key.
  readonly #inflight = new Map<string, Set<DispatchHandle>>();
  /**
   * The catalog each surface was created in, by client context, source and the vendor's surface id
   * (task-12.7 decision 1): a later answer's update is checked against its surface's catalog.
   */
  readonly #catalogs = new Map<string, Map<string, Map<string, string>>>();

  constructor(registry: Registry, options: AgentsPoolOptions) {
    this.#registry = registry;
    this.#options = options;
    this.#contexts = options.contexts ?? new InMemoryVendorContextMap();
  }

  /** A composition closed (task-9.3 decision 5): its vendor conversations are let go. */
  forget(clientContextId: string): void {
    this.#contexts.drop(clientContextId);
    this.#catalogs.delete(clientContextId);
  }

  /**
   * Whether the vendor surface `surfaceId` was created in a catalog the source's app, as the
   * registry holds it now, no longer paints in — one an update dropped (task-15.11 decision 41).
   */
  drawnInDropped(clientContextId: string, source: string, surfaceId: string): boolean {
    const catalogId = this.#catalogs.get(clientContextId)?.get(source)?.get(surfaceId);
    const app = this.#registry.find(parseSourceId(source)?.appId ?? source);
    return catalogId !== undefined && app !== undefined && !app.entitlement.includes(catalogId);
  }

  /** The catalog each surface a source painted in this composition was created in, by vendor id. */
  #surfaceCatalogs(clientContextId: string, source: string): Map<string, string> {
    let bySource = this.#catalogs.get(clientContextId);
    if (!bySource) this.#catalogs.set(clientContextId, (bySource = new Map()));
    let catalogs = bySource.get(source);
    if (!catalogs) bySource.set(source, (catalogs = new Map()));
    return catalogs;
  }

  dispatch(source: string, turn: DispatchTurn): DispatchHandle {
    const record: DispatchRecord = {
      source,
      clientContextId: turn.clientContextId,
      clientTaskId: turn.clientTaskId,
      startedAt: new Date().toISOString(),
      outcome: 'failed',
      deadlineMs: this.#options.hardCapMs,
    };
    const startedAt = Date.now();
    logLine(`→ ${source} task=${turn.clientTaskId}`);
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
      logLine(`⏱ ${source} task=${turn.clientTaskId} hard cap ${this.#options.hardCapMs} ms`);
      resolveCapped();
    }, this.#options.hardCapMs);
    capTimer.unref?.();

    let handles = this.#inflight.get(turn.clientTaskId);
    if (!handles) this.#inflight.set(turn.clientTaskId, (handles = new Set()));
    const registered = handles;
    // The stream body runs only once iterated, so `handle` exists by the time finish fires.
    const finish = (outcome: DispatchOutcome, failure?: {error: string; cause?: FailureCause}) => {
      ended = true;
      clearTimeout(capTimer);
      record.outcome = outcome;
      if (failure) {
        record.error = failure.error;
        if (failure.cause) record.cause = failure.cause;
      }
      record.endedAt = new Date().toISOString();
      logLine(
        `← ${source} task=${turn.clientTaskId} ${outcome}${failure ? ` (${failure.error})` : ''} ${elapsedMs(startedAt)} ms`,
      );
      registered.delete(handle);
      if (registered.size === 0) this.#inflight.delete(turn.clientTaskId);
      resolveDone(record);
    };

    const handle: DispatchHandle = {
      events: this.#stream(source, turn, record, controller, finish),
      done,
      record,
      capped,
      cancel: () => {
        if (ended || controller.signal.aborted) return;
        controller.abort();
        this.#cancelVendor(source, record);
      },
    };
    registered.add(handle);
    return handle;
  }

  cancel(clientTaskId: string): void {
    for (const handle of this.#inflight.get(clientTaskId) ?? []) handle.cancel();
  }

  async *#stream(
    source: string,
    turn: DispatchTurn,
    record: DispatchRecord,
    controller: AbortController,
    finish: (outcome: DispatchOutcome, failure?: {error: string; cause?: FailureCause}) => void,
  ): AsyncGenerator<VendorEvent> {
    const relayCtx = {
      taskId: turn.clientTaskId,
      contextId: turn.clientContextId,
      source,
      debugIds: this.#options.debugIds,
    };
    const fault = this.#faultFor(source, turn);
    if (fault) record.fault = fault.fault;
    // How the answer ended is read from its states alone (task-20.1 decision 2): the state the
    // stream last named — a task's or a status update's — and whether a message arrived. `final`
    // is not read.
    let lastState: TaskState | undefined;
    let answered = false;
    // The agent's words on the state its answer ended on.
    let finalMessage: string | undefined;
    // The agent asked for sign-in where nothing can meet it: a failure it declared itself.
    let unmet = false;
    let broke = false;
    let invalid: string | undefined;
    // The source's app as the registry holds it now: the entitlement this dispatch is sent under
    // and checked against to its end, whatever the registry does meanwhile (task-11.4 decision 6).
    const appId = parseSourceId(source)?.appId ?? source;
    const app = this.#registry.find(appId);
    if (!app) {
      finish('failed', {error: `app ${appId} is not installed`, cause: 'uninstalled'});
      return;
    }
    this.#sentTo.set(record, app);
    let outside: CatalogOutside | undefined;
    let painted = false;
    let credentialRefused = false;
    try {
      if (fault?.seconds) await sleep(fault.seconds * 1000, controller.signal);
      if (fault?.fault === 'hang') await sleep(Infinity, controller.signal);
      if (fault?.fault === 'refuse') throw new Error('connection refused (fault map)');
      if (fault?.fault === 'fail') {
        const event = failedFinal(fault.message);
        lastState = TaskState.TASK_STATE_FAILED;
        finalMessage = fault.message;
        yield relayEvent(event, relayCtx);
      } else {
        // The update check before dispatch (task-15.5 decisions 1 to 3): an app whose live card
        // names nothing it is installed with is not called, before any sign-in is judged.
        const updates = this.#options.updates;
        const stopped = async (why: UpdateCase) => {
          const finding = await updates!.finding(app.id, why);
          if (!finding) return false;
          record.update = finding;
          finish('failed', {error: 'the app needs an update'});
          return true;
        };
        if (updates?.catalogsChanged(app.id) && (await stopped('catalogs'))) return;
        // The header the card's scheme names, from the vault (phase-12 decision 4); a card the
        // vault cannot meet is not called (decision 5).
        const credentials = this.#options.credentials;
        const prepared = credentials ? await credentials.prepare(source) : undefined;
        if (prepared && 'need' in prepared) {
          record.authority = prepared.need;
          finish('failed', {error: 'the app needs sign-in'});
          return;
        }
        // A live card asking more than the account meets, once the installed card is met.
        if (updates?.permissionChanged(source) && (await stopped('permission'))) return;
        let headers = prepared?.headers ?? {};
        const client = await this.#connect(app);
        // The interface the SDK chose from the card (task-20.1 decision 5).
        record.a2aVersion = client.protocolVersion;
        record.binding = client.transport.protocolName;
        // The catalog each of the source's surfaces was created in: its options are what a
        // painted value is matched by.
        const catalogs = this.#surfaceCatalogs(turn.clientContextId, source);
        const optionsFor = (catalogId: string | undefined) =>
          this.#registry.credentialOptions(app, catalogId);
        let outgoing = withEntitlement(turn.message, app);
        let resent = false;
        // A paint carrying a credential input is never relayed (task-12.7 decisions 2, 3): what the
        // answer had already shown is taken down, and the reason alone goes back to the agent once,
        // in the same conversation; a repair refused again fails the slot.
        for (let send = 0; ; send++) {
          const params = prepareOutgoing(
            outgoing,
            this.#contexts.get(turn.clientContextId, source),
          );
          const faulted = fault !== undefined && (send === 0 || fault.every === true);
          let injected = false;
          let found: CredentialFinding | undefined;
          let foundOnTerminal = false;
          let sendTaskId: string | undefined;
          const shown: CreatedSurface[] = [];
          // At most two sends: a refusal — 401, or an `auth-required` naming nothing — is answered
          // once by a refresh and a resend; a second makes the account sign in again (task-12.5
          // decisions 1, 8).
          for (;;) {
            const options = {
              signal: controller.signal,
              serviceParameters: {
                ...ServiceParameters.create(
                  withA2AExtensions(...Object.values(A2UI_EXTENSION_URIS)),
                ),
                ...headers,
              },
            };
            let refused = false;
            lastState = undefined;
            answered = false;
            unmet = false;
            try {
              for await (const event of client.sendMessageStream(params, options)) {
                this.#learnIds(event, source, turn, record);
                sendTaskId ??= idsOf(event).taskId;
                // A paint outside the app's entitlement — the set of its stamp — is refused at
                // the hub, never relayed (task-11.4 decision 12; task-19.2 decision 2): the
                // dispatch ends failed on the catalog's id.
                outside = catalogOutside(event, app.entitlementByVersion);
                if (outside !== undefined) break;
                if (carriesA2ui(event)) painted = true;
                // The agent asks for authority mid-task (phase-12 decisions 4, 6): read against
                // the installed card, never relayed.
                const asked = authRequiredOf(event);
                if (asked !== undefined) {
                  lastState = TaskState.TASK_STATE_AUTH_REQUIRED;
                  const request = credentials?.requested(source, asked.request) ?? {
                    kind: 'unsigned',
                  };
                  if (request.kind === 'unauthorized') {
                    refused = true;
                  } else if (request.kind === 'escalate') {
                    record.authority = {
                      cause: 'signIn',
                      scheme: request.scheme,
                      keys: request.keys,
                      words: request.words,
                      escalation: true,
                    };
                  } else if (request.kind === 'invalid') {
                    invalid = request.reason;
                  } else {
                    unmet = true;
                    finalMessage = asked.text;
                  }
                  break;
                }
                let out: VendorEvent = event;
                if (faulted && fault.fault === 'invalid' && !injected) {
                  out = withRejectedProp(event);
                  injected = out !== event;
                } else if (faulted && fault.fault === 'credential' && !injected) {
                  out = withCredentialField(event);
                  injected = out !== event;
                }
                found = credentialIn(out, catalogs, optionsFor);
                if (found) {
                  foundOnTerminal = isTerminal(event);
                  break;
                }
                const state = stateOf(event);
                if (state !== undefined) {
                  lastState = state;
                  if (ENDED_STATES.has(state)) finalMessage = wordsOf(partsOf(event));
                }
                if (event.payload?.$case === 'message') answered = true;
                shown.push(...createdIn(out));
                yield relayEvent(out, relayCtx);
                // The first paint forwarded, then the stream broken — even where the vendor's
                // paint rode the state its answer ended on (task 8.6: the deterministic roster
                // paints that way).
                if (fault?.fault === 'break' && carriesA2ui(event)) {
                  broke = true;
                  break;
                }
              }
            } catch (err) {
              if (!(err instanceof UnauthorizedError) || !credentials || prepared === undefined) {
                throw err;
              }
              refused = true;
            }
            if (!refused) break;
            if (resent) {
              await credentials!.markAgain(source, 'refused after a refresh');
              record.authority = {cause: 'again'};
              break;
            }
            const renewed = await credentials!.unauthorized(source, headers);
            if ('need' in renewed) {
              record.authority = renewed.need;
              break;
            }
            headers = renewed.headers;
            resent = true;
          }
          if (found === undefined) break;
          // The source, the component and the term — never a value (task-12.7 decision 10).
          logLine(
            `✗ ${source} task=${turn.clientTaskId} painted a credential input: ${found.component}, matching ${JSON.stringify(found.term)}`,
          );
          if (sendTaskId !== undefined && !foundOnTerminal) {
            this.#cancelTask(source, app, record, sendTaskId);
          }
          if (shown.length > 0) yield relayEvent(takeDown(shown), relayCtx);
          if (send > 0) {
            credentialRefused = true;
            break;
          }
          outgoing = repairOf(outgoing, found);
        }
      }
      // An answer has ended when the stream's body ends with the task's last state terminal or
      // interrupted, or after a message; a body that ends any other way broke.
      const endState = broke
        ? undefined
        : lastState !== undefined && ENDED_STATES.has(lastState)
          ? lastState
          : answered
            ? TaskState.TASK_STATE_COMPLETED
            : undefined;
      if (endState !== undefined) record.endState = taskStateToJSON(endState);
      if (record.authority) {
        finish('failed', {error: 'the app needs sign-in'});
      } else if (invalid !== undefined) {
        finish('failed', {
          error: `the request for more access is invalid: ${invalid}`,
          cause: 'invalid',
        });
      } else if (outside !== undefined) {
        record.catalogId = outside.catalogId;
        this.#cancelVendor(source, record);
        // The catch after the call (task-15.5 decision 4): the live card fetched again; one that
        // names the change brings the update tile, its finding on the catalog record.
        const updates = this.#options.updates;
        if (updates) {
          record.refetched = await updates.refetched(app.id);
          if (record.refetched === 'changed') {
            const finding = await updates.finding(app.id, 'catalogs');
            if (finding) record.update = finding;
          }
        }
        // The words name the stamp when the version axis made the refusal (task-19.2 decision 3).
        finish('failed', {
          error: `painted in ${describePaintOutside(outside.catalogId, outside.outside)}`,
          cause: 'catalog',
        });
      } else if (credentialRefused) {
        const continueUrl = continueUrlOf(
          this.#registry.card(app.id) ?? this.#registry.storedCard(app.id),
        );
        if (continueUrl !== undefined) record.continueUrl = continueUrl;
        finish('failed', {
          error: 'painted a credential input, and again after the repair',
          cause: 'credential',
        });
      } else if (endState === undefined) {
        finish('failed', {
          error: `the stream ended before the answer did${broke ? ' (fault map)' : ''}`,
          cause: 'unreachable',
        });
      } else if (FAILED_STATES.has(endState) || unmet) {
        if (finalMessage) record.vendorMessage = finalMessage;
        finish('failed', {
          error: `vendor ended the task as ${taskStateToJSON(endState)}`,
          cause: 'vendor',
        });
      } else if (!painted && (await this.#caughtWithNoUi(app.id, record))) {
        finish('failed', {
          error: 'answered with no UI, its live card naming nothing it is installed with',
        });
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

  /**
   * The catch after a call that ended with no UI (task-15.11 decision 5): an agent offered no
   * catalog it still holds paints nothing, so its live card is fetched again as after a refused
   * paint; one naming nothing in the entitlement brings the update tile, the outcome on the record.
   */
  async #caughtWithNoUi(appId: string, record: DispatchRecord): Promise<boolean> {
    const updates = this.#options.updates;
    if (!updates) return false;
    record.refetched = await updates.refetched(appId);
    if (record.refetched !== 'changed' || !updates.catalogsChanged(appId)) return false;
    const finding = await updates.finding(appId, 'catalogs');
    if (!finding) return false;
    record.update = finding;
    return true;
  }

  /**
   * The plan's dispatch of a faulted source, or every dispatch of it when the fault says so: the
   * fault keyed by the source, else by its app, which covers every source of it (task-12.4
   * decision 8).
   */
  #faultFor(source: string, turn: DispatchTurn): Fault | undefined {
    const faults = this.#options.faults;
    const fault = faults?.get(source) ?? faults?.get(parseSourceId(source)?.appId ?? source);
    return fault && (turn.fromPlan || fault.every) ? fault : undefined;
  }

  /**
   * A2A's cancel for an aborted dispatch (task-8.3 decision 4): closing the stream alone leaves
   * the vendor working on. Fire and forget; a vendor that refuses is logged, never fatal.
   */
  #cancelVendor(source: string, record: DispatchRecord): void {
    const id = record.vendorTaskId;
    const app = this.#sentTo.get(record);
    if (
      !id ||
      !app ||
      record.fault === 'fail' ||
      record.fault === 'hang' ||
      record.fault === 'refuse'
    )
      return;
    this.#cancelTask(source, app, record, id);
  }

  /** A2A's cancel for one vendor task, fire and forget. */
  #cancelTask(source: string, app: AppRecord, record: DispatchRecord, id: string): void {
    void this.#connect(app)
      .then(client => client.cancelTask({tenant: '', id, metadata: undefined}))
      .then(
        () => logLine(`✗ ${source} task=${record.clientTaskId} cancel sent`),
        err =>
          logLine(
            `✗ ${source} task=${record.clientTaskId} cancel refused (${err instanceof Error ? err.message : String(err)})`,
          ),
      );
  }

  #learnIds(event: VendorEvent, source: string, turn: DispatchTurn, record: DispatchRecord): void {
    const {contextId, taskId} = idsOf(event);
    if (contextId && !record.vendorContextId) {
      record.vendorContextId = contextId;
      this.#contexts.set(turn.clientContextId, source, contextId);
    }
    if (taskId && !record.vendorTaskId) record.vendorTaskId = taskId;
  }

  /**
   * A client for the app's agent, from this run's card — the stored one when the agent was down at
   * startup — so a dispatch fetches no card of its own (task-11.4 decision 8). The card is handed
   * to the SDK as its agent served it (task-20.1 decision 1): the SDK's 0.3 layer reads a card
   * written for A2A 0.3 and speaks 0.3 to its agent. JSON-RPC is the one binding spoken.
   */
  #connect(app: AppRecord): Promise<Client> {
    const {agentUrl} = app;
    let pending = this.#clients.get(agentUrl);
    if (!pending) {
      const base = this.#options.fetchImpl ?? fetch;
      // A 401 becomes an error of its own, thrown out through the A2A client to the dispatch
      // that sent it, which the SDK's own error would only name in its message.
      const fetchImpl: typeof fetch = async (input, init) => {
        const response = await base(input, init);
        if (response.status === 401) {
          await response.body?.cancel().catch(() => {});
          throw new UnauthorizedError();
        }
        return response;
      };
      const legacyCompat = {enabled: true};
      const cardResolver = new DefaultAgentCardResolver({fetchImpl, legacyCompat});
      const factory = new ClientFactory({
        transports: [new JsonRpcTransportFactory({fetchImpl, legacyCompat})],
        cardResolver,
      });
      const card = this.#registry.card(app.id) ?? this.#registry.storedCard(app.id);
      const created = card
        ? Promise.resolve()
            .then(() => cardResolver.normalizeAgentCard(card))
            .then(read => factory.createFromAgentCard(read))
        : factory.createFromUrl(agentUrl);
      pending = created.catch(err => {
        this.#clients.delete(agentUrl);
        throw err;
      });
      this.#clients.set(agentUrl, pending);
    }
    return pending;
  }
}

/**
 * The vendor-bound message with the app's own entitlement as its A2UI client capabilities
 * (task-11.4 decision 12): what the agent may paint in, never the table, never the client's list —
 * each version's set under its own key (task-19.2 decision 1).
 */
function withEntitlement(message: Message, app: AppRecord): Message {
  return {
    ...message,
    metadata: {
      ...message.metadata,
      [A2UI_CLIENT_CAPABILITIES_KEY]: clientCapabilities(app.entitlementByVersion),
    },
  };
}

/** A created surface the entitlement refuses: its catalog, and the sdk's answer on it. */
interface CatalogOutside {
  catalogId: string;
  outside: PaintOutside;
}

/**
 * The first surface in the event created in a catalog outside the set of its stamp — the union of
 * the sets when the stamp is neither version (task-19.2 decisions 2, 7), by the sdk's one rule.
 */
function catalogOutside(event: VendorEvent, sets: CatalogIdsByVersion): CatalogOutside | undefined {
  for (const part of partsOf(event)) {
    const data = dataOf(part);
    if (!data) continue;
    const messages = Array.isArray(data.messages) ? data.messages : [data];
    for (const message of messages) {
      if (typeof message !== 'object' || message === null) continue;
      const {version, createSurface: create} = message as Record<string, unknown>;
      if (typeof create !== 'object' || create === null) continue;
      const catalogId = (create as {catalogId?: unknown}).catalogId;
      if (typeof catalogId !== 'string') continue;
      const outside = paintOutside(version, catalogId, sets);
      if (outside) return {catalogId, outside};
    }
  }
  return undefined;
}

/**
 * An agent's auth-required: the task moving to it, with the request in the card's `security`
 * shape when its status message carries one (task-12.2 decision 12), and the agent's own words.
 * Undefined for any other event.
 */
function authRequiredOf(
  event: VendorEvent,
): {request: AuthRequired | undefined; text: string | undefined} | undefined {
  const status = statusOf(event);
  if (status?.state !== TaskState.TASK_STATE_AUTH_REQUIRED) return undefined;
  const parts = status.message?.parts ?? [];
  let request: AuthRequired | undefined;
  for (const part of parts) {
    const data = dataOf(part);
    if (!data) continue;
    request = readAuthRequired(data);
    if (request) break;
  }
  return {request, text: wordsOf(parts)};
}

/** The text parts of a status message, joined: the vendor's own words. */
function wordsOf(parts: Part[]): string | undefined {
  const text = parts
    .flatMap(part => [textOf(part)?.trim()])
    .filter(Boolean)
    .join('\n');
  return text === '' ? undefined : text;
}

/** An event that ends the vendor's answer: nothing left to cancel. */
function isTerminal(event: VendorEvent): boolean {
  if (event.payload?.$case === 'message') return true;
  const state = stateOf(event);
  return state !== undefined && ENDED_STATES.has(state);
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

/** The `fail` fault's answer: a vendor's status update ending the task failed, the fault's words on it. */
function failedFinal(message: string | undefined): VendorEvent {
  const taskId = randomUUID();
  const contextId = randomUUID();
  return {
    payload: {
      $case: 'statusUpdate',
      value: {
        taskId,
        contextId,
        status: {
          state: TaskState.TASK_STATE_FAILED,
          message: message ? agentMessage([textPart(message)], {taskId, contextId}) : undefined,
          timestamp: undefined,
        },
        metadata: undefined,
      },
    },
  };
}

const A2UI_OPS = ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface'];

function isA2ui(data: Record<string, unknown>): boolean {
  return typeof data.version === 'string' && A2UI_OPS.some(op => op in data);
}

function carriesA2ui(event: VendorEvent): boolean {
  return partsOf(event).some(part => {
    const data = dataOf(part);
    return data !== undefined && isA2ui(data);
  });
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
      const data = dataOf(part);
      if (swapped || !data) return part;
      const update = data.updateComponents as {components?: unknown} | undefined;
      const components = update?.components;
      if (!Array.isArray(components)) return part;
      const index = components.findIndex(c =>
        BREAKABLE_PROPS.some(prop => typeof c === 'object' && c !== null && prop in c),
      );
      if (index < 0) return part;
      const component = components[index] as Record<string, unknown>;
      const prop = BREAKABLE_PROPS.find(p => p in component)!;
      swapped = true;
      return withData(part, {
        ...data,
        updateComponents: {
          ...update,
          components: components.map((c, i) =>
            i === index ? {...component, [prop]: REJECTED_VALUE} : c,
          ),
        },
      });
    });
  if (event.payload?.$case === 'artifactUpdate') return event;
  const parts = swap(partsOf(event));
  return swapped ? withParts(event, parts) : event;
}
