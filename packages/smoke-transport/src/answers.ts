/**
 * What an interface's answer says before the request is taken in (task-20.5 decisions 3, 8): that
 * the interface is not there, or that the agent needs sign-in, on each binding.
 *
 * Not there: the A2A error for a version not supported, on every binding; the gRPC status
 * `UNIMPLEMENTED`, which `@grpc/grpc-js` also reports for an HTTP 404 carrying no gRPC status; an
 * HTTP 404 or 405 carrying no A2A error, on JSON-RPC and HTTP+JSON; the JSON-RPC error -32601,
 * "Method not found", which a server answers to an A2A version it has no handler for, the two
 * versions naming the send method differently. Sign-in: HTTP 401 on JSON-RPC
 * and HTTP+JSON, the gRPC status `UNAUTHENTICATED` on gRPC, as section 3.3.2 of the A2A 1.0
 * specification names them. HTTP 403 and `PERMISSION_DENIED` are ordinary failures.
 */
import type {AgentInterface} from '@a2a-js/sdk';
import {A2A_ERROR_CODE, isJsonRpcError, VersionNotSupportedError} from '@a2a-js/sdk/errors';
import {GRPC_STATUS_CODE, isGrpcError} from '@a2a-js/sdk/errors/grpc';
import {isGrpc} from './address.js';

/** The agent refused the request for sign-in: HTTP 401, or `UNAUTHENTICATED` on gRPC. */
export class UnauthorizedError extends Error {
  constructor() {
    super('the agent refused the request for sign-in');
  }
}

/** The signal a refusal for sign-in arrives as on the interface's binding, in a publisher's words. */
export function signInSignalOf(agentInterface: AgentInterface): string {
  return isGrpc(agentInterface) ? 'UNAUTHENTICATED' : '401';
}

/** What answered at the interface said it is not there. */
export class NotServedError extends Error {
  constructor(answer: string) {
    super(`what answered there does not serve it: ${answer}`);
  }
}

/**
 * A fetch that turns the HTTP answers the A2A SDK would only name in an error's message into
 * errors of their own, thrown out through the A2A SDK's client: HTTP 401, and HTTP 404 or 405
 * carrying no A2A error.
 */
export function answeringFetch(base: typeof fetch): typeof fetch {
  return async (input, init) => {
    const response = await base(input, init);
    if (response.status === 401) {
      await response.body?.cancel().catch(() => {});
      throw new UnauthorizedError();
    }
    if (
      (response.status === 404 || response.status === 405) &&
      !(await carriesA2aError(response.clone()))
    ) {
      await response.body?.cancel().catch(() => {});
      throw new NotServedError(`HTTP ${response.status}`);
    }
    return response;
  };
}

/**
 * An error the A2A SDK's client threw, as the dial reads it: a refusal for sign-in or an answer
 * saying the interface is not there in an error of its own, anything else as it came.
 */
export function readAnswerError(err: unknown): unknown {
  if (err instanceof UnauthorizedError || err instanceof NotServedError) return err;
  if (err instanceof VersionNotSupportedError) return new NotServedError(err.message);
  if (isJsonRpcError(err) && err.envelopeCode === A2A_ERROR_CODE.METHOD_NOT_FOUND) {
    return new NotServedError(err.message);
  }
  if (isGrpcError(err)) {
    if (err.status === GRPC_STATUS_CODE.UNAUTHENTICATED) return new UnauthorizedError();
    if (err.status === GRPC_STATUS_CODE.UNIMPLEMENTED) return new NotServedError(err.message);
  }
  return err;
}

/**
 * Whether an answer's body is an A2A error: a JSON-RPC error, an A2A 1.0 HTTP+JSON error, each an
 * object under `error`, or an A2A 0.3 HTTP+JSON error, a numeric `code` beside a `message`. The
 * body is read whole, so a caller hands it a copy of the response.
 */
async function carriesA2aError(response: Response): Promise<boolean> {
  let body: unknown;
  try {
    body = JSON.parse(await response.text());
  } catch {
    return false;
  }
  if (typeof body !== 'object' || body === null) return false;
  const {error, code, message} = body as {error?: unknown; code?: unknown; message?: unknown};
  return (
    (typeof error === 'object' && error !== null) ||
    (typeof code === 'number' && typeof message === 'string')
  );
}
