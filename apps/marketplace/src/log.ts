/**
 * One line per thing that crosses the marketplace's boundary: a claim, a publish and its
 * hello-fragment smoke test, an unpublish, a report, a flag. Each opens with its instant, as
 * `Date#toISOString` writes it, the form the orchestrator's journal stamps its entries in, so a
 * sitting's log times what happened inside a publish.
 */
export const APP_NAME = '@a2uiverse/marketplace';

export function logLine(text: string, at: Date = new Date()): void {
  console.log(`${at.toISOString()} ${APP_NAME}: ${text}`);
}
