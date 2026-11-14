/**
 * The answer to A2A's Get Extended Agent Card (task-20.8 decisions 7, 9, 10): what an agent
 * served a signed-in caller, read as the walk and the account's card need it.
 *
 * The A2A SDK's client hands back a card it has already read, never the answer as served
 * (`_dev/a2a-findings.md` 20), and over A2A 0.3 on HTTP+JSON it reads the answer as the JSON form
 * of A2A 0.3's protobuf, where Python's A2A SDK answers in A2A 0.3's JSON-schema form
 * (finding 21). So on JSON-RPC and HTTP+JSON the answer is read around it: the fetch the A2A SDK
 * sends through keeps the body of the answer to this one call, and that body is the card as
 * served — the JSON-RPC result, or the HTTP+JSON body. On gRPC at A2A 1.0 the A2A SDK hands back
 * the message received, and its JSON form is the card as served. On gRPC at A2A 0.3 the A2A SDK
 * hands back only its own reading of the message, which is taken as it is.
 */
import {AsyncLocalStorage} from 'node:async_hooks';
import {AgentCard} from '@a2a-js/sdk';
import {
  checkSignatures,
  readCard,
  UnconfirmedCardError,
  type PassedSignature,
} from '@a2uiverse/card';
import {A2A_ERROR_CODE, isJsonRpcError} from '@a2a-js/sdk/errors';
import {GRPC_STATUS_CODE, isGrpcError} from '@a2a-js/sdk/errors/grpc';

/**
 * What the agent answered: a card as served; on gRPC at A2A 0.3 the card as the A2A SDK read it;
 * that it has none; a refusal for sign-in; or no card for any other reason, in words.
 */
export type ExtendedCardAnswer =
  | {kind: 'served'; served: object}
  | {kind: 'read'; card: AgentCard}
  | {kind: 'none'; answer: string}
  | {kind: 'refused'}
  | {kind: 'failed'; reason: string};

/** The body of one HTTP answer, kept for the call it was asked for. */
export interface KeptAnswer {
  status?: number;
  body?: unknown;
}

const keeping = new AsyncLocalStorage<KeptAnswer>();

/**
 * A fetch that keeps the body of the answer to the one call `keepingAnswer` runs, its JSON when
 * it parses; every other request goes through untouched, a stream among them.
 */
export function keepingFetch(base: typeof fetch): typeof fetch {
  return async (input, init) => {
    const response = await base(input, init);
    const kept = keeping.getStore();
    if (kept) {
      kept.status = response.status;
      try {
        kept.body = JSON.parse(await response.clone().text());
      } catch {
        delete kept.body;
      }
    }
    return response;
  };
}

/** Runs `call`, keeping the body of the HTTP answer it gets; the call's own result or error beside it. */
export async function keepingAnswer<T>(
  call: () => Promise<T>,
): Promise<{kept: KeptAnswer} & ({result: T} | {error: unknown})> {
  const kept: KeptAnswer = {};
  try {
    return {kept, result: await keeping.run(kept, call)};
  } catch (error) {
    return {kept, error};
  }
}

/**
 * The card as served in a kept HTTP answer: the JSON-RPC result, or the HTTP+JSON body, when it
 * is a JSON object and the answer was a success.
 */
export function servedIn(kept: KeptAnswer, binding: 'JSONRPC' | 'HTTP+JSON'): object | undefined {
  if (kept.status === undefined || kept.status < 200 || kept.status >= 300) return undefined;
  const body = binding === 'JSONRPC' ? resultOf(kept.body) : kept.body;
  return isObject(body) ? body : undefined;
}

function resultOf(body: unknown): unknown {
  return isObject(body) && !('error' in body) ? (body as {result?: unknown}).result : undefined;
}

/** The card as served, from the message a gRPC call at A2A 1.0 received: its JSON form. */
export function servedFromMessage(message: AgentCard): object {
  return AgentCard.toJSON(message) as object;
}

/** The reasons A2A names for an agent that serves no extended card, in its error details. */
const NONE_REASONS: ReadonlySet<string> = new Set([
  'EXTENDED_AGENT_CARD_NOT_CONFIGURED',
  'UNSUPPORTED_OPERATION',
]);

/** The JSON-RPC codes of the same two errors. */
const NONE_CODES: ReadonlySet<number> = new Set([
  A2A_ERROR_CODE.EXTENDED_CARD_NOT_CONFIGURED,
  A2A_ERROR_CODE.UNSUPPORTED_OPERATION,
]);

/** The names the two errors go by, which Python's A2A 0.3 layer writes in a gRPC status's details. */
const NONE_NAMES = /\b(ExtendedAgentCardNotConfiguredError|UnsupportedOperationError)\b/;

/**
 * The agent's answer that it has no extended card (task-20.8 decision 9): A2A's
 * `ExtendedAgentCardNotConfiguredError` or `UnsupportedOperationError`, by the reason its error
 * details name, by its JSON-RPC code, by the reason or the code in the HTTP answer's body where
 * the A2A SDK's 0.3 layer leaves it unread, or by the error's name in a gRPC status's details,
 * which is all Python's A2A 0.3 layer sends. The words it said, or none for any other error: a
 * gRPC status alone does not tell, both servers answering `FAILED_PRECONDITION` for these and
 * for others (finding 25).
 */
export function noneAnswered(err: unknown, kept: KeptAnswer = {}): string | undefined {
  if (!(err instanceof Error)) return undefined;
  const reason = (err as {reason?: unknown}).reason;
  if (typeof reason === 'string' && NONE_REASONS.has(reason)) return err.message;
  if (isJsonRpcError(err) && NONE_CODES.has(err.envelopeCode)) return err.message;
  const said = noneInBody(kept.body);
  if (said !== undefined) return said;
  if (isGrpcError(err) && err.status === GRPC_STATUS_CODE.FAILED_PRECONDITION) {
    const named = err.message.match(NONE_NAMES);
    if (named) return err.message;
  }
  return undefined;
}

/**
 * An A2A error in an HTTP answer's body naming one of the two: A2A 1.0's, an object under `error`
 * whose details carry the reason, or whose code is a JSON-RPC one; A2A 0.3's HTTP+JSON, a numeric
 * `code` beside a `message`. Its message, or none.
 */
function noneInBody(body: unknown): string | undefined {
  if (!isObject(body)) return undefined;
  const {error, code, message} = body as {error?: unknown; code?: unknown; message?: unknown};
  if (isObject(error)) {
    const {
      details,
      code: errorCode,
      message: said,
    } = error as {
      details?: unknown;
      code?: unknown;
      message?: unknown;
    };
    const named =
      Array.isArray(details) &&
      details.some(
        detail =>
          isObject(detail) &&
          typeof (detail as {reason?: unknown}).reason === 'string' &&
          NONE_REASONS.has((detail as {reason: string}).reason),
      );
    if (named || (typeof errorCode === 'number' && NONE_CODES.has(errorCode))) {
      return typeof said === 'string' ? said : 'no extended card';
    }
    return undefined;
  }
  if (typeof code === 'number' && NONE_CODES.has(code) && typeof message === 'string') {
    return message;
  }
  return undefined;
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * How a fetch of an account's card ended (task-20.8 decision 9): the card taken; the agent has
 * none for it; it refused the credential; nothing answered within the time limit, a key set among
 * it; an answer that is not a card that reads; a signed card none of whose signatures passed; or
 * any other answer that brought no card.
 */
export type ExtendedCardOutcome =
  'taken' | 'none' | 'refused' | 'unanswered' | 'unread' | 'unconfirmed' | 'failed';

/** An account's card as taken from an answer, or why none was. */
export interface TakenExtendedCard {
  outcome: ExtendedCardOutcome;
  /** The card, read, when it was taken. */
  card?: AgentCard;
  /** Why the fetch brought no card, in a finding's words. */
  reason?: string;
  /** The signature that passed, on a signed card taken. */
  signature?: PassedSignature;
}

export interface TakeExtendedCardOptions {
  /** The app's card URL: an account's card has none of its own, so its key sets must be on its origin. */
  cardUrl: string;
  /** The fetch's time limit, which a key set's fetch shares. */
  signal: AbortSignal;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

/**
 * The answer read by the card's one reading and a signed card checked (task-20.8 decisions 10,
 * 11): a card that passes, an unsigned card and a card written for A2A 0.3 are taken; a signed
 * card that does not pass is not, and neither is one whose key set does not answer in time.
 */
export async function takeExtendedCard(
  answer: ExtendedCardAnswer | {kind: 'unanswered'},
  {cardUrl, signal, timeoutMs, fetchImpl}: TakeExtendedCardOptions,
): Promise<TakenExtendedCard> {
  switch (answer.kind) {
    case 'unanswered':
      return {outcome: 'unanswered'};
    case 'refused':
      return {outcome: 'refused'};
    case 'none':
      return {outcome: 'none', reason: answer.answer};
    case 'failed':
      return {outcome: 'failed', reason: answer.reason};
    case 'read':
      // A card written for A2A 0.3 that only the A2A SDK could read: taken as unsigned.
      return {outcome: 'taken', card: answer.card};
    case 'served': {
      let card: AgentCard;
      try {
        card = readCard(answer.served);
      } catch (err) {
        return {outcome: 'unread', reason: (err as Error).message};
      }
      try {
        const signature = await checkSignatures(answer.served, {
          cardUrl,
          signal,
          timeoutMs,
          ...(fetchImpl ? {fetchImpl} : {}),
        });
        return {outcome: 'taken', card, ...(signature ? {signature} : {})};
      } catch (err) {
        const reason = (err as Error).message;
        return err instanceof UnconfirmedCardError
          ? {outcome: 'unconfirmed', reason}
          : {outcome: 'unanswered', reason};
      }
    }
  }
}
