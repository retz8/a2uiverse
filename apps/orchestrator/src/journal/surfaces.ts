import type {Part} from '@a2a-js/sdk';
import type {VendorEvent} from '../agentsPool/relay.js';

export interface SurfaceTouches {
  created: string[];
  updated: string[];
  deleted: string[];
}

export function emptyTouches(): SurfaceTouches {
  return {created: [], updated: [], deleted: []};
}

export function mergeTouches(a: SurfaceTouches, b: SurfaceTouches): SurfaceTouches {
  const union = (x: string[], y: string[]) => [...new Set([...x, ...y])];
  return {
    created: union(a.created, b.created),
    updated: union(a.updated, b.updated),
    deleted: union(a.deleted, b.deleted),
  };
}

/**
 * Read-only scan of an event's A2UI parts for the surfaces it touches. Parts
 * are inspected, never modified.
 */
export function touchesOf(event: VendorEvent): SurfaceTouches {
  const touches = emptyTouches();
  for (const part of partsOf(event)) {
    if (part.kind !== 'data') continue;
    for (const message of a2uiMessagesIn(part.data)) collect(message, touches);
  }
  return touches;
}

function partsOf(event: VendorEvent): Part[] {
  switch (event.kind) {
    case 'message':
      return event.parts;
    case 'task':
    case 'status-update':
      return event.status.message?.parts ?? [];
    case 'artifact-update':
      return event.artifact.parts;
  }
}

type A2uiMessage = Record<string, unknown>;

/** One message object per DataPart (a2ui-github agents) or the spec's array form under `messages`. */
function a2uiMessagesIn(data: Record<string, unknown>): A2uiMessage[] {
  if (typeof data.version === 'string') return [data];
  if (Array.isArray(data.messages)) {
    return data.messages.filter(
      (m): m is A2uiMessage => typeof m === 'object' && m !== null && typeof m.version === 'string',
    );
  }
  return [];
}

const OPS: ReadonlyArray<[key: string, bucket: keyof SurfaceTouches]> = [
  ['createSurface', 'created'],
  ['updateComponents', 'updated'],
  ['updateDataModel', 'updated'],
  ['deleteSurface', 'deleted'],
];

function collect(message: A2uiMessage, touches: SurfaceTouches): void {
  for (const [key, bucket] of OPS) {
    const op = message[key];
    if (typeof op !== 'object' || op === null) continue;
    const surfaceId = (op as {surfaceId?: unknown}).surfaceId;
    if (typeof surfaceId === 'string' && !touches[bucket].includes(surfaceId)) {
      touches[bucket].push(surfaceId);
    }
  }
}
