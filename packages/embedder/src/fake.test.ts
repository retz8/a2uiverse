import {describe, expect, test} from 'vitest';
import {FakeEmbedder} from './fake.js';
import {cosine} from './similarity.js';

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

  test('records every call, for a test to assert what was embedded', async () => {
    const embedder = new FakeEmbedder();
    await embedder.embed(['a', 'b']);
    await embedder.embed(['c']);
    expect(embedder.calls).toEqual([['a', 'b'], ['c']]);
  });
});
