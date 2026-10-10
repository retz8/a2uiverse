import {expect, test} from 'vitest';
import * as embedder from './index.js';

test('exports the seam, the implementation, the fake, the corpus document, cosine and rank', () => {
  expect(typeof embedder.TransformersEmbedder).toBe('function');
  expect(typeof embedder.FakeEmbedder).toBe('function');
  expect(typeof embedder.corpusDoc).toBe('function');
  expect(typeof embedder.cosine).toBe('function');
  expect(typeof embedder.rank).toBe('function');
  expect(embedder.EMBEDDER_MODEL_ID).toBe('Xenova/all-MiniLM-L6-v2');
});
