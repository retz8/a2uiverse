/**
 * The live card (SPEC §9.3): what the marketplace fetches from the card URL a publish gives, at the
 * refresh at boot, and on a report — under the card timeout (task-13.3 decision 6), since the sdk's
 * own resolver has none.
 */
import type {AgentCard} from '@a2a-js/sdk';

export type FetchCard = (cardUrl: string) => Promise<AgentCard>;

export function cardFetcher({
  timeoutMs,
  fetchImpl = fetch,
}: {
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}): FetchCard {
  return async cardUrl => {
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
    return card as AgentCard;
  };
}
