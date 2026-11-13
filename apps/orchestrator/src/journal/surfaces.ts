import {a2uiMessagesIn, type A2uiMessage} from '@a2uiverse/sdk';
import {valueOf} from '../a2a/parts.js';
import {partsOf, type WireEvent} from '../a2a/wire.js';

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
export function touchesOf(event: WireEvent): SurfaceTouches {
  const touches = emptyTouches();
  for (const message of a2uiMessagesOf(event)) collect(message, touches);
  return touches;
}

/**
 * Every A2UI message the parts of an event's status message carry, in order, through the platform
 * sdk's one reading: one message object per data part, or a bare list.
 */
export function a2uiMessagesOf(event: WireEvent): A2uiMessage[] {
  return partsOf(event).flatMap(part => a2uiMessagesIn(valueOf(part)));
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
