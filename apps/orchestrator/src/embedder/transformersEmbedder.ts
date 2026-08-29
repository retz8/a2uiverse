import type {Embedder} from './types.js';

/**
 * Recorded beside every vector: stored vectors carry their model version when
 * persistence arrives at M7 (SPEC decision 10).
 */
export const EMBEDDER_MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
export const EMBEDDER_MODEL_REVISION = 'main';
export const EMBEDDER_DTYPE = 'q8';

/**
 * The production {@link Embedder}: quantized MiniLM over transformers.js,
 * in-process, no API key. The pipeline loads once, lazily, so importing this
 * module never touches onnxruntime; the first-boot model download is cached
 * under the orchestrator's state dir and later boots are offline.
 */
export class TransformersEmbedder implements Embedder {
  #cacheDir: string;
  #pipeline: Promise<FeatureExtraction> | undefined;

  constructor(options: {cacheDir: string}) {
    this.#cacheDir = options.cacheDir;
  }

  async embed(texts: readonly string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const extract = await (this.#pipeline ??= this.#load());
    const output = await extract([...texts], {pooling: 'mean', normalize: true});
    return output.tolist();
  }

  async #load(): Promise<FeatureExtraction> {
    const {env, pipeline} = await import('@huggingface/transformers');
    env.cacheDir = this.#cacheDir;
    return (await pipeline('feature-extraction', EMBEDDER_MODEL_ID, {
      revision: EMBEDDER_MODEL_REVISION,
      dtype: EMBEDDER_DTYPE,
    })) as unknown as FeatureExtraction;
  }
}

type FeatureExtraction = (
  texts: string[],
  options: {pooling: 'mean'; normalize: boolean},
) => Promise<{tolist(): number[][]}>;
