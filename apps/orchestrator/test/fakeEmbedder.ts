import type {Embedder} from '../src/embedder/types.js';

const DIM = 64;

/**
 * Deterministic, dependency-free {@link Embedder} for tests: hashed
 * bag-of-words into a fixed-dimension unit vector, so texts sharing tokens
 * score a higher cosine than unrelated texts.
 */
export class FakeEmbedder implements Embedder {
  calls: string[][] = [];

  async embed(texts: readonly string[]): Promise<number[][]> {
    this.calls.push([...texts]);
    return texts.map(text => vectorOf(text));
  }
}

function vectorOf(text: string): number[] {
  const v = new Array<number>(DIM).fill(0);
  for (const token of text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)) {
    v[hash(token) % DIM] += 1;
  }
  const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
  return norm === 0 ? v : v.map(x => x / norm);
}

function hash(token: string): number {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
