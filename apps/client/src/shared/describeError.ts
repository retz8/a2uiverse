/**
 * A one-line reason for a failure, safe to show in the transcript.
 *
 * Deliberately thin: it surfaces whatever the thrower said rather than mapping error
 * types to friendlier copy. The failures this shows are agent/protocol faults the user
 * cannot act on, so the message's job is to make the failure *visible and reportable*,
 * not to explain it away.
 */
export function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return 'Unknown error.';
}
