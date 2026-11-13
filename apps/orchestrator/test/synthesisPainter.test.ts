import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import {SYNTHESIS_KEY, type SynthesisPayload} from '@a2uiverse/sdk';
import type {SynthesisTree} from '../src/synthesizer/document.js';
import {TaskState} from '@a2a-js/sdk';
import {describe, expect, test} from 'vitest';
import {dataOf} from '../src/a2a/parts.js';
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

const payload: SynthesisPayload = {dataModel: {best: {op: 'min', args: []}}, sorts: []};

describe('the model-authored tree (task-5.4 decision 10)', () => {
  test('creates the shell:synthesis surface in the shell catalog', () => {
    const parts = synthesisParts(tree);
    expect(synthesisSurfaceId()).toBe('shell:synthesis');
    expect(dataOf(parts[0])).toEqual({
      version: 'v0.9',
      createSurface: {surfaceId: 'shell:synthesis', catalogId: SHELL_CATALOG_ID},
    });
  });

  test('paints the components verbatim', () => {
    const parts = synthesisParts(tree);
    expect(dataOf(parts[1])).toEqual({
      version: 'v0.9',
      updateComponents: {surfaceId: 'shell:synthesis', components: tree.components},
    });
  });

  test('the envelope claims the synthesis slot as a fragment of the shell, the payload on its metadata', () => {
    const event = synthesisEnvelope({taskId: 't1', contextId: 'c1'}, synthesisParts(tree), payload);
    expect(event.data.metadata?.a2uiverse).toEqual({
      source: 'shell',
      role: 'fragment',
    });
    expect(event.data.metadata?.[SYNTHESIS_KEY]).toEqual(payload);
    expect(event.data.metadata?.a2uiverseWiring).toBeUndefined();
    expect(event.data.status?.state).toBe(TaskState.TASK_STATE_WORKING);
  });
});
