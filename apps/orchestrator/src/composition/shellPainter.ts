import {randomUUID} from 'node:crypto';
import type {Part, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {PAINT_META_MIME_TYPE, paintMetaData, STAMP_KEY, type A2uiComponent} from '@a2uiverse/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import {PAINTER_ID_PREFIX} from '../planner/validate.js';
import {SHELL_SOURCE_ID} from '../registry/types.js';
import {shellSurfaceId, SYNTHESIS_DISPLAY_NAME} from './constants.js';
import {inSlotOrder, lateSources, type CompositionState} from './state.js';

/** The client's extractor keys off this inline version field. */
export const A2UI_VERSION = 'v0.9';

type ShellComponent = A2uiComponent;

/**
 * First paint of a turn: the composition's `paintMeta` when the Planner titled it (task-9.3 decision
 * 4) — the contract's part, ahead of the `createSurface` it names — then createSurface, the
 * literal data model when the tree binds one, and the full component tree with every slot pending.
 */
export function shellCreateParts(state: CompositionState): Part[] {
  const parts: Part[] = [];
  if (state.title) {
    parts.push({
      kind: 'data',
      data: paintMetaData({surfaceId: shellSurfaceId(), title: state.title}),
      metadata: {mimeType: PAINT_META_MIME_TYPE},
    });
  }
  parts.push(a2uiPart({createSurface: {surfaceId: shellSurfaceId(), catalogId: SHELL_CATALOG_ID}}));
  if (Object.keys(state.layout.dataModel).length > 0) {
    parts.push(
      a2uiPart({updateDataModel: {surfaceId: shellSurfaceId(), value: state.layout.dataModel}}),
    );
  }
  parts.push(updateComponentsPart(state));
  return parts;
}

/** In-turn change (a slot state flip): repaint of the same surface, never a new one. */
export function shellRepaintParts(state: CompositionState): Part[] {
  return [updateComponentsPart(state)];
}

/** The shell paint envelope: a non-final working status-update stamped as the shell's own. */
export function shellEnvelope(
  ctx: {taskId: string; contextId: string},
  parts: Part[],
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
    metadata: {[STAMP_KEY]: {source: SHELL_SOURCE_ID, role: 'shell'}},
  };
}

function updateComponentsPart(state: CompositionState): Part {
  return a2uiPart({
    updateComponents: {surfaceId: shellSurfaceId(), components: paintLayout(state)},
  });
}

/**
 * The layout surface as painted (task-6.4 decisions 1, 3, 11): the Planner's tree and ids kept,
 * with what the shell owns written in. Each vendor `Slot` is wrapped in an `Attribution` — the
 * marker over the fragment, one box of the layout — that names the source, holds the slot as its
 * child and carries the slot's weight; its parent names the wrapper where it named the slot. The
 * synthesis slot is shell content, bare, and a gap slot is left as authored: the catalog draws the
 * tile. `state` and `label` (and `content`, `columns`, `columnSources` and `join` on the synthesis
 * slot) are the painter's, so a repaint flips a slot by its source and every id stays put. So are
 * the facts a state carries (task-8.3 decisions 6, 9, 10): a vendor slot's `noun` under a join
 * and its `failure` once failed; the merge slot's `declined` reason or `collapse` cause once
 * collapsed. And the facts the presses' lines are drawn from (task-8.4 decision 13): the merge's
 * own source set once a view landed, the late sources waiting for Include, a call a press caused
 * in progress, the last one failed with the view kept, and the retried sources a collapsed merge
 * waits on.
 */
export function paintLayout(state: CompositionState): ShellComponent[] {
  const {components} = state.layout.tree;
  const wrapperOf = new Map<string, string>();
  for (const component of components) {
    if (component.component !== 'Slot') continue;
    const source = component.source;
    if (typeof source === 'string' && source !== SHELL_SOURCE_ID) {
      wrapperOf.set(component.id, `${PAINTER_ID_PREFIX}${component.id}`);
    }
  }
  const rewire = (value: unknown): unknown =>
    typeof value === 'string' && wrapperOf.has(value) ? wrapperOf.get(value) : value;

  const painted: ShellComponent[] = [];
  for (const component of components) {
    if (component.component !== 'Slot') {
      painted.push({
        ...component,
        ...(typeof component.child === 'string' ? {child: rewire(component.child)} : {}),
        ...(Array.isArray(component.children) ? {children: component.children.map(rewire)} : {}),
      });
      continue;
    }
    if (typeof component.gap === 'string') {
      painted.push({...component});
      continue;
    }
    const source = String(component.source);
    const entry = state.slots.get(source);
    const slotState = entry?.state ?? 'pending';
    if (source === SHELL_SOURCE_ID) {
      // The synthesis slot is shell content (task-5.5 decision 1): a reserved position painted
      // like the shell's own UI — no attribution beside it, reserved while pending under the
      // planned columns (task-7.15), the join's nouns carried for the client's progress line.
      const collapsed = slotState === 'collapsed';
      const late = lateSources(state);
      const folding = inSlotOrder(
        state,
        new Set([...state.folding].filter(appId => state.arrived.has(appId))),
      );
      painted.push({
        ...component,
        state: slotState,
        label: SYNTHESIS_DISPLAY_NAME,
        content: 'shell',
        ...(entry?.plan.columns ? {columns: entry.plan.columns} : {}),
        ...(entry?.plan.columns && entry.plan.columnSources
          ? {columnSources: entry.plan.columnSources}
          : {}),
        ...(entry?.plan.join ? {join: entry.plan.join} : {}),
        ...(collapsed && entry?.declined !== undefined
          ? {declined: {reason: entry.declined}}
          : collapsed && entry?.collapse
            ? {collapse: entry.collapse}
            : {}),
        ...(state.synthesis ? {merged: inSlotOrder(state, state.merged)} : {}),
        ...(late.length > 0 ? {late} : {}),
        ...(state.pressWork > 0 ? {working: {sources: folding}} : {}),
        ...(state.synthesis && state.callFailed ? {callFailed: state.callFailed} : {}),
        ...(collapsed && state.retrying.size > 0
          ? {retrying: inSlotOrder(state, state.retrying)}
          : {}),
      });
      continue;
    }
    const displayName = entry?.plan.displayName ?? source;
    painted.push(
      {
        id: wrapperOf.get(component.id)!,
        component: 'Attribution',
        displayName,
        appId: source,
        child: component.id,
        ...(typeof component.weight === 'number' ? {weight: component.weight} : {}),
      },
      {
        ...component,
        state: slotState,
        label: displayName,
        ...(entry?.plan.noun ? {noun: entry.plan.noun} : {}),
        ...(slotState === 'failed' && entry?.failure ? {failure: entry.failure} : {}),
      },
    );
  }
  return painted;
}

export function a2uiPart(op: Record<string, unknown>): Part {
  return {kind: 'data', data: {version: A2UI_VERSION, ...op}};
}
