/**
 * The card's one reading (task-20.3 decisions 1, 7, 8): a card as its agent served it, in the
 * shape of whichever A2A version it was written in, read into the A2A SDK's own `AgentCard` by
 * the A2A SDK's own two functions. Every process reads a card through here and nowhere else, so
 * what the A2A SDK's functions drop the platform drops, and what they refuse it refuses, but for
 * the A2A version of a 0.3 card's further interfaces (task-20.5 decision 7).
 */
import {AgentCard} from '@a2a-js/sdk';
import {isLegacyAgentCard, parseLegacyAgentCard} from '@a2a-js/sdk/compat/v0_3/client';

/**
 * A card as its agent served it, the form a card is kept in at rest. The type names no field: a
 * field is reached through {@link readCard}.
 */
export type ServedCard = object;

/**
 * The card read. Throws, in the words of a finding, for a thing that is not a card and for a
 * card the A2A SDK cannot read, the A2A SDK's own message then.
 */
export function readCard(served: unknown): AgentCard {
  if (typeof served !== 'object' || served === null || Array.isArray(served)) {
    throw new Error('not an agent card');
  }
  if (typeof (served as {name?: unknown}).name !== 'string') {
    throw new Error('not an agent card: no name');
  }
  return isLegacyAgentCard(served)
    ? atCardVersion(parseLegacyAgentCard(served))
    : AgentCard.fromJSON(served);
}

/**
 * A card written for A2A 0.3 names one A2A version, the agent's, and its `additionalInterfaces`
 * name none. The A2A SDK reads the card's own URL at the card's version and each further
 * interface at a fixed "0.3"; here every interface is at the version the card spells, as the
 * first one is.
 */
function atCardVersion(card: AgentCard): AgentCard {
  const version = card.supportedInterfaces[0]?.protocolVersion;
  if (version === undefined) return card;
  return {
    ...card,
    supportedInterfaces: card.supportedInterfaces.map(listed => ({
      ...listed,
      protocolVersion: version,
    })),
  };
}

/** Why a card does not read, as {@link readCard} says it; undefined for a card that reads. */
export function cardReadError(served: unknown): string | undefined {
  try {
    readCard(served);
    return undefined;
  } catch (err) {
    return (err as Error).message;
  }
}
