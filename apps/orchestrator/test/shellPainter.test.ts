import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import {describe, expect, test} from 'vitest';
import {compositionFrom} from '../src/composition/state.js';
import {
  shellCreateParts,
  shellEnvelope,
  shellRepaintParts,
} from '../src/composition/shellPainter.js';
import type {Plan} from '../src/planner/planSchema.js';
import {Registry} from '../src/registry/registry.js';
import type {AppRecord} from '../src/registry/types.js';

function record(id: string, displayName: string): AppRecord {
  return {
    id,
    displayName,
    agentUrl: `http://localhost/${id}`,
    authScheme: 'none',
    catalogId: `cat-${id}`,
    catalogPackage: `${id}-catalog`,
  };
}

const registry = new Registry([
  record('github', 'GitHub'),
  record('gmail', 'Gmail'),
  record('calendar', 'Google Calendar'),
]);

const trio: Plan = {
  direction: 'row',
  groups: [
    {slots: [{appId: 'github', archetype: 'card', request: 'a'}]},
    {
      slots: [
        {appId: 'gmail', archetype: 'card', request: 'b'},
        {appId: 'calendar', archetype: 'card', request: 'c'},
      ],
    },
  ],
};

type A2uiData = {version: string} & Record<string, unknown>;
const dataOf = (part: {kind: string; data?: unknown}) => part.data as A2uiData;

describe('shellCreateParts', () => {
  const state = compositionFrom(trio, registry);
  const parts = shellCreateParts(state);

  test('paints createSurface for shell:main in the shell catalog, then components', () => {
    expect(parts).toHaveLength(2);
    expect(dataOf(parts[0])).toEqual({
      version: 'v0.9',
      createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID},
    });
    const update = dataOf(parts[1]).updateComponents as {surfaceId: string; components: unknown[]};
    expect(update.surfaceId).toBe('shell:main');
  });

  test('has one root, alternating axes, a pending Slot + Attribution per leaf', () => {
    const {components} = dataOf(parts[1]).updateComponents as {
      components: Array<Record<string, unknown>>;
    };
    const byId = new Map(components.map(c => [c.id as string, c]));
    const root = byId.get('root')!;
    expect(root.component).toBe('Row');
    expect(root.children).toEqual(['wrap-slot-github', 'group-1']);
    expect(byId.get('group-1')!.component).toBe('Column');
    expect(byId.get('group-1')!.children).toEqual(['wrap-slot-gmail', 'wrap-slot-calendar']);
    for (const app of ['github', 'gmail', 'calendar']) {
      expect(byId.get(`wrap-slot-${app}`)!.children).toEqual([`attr-slot-${app}`, `slot-${app}`]);
      expect(byId.get(`slot-${app}`)).toMatchObject({
        component: 'Slot',
        name: `slot-${app}`,
        state: 'pending',
      });
      expect(byId.get(`attr-slot-${app}`)!.component).toBe('Attribution');
    }
    expect(byId.get('attr-slot-calendar')).toMatchObject({
      displayName: 'Google Calendar',
      appId: 'calendar',
    });
  });
});

describe('shellRepaintParts', () => {
  test('repaints the same surface with flipped slot states and stable ids', () => {
    const state = compositionFrom(trio, registry);
    state.slots.get('slot-gmail')!.state = 'failed';
    const [part] = shellRepaintParts(state);
    const update = dataOf(part).updateComponents as {
      surfaceId: string;
      components: Array<Record<string, unknown>>;
    };
    expect(update.surfaceId).toBe('shell:main');
    const slot = update.components.find(c => c.id === 'slot-gmail')!;
    expect(slot.state).toBe('failed');
    expect(update.components.map(c => c.id)).toEqual(
      (
        dataOf(shellCreateParts(compositionFrom(trio, registry))[1]).updateComponents as {
          components: Array<Record<string, unknown>>;
        }
      ).components.map(c => c.id),
    );
  });
});

describe('shellEnvelope', () => {
  test('is a non-final working status-update stamped as the shell', () => {
    const state = compositionFrom(trio, registry);
    const event = shellEnvelope({taskId: 't1', contextId: 'c1'}, shellCreateParts(state));
    expect(event.kind).toBe('status-update');
    expect(event.final).toBe(false);
    expect(event.status.state).toBe('working');
    expect(event.taskId).toBe('t1');
    expect(event.status.message?.parts).toHaveLength(2);
    expect(event.metadata?.a2uiverse).toEqual({source: 'shell', role: 'shell'});
  });
});
