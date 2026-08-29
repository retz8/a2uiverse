import {describe, expect, test} from 'vitest';
import {cosine} from '../src/embedder/similarity.js';
import {FakeEmbedder} from './fakeEmbedder.js';

describe('cosine', () => {
  test('identical unit vectors score 1, orthogonal score 0', () => {
    expect(cosine([1, 0], [1, 0])).toBe(1);
    expect(cosine([1, 0], [0, 1])).toBe(0);
    expect(cosine([1, 0], [-1, 0])).toBe(-1);
  });
});

describe('FakeEmbedder', () => {
  test('is deterministic and unit-normalized', async () => {
    const embedder = new FakeEmbedder();
    const [a] = await embedder.embed(['list my open pull requests']);
    const [b] = await embedder.embed(['list my open pull requests']);
    expect(a).toEqual(b);
    const norm = Math.sqrt(a.reduce((sum, x) => sum + x * x, 0));
    expect(norm).toBeCloseTo(1, 6);
  });

  test('token overlap orders similarity', async () => {
    const embedder = new FakeEmbedder();
    const [query, github, calendar] = await embedder.embed([
      'show my pull requests on github',
      'github repositories issues pull requests code review',
      'calendar events meetings schedule availability',
    ]);
    expect(cosine(query, github)).toBeGreaterThan(cosine(query, calendar));
  });

  test('empty input embeds to a zero vector without throwing', async () => {
    const embedder = new FakeEmbedder();
    const [v] = await embedder.embed(['']);
    expect(v.every(x => x === 0)).toBe(true);
  });
});
