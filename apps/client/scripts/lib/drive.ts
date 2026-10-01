/**
 * Shared A2A driver for the client's on-demand scripts (`record-beats`, `check-transparency`):
 * one prompt in, the raw event stream out with arrival times. Node-only; reuses the client's
 * own message builder and extractors so a script sees exactly what the canvas sees.
 */
import {ClientFactory} from '@a2a-js/sdk/client';
import type {MessageSendParams} from '@a2a-js/sdk';
import type {A2AMessageSender} from '../../src/a2a/client';
import type {A2AStreamEventData} from '../../src/a2a/messages';
import {BASIC_CATALOG_ID, type CompositionOperation} from '@a2uiverse/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import type {A2uiClientError} from '../../src/a2a/messages';
import {
  buildErrorMessageParams,
  buildOperationMessageParams,
  buildTextMessageParams,
  extractContextId,
} from '../../src/a2a/messages';

export interface TimedEvent {
  /** Milliseconds since the turn was sent. */
  atMs: number;
  event: A2AStreamEventData;
}

export interface DrivenTurn {
  events: TimedEvent[];
  contextId: string | undefined;
  taskId: string | null;
  durationMs: number;
}

/**
 * Resolve the agent card and return a streaming sender (the non-deprecated SDK client): the card at
 * `url`'s well-known path, or at `url` itself when `path` is `''`.
 */
export async function createSender(url: string, path?: string): Promise<A2AMessageSender> {
  const client = await new ClientFactory().createFromUrl(url, path);
  return {
    sendMessageStream: (params, options) => client.sendMessageStream(params, options),
  };
}

/**
 * The catalog ids the canvas advertises on every message (task-11.5 decision 8): the client's own
 * two, the basic catalog and the shell catalog. What an app may paint in is the orchestrator's to
 * tell it, through the app's entitlement.
 */
export async function supportedCatalogIds(): Promise<string[]> {
  return [BASIC_CATALOG_ID, SHELL_CATALOG_ID];
}

/**
 * Send one text prompt and collect every streamed event with its arrival offset. A question
 * opens a canvas of its own (task-9.2 decision 1): the message carries no contextId, and names
 * the canvas it was asked from as `parent` when the beat chains after another.
 */
export function driveTurn(
  sender: A2AMessageSender,
  prompt: string,
  parent: string | undefined,
  catalogIds: string[],
  onEvent?: (e: TimedEvent) => void,
): Promise<DrivenTurn> {
  const params = buildTextMessageParams(prompt, undefined, catalogIds, parent);
  return driveMessage(sender, params, undefined, onEvent);
}

/** The reader's press on the composition in `contextId`, on a stream of its own (task-8.6 decision 1). */
export function drivePress(
  sender: A2AMessageSender,
  operation: CompositionOperation,
  contextId: string,
  catalogIds: string[],
  onEvent?: (e: TimedEvent) => void,
): Promise<DrivenTurn> {
  const params = buildOperationMessageParams(operation, contextId, catalogIds);
  return driveMessage(sender, params, contextId, onEvent);
}

/** The client's report of a fragment it could not draw, as the canvas sends it. */
export function driveReport(
  sender: A2AMessageSender,
  error: A2uiClientError,
  contextId: string,
  catalogIds: string[],
  onEvent?: (e: TimedEvent) => void,
): Promise<DrivenTurn> {
  const params = buildErrorMessageParams(error, contextId, undefined, catalogIds);
  return driveMessage(sender, params, contextId, onEvent);
}

/** Send one message and collect every streamed event with its arrival offset. */
export async function driveMessage(
  sender: A2AMessageSender,
  params: MessageSendParams,
  contextId: string | undefined,
  onEvent?: (e: TimedEvent) => void,
): Promise<DrivenTurn> {
  const started = performance.now();
  const events: TimedEvent[] = [];
  let taskId: string | null = null;
  let learned = contextId;
  for await (const event of sender.sendMessageStream(params)) {
    const timed = {atMs: Math.round(performance.now() - started), event};
    events.push(timed);
    learned ??= extractContextId(event);
    taskId ??= event.kind === 'task' ? event.id : (event.taskId ?? null);
    onEvent?.(timed);
  }
  return {events, contextId: learned, taskId, durationMs: Math.round(performance.now() - started)};
}

/** Parse `--beats 1,2,10-18` into a sorted, deduplicated list of integers. */
export function parseBeatList(value: string): number[] {
  const beats = value.split(',').flatMap(token => {
    const [from, to] = token.split('-').map(s => Number(s.trim()));
    if (to === undefined) return [from];
    return Array.from({length: Math.max(0, to - from + 1)}, (_, i) => from + i);
  });
  return [...new Set(beats.filter(n => Number.isInteger(n) && n > 0))].sort((a, b) => a - b);
}
