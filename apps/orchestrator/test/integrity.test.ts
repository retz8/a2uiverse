/** The IntegrityChecker (task-5.4 spec): per-binding validity over the sdk kit; the change account. */
import type {SynthesisPayload} from '@a2uiverse/sdk';
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
            {surface: A, pointer: '/items/0/price'},
            {surface: B, pointer: '/products[sku="x100"]/price'},
          ],
        },
      },
    ],
  },
  sorts: [],
  computedAgainst: {[A]: 1, [B]: 0},
};

test('an index ref is valid while its surface generation matches; a predicate ref always is', () => {
  const at = payload.computedAgainst;
  expect(refValid({surface: A, pointer: '/items/0/price'}, at, {[A]: 1, [B]: 0})).toBe(true);
  expect(refValid({surface: A, pointer: '/items/0/price'}, at, {[A]: 2, [B]: 0})).toBe(false);
  expect(refValid({surface: A, pointer: '/items[id="x100"]/name'}, at, {[A]: 2})).toBe(true);
  expect(refValid({surface: B, pointer: '/products[sku="x100"]/price'}, at, {[B]: 9})).toBe(true);
});

test('the payload holds while every ref does; only surfaces with a stale index ref are named', () => {
  expect(checkSynthesisPayload(payload, {[A]: 1, [B]: 0})).toEqual({valid: true, invalid: []});
  expect(checkSynthesisPayload(payload, {[A]: 1, [B]: 3})).toEqual({valid: true, invalid: []});
  expect(checkSynthesisPayload(payload, {[A]: 2, [B]: 3})).toEqual({valid: false, invalid: [A]});
});

test('a surface the payload never referenced does not affect validity', () => {
  expect(checkSynthesisPayload(payload, {[A]: 1, [B]: 0, 'other:x': 9}).valid).toBe(true);
});

test('the change account names stale refs by surface and absent refs once each', () => {
  const resolve = (ref: {pointer: string}) => ({found: !ref.pointer.includes('sku="x100"')});
  expect(changeAccount(payload, {[A]: 2, [B]: 0}, {resolve})).toEqual({
    stale: {[A]: [{surface: A, pointer: '/items/0/price'}]},
    absent: [{surface: B, pointer: '/products[sku="x100"]/price'}],
  });
});
