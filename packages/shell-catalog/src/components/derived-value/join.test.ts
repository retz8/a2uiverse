// @vitest-environment node
/**
 * The mark rule (task-7.5 decision 9): which values of a claimed object a link marks, from the
 * object's evaluated relations and one cell's apps. The evaluator writes the result; nothing here
 * resolves a ref.
 */
import {describe, expect, test} from 'vitest';
import {cellJoin, type EvaluatedRelation, type RelationState} from './join';

let seq = 0;
/** A relation between two apps, as the evaluator hands it over. */
const rel = (
  op: EvaluatedRelation['op'],
  a: string,
  b: string,
  state: RelationState = 'holds',
): EvaluatedRelation => ({
  name: `${a} ${op} ${b} ${seq++}`,
  kind: op === 'judged' ? 'judged' : 'fact',
  op,
  state,
  sides: [
    {app: a, ref: {surface: `${a}:s`, pointer: '/x'}, value: state === 'absent' ? undefined : 'x'},
    {app: b, ref: {surface: `${b}:s`, pointer: '/y'}, value: 'x'},
  ],
});
const mark = (claim: EvaluatedRelation[], apps: string[], absentApps: string[] = []) =>
  cellJoin(claim, apps, absentApps)?.mark;

// The pull request row over the real roster: GitHub's list carries no branch, so CircleCI is
// tied to the row through Linear.
const number = rel('equal', 'github', 'linear');
const branch = rel('equal', 'linear', 'circleci');
const subject = rel('contains', 'gmail', 'github');

test('an object with no match claim has no join', () => {
  expect(cellJoin([], ['github'])).toBeUndefined();
});

test('facts that hold tie apps into the row’s core, whose values are unmarked', () => {
  const claim = [number, branch, subject];
  for (const app of ['github', 'linear', 'circleci', 'gmail'])
    expect(mark(claim, [app])).toBe('none');
});

test('an app outside the core tied in only by a judgment is guessed', () => {
  const claim = [number, rel('judged', 'gmail', 'github')];
  expect(mark(claim, ['gmail'])).toBe('guessed');
  expect(mark(claim, ['github'])).toBe('none');
  expect(mark(claim, ['linear'])).toBe('none');
});

test('an app the claim ties in by no relation is guessed', () => {
  expect(mark([number], ['calendar'])).toBe('guessed');
});

test('an app whose only link fails is broken; a judgment beside the failing fact keeps it guessed', () => {
  const failing = rel('equal', 'linear', 'circleci', 'fails');
  expect(mark([number, failing], ['circleci'])).toBe('broken');
  expect(mark([number, failing], ['linear'])).toBe('none');
  expect(mark([number, failing, rel('judged', 'circleci', 'github')], ['circleci'])).toBe(
    'guessed',
  );
});

test('more than one fact keeps a value unmarked when one of them fails', () => {
  const claim = [number, rel('contains', 'github', 'linear', 'fails')];
  expect(mark(claim, ['linear'])).toBe('none');
});

describe('a two-app object whose link is in doubt marks both sides', () => {
  test('a judgment: both guessed', () => {
    const claim = [rel('judged', 'github', 'linear')];
    expect(mark(claim, ['github'])).toBe('guessed');
    expect(mark(claim, ['linear'])).toBe('guessed');
  });

  test('a failing fact: both broken', () => {
    const claim = [rel('equal', 'github', 'linear', 'fails')];
    expect(mark(claim, ['github'])).toBe('broken');
    expect(mark(claim, ['linear'])).toBe('broken');
  });
});

test('when no single group is largest there is no core, and every app is outside it', () => {
  const claim = [
    rel('equal', 'github', 'linear'),
    rel('equal', 'circleci', 'gmail'),
    rel('judged', 'linear', 'circleci'),
  ];
  for (const app of ['github', 'linear', 'circleci', 'gmail'])
    expect(mark(claim, [app])).toBe('guessed');
});

describe('a relation that is absent keeps the link it made', () => {
  test('a vanished app’s facts keep tying: the app it linked stays in the core', () => {
    // The user opens a Linear issue: Linear's list vanishes and both facts through it go absent.
    const claim = [
      rel('equal', 'github', 'linear', 'absent'),
      rel('equal', 'linear', 'circleci', 'absent'),
      subject,
    ];
    expect(mark(claim, ['circleci'])).toBe('none');
    expect(mark(claim, ['github'])).toBe('none');
  });

  test('an absent judgment still ties in only by judgment: guessed stays guessed, never broken', () => {
    const claim = [
      number,
      rel('equal', 'gmail', 'linear', 'fails'),
      rel('judged', 'gmail', 'github', 'absent'),
    ];
    expect(mark(claim, ['gmail'])).toBe('guessed');
  });
});

test('an absent app adds no mark to a cell: its cells already show absence', () => {
  const claim = [number, rel('judged', 'gmail', 'github', 'absent')];
  expect(mark(claim, ['gmail'], ['gmail'])).toBe('none');
  expect(mark(claim, ['github', 'gmail'], ['gmail'])).toBe('none');
});

test('a cell over several apps takes the worst of its apps’ marks', () => {
  const claim = [
    number,
    rel('judged', 'gmail', 'github'),
    rel('equal', 'circleci', 'github', 'fails'),
  ];
  expect(mark(claim, ['github', 'linear'])).toBe('none');
  expect(mark(claim, ['github', 'gmail'])).toBe('guessed');
  expect(mark(claim, ['gmail', 'circleci'])).toBe('broken');
});

test('the join names the cell’s apps once each and carries the relations touching them', () => {
  const claim = [number, branch, subject];
  const join = cellJoin(claim, ['linear', 'linear']);
  expect(join).toEqual({mark: 'none', apps: ['linear'], evidence: [number, branch]});
  expect(cellJoin(claim, [])).toEqual({mark: 'none', apps: [], evidence: []});
});
