/**
 * The one embedding seam (SPEC §9.3, §10): one model instance per process, injected into the
 * orchestrator's Registry, Router and IntentJournal, and into the marketplace's index, so both
 * processes rank the same way.
 */
export interface Embedder {
  /** Embed each text into a unit-normalized vector. One call may batch many texts. */
  embed(texts: readonly string[]): Promise<number[][]>;
}
