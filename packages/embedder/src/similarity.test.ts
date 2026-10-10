import {describe, expect, test} from 'vitest';
import {cosine, rank} from './similarity.js';

describe('cosine', () => {
  test('identical unit vectors score 1, orthogonal score 0, opposite score -1', () => {
    expect(cosine([1, 0], [1, 0])).toBe(1);
    expect(cosine([1, 0], [0, 1])).toBe(0);
    expect(cosine([1, 0], [-1, 0])).toBe(-1);
  });
});

describe('rank', () => {
  test('orders candidates by cosine to the query, highest first, each carrying its score', () => {
    const ranked = rank(
      [1, 0],
      [
        {id: 'far', vector: [0, 1]},
        {id: 'near', vector: [1, 0]},
        {id: 'mid', vector: [Math.SQRT1_2, Math.SQRT1_2]},
      ],
    );
    expect(ranked.map(entry => entry.id)).toEqual(['near', 'mid', 'far']);
    expect(ranked[0].score).toBe(1);
    expect(ranked[1].score).toBeCloseTo(Math.SQRT1_2, 6);
    expect(ranked[2].score).toBe(0);
  });

  test('keeps the candidates’ own fields and leaves the input untouched', () => {
    const candidates = [
      {id: 'a', vector: [0, 1], name: 'A'},
      {id: 'b', vector: [1, 0], name: 'B'},
    ];
    const ranked = rank([1, 0], candidates);
    expect(ranked[0]).toMatchObject({id: 'b', name: 'B', score: 1});
    expect(candidates.map(c => c.id)).toEqual(['a', 'b']);
  });

  test('ties keep the candidates’ order', () => {
    const ranked = rank(
      [1, 0],
      [
        {id: 'first', vector: [1, 0]},
        {id: 'second', vector: [1, 0]},
      ],
    );
    expect(ranked.map(entry => entry.id)).toEqual(['first', 'second']);
  });

  test('no candidates ranks to an empty list', () => {
    expect(rank([1, 0], [])).toEqual([]);
  });
});
