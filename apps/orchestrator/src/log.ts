/**
 * One line per thing that crosses the hub's boundary (task 5.7): a request arriving from the
 * canvas, a relay leaving for a vendor, and each of them settling. The journal records a turn
 * only when it closes; a turn that never closes — the canvas reporting "Failed to fetch" while
 * nothing reached a vendor — left no trace until these lines existed.
 */
const PREFIX = '@a2uiverse/orchestrator';

export function logLine(text: string): void {
  console.log(`${PREFIX}: ${text}`);
}

export function elapsedMs(since: number): number {
  return Math.max(0, Date.now() - since);
}
