import type {
  MessageSendParams,
  Task,
  TaskArtifactUpdateEvent,
  TaskStatusUpdateEvent,
  Message,
  Part,
} from '@a2a-js/sdk';
import type {A2uiClientAction, A2uiClientDataModel, A2uiMessage} from '@a2ui/web_core/v0_9';
import {logClientDataModelSize} from './dataModelSize';

/**
 * What `sendMessageStream` yields. The SDK declares this union on its client but does not export
 * it publicly, so it is restated here from the public event types.
 */
export type A2AStreamEventData = Message | Task | TaskStatusUpdateEvent | TaskArtifactUpdateEvent;

const A2UI_VERSION = 'v0.9' as const;

/**
 * A2A message-metadata key under which the client's current data model rides
 * (surfaces created with `sendDataModel: true`), per the spec's A2A binding.
 */
export const A2UI_CLIENT_DATA_MODEL_KEY = 'a2uiClientDataModel';

/**
 * A2A message-metadata key under which the canvas attaches fork context when a turn is
 * dispatched from a parked (historical) view. Presence of the key IS the historical-view
 * flag; a live dispatch never carries it.
 */
export const A2UI_FORK_CONTEXT_KEY = 'a2uiForkContext';

/** The fork-context object: which paint the user was acting on, spec-minimal. */
export interface ForkContext {
  /** The parked paint's monotonic id — the stable identifier. */
  paintId: number;
  /** The paint's display title (agent-authored, or the cause-derived fallback). */
  title: string;
  /** Epoch ms of the moment the paint took the stage. */
  paintedAt: number;
  /** Depth behind the live head at dispatch time (0 = parked on the head entry). */
  position: number;
}

/**
 * A2A message-metadata key under which the client advertises what it can render, per the A2UI
 * extension spec — attached to every message when the catalog list is known.
 */
export const A2UI_CLIENT_CAPABILITIES_KEY = 'a2uiClientCapabilities';

function messageMetadata(
  clientDataModel?: A2uiClientDataModel,
  forkContext?: ForkContext,
  supportedCatalogIds?: string[],
): {[k: string]: unknown} | undefined {
  const metadata: {[k: string]: unknown} = {};
  if (supportedCatalogIds) {
    metadata[A2UI_CLIENT_CAPABILITIES_KEY] = {[A2UI_VERSION]: {supportedCatalogIds}};
  }
  if (clientDataModel) {
    // Both send paths funnel through here, so this is the one place that sees every payload.
    logClientDataModelSize(clientDataModel);
    metadata[A2UI_CLIENT_DATA_MODEL_KEY] = clientDataModel;
  }
  if (forkContext) metadata[A2UI_FORK_CONTEXT_KEY] = forkContext;
  return Object.keys(metadata).length ? metadata : undefined;
}

/** Wrap an A2UI client action as A2A send params carrying one v0.9 A2UI DataPart. */
export function buildActionMessageParams(
  action: A2uiClientAction,
  contextId?: string,
  clientDataModel?: A2uiClientDataModel,
  forkContext?: ForkContext,
  supportedCatalogIds?: string[],
): MessageSendParams {
  return {
    message: {
      kind: 'message',
      role: 'user',
      messageId: crypto.randomUUID(),
      contextId,
      parts: [{kind: 'data', data: {version: A2UI_VERSION, action}}],
      metadata: messageMetadata(clientDataModel, forkContext, supportedCatalogIds),
    },
  };
}

/** Wrap user prompt text as A2A send params carrying one TextPart. */
export function buildTextMessageParams(
  text: string,
  contextId?: string,
  clientDataModel?: A2uiClientDataModel,
  forkContext?: ForkContext,
  supportedCatalogIds?: string[],
): MessageSendParams {
  return {
    message: {
      kind: 'message',
      role: 'user',
      messageId: crypto.randomUUID(),
      contextId,
      parts: [{kind: 'text', text}],
      metadata: messageMetadata(clientDataModel, forkContext, supportedCatalogIds),
    },
  };
}

/**
 * Pull A2UI messages out of a single A2A stream event.
 *
 * A2UI rides the status message of `Task` / `TaskStatusUpdateEvent` (and the parts of a direct
 * agent `Message`) as version-tagged DataParts. `TaskArtifactUpdateEvent` is ignored — our agents
 * never deliver A2UI as artifacts.
 */
export function extractA2uiMessagesFromEvent(event: A2AStreamEventData): A2uiMessage[] {
  let parts: Part[];
  switch (event.kind) {
    case 'message':
      parts = event.parts;
      break;
    case 'task':
    case 'status-update':
      parts = event.status.message?.parts ?? [];
      break;
    default:
      return [];
  }
  return (
    parts
      .filter((p): p is Extract<Part, {kind: 'data'}> => p.kind === 'data')
      .map(p => p.data as unknown)
      // Keyed off the inline `version` field each A2UI message carries — NOT the
      // DataPart's MIME metadata (the A2A SDK tags version there, not in `data`).
      .filter((d): d is A2uiMessage => (d as {version?: unknown}).version === A2UI_VERSION)
  );
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
  let message: Message | undefined;
  switch (event.kind) {
    case 'message':
      message = event;
      break;
    case 'task':
    case 'status-update':
      message = event.status.message;
      break;
    default:
      return [];
  }
  if (!message || message.role !== 'agent') return [];
  return message.parts
    .filter((p): p is Extract<Part, {kind: 'text'}> => p.kind === 'text')
    .map(p => p.text)
    .filter(text => text.length > 0);
}

/** Pull A2UI messages out of a non-streaming A2A send result. */
export function extractA2uiMessages(result: Task | Message): A2uiMessage[] {
  return extractA2uiMessagesFromEvent(result);
}

/**
 * The paintMeta shell object: the agent's per-paint metadata — a short human
 * title, and the question marker the canvas routes on. Rides the A2A stream as a dedicated
 * DataPart (`{paintMeta: {...}}`, no inline `version` field), emitted ahead of the
 * `createSurface` it names, so the A2UI extractor above never sees it.
 */
export interface PaintMeta {
  surfaceId: string;
  /** The agent-authored paint title; best-effort — absent falls back to cause-derived. */
  title?: string;
  /** The paint's declared kind; `"question"` routes to the overlay slot. */
  kind?: string;
}

/** The question-marker value of `PaintMeta.kind`. */
export const QUESTION_PAINT_KIND = 'question';

/** A paintMeta shell object when `data` is one, else undefined. */
export function paintMetaOf(data: unknown): PaintMeta | undefined {
  const meta = (data as {paintMeta?: unknown} | null | undefined)?.paintMeta;
  if (!meta || typeof meta !== 'object') return undefined;
  const {surfaceId, title, kind} = meta as {surfaceId?: unknown; title?: unknown; kind?: unknown};
  if (typeof surfaceId !== 'string' || !surfaceId) return undefined;
  return {
    surfaceId,
    ...(typeof title === 'string' && title ? {title} : {}),
    ...(typeof kind === 'string' && kind ? {kind} : {}),
  };
}

/** Pull paintMeta shell objects out of a single A2A stream event. */
export function extractPaintMetasFromEvent(event: A2AStreamEventData): PaintMeta[] {
  let parts: Part[];
  switch (event.kind) {
    case 'message':
      parts = event.parts;
      break;
    case 'task':
    case 'status-update':
      parts = event.status.message?.parts ?? [];
      break;
    default:
      return [];
  }
  return parts
    .filter((p): p is Extract<Part, {kind: 'data'}> => p.kind === 'data')
    .map(p => paintMetaOf(p.data))
    .filter((m): m is PaintMeta => m !== undefined);
}

/** The conversation contextId carried by an A2A stream event, if any. */
export function extractContextId(event: A2AStreamEventData): string | undefined {
  return event.contextId;
}
