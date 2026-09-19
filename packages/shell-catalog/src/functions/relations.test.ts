/**
 * The relations (task-7.5 decisions 1–4): pure catalog functions over the two values of a match
 * claim's relation, returning whether it holds. The evaluator resolves the refs and calls a
 * relation absent when either side does not resolve; nothing here knows about surfaces.
 */
import type {DataContext} from '@a2ui/web_core/v0_9';
import {describe, expect, test} from 'vitest';
import {OPERATORS} from './operators';
import {RELATIONS, relationFunctions, relationKind} from './relations';

const ctx = undefined as unknown as DataContext;
const run = (name: string, a: unknown, b: unknown) => {
  const fn = relationFunctions.find(f => f.name === name);
  if (!fn) throw new Error(`no relation ${name}`);
  return fn.execute({values: [a, b]}, ctx);
};
const equal = (a: unknown, b: unknown) => run('equal', a, b);
const contains = (a: unknown, b: unknown) => run('contains', a, b);

test('RELATIONS names every implementation, in order, apart from the operators', () => {
  expect(relationFunctions.map(f => f.name)).toEqual([...RELATIONS]);
  expect(RELATIONS).toEqual(['equal', 'contains', 'judged']);
  for (const relation of RELATIONS) expect(OPERATORS).not.toContain(relation);
});

test('equal and contains are facts; judged is the Synthesizer’s judgment', () => {
  expect(relationKind('equal')).toBe('fact');
  expect(relationKind('contains')).toBe('fact');
  expect(relationKind('judged')).toBe('judged');
});

test('every relation returns a boolean and takes exactly two values', () => {
  for (const fn of relationFunctions) {
    expect(fn.returnType).toBe('boolean');
    expect(fn.schema.safeParse({values: ['a', 'b']}).success).toBe(true);
    expect(fn.schema.safeParse({values: ['a']}).success).toBe(false);
    expect(fn.schema.safeParse({values: ['a', 'b', 'c']}).success).toBe(false);
  }
});

describe('text compares as token sequences (decision 2)', () => {
  test('case and punctuation are ignored; anything not a letter or digit splits', () => {
    expect(equal('Fix: login flow', 'fix login-flow')).toBe(true);
    expect(equal('ekkicb71/a2u-5-say-hello', 'ekkicb71 a2u 5 say hello')).toBe(true);
    expect(equal('login flow', 'flow login')).toBe(false);
    expect(equal('login', 'logins')).toBe(false);
  });

  test('Unicode is normalized before comparing', () => {
    // A precomposed é and an e with a combining accent; a full-width and an ASCII digit.
    expect(equal('café', 'café')).toBe(true);
    expect(equal('PR ６', 'pr 6')).toBe(true);
  });

  test('in scripts written without spaces between words, each character is a token', () => {
    expect(contains('ログイン画面の修正', 'ログイン')).toBe(true);
    expect(contains('登录页面修复', '页面')).toBe(true);
    expect(contains('Fix 登录页面', '登录')).toBe(true);
    // A script written with spaces keeps its words whole.
    expect(contains('로그인 화면 수정', '로그')).toBe(false);
    expect(contains('로그인 화면 수정', '화면')).toBe(true);
  });

  test('contains is the second’s sequence unbroken inside the first’s', () => {
    expect(contains('[a2uiverse] Fix login flow (#6)', 'fix login flow')).toBe(true);
    expect(contains('Fix login flow', 'fix flow')).toBe(false);
    expect(contains('Fix login flow', 'log')).toBe(false);
    expect(contains('Fix login', 'Fix login flow')).toBe(false);
  });

  test('a side with no letter or digit holds nothing', () => {
    expect(equal('—', '—')).toBe(false);
    expect(equal('', '')).toBe(false);
    expect(contains('Fix login', '')).toBe(false);
    expect(contains('Fix login', ' · ')).toBe(false);
  });

  test('a number or a boolean that does not compare as one compares as its text', () => {
    expect(equal('#6', 6)).toBe(true);
    expect(contains('Fix login (#6)', 6)).toBe(true);
    expect(equal(true, 'TRUE')).toBe(true);
  });
});

describe('numbers and instants compare by value (decision 3)', () => {
  test('two numbers compare by value: a JSON number, or text that is only a number', () => {
    expect(equal(6, 6)).toBe(true);
    expect(equal(6, '6')).toBe(true);
    expect(equal(1234.5, '$1,234.50')).toBe(true);
    expect(equal('€1.234,50', '1234.5')).toBe(true);
    expect(equal('1 234', 1234)).toBe(true);
    expect(equal("1'234", 1234)).toBe(true);
    expect(equal('-$5', -5)).toBe(true);
    expect(equal('1,234,567.89', 1234567.89)).toBe(true);
    expect(equal(6, 7)).toBe(false);
    expect(equal('0.50', 0.5)).toBe(true);
  });

  test('a spelling that reads two ways stays text', () => {
    // 1,234 is a thousand and more, or one and a fraction: text, so it is not the number 1234 …
    expect(equal('1,234', 1234)).toBe(false);
    expect(equal('1.000', 1)).toBe(false);
    // … and compares with another spelling as words.
    expect(equal('1,234', '1.234')).toBe(true);
    expect(equal('1,234', '$1,234')).toBe(true);
  });

  test('text that is more than a number stays text', () => {
    expect(equal('6 files', 6)).toBe(false);
    expect(equal('v1.5', 1.5)).toBe(false);
  });

  test('two instants compare by moment, whatever the spelling', () => {
    expect(equal('2026-09-06T00:20:00Z', 'Sep 6, 2026 · 00:20 UTC')).toBe(true);
    expect(equal('2026-09-06T02:20:00+02:00', '2026-09-06 00:20 UTC')).toBe(true);
    expect(equal('2026-09-06T00:20:00Z', '2026-09-06T00:21:00Z')).toBe(false);
  });

  test('instants compare to the coarser precision of the two spellings', () => {
    expect(equal('2026-09-06T00:20:37Z', '2026-09-06 00:20 UTC')).toBe(true);
    expect(equal('2026-09-06T00:20:37.250Z', '2026-09-06T00:20:37Z')).toBe(true);
    expect(equal('2026-09-06T00:20:37Z', '2026-09-06T00:20:38Z')).toBe(false);
    expect(equal('2026-09-06T00:21:05Z', '2026-09-06 00:20 UTC')).toBe(false);
  });

  test('a date without a clock stays text', () => {
    expect(equal('2026-09-06', '2026-09-06')).toBe(true);
    expect(equal('2026-09-06', 'Sep 6, 2026')).toBe(false);
  });

  test('contains stays token-based', () => {
    expect(contains('Released 1,234 users', '1,234')).toBe(true);
    expect(contains('Total $1,234.50', 1234.5)).toBe(false);
    expect(contains('Deployed 2026-09-06 00:20 UTC', '2026-09-06')).toBe(true);
  });
});

describe('lists of plain values compare as lists; objects never do (decision 4)', () => {
  test('contains(list, value) is membership, by the text, number and instant readings', () => {
    expect(contains(['bug', 'Login Flow'], 'login flow')).toBe(true);
    expect(contains([5, 6, 7], '6')).toBe(true);
    expect(contains(['2026-09-06T00:20:00Z'], '2026-09-06 00:20 UTC')).toBe(true);
    expect(contains(['bug', 'ui'], 'login')).toBe(false);
  });

  test('contains(list, list) is every member of the second in the first', () => {
    expect(contains(['bug', 'ui', 'login'], ['UI', 'bug'])).toBe(true);
    expect(contains(['bug', 'ui'], ['bug', 'login'])).toBe(false);
    expect(contains(['bug'], [])).toBe(false);
  });

  test('equal(list, list) is the same members in any order', () => {
    expect(equal(['bug', 'ui'], ['UI', 'Bug'])).toBe(true);
    expect(equal([6, 7], ['7', '6'])).toBe(true);
    expect(equal(['bug', 'ui'], ['bug'])).toBe(false);
    expect(equal([], [])).toBe(false);
  });

  test('a list against a single value is not equal, and a value does not contain a list', () => {
    expect(equal(['bug'], 'bug')).toBe(false);
    expect(contains('bug fix', ['bug'])).toBe(false);
  });

  test('a relation over an object, or a list holding one, does not hold', () => {
    const object = {title: 'Fix login'};
    expect(equal(object, {title: 'Fix login'})).toBe(false);
    expect(equal(object, 'Fix login')).toBe(false);
    expect(contains(object, 'login')).toBe(false);
    expect(contains([object], 'Fix login')).toBe(false);
    expect(contains(['Fix login', object], 'Fix login')).toBe(false);
  });
});

test('judged holds whenever it is given its two values', () => {
  expect(run('judged', 'Fix login', 'Login page broken')).toBe(true);
  expect(run('judged', 6, {any: 'thing'})).toBe(true);
});
