import {randomUUID} from 'node:crypto';
import type {Part, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {STAMP_KEY} from '@a2uiverse/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import {SHELL_SOURCE_ID} from '../registry/types.js';
import {shellSurfaceId, slotNameFor} from './constants.js';
import type {CompositionState} from './state.js';

/** The client's extractor keys off this inline version field. */
const A2UI_VERSION = 'v0.9';

type ShellComponent = {id: string; component: string; [prop: string]: unknown};

/** First paint of a turn: createSurface + the full component tree, pending slots. */
export function shellCreateParts(state: CompositionState): Part[] {
  return [
    a2uiPart({createSurface: {surfaceId: shellSurfaceId(), catalogId: SHELL_CATALOG_ID}}),
    updateComponentsPart(state),
  ];
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
    updateComponents: {surfaceId: shellSurfaceId(), components: shellComponents(state)},
  });
}

/**
 * The flat component tree of the layout surface: the root lays groups on the
 * plan's direction; a multi-slot group is a container on the opposite axis; a
 * leaf is a Column of Attribution over Slot. Ids derive from slot names so
 * repaints keep identity.
 */
function shellComponents(state: CompositionState): ShellComponent[] {
  const {plan} = state;
  const components: ShellComponent[] = [];
  const rootChildren: string[] = [];
  const cross = plan.direction === 'row' ? 'Column' : 'Row';

  plan.groups.forEach((group, i) => {
    const leafIds = group.slots.map(slot => {
      const slotName = slotNameFor(slot.appId);
      const entry = state.slots.get(slotName);
      const displayName = entry?.plan.displayName ?? slot.appId;
      components.push(
        {
          id: `wrap-${slotName}`,
          component: 'Column',
          children: [`attr-${slotName}`, slotName],
        },
        {
          id: `attr-${slotName}`,
          component: 'Attribution',
          displayName,
          appId: slot.appId,
        },
        {
          id: slotName,
          component: 'Slot',
          name: slotName,
          state: entry?.state ?? 'pending',
          label: displayName,
        },
      );
      return `wrap-${slotName}`;
    });
    if (leafIds.length === 1) {
      rootChildren.push(leafIds[0]);
    } else {
      const groupId = `group-${i}`;
      components.push({id: groupId, component: cross, children: leafIds});
      rootChildren.push(groupId);
    }
  });

  components.unshift({
    id: 'root',
    component: plan.direction === 'row' ? 'Row' : 'Column',
    children: rootChildren,
  });
  return components;
}

function a2uiPart(op: Record<string, unknown>): Part {
  return {kind: 'data', data: {version: A2UI_VERSION, ...op}};
}
