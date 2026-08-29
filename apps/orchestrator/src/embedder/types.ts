/** The one embedding seam (SPEC decision: one model instance, injected into Registry, Router, and journal). */
export interface Embedder {
  /** Embed each text into a unit-normalized vector. One call may batch many texts. */
  embed(texts: readonly string[]): Promise<number[][]>;
}
