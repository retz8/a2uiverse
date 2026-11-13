/**
 * The fetch of the live card (SPEC §9.3, §10; task-20.3 decisions 3, 4): what the orchestrator,
 * the marketplace and Stellify fetch from a card URL. Under a time limit, since the A2A SDK's own
 * resolver has none; naming A2A 1.0, as that resolver does; and kept as its agent served it,
 * where that resolver hands back its translation.
 */
import type {ServedCard} from './readCard.js';

/** The A2A version the fetch names in its request: the card served to it is the card kept. */
const CARD_FETCH_A2A_VERSION = '1.0';

export interface FetchLiveCardOptions {
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

/**
 * The card at `cardUrl`, as served. Throws, in the words of a finding, when the URL hands no
 * JSON object back in time. Whether what came back is a card is the reading's to say.
 */
export async function fetchLiveCard(
  cardUrl: string,
  {timeoutMs, fetchImpl = fetch}: FetchLiveCardOptions,
): Promise<ServedCard> {
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
  return card;
}
