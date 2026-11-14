/**
 * The fetch of the live card (SPEC §9.3, §10; task-20.3 decisions 3, 4; task-20.7 decisions 2, 8):
 * what the orchestrator, the marketplace and Stellify fetch from a card URL. Under a time limit,
 * since the A2A SDK's own resolver has none; naming A2A 1.0, as that resolver does; kept as its
 * agent served it, where that resolver hands back its translation; and a signed card checked as
 * it is fetched, under the same time limit, so no card from a card URL is taken unchecked.
 */
import type {ServedCard} from './readCard.js';
import {checkSignatures, type PassedSignature} from './signatures.js';

/** The A2A version the fetch names in its request: the card served to it is the card kept. */
const CARD_FETCH_A2A_VERSION = '1.0';

export interface FetchLiveCardOptions {
  /** The card's own time limit: the card's fetch and its key sets' together. */
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

/** A live card as fetched: as its agent served it, with the signature that passed on a signed one. */
export interface LiveCard {
  served: ServedCard;
  /** The signature that passed; none on a card taken as an unsigned card is. */
  signature?: PassedSignature;
}

/**
 * The card at `cardUrl`, as served, its signatures checked. Throws, in the words of a finding,
 * when the URL hands no JSON object back in time, or a key set the card names does not answer
 * within the same limit: the card not answering. Throws an `UnconfirmedCardError` for a signed
 * card none of whose signatures passes: the card answered and is refused. Whether what came back
 * is a card is the reading's to say.
 */
export async function fetchLiveCard(
  cardUrl: string,
  {timeoutMs, fetchImpl = fetch}: FetchLiveCardOptions,
): Promise<LiveCard> {
  const signal = AbortSignal.timeout(timeoutMs);
  let response: Response;
  try {
    response = await fetchImpl(cardUrl, {
      signal,
      headers: {accept: 'application/json', 'A2A-Version': CARD_FETCH_A2A_VERSION},
    });
  } catch (err) {
    if (signal.aborted) throw new Error(`did not answer within ${timeoutMs / 1000} s`);
    throw new Error((err as Error).message);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  let card: unknown;
  try {
    card = await response.json();
  } catch (err) {
    if (signal.aborted) throw new Error(`did not answer within ${timeoutMs / 1000} s`);
    throw new Error(`not JSON (${(err as Error).message})`);
  }
  if (typeof card !== 'object' || card === null || Array.isArray(card)) {
    throw new Error('not an agent card');
  }
  const signature = await checkSignatures(card, {cardUrl, signal, timeoutMs, fetchImpl});
  return signature ? {served: card, signature} : {served: card};
}
