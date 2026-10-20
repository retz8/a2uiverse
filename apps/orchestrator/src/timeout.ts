/**
 * How long an app's live card fetched again on demand is waited on: a publisher's listings wait half
 * the page's read bound on it (task-14.11 decision 26), so an app that does not answer leaves the
 * Store's flag and the listings still answer inside it; the catch after a refused paint waits the
 * same (task-15.5 decision 14).
 */
export const LIVE_CARD_TIMEOUT_MS = 5_000;

/** A promise that rejects once `ms` pass without it settling. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no answer in ${ms} ms`)), ms);
  });
  return Promise.race([promise, late]).finally(() => clearTimeout(timer));
}
