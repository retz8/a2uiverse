/**
 * The live card (SPEC §9.3; task-20.2 decisions 4, 5): what the marketplace fetches from the card
 * URL at publish, at its refresh at boot and on a report, and what Stellify's `preview` fetches —
 * under a timeout, since the A2A SDK's own resolver has none, and kept as its agent served it,
 * where the A2A SDK's resolver hands back its translation.
 */
import type {PublishedCard} from '@a2uiverse/sdk';

export interface FetchLiveCardOptions {
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

/** The card at `cardUrl`, as served. Throws, in the words of a finding, when there is none. */
export async function fetchLiveCard(
  cardUrl: string,
  {timeoutMs, fetchImpl = fetch}: FetchLiveCardOptions,
): Promise<PublishedCard> {
  const signal = AbortSignal.timeout(timeoutMs);
  let response: Response;
  try {
    response = await fetchImpl(cardUrl, {signal, headers: {accept: 'application/json'}});
  } catch (err) {
    if (signal.aborted) throw new Error(`did not answer within ${timeoutMs / 1000} s`);
    throw new Error((err as Error).message);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  let card: unknown;
  try {
    card = await response.json();
  } catch (err) {
    throw new Error(`not JSON (${(err as Error).message})`);
  }
  if (typeof card !== 'object' || card === null) throw new Error('not an agent card');
  const c = card as Record<string, unknown>;
  if (typeof c.url !== 'string' || typeof c.name !== 'string') {
    throw new Error('not an agent card: no url or name');
  }
  return card as PublishedCard;
}
