import {expect, test} from 'vitest';
import type {DerivedModel} from './synthesis';
import {isFormula, refsOf, walkModel} from './walk';

const model: DerivedModel = {
  counts: {
    calendar: {op: 'count', args: [{surface: 'calendar:today', pointer: '/events'}]},
  },
  entries: [
    {
      when: {
        op: 'value',
        args: [{surface: 'gmail:inbox', pointer: '/messages[id="m_1"]/receivedAt'}],
      },
      what: {op: 'value', args: [{surface: 'gmail:inbox', pointer: '/messages[id="m_1"]/subject'}]},
    },
    {
      when: {op: 'value', args: [{surface: 'github:prs', pointer: '/pulls[number=812]/updatedAt'}]},
      what: {op: 'value', args: []},
    },
  ],
};

test('isFormula recognizes a leaf by shape: exactly op and args', () => {
  expect(isFormula({op: 'value', args: []})).toBe(true);
  expect(isFormula({op: 'value'})).toBe(false);
  expect(isFormula({op: 'value', args: [], extra: 1})).toBe(false);
  expect(isFormula({op: 1, args: []})).toBe(false);
  expect(isFormula({op: 'value', args: {}})).toBe(false);
  expect(isFormula([])).toBe(false);
  expect(isFormula(null)).toBe(false);
  expect(isFormula('value')).toBe(false);
});

test('walkModel enumerates every formula leaf with its JSON Pointer path', () => {
  const {leaves, violations} = walkModel(model);
  expect(violations).toEqual([]);
  expect(leaves.map(leaf => leaf.path)).toEqual([
    '/counts/calendar',
    '/entries/0/when',
    '/entries/0/what',
    '/entries/1/when',
    '/entries/1/what',
  ]);
  expect(leaves[0].formula).toEqual(model.counts.calendar);
});

test('walkModel reports the path of every scalar as a violation', () => {
  const bad = {
    a: {op: 'value', args: []},
    b: 'literal',
    c: [{op: 'count', args: []}, 3, null],
    d: {e: true},
  } as unknown as DerivedModel;
  const {leaves, violations} = walkModel(bad);
  expect(leaves.map(leaf => leaf.path)).toEqual(['/a', '/c/0']);
  expect(violations).toEqual(['/b', '/c/1', '/c/2', '/d/e']);
});

test('walkModel escapes ~ and / in path segments', () => {
  const {leaves} = walkModel({'a/b': {'~': {op: 'value', args: []}}});
  expect(leaves.map(leaf => leaf.path)).toEqual(['/a~1b/~0']);
});

test('refsOf lists every ref in leaf order', () => {
  expect(refsOf(model)).toEqual([
    {surface: 'calendar:today', pointer: '/events'},
    {surface: 'gmail:inbox', pointer: '/messages[id="m_1"]/receivedAt'},
    {surface: 'gmail:inbox', pointer: '/messages[id="m_1"]/subject'},
    {surface: 'github:prs', pointer: '/pulls[number=812]/updatedAt'},
  ]);
});
