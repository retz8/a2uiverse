import {randomUUID} from 'node:crypto';
import type {Part, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {namespaceSurfaceId, STAMP_KEY, WIRING_KEY, type SynthesisWiring} from '@a2uiverse/sdk';
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
 * The derived tree (task-4.4 decision 1): the one tree that fits a list of
 * same-shaped entities, generated from the wiring rather than asked of the
 * model. Sort control over `/sort`, a header of field labels, a template over
 * `/entities` whose row is one DerivedValue per field — so every formula cell
 * renders through the shell's component by construction (phase decision 17).
 * Paths inside the template are relative to the entity; the client's evaluator
 * writes `{sort, entities: [{<field>: cell}]}`.
 */
export function synthesisParts(wiring: SynthesisWiring): Part[] {
  return [
    a2uiPart({createSurface: {surfaceId: synthesisSurfaceId(), catalogId: SHELL_CATALOG_ID}}),
    a2uiPart({
      updateComponents: {surfaceId: synthesisSurfaceId(), components: synthesisComponents(wiring)},
    }),
  ];
}

/** Repaint (a re-synthesis): the same surface, replaced. */
export function synthesisRepaintParts(wiring: SynthesisWiring): Part[] {
  return synthesisParts(wiring);
}

/** The paint envelope: a fragment of the shell claiming the synthesis slot, with the wiring beside the stamp. */
export function synthesisEnvelope(
  ctx: {taskId: string; contextId: string},
  parts: Part[],
  wiring: SynthesisWiring,
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
      [WIRING_KEY]: wiring,
    },
  };
}

type Component = {id: string; component: string; [prop: string]: unknown};

function synthesisComponents(wiring: SynthesisWiring): Component[] {
  const header = wiring.fields.map<Component>(f => ({
    id: `head-${f.name}`,
    component: 'Text',
    text: f.label,
  }));
  const cells = wiring.fields.map<Component>(f => ({
    id: `cell-${f.name}`,
    component: 'DerivedValue',
    cell: {path: f.name},
  }));
  return [
    {id: 'root', component: 'Column', children: ['sort', 'header', 'list']},
    {id: 'sort', component: 'SortControl', sort: {path: '/sort'}},
    {id: 'header', component: 'Row', children: header.map(c => c.id)},
    ...header,
    {id: 'list', component: 'Column', children: {path: '/entities', componentId: 'entity'}},
    {id: 'entity', component: 'Row', children: cells.map(c => c.id)},
    ...cells,
  ];
}
