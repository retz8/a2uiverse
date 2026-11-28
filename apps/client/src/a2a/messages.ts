import {
  Role,
  TaskState,
  type Message,
  type Part,
  type SendMessageRequest,
  type StreamResponse,
} from '@a2a-js/sdk';
import type {
  ActionMessage,
  AgentToRendererMessage,
  CallAgentFunctionMessage,
  RendererFunctionResponseMessage,
} from '@a2ui/web_core/v1_0';
import type {
  CompositionOperation,
  CompositionStamp,
  PaintMeta,
  SynthesisPayload,
} from '@a2uiverse/sdk';
import {
  A2UI_RENDERER_CAPABILITIES_KEY,
  A2UI_RENDERER_DATA_MODEL_KEY,
  A2UI_VERSION,
  a2uiMessagesIn,
  a2uiPart,
  clientSessionMetadata,
  operationData,
  readA2uiStamp,
  readPaintMeta,
  readStamp,
  readSynthesis,
  rendererCapabilities,
  rendererDataModel,
  shellPart,
} from '@a2uiverse/sdk';
import {logRendererDataModelSize} from './dataModelSize';
import {PAGE_SESSION} from './pageSession';
import {readClock} from './clock';

/**
 * What `sendMessageStream` yields: one event of the orchestrator's stream, in the A2A SDK's
 * in-memory shape. On the private wire (task-20.1 decision 6) that is the orchestrator's task,
 * then `working` status updates and agents' artifact updates, then one terminal status update.
 */
export type A2AStreamEventData = StreamResponse;

/** A text part in the SDK's in-memory shape, every key of which is required. */
export function textPart(text: string): Part {
  return {content: {$case: 'text', value: text}, metadata: undefined, filename: '', mediaType: ''};
}

/**
 * A data part in the SDK's in-memory shape, carrying no mark. The parts the client sends it
 * writes through the platform sdk's builders, `a2uiPart` and `shellPart`, which mark them
 * (task-20.4 decisions 5, 8).
 */
export function dataPart(data: unknown): Part {
  return {content: {$case: 'data', value: data}, metadata: undefined, filename: '', mediaType: ''};
}

/**
 * What a data part carries, whatever JSON value it is; undefined for any other part. What the
 * platform sdk's one reading of A2UI, `a2uiMessagesIn`, is handed.
 */
export function valueOf(part: Part): unknown {
  return part.content?.$case === 'data' ? part.content.value : undefined;
}

/** The object a data part carries; undefined for any other part, and for data that is no object. */
export function dataOf(part: Part): Record<string, unknown> | undefined {
  if (part.content?.$case !== 'data') return undefined;
  const value: unknown = part.content.value;
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** The message an event carries: a direct message, or a task's or a status update's status message. */
export function messageOf(event: A2AStreamEventData): Message | undefined {
  const payload = event.payload;
  switch (payload?.$case) {
    case 'message':
      return payload.value;
    case 'task':
    case 'statusUpdate':
      return payload.value.status?.message;
    default:
      return undefined;
  }
}

/**
 * A status update of the orchestrator's task, as the SDK's client yields one: its state, the
 * agent message its parts ride — none leaves the message out — and the event's metadata. What the
 * replay rebuilds a recorded batch into.
 */
export function statusUpdateEvent(fields: {
  taskId: string;
  contextId: string;
  state: TaskState;
  parts?: Part[];
  metadata?: Record<string, unknown>;
}): A2AStreamEventData {
  const {taskId, contextId, state, parts, metadata} = fields;
  return {
    payload: {
      $case: 'statusUpdate',
      value: {
        taskId,
        contextId,
        status: {
          state,
          message:
            parts && parts.length > 0
              ? {
                  messageId: crypto.randomUUID(),
                  contextId,
                  taskId,
                  role: Role.ROLE_AGENT,
                  parts,
                  metadata: undefined,
                  extensions: [],
                  referenceTaskIds: [],
                }
              : undefined,
          timestamp: undefined,
        },
        metadata,
      },
    },
  };
}

/** One message from the canvas shell, as the request the SDK's client sends. */
function sendRequest(
  parts: Part[],
  metadata: {[k: string]: unknown},
  contextId?: string,
): SendMessageRequest {
  return {
    tenant: '',
    message: {
      messageId: crypto.randomUUID(),
      contextId: contextId ?? '',
      taskId: '',
      role: Role.ROLE_USER,
      parts,
      metadata,
      extensions: [],
      referenceTaskIds: [],
    },
    configuration: undefined,
    metadata: undefined,
  };
}

/** A renderer action, the body of the A2UI `action` message the client sends for a press in a surface. */
export type RendererAction = ActionMessage['action'];

/** The renderer's data model: each surface created with `sendDataModel: true`, by surface id. */
export type RendererDataModel = ReturnType<typeof rendererDataModel>;

/**
 * What the release sends to an agent on its own (task-21.14 decisions 8, 9): a renderer
 * function's answer, and a component's call of an agent function.
 */
export type RendererOutbound = RendererFunctionResponseMessage | CallAgentFunctionMessage;

/**
 * Whether a message is one the client reads (task-21.14 decision 10): stamped `1.0`, by the
 * sdk's one reading of a stamp.
 */
const isCurrent = (message: unknown): boolean => readA2uiStamp(message)?.current === true;

function messageMetadata(
  rendererData?: RendererDataModel,
  supportedCatalogIds?: string[],
  parent?: string,
): {[k: string]: unknown} {
  const metadata: {[k: string]: unknown} = {};
  if (supportedCatalogIds) {
    // Under v1.0's key alone, as the hub writes an app's entitlement in its place.
    metadata[A2UI_RENDERER_CAPABILITIES_KEY] = rendererCapabilities(supportedCatalogIds);
  }
  if (rendererData) {
    // Every send path funnels through here, so this is the one place that sees every payload.
    logRendererDataModelSize(rendererData);
    metadata[A2UI_RENDERER_DATA_MODEL_KEY] = rendererData;
  }
  // The page load's session and the person's clock, on every message, and the canvas this
  // question was asked from ride under the stamp key (task-12.5 decision 6, task-9.2 decision 2,
  // task-12.13 decision 47).
  Object.assign(metadata, clientSessionMetadata(PAGE_SESSION, parent, readClock()));
  return metadata;
}

/**
 * Wrap a renderer action as A2A send params carrying one A2UI part stamped `1.0`: one message in
 * the part, marked `application/a2ui+json` (task-20.4 decision 5).
 */
export function buildActionMessageParams(
  action: RendererAction,
  contextId?: string,
  rendererData?: RendererDataModel,
  supportedCatalogIds?: string[],
): SendMessageRequest {
  return sendRequest(
    [a2uiPart({version: A2UI_VERSION, action})],
    messageMetadata(rendererData, supportedCatalogIds),
    contextId,
  );
}

/**
 * Wrap what the release sends an agent on its own — a renderer function's answer, carrying the
 * call's id as received, or a component's `callAgentFunction` — as A2A send params carrying that
 * one message as an A2UI part (task-21.14 decisions 8, 9; task-21.13 decisions 8, 9).
 */
export function buildOutboundMessageParams(
  message: RendererOutbound,
  contextId?: string,
  rendererData?: RendererDataModel,
  supportedCatalogIds?: string[],
): SendMessageRequest {
  return sendRequest(
    [a2uiPart(message as Record<string, unknown>)],
    messageMetadata(rendererData, supportedCatalogIds),
    contextId,
  );
}

/** The protocol's `VALIDATION_FAILED` code — a fragment that would not validate or mount. */
export const VALIDATION_FAILED = 'VALIDATION_FAILED';

/** The protocol's renderer-to-agent error report. */
export interface RendererError {
  code: string;
  /** Namespaced, as the hub sent it: an un-namespaced id silently no-ops hub-side. */
  surfaceId: string;
  path?: string;
  message?: string;
  /** With the A2UIVerse extension's catalog load failure: the catalog the client could not load. */
  catalogId?: string;
}

/**
 * Wrap a client-side failure as A2A send params carrying one error DataPart. The hub reads
 * `code` and `surfaceId`, flips that slot to failed by repainting its own shell surface, and
 * journals the rest.
 */
export function buildErrorMessageParams(
  error: RendererError,
  contextId?: string,
  rendererData?: RendererDataModel,
  supportedCatalogIds?: string[],
): SendMessageRequest {
  return sendRequest(
    [a2uiPart({version: A2UI_VERSION, error})],
    messageMetadata(rendererData, supportedCatalogIds),
    contextId,
  );
}

/**
 * Wrap the reader's press — Retry, Include, Try again, or a step in a fragment's history — as A2A
 * send params carrying the A2UIVerse extension's operation as a data part of its own (task-8.4
 * decision 14), marked `application/a2ui-shell+json` (task-20.4 decision 8). The press acts on the composition in its context; a step alone carries the data
 * model, the restored paint's among it, so the orchestrator writes its partition from what is on
 * screen (task-9.2 decision 5).
 */
export function buildOperationMessageParams(
  operation: CompositionOperation,
  contextId?: string,
  supportedCatalogIds?: string[],
  rendererData?: RendererDataModel,
): SendMessageRequest {
  return sendRequest(
    [shellPart(operationData(operation, A2UI_VERSION))],
    messageMetadata(rendererData, supportedCatalogIds),
    contextId,
  );
}

/**
 * Wrap user prompt text as A2A send params carrying one TextPart. A question opens a canvas of
 * its own (task-9.2 decision 1): it is sent with no `contextId` — the orchestrator mints one — and
 * names the canvas it was asked from as `parent`, when there was one.
 */
export function buildTextMessageParams(
  text: string,
  rendererData?: RendererDataModel,
  supportedCatalogIds?: string[],
  parent?: string,
): SendMessageRequest {
  return sendRequest([textPart(text)], messageMetadata(rendererData, supportedCatalogIds, parent));
}

/**
 * Pull A2UI messages out of a single A2A stream event.
 *
 * A2UI is read from a bare message and from the status message of a task or a status update,
 * never from an artifact (task-20.4 decision 4), through the platform sdk's one reading: a part
 * is A2UI by what its `data` holds — one message, or a bare list of them — and no mark is read
 * (decisions 1 to 3).
 *
 * A message is taken when it is stamped `1.0`. A message in any other version is passed over with
 * nothing said, an entry of a list like a message alone (task-21.14 decision 10).
 */
export function extractA2uiMessagesFromEvent(event: A2AStreamEventData): AgentToRendererMessage[] {
  return (messageOf(event)?.parts ?? [])
    .flatMap(part => a2uiMessagesIn(valueOf(part)))
    .filter(isCurrent) as AgentToRendererMessage[];
}

/**
 * Pull the agent's plain-text parts out of a single A2A stream event.
 *
 * The agent answers in prose when it cannot produce a surface — a validator-exhausted turn tears
 * the half-built surface down and apologises as a TextPart. Without this the turn leaves nothing
 * on screen at all: the surface is removed and the only other channel, `onError`, fires on wire
 * failures, not on a successful response that happens to carry no A2UI.
 *
 * User-role messages are skipped so a server that echoes the prompt cannot replay it into the
 * transcript. Text is returned verbatim — prose arrives in stream chunks, and trimming each one
 * would delete the spaces that join them ("…requests on " + "a2ui-project"). Deciding a whole
 * accumulated response is blank belongs to the consumer, which is what sees the chunks together.
 */
export function extractAgentTextFromEvent(event: A2AStreamEventData): string[] {
  const message = messageOf(event);
  if (!message || message.role !== Role.ROLE_AGENT) return [];
  return message.parts
    .flatMap(part => (part.content?.$case === 'text' ? [part.content.value] : []))
    .filter(text => text.length > 0);
}

/**
 * Pull paintMeta shell objects — the A2UIVerse extension's `paintMeta` part, `@a2uiverse/sdk`'s
 * `readPaintMeta` — out of a single A2A stream event. Read by its `paintMeta` key, whatever the
 * part's mark, or with none (task-20.4 decision 2). Emitted ahead of the `createSurface` it
 * names, so the A2UI extractor above never sees it.
 */
export function extractPaintMetasFromEvent(event: A2AStreamEventData): PaintMeta[] {
  return (messageOf(event)?.parts ?? [])
    .map(part => readPaintMeta(dataOf(part)))
    .filter((m): m is PaintMeta => m !== undefined);
}

/**
 * The composition stamp the orchestrator writes onto every event it relays
 * (`metadata.a2uiverse`, defined by `@a2uiverse/sdk`'s A2UIVerse extension): who painted this
 * (`source`) and whether it is the shell's paint or a fragment (`role`); a fragment fills the
 * `Slot` whose `source` is the stamp's. One stamp per event, because one event is one source.
 * Absent on any stream that did not come through a composing hub.
 */
export function extractStampFromEvent(event: A2AStreamEventData): CompositionStamp | undefined {
  return readStamp(event.payload?.value.metadata);
}

/**
 * The synthesis payload beside the stamp (`metadata.a2uiverseSynthesis`), on the one event that
 * paints the synthesis surface. Envelope-checked here; validated by the synthesis session.
 */
export function extractSynthesisFromEvent(event: A2AStreamEventData): SynthesisPayload | undefined {
  return readSynthesis(event.payload?.value.metadata);
}

/** The conversation contextId carried by an A2A stream event, if any. */
export function extractContextId(event: A2AStreamEventData): string | undefined {
  return event.payload?.value.contextId || undefined;
}

/** The orchestrator's task an A2A stream event belongs to, if it names one. */
export function extractTaskId(event: A2AStreamEventData): string | undefined {
  const payload = event.payload;
  if (!payload) return undefined;
  return (payload.$case === 'task' ? payload.value.id : payload.value.taskId) || undefined;
}
