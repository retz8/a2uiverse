/**
 * Operators are pure catalog functions over positional values (task-4.3 decision 2): the
 * evaluator resolves refs, drops absents and counts contributors around the call. Nothing
 * here knows about surfaces.
 */
import type {DataContext} from '@a2ui/web_core/v0_9';
import {expect, test} from 'vitest';
import {OPERATORS, operatorFunctions} from './operators';

const ctx = undefined as unknown as DataContext;
const run = (name: string, values: unknown[]) => {
  const fn = operatorFunctions.find(f => f.name === name);
  if (!fn) throw new Error(`no operator ${name}`);
  return fn.execute({values}, ctx);
};

test('OPERATORS names every implementation, in order', () => {
  expect(operatorFunctions.map(f => f.name)).toEqual([...OPERATORS]);
});

test('value passes its single input through unchanged', () => {
  expect(run('value', [899])).toBe(899);
  expect(run('value', ['X100'])).toBe('X100');
});

test('min and max pick the extreme of the given numbers', () => {
  expect(run('min', [899, 949])).toBe(899);
  expect(run('max', [899, 949])).toBe(949);
  expect(run('min', [949])).toBe(949);
});

test('sum, avg and count aggregate the given values', () => {
  expect(run('sum', [1, 2, 3.5])).toBe(6.5);
  expect(run('avg', [1, 2, 3])).toBe(2);
  expect(run('count', ['a', 'b', 'c'])).toBe(3);
});

test('argmin and argmax return the index of the winning input, not its provenance', () => {
  expect(run('argmin', [949, 899, 1020])).toBe(1);
  expect(run('argmax', [949, 899, 1020])).toBe(2);
});

test('every operator declares the return type its implementation honours', () => {
  const returns = Object.fromEntries(operatorFunctions.map(f => [f.name, f.returnType]));
  expect(returns).toEqual({
    value: 'any',
    min: 'number',
    max: 'number',
    sum: 'number',
    avg: 'number',
    count: 'number',
    argmin: 'number',
    argmax: 'number',
  });
});
