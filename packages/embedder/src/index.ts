/**
 * @a2uiverse/embedder — the one embedding model the platform ranks with (SPEC §9.3, §10): the
 * `Embedder` seam, its transformers.js implementation, the corpus document an agent card is
 * embedded as, cosine and the shared rank, and the deterministic fake both processes' tests use.
 */
export type {Embedder} from './types.js';
export {
  EMBEDDER_DTYPE,
  EMBEDDER_MODEL_ID,
  EMBEDDER_MODEL_REVISION,
  TransformersEmbedder,
} from './transformersEmbedder.js';
export {cosine, rank} from './similarity.js';
export {corpusDoc, type CardForCorpus} from './corpus.js';
export {FakeEmbedder} from './fake.js';
