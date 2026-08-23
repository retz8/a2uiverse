/**
 * Shared A2A driver for the client's on-demand scripts (`record-beats`, `check-transparency`):
 * one prompt in, the raw event stream out with arrival times. Node-only; reuses the client's
 * own message builder and extractors so a script sees exactly what the canvas sees.
 */
import {ClientFactory} from '@a2a-js/sdk/client';
import type {MessageSendParams} from '@a2a-js/sdk';
import type {A2AMessageSender} from '../../src/a2a/client';
import type {A2AStreamEventData} from '../../src/a2a/messages';
import {buildTextMessageParams, extractContextId} from '../../src/a2a/messages';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

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

/** Resolve the agent card at `url` and return a streaming sender (the non-deprecated SDK client). */
export async function createSender(url: string): Promise<A2AMessageSender> {
  const client = await new ClientFactory().createFromUrl(url);
  return {
    sendMessageStream: (params, options) => client.sendMessageStream(params, options),
  };
}

/**
 * The catalog ids the canvas advertises on every message. The client's projection
 * (`orchestratorApi`) resolves them through the adapter's React entry, which drags CSS into a
 * Node process; the published catalog JSON carries the same id, so read it from there.
 */
export async function supportedCatalogIds(): Promise<string[]> {
  // The adapter's `exports` map hides package.json, so locate it as a dependency directory.
  const pkgDir = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../node_modules/primer-a2ui-adapter',
  );
  const json = await readFile(resolve(pkgDir, 'catalogs/v0.9.1/catalog.json'), 'utf8');
  return [(JSON.parse(json) as {catalogId: string}).catalogId];
}

/** Send one text prompt and collect every streamed event with its arrival offset. */
export async function driveTurn(
  sender: A2AMessageSender,
  prompt: string,
  contextId: string | undefined,
  catalogIds: string[],
  onEvent?: (e: TimedEvent) => void,
): Promise<DrivenTurn> {
  const params: MessageSendParams = buildTextMessageParams(
    prompt,
    contextId,
    undefined,
    undefined,
    catalogIds,
  );
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

/** Parse `--beats 1,2,3` into a sorted, deduplicated list of integers. */
export function parseBeatList(value: string): number[] {
  const beats = value
    .split(',')
    .map(s => Number(s.trim()))
    .filter(n => Number.isInteger(n) && n > 0);
  return [...new Set(beats)].sort((a, b) => a - b);
}
