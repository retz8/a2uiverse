/**
 * How an agent is reached (task-20.3 decisions 10, 11, 15; task-20.5 decision 1): which of a
 * card's interfaces the platform speaks, in the card's own order, and what a publisher reads when
 * it speaks none. The dial walks the spoken interfaces from the first, and the A2A SDK dials the
 * one interface it is handed.
 */
import type {AgentCard, AgentInterface} from '@a2a-js/sdk';

/** The bindings the platform speaks, as A2A names them: the three standard bindings. */
export const SPOKEN_BINDINGS: readonly string[] = ['JSONRPC', 'HTTP+JSON', 'GRPC'];

/** The A2A version an interface naming none is on, as the A2A SDK reads it. */
const ABSENT_A2A_VERSION = '0.3';

/** The A2A versions the platform speaks, in a publisher's words. */
const SPOKEN_VERSIONS_WORDS = 'A2A 0.3 and 1.x';

/** The A2A version an interface is on: its own, or 0.3 when it names none. */
export function a2aVersionOf(agentInterface: AgentInterface): string {
  const version = agentInterface.protocolVersion?.trim() ?? '';
  return version === '' ? ABSENT_A2A_VERSION : version;
}

/** A version from 0.3 up to but not including 1.0, or 1.x. */
function isSpokenVersion(version: string): boolean {
  const [majorText, minorText = '0'] = version.split('.');
  if (!/^\d+$/.test(majorText ?? '') || !/^\d+$/.test(minorText)) return false;
  const major = Number(majorText);
  const minor = Number(minorText);
  return major === 1 || (major === 0 && minor >= 3);
}

/** A binding on the list, compared as the A2A SDK compares bindings: whatever its case. */
function isSpokenBinding(binding: string): boolean {
  return SPOKEN_BINDINGS.some(spoken => spoken.toUpperCase() === binding.toUpperCase());
}

/**
 * The interfaces of a read card the platform speaks, in the card's order. An agent is reachable
 * when the list is not empty, and a dial walks it from the first entry. An interface naming no URL
 * is spoken by nobody: a card written for A2A 0.3 with no `url` reads to one.
 */
export function spokenInterfaces(card: AgentCard): AgentInterface[] {
  return (card.supportedInterfaces ?? []).filter(
    agentInterface =>
      Boolean(agentInterface.url) &&
      isSpokenBinding(agentInterface.protocolBinding ?? '') &&
      isSpokenVersion(a2aVersionOf(agentInterface)),
  );
}

/**
 * The card the A2A SDK is handed to dial from: the read card listing the one interface taken, so
 * the card's order holds inside one binding too, where the A2A SDK alone takes an A2A 1.0
 * interface over a 0.3 one. The dial hands it a gRPC interface at the address it reads.
 */
export function cardToDial(card: AgentCard, taken: AgentInterface): AgentCard {
  return {...card, supportedInterfaces: [taken]};
}

/**
 * What a publisher reads of a card listing no interface the platform speaks: what the card lists,
 * its bindings spelled as it spells them, and what the platform speaks.
 */
export function noInterfaceFinding(card: AgentCard): string {
  const listed = card.supportedInterfaces ?? [];
  if (listed.length === 0) return 'the card lists no interface';
  const lists = listed.map(agentInterface => {
    const version = agentInterface.protocolVersion?.trim() ?? '';
    const binding = agentInterface.protocolBinding || 'no binding';
    const at = version === '' ? `${binding} with no A2A version` : `${binding} at A2A ${version}`;
    return agentInterface.url ? at : `${at} with no URL`;
  });
  return `the card lists no interface A2UIVerse speaks: it lists ${lists.join(' and ')}; A2UIVerse speaks ${listWords(SPOKEN_BINDINGS)} at ${SPOKEN_VERSIONS_WORDS}`;
}

/** `a`, `a and b`, `a, b and c`. */
function listWords(items: readonly string[]): string {
  return items.length < 2
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
