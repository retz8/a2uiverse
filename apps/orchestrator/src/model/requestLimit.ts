/**
 * The time a model request of the Planner or the Synthesizer may run, the apps' hard cap's: each
 * request — a step of the call, the model's answer and the tools it ran — cut off past it, and the
 * call failed as a request that throws. The canvas closing still aborts the call first.
 */

/** The AI SDK's step timeout for a limit, none without one. */
export function stepTimeout(limitMs: number | undefined): {timeout?: {stepMs: number}} {
  return limitMs === undefined ? {} : {timeout: {stepMs: limitMs}};
}

/** What a call that the limit cut off fails with. */
export function pastLimit(limitMs: number | undefined): Error {
  return new Error(
    limitMs === undefined
      ? 'the model request was cut off'
      : `the model request ran past its ${limitMs / 1000} s limit`,
  );
}
