import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import {SYNTHESIS_KEY, type SynthesisPayload, type SynthesisTree} from '@a2uiverse/sdk';
import {describe, expect, test} from 'vitest';
import {
  synthesisEnvelope,
  synthesisParts,
  synthesisSurfaceId,
} from '../src/composition/synthesisPainter.js';

const tree: SynthesisTree = {
  components: [
    {id: 'root', component: 'Column', children: ['sort', 'cell']},
    {id: 'sort', component: 'SortControl', sort: {path: '/sorts/0'}},
    {id: 'cell', component: 'DerivedValue', cell: {path: '/best'}, format: {kind: 'number'}},
  ],
};

const payload: SynthesisPayload = {
  dataModel: {best: {op: 'min', args: []}},
  sorts: [],
  computedAgainst: {'shop-a:list': 1},
};

describe('the model-authored tree (task-5.4 decision 10)', () => {
  test('creates the shell:synthesis surface in the shell catalog', () => {
    const parts = synthesisParts(tree);
    expect(synthesisSurfaceId()).toBe('shell:synthesis');
    expect((parts[0] as {data: Record<string, unknown>}).data).toEqual({
      version: 'v0.9',
      createSurface: {surfaceId: 'shell:synthesis', catalogId: SHELL_CATALOG_ID},
    });
  });

  test('paints the components verbatim', () => {
    const parts = synthesisParts(tree);
    expect((parts[1] as {data: Record<string, unknown>}).data).toEqual({
      version: 'v0.9',
      updateComponents: {surfaceId: 'shell:synthesis', components: tree.components},
    });
  });

  test('the envelope claims the synthesis slot as a fragment of the shell, the payload on its metadata', () => {
    const event = synthesisEnvelope({taskId: 't1', contextId: 'c1'}, synthesisParts(tree), payload);
    expect(event.metadata?.a2uiverse).toEqual({
      source: 'shell',
      slot: 'slot-shell',
      role: 'fragment',
    });
    expect(event.metadata?.[SYNTHESIS_KEY]).toEqual(payload);
    expect(event.metadata?.a2uiverseWiring).toBeUndefined();
    expect(event.final).toBe(false);
  });
});
