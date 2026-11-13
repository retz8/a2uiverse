import type {Part} from '@a2a-js/sdk';
import {namespaceSurfaceId, STAMP_KEY, SYNTHESIS_KEY, type SynthesisPayload} from '@a2uiverse/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import {workingUpdate, type WireContext, type WireStatusUpdate} from '../a2a/wire.js';
import {SHELL_SOURCE_ID} from '../registry/types.js';
import type {SynthesisTree} from '../synthesizer/document.js';
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

/** The half-drawn view taken down (task-17.10 decisions 6, 8): the synthesis surface deleted. */
export function synthesisTakeDownParts(): Part[] {
  return [a2uiPart({deleteSurface: {surfaceId: synthesisSurfaceId()}})];
}

/**
 * The paint envelope: a fragment of the shell claiming the synthesis slot, the payload beside the
 * stamp. With no parts — a piece of a streamed view after its tree (task-17.10 decision 1) — the
 * event carries the payload alone, as a source's settled marker carries its stamp alone.
 */
export function synthesisEnvelope(
  ctx: WireContext,
  parts: Part[],
  payload: SynthesisPayload,
): WireStatusUpdate {
  return workingUpdate(ctx, {
    parts,
    metadata: {
      [STAMP_KEY]: {source: SHELL_SOURCE_ID, role: 'fragment'},
      [SYNTHESIS_KEY]: payload,
    },
  });
}

/** The take-down envelope: the shell's fragment deleting its surface, no payload beside it. */
export function synthesisTakeDown(ctx: WireContext): WireStatusUpdate {
  return workingUpdate(ctx, {
    parts: synthesisTakeDownParts(),
    metadata: {[STAMP_KEY]: {source: SHELL_SOURCE_ID, role: 'fragment'}},
  });
}
