/**
 * The card's one reading (task-20.3 decisions 1, 7, 8): a card as its agent served it, in the
 * shape of whichever A2A version it was written in, read into the A2A SDK's own `AgentCard` by
 * the A2A SDK's own two functions. Every process reads a card through here and nowhere else, so
 * what the A2A SDK's functions drop the platform drops, and what they refuse it refuses, but for
 * the A2A version of a 0.3 card's further interfaces (task-20.5 decision 7) and a device-code flow
 * on a 0.3 card (task-20.6 decision 12).
 */
import {AgentCard, SecurityScheme} from '@a2a-js/sdk';
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
  return isLegacyAgentCard(served) ? readLegacy(served) : AgentCard.fromJSON(served);
}

/**
 * A card written for A2A 0.3. A2A 0.3 names four OAuth flows and the device-code flow is not one
 * of them; the A2A SDK's 0.3 reading fails the whole card when a scheme holds none of the four.
 * A scheme whose only flow is `deviceCode` is read here instead, in A2A 1.0's field names, the
 * rest of the card by the A2A SDK. A scheme holding one of the four beside it reads with that one.
 */
function readLegacy(served: object): AgentCard {
  const schemes = (served as {securitySchemes?: unknown}).securitySchemes;
  const deviceCode = deviceCodeSchemes(schemes);
  if (deviceCode.size === 0) return atCardVersion(parseLegacyAgentCard(served));
  const declared = schemes as Record<string, unknown>;
  const others = Object.fromEntries(
    Object.entries(declared).filter(([name]) => !deviceCode.has(name)),
  );
  const card = atCardVersion(parseLegacyAgentCard({...served, securitySchemes: others}));
  return {
    ...card,
    securitySchemes: Object.fromEntries(
      Object.keys(declared).flatMap(name => {
        const scheme = deviceCode.get(name) ?? card.securitySchemes[name];
        return scheme ? [[name, scheme]] : [];
      }),
    ),
  };
}

/** The A2A 0.3 flows the A2A SDK's 0.3 reading takes, as it tests for them. */
const V0_3_FLOWS = ['authorizationCode', 'clientCredentials', 'implicit', 'password'];

/** A 0.3 card's OAuth schemes whose one flow is `deviceCode`, each read in A2A 1.0's shape. */
function deviceCodeSchemes(schemes: unknown): Map<string, SecurityScheme> {
  const read = new Map<string, SecurityScheme>();
  if (!isRecord(schemes)) return read;
  for (const [name, scheme] of Object.entries(schemes)) {
    if (!isRecord(scheme) || scheme.type !== 'oauth2' || !isRecord(scheme.flows)) continue;
    const flows = scheme.flows;
    if (V0_3_FLOWS.some(flow => Boolean(flows[flow])) || !isRecord(flows.deviceCode)) continue;
    read.set(
      name,
      SecurityScheme.fromJSON({
        oauth2SecurityScheme: {
          description: scheme.description,
          flows: {deviceCode: flows.deviceCode},
          oauth2MetadataUrl: scheme.oauth2MetadataUrl,
        },
      }),
    );
  }
  return read;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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
