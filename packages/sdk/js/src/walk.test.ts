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

const G = (pointer: string) => ({surface: 'github:prs', pointer});
const C = (pointer: string) => ({surface: 'circleci:runs', pointer});
const joined: DerivedModel = {
  match: {branch: {op: 'equal', args: [G('/head'), C('/branch')]}},
  pulls: [
    {
      title: {op: 'value', args: [G('/pulls[number=142]/title')]},
      ci: {op: 'value', args: [C('/runs[id="r1"]/status')]},
      match: {
        branch: {op: 'equal', args: [G('/pulls[number=142]/branch'), C('/runs[id="r1"]/branch')]},
      },
    },
  ],
};

test('walkModel lists every match claim with the path of the object carrying it and its named relations', () => {
  const {claims} = walkModel(joined);
  expect(claims).toEqual([
    {path: '', relations: [{name: 'branch', path: '/match/branch', formula: joined.match.branch}]},
    {
      path: '/pulls/0',
      relations: [
        {
          name: 'branch',
          path: '/pulls/0/match/branch',
          formula: {
            op: 'equal',
            args: [G('/pulls[number=142]/branch'), C('/runs[id="r1"]/branch')],
          },
        },
      ],
    },
  ]);
});

test("a match claim's relations are leaves like any other, so their refs are the model's refs", () => {
  const {leaves} = walkModel(joined);
  expect(leaves.map(leaf => leaf.path)).toEqual([
    '/match/branch',
    '/pulls/0/title',
    '/pulls/0/ci',
    '/pulls/0/match/branch',
  ]);
  expect(refsOf(joined)).toContainEqual(C('/runs[id="r1"]/branch'));
});

test('a model with no match claim has no claims', () => {
  expect(walkModel(model).claims).toEqual([]);
});
