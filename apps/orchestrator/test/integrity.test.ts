/**
 * The IntegrityChecker (task-5.4 spec, amended by task 5.10): refs select elements by key, so
 * resolution is validity. A partition that reorders or repaints under a ref breaks nothing; a
 * ref that stops resolving is what gates a re-synthesis, and the change account carries it.
 */
import type {Ref, SynthesisPayload} from '@a2uiverse/sdk';
import {expect, test} from 'vitest';
import {changeAccount, checkSynthesisPayload, refValid} from '../src/composition/integrity.js';

const A = 'shop-a:list';
const B = 'shop-b:list';

const payload: SynthesisPayload = {
  dataModel: {
    rows: [
      {
        name: {op: 'value', args: [{surface: A, pointer: '/items[id="x100"]/name'}]},
        best: {
          op: 'min',
          args: [
            {surface: A, pointer: '/items[id="x100"]/price'},
            {surface: B, pointer: '/products[sku="x100"]/price'},
          ],
        },
      },
    ],
  },
  sorts: [],
};

/** A partition stub in which every ref resolves except the pointers named. */
function partitions(...gone: string[]) {
  return {resolve: (ref: Ref) => ({found: !gone.some(g => ref.pointer.includes(g))})};
}

test('a ref is valid while it resolves, whatever the partition did under it', () => {
  expect(refValid({surface: A, pointer: '/items[id="x100"]/name'}, partitions())).toBe(true);
  expect(refValid({surface: A, pointer: '/items[id="x100"]/name'}, partitions('x100'))).toBe(false);
});

test('the payload holds while every ref resolves; only the surfaces that broke are named', () => {
  expect(checkSynthesisPayload(payload, partitions())).toEqual({valid: true, invalid: []});
  expect(checkSynthesisPayload(payload, partitions('sku="x100"'))).toEqual({
    valid: false,
    invalid: [B],
  });
  expect(checkSynthesisPayload(payload, partitions('x100')).invalid).toEqual([A, B]);
});

test('a reorder that leaves every key resolving does not invalidate the payload', () => {
  // The property the phase is built on: keys survive a repaint that moves elements around.
  expect(checkSynthesisPayload(payload, partitions()).valid).toBe(true);
});

test('the change account names the refs that stopped resolving, once each', () => {
  expect(changeAccount(payload, partitions('sku="x100"'))).toEqual({
    absent: [{surface: B, pointer: '/products[sku="x100"]/price'}],
  });
});

test('a ref repeated across formulas is accounted once', () => {
  const twice: SynthesisPayload = {
    dataModel: {
      a: {op: 'value', args: [{surface: A, pointer: '/items[id="x100"]/name'}]},
      b: {op: 'value', args: [{surface: A, pointer: '/items[id="x100"]/name'}]},
    },
    sorts: [],
  };
  expect(changeAccount(twice, partitions('x100')).absent).toHaveLength(1);
});
