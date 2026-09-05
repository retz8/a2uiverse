import {randomUUID} from 'node:crypto';
import type {Part, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {
  namespaceSurfaceId,
  STAMP_KEY,
  SYNTHESIS_KEY,
  type SynthesisPayload,
  type SynthesisTree,
} from '@a2uiverse/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import {SHELL_SOURCE_ID} from '../registry/types.js';
import {slotNameFor} from './constants.js';
import {a2uiPart} from './shellPainter.js';

/** The shell's second surface: the merged view, un-namespaced half. */
export const SYNTHESIS_SURFACE_ID = 'synthesis';

export function synthesisSurfaceId(): string {
  return namespaceSurfaceId(SHELL_SOURCE_ID, SYNTHESIS_SURFACE_ID);
}

/**
 * The model-authored tree (task-5.4 decision 10), painted verbatim: `createSurface` in the
 * shell catalog plus `updateComponents` carrying the Synthesizer's components as written. A
 * re-synthesis paints the same surface again — repaint is surface replacement.
 */
export function synthesisParts(tree: SynthesisTree): Part[] {
  return [
    a2uiPart({createSurface: {surfaceId: synthesisSurfaceId(), catalogId: SHELL_CATALOG_ID}}),
    a2uiPart({
      updateComponents: {surfaceId: synthesisSurfaceId(), components: tree.components},
    }),
  ];
}

/**
 * The shell's own words in the synthesis slot: a decline's reason, stamped as the synthesis
 * fragment so the client buckets it under the shell and the collapsed slot rests on it (task
 * 4.8). No payload rides beside this stamp — nothing was synthesized.
 */
export function synthesisProseEnvelope(
  ctx: {taskId: string; contextId: string},
  text: string,
): TaskStatusUpdateEvent {
  return {
    kind: 'status-update',
    taskId: ctx.taskId,
    contextId: ctx.contextId,
    final: false,
    status: {
      state: 'working',
      message: {
        kind: 'message',
        messageId: randomUUID(),
        role: 'agent',
        parts: [{kind: 'text', text}],
        contextId: ctx.contextId,
        taskId: ctx.taskId,
      },
    },
    metadata: {
      [STAMP_KEY]: {source: SHELL_SOURCE_ID, slot: slotNameFor(SHELL_SOURCE_ID), role: 'fragment'},
    },
  };
}

/** The paint envelope: a fragment of the shell claiming the synthesis slot, the payload beside the stamp. */
export function synthesisEnvelope(
  ctx: {taskId: string; contextId: string},
  parts: Part[],
  payload: SynthesisPayload,
): TaskStatusUpdateEvent {
  return {
    kind: 'status-update',
    taskId: ctx.taskId,
    contextId: ctx.contextId,
    final: false,
    status: {
      state: 'working',
      message: {
        kind: 'message',
        messageId: randomUUID(),
        role: 'agent',
        parts,
        contextId: ctx.contextId,
        taskId: ctx.taskId,
      },
    },
    metadata: {
      [STAMP_KEY]: {source: SHELL_SOURCE_ID, slot: slotNameFor(SHELL_SOURCE_ID), role: 'fragment'},
      [SYNTHESIS_KEY]: payload,
    },
  };
}
