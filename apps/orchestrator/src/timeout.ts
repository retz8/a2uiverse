/**
 * How long an app's live card fetched again on demand is waited on: a publisher's listings wait half
 * the page's read bound on it (task-14.11 decision 26), so an app that does not answer leaves the
 * Store's flag and the listings still answer inside it; the catch after a refused paint waits the
 * same (task-15.5 decision 14).
 */
export const LIVE_CARD_TIMEOUT_MS = 5_000;
