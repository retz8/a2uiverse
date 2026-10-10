/**
 * The live card (SPEC §9.3): what `preview` fetches from the card URL under the card timeout
 * (task-13.4 decision 12), as the marketplace fetches it at publish.
 */
import type {AgentCard} from '@a2a-js/sdk';

export async function fetchCard(
  cardUrl: string,
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<AgentCard> {
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
}
