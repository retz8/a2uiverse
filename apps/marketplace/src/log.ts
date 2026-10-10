/** One line per thing that crosses the marketplace's boundary: a claim, a publish, an unpublish, a report, a flag. */
export const APP_NAME = '@a2uiverse/marketplace';

export function logLine(text: string): void {
  console.log(`${APP_NAME}: ${text}`);
}
