import {describe, expect, test} from 'vitest';
import {decideTrigger, mergePossible} from '../src/composition/trigger.js';

const sources = ['linear', 'github', 'circleci'];
const set = (...ids: string[]) => new Set(ids);

describe('the synthesis trigger (task-8.3 decisions 1, 4, 8, 9)', () => {
  test('a merge is possible from two arrivals, the home source among them under a join', () => {
    expect(mergePossible(set('github'), undefined)).toBe(false);
    expect(mergePossible(set('github', 'circleci'), undefined)).toBe(true);
    expect(mergePossible(set('github', 'circleci'), 'linear')).toBe(false);
    expect(mergePossible(set('linear', 'circleci'), 'linear')).toBe(true);
  });

  test('every source settled over a possible merge releases it', () => {
    const settled = set(...sources);
    expect(decideTrigger({sources, settled, arrived: settled})).toEqual({
      kind: 'release',
      by: 'settled',
    });
    expect(
      decideTrigger({sources, settled, arrived: settled, home: 'linear', justSettled: 'linear'}),
    ).toEqual({kind: 'release', by: 'home'});
  });

  test('sources still out over a possible merge arm the soft deadline, however many', () => {
    expect(
      decideTrigger({sources, settled: set('linear', 'github'), arrived: set('linear', 'github')}),
    ).toEqual({kind: 'arm'});
    const four = [...sources, 'gmail'];
    expect(
      decideTrigger({
        sources: four,
        settled: set('linear', 'github'),
        arrived: set('linear', 'github'),
      }),
    ).toEqual({kind: 'arm'});
  });

  test('the soft deadline never runs while the pack alone cannot merge', () => {
    // CircleCI failed fast, Linear arrived, GitHub is out: one arrival is no merge.
    expect(
      decideTrigger({sources, settled: set('linear', 'circleci'), arrived: set('linear')}),
    ).toEqual({kind: 'wait'});
  });

  test('the home source is never waited out: without it no merge is possible', () => {
    expect(
      decideTrigger({
        sources,
        settled: set('github', 'circleci'),
        arrived: set('github', 'circleci'),
        home: 'linear',
      }),
    ).toEqual({kind: 'wait'});
  });

  test('a failed home source collapses the merge at once, sources still out or not', () => {
    expect(
      decideTrigger({sources, settled: set('linear'), arrived: set(), home: 'linear'}),
    ).toEqual({kind: 'collapse', cause: 'home'});
  });

  test('every source settled with fewer than two arrived collapses the merge', () => {
    expect(decideTrigger({sources, settled: set(...sources), arrived: set('github')})).toEqual({
      kind: 'collapse',
      cause: 'few',
    });
  });
});
