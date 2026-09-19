import {describe, expect, test} from 'vitest';
import type {DerivedModel} from './synthesis';
import {isFormula, reachSortPath, refsOf, walkModel} from './walk';

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

describe('reachSortPath: every array a sort path reaches (task-7.12)', () => {
  const cell = (pointer: string) => ({op: 'value', args: [{surface: 'circleci:runs', pointer}]});
  const rows = {
    rows: [
      {title: cell('/runs[id="a"]/branch'), runs: [{when: cell('/runs[id="a"]/when')}]},
      {title: cell('/runs[id="b"]/branch'), runs: []},
    ],
  };

  test('a path with no * reaches the one array it names', () => {
    const reach = reachSortPath(model, '/entries');
    expect(reach.faults).toEqual([]);
    expect(reach.targets).toEqual([{location: '/entries', array: model.entries}]);
  });

  test('a * passes through every element, each list reached at its concrete location, [] included', () => {
    const reach = reachSortPath(rows, '/rows/*/runs');
    expect(reach.faults).toEqual([]);
    expect(reach.targets).toEqual([
      {location: '/rows/0/runs', array: rows.rows[0]!.runs},
      {location: '/rows/1/runs', array: rows.rows[1]!.runs},
    ]);
  });

  test('the targets are the model’s own arrays, so a consumer can reorder them in place', () => {
    const reach = reachSortPath(rows, '/rows/*/runs');
    expect(reach.targets[0]!.array).toBe(rows.rows[0]!.runs);
  });

  test('* goes to any depth', () => {
    const deep = {groups: [{rows: [{runs: []}, {runs: []}]}, {rows: [{runs: []}]}]};
    expect(reachSortPath(deep, '/groups/*/rows/*/runs').targets.map(t => t.location)).toEqual([
      '/groups/0/rows/0/runs',
      '/groups/0/rows/1/runs',
      '/groups/1/rows/0/runs',
    ]);
  });

  test('an empty enclosing array reaches nothing and breaks nothing', () => {
    expect(reachSortPath({rows: []}, '/rows/*/runs')).toEqual({targets: [], faults: []});
  });

  test('an element without the list is a fault naming where the list should be', () => {
    const gap = {rows: [{runs: []}, {title: cell('/x')}]};
    const reach = reachSortPath(gap, '/rows/*/runs');
    expect(reach.targets.map(t => t.location)).toEqual(['/rows/0/runs']);
    expect(reach.faults).toEqual([
      'path /rows/*/runs reaches no array at /rows/1/runs — every element it passes through carries the list, [] when it has none',
    ]);
  });

  test('a path with no * that names no array says so', () => {
    expect(reachSortPath(model, '/counts').faults).toEqual([
      'path /counts is not an array of the derived model',
    ]);
  });

  test('* is valid only on an array', () => {
    expect(reachSortPath(model, '/counts/*/when').faults).toEqual([
      'path /counts/*/when steps with * through /counts, which is not an array',
    ]);
  });

  test('an array is stepped through with *, never by position', () => {
    expect(reachSortPath(rows, '/rows/0/runs').faults).toEqual([
      'path /rows/0/runs steps into the array at /rows by name or position; a sort path steps through an array with *',
    ]);
  });

  test('a predicate step is refused: a sort path selects no element by key', () => {
    expect(reachSortPath(rows, '/rows[title="a"]/runs').faults).toEqual([
      'path /rows[title="a"]/runs selects an element by key; a sort path steps through an array with *',
    ]);
  });

  test('the last step names the sorted array, never *', () => {
    expect(reachSortPath(rows, '/rows/*').faults).toEqual([
      'path /rows/* ends in *; its last step names the sorted array',
    ]);
  });

  test('a malformed path is a fault, not a throw', () => {
    expect(reachSortPath(rows, '/rows[x/runs').faults).toHaveLength(1);
  });
});
