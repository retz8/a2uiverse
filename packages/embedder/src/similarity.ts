/** Cosine similarity of two unit-normalized vectors — a plain dot product. */
export function cosine(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/**
 * The one ranking both processes use: every candidate scored by cosine to the query, highest
 * first, ties in the candidates' order. The Router's cap and keep rule sit on top of it; the
 * marketplace's search returns it as is.
 */
export function rank<T extends {vector: readonly number[]}>(
  query: readonly number[],
  candidates: readonly T[],
): (T & {score: number})[] {
  return candidates
    .map(candidate => ({...candidate, score: cosine(query, candidate.vector)}))
    .sort((a, b) => b.score - a.score);
}
