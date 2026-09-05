import {expect, test} from 'vitest';
import {isGenerationGuarded, refValidity} from './validity';

test('a pointer with an integer step is generation-guarded; one with only names and predicates is not', () => {
  expect(isGenerationGuarded('/items/0/price')).toBe(true);
  expect(isGenerationGuarded('/items[sku="x"]/price')).toBe(false);
  expect(isGenerationGuarded('/items[sku="x"]/tags/0')).toBe(true);
  expect(isGenerationGuarded('/summary/total')).toBe(false);
  expect(isGenerationGuarded('')).toBe(false);
});

test('an index ref is stale when the seen generation differs from the one computed against', () => {
  const ref = {surface: 'shop-a:list', pointer: '/items/0/price'};
  expect(refValidity(ref, {'shop-a:list': 1}, {'shop-a:list': 2})).toBe('stale');
  expect(refValidity(ref, {'shop-a:list': 2}, {'shop-a:list': 1})).toBe('stale');
  expect(refValidity(ref, {'shop-a:list': 1}, {'shop-a:list': 1})).toBe('valid');
});

test('a surface never stamped, on either side, counts as matched', () => {
  const ref = {surface: 'shop-a:list', pointer: '/items/0/price'};
  expect(refValidity(ref, {}, {'shop-a:list': 2})).toBe('valid');
  expect(refValidity(ref, {'shop-a:list': 1}, {})).toBe('valid');
});

test('a predicate ref never goes stale', () => {
  const ref = {surface: 'shop-a:list', pointer: '/items[sku="x"]/price'};
  expect(refValidity(ref, {'shop-a:list': 1}, {'shop-a:list': 5})).toBe('valid');
});
