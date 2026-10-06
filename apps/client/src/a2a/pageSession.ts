/**
 * The page load's session (task-12.5 decision 6; task 12.8): minted once when the page loads and
 * named on every client message, beside the parent of an opening utterance. A reload is a new
 * session. The orchestrator keeps one sitting's memory by it — whether an app's full sign-in tile
 * was shown, so the next slot for that app is the quiet line.
 */
export const PAGE_SESSION: string = crypto.randomUUID();
