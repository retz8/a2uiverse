import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import {WIRING_KEY, type SynthesisWiring} from '@a2uiverse/sdk';
import {describe, expect, test} from 'vitest';
import {
  synthesisEnvelope,
  synthesisParts,
  synthesisSurfaceId,
} from '../src/composition/synthesisPainter.js';

const wiring: SynthesisWiring = {
  fields: [
    {name: 'product', label: 'Camera'},
    {name: 'best', label: 'Best price'},
  ],
  entities: [],
  sort: {field: 'best', direction: 'asc'},
  computedAgainst: {'shop-a:list': 1},
};

type Component = {id: string; component: string; [k: string]: unknown};
function componentsOf(parts: ReturnType<typeof synthesisParts>): Component[] {
  const update = parts[1] as {data: {updateComponents: {components: Component[]}}};
  return update.data.updateComponents.components;
}

describe('the derived tree (task-4.4 decision 1)', () => {
  test('creates the shell:synthesis surface in the shell catalog', () => {
    const parts = synthesisParts(wiring);
    expect(synthesisSurfaceId()).toBe('shell:synthesis');
    expect((parts[0] as {data: Record<string, unknown>}).data).toEqual({
      version: 'v0.9',
      createSurface: {surfaceId: 'shell:synthesis', catalogId: SHELL_CATALOG_ID},
    });
  });

  test('places the sort control bound to /sort and a template over /entities', () => {
    const components = componentsOf(synthesisParts(wiring));
    expect(components.find(c => c.component === 'SortControl')).toMatchObject({
      sort: {path: '/sort'},
    });
    const list = components.find(c => typeof c.children === 'object' && !Array.isArray(c.children));
    expect(list?.children).toMatchObject({path: '/entities'});
  });

  test('one DerivedValue per field, bound by the field name inside the entity template; labels in a header', () => {
    const components = componentsOf(synthesisParts(wiring));
    const cells = components.filter(c => c.component === 'DerivedValue');
    expect(cells.map(c => c.cell)).toEqual([{path: 'product'}, {path: 'best'}]);
    const texts = components.filter(c => c.component === 'Text').map(c => c.text);
    expect(texts).toEqual(['Camera', 'Best price']);
  });

  test('the envelope claims the synthesis slot as a fragment of the shell, wiring on its metadata', () => {
    const event = synthesisEnvelope(
      {taskId: 't1', contextId: 'c1'},
      synthesisParts(wiring),
      wiring,
    );
    expect(event.metadata?.a2uiverse).toEqual({
      source: 'shell',
      slot: 'slot-shell',
      role: 'fragment',
    });
    expect(event.metadata?.[WIRING_KEY]).toEqual(wiring);
    expect(event.final).toBe(false);
  });
});
