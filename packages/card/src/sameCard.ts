/**
 * When two cards are the same card (task-20.3 decision 12): equal as read, how the agent is
 * reached set aside. The marketplace's card-version rule and the install summary's "nothing
 * changed" use this test, so an agent that changes the A2A version or the bindings it serves, and
 * nothing else, has not changed its card.
 */
import {AgentCard} from '@a2a-js/sdk';

/**
 * Whether two read cards say the same thing. Their interfaces are set aside — URL, binding, A2A
 * version and tenant — and their signatures with them, since a signature covers the interfaces.
 * Everything else the reading holds must be equal; a field the reading does not name counts for
 * nothing.
 */
export function sameCard(a: AgentCard, b: AgentCard): boolean {
  return canonical(a) === canonical(b);
}

/** A read card in A2A 1.0's JSON with its interfaces and signatures out, every key in order. */
function canonical(card: AgentCard): string {
  const json = AgentCard.toJSON({...card, supportedInterfaces: [], signatures: []});
  return JSON.stringify(sorted(json));
}

function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))
      .map(([key, child]) => [key, sorted(child)]),
  );
}
