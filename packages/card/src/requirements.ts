/**
 * What a read card asks of a caller (SPEC §8): its sign-in requirements as an OR of ANDs, each
 * alternative a scheme's name on the card to the scopes asked of it.
 */
import type {AgentCard} from '@a2a-js/sdk';

/** One alternative of a card's sign-in requirements: a scheme's name to the scopes it asks. */
export type SignInAlternative = Record<string, string[]>;

/** The card's sign-in requirements, in the card's order; none for a card asking nothing. */
export function signInAlternatives(card: AgentCard): SignInAlternative[] {
  return (card.securityRequirements ?? []).map(requirement =>
    Object.fromEntries(
      Object.entries(requirement.schemes ?? {}).map(([name, scopes]) => [
        name,
        [...(scopes?.list ?? [])],
      ]),
    ),
  );
}

/**
 * Whether the card asks for sign-in: requirements none of whose alternatives is empty. With no
 * requirement, or with an empty alternative, nothing is needed.
 */
export function asksSignIn(card: AgentCard): boolean {
  const alternatives = signInAlternatives(card);
  return (
    alternatives.length > 0 &&
    alternatives.every(alternative => Object.keys(alternative).length > 0)
  );
}
