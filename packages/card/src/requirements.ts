/**
 * What a read card asks of a caller (SPEC §8): its sign-in requirements as an OR of ANDs, each
 * alternative a scheme's name on the card to the scopes asked of it, and the order the platform
 * follows them in.
 */
import type {AgentCard, SecurityScheme} from '@a2a-js/sdk';

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

/**
 * How a scheme signs a person in, where it is a flow the platform signs in with: by redirect —
 * OAuth's authorization-code flow, or OpenID Connect — or by a code given on the app's own page,
 * OAuth's device-code flow (task-20.6).
 */
export type SignInFlow = 'redirect' | 'deviceCode';

export function signInFlow(scheme: SecurityScheme | undefined): SignInFlow | undefined {
  const declared = scheme?.scheme;
  if (declared?.$case === 'openIdConnectSecurityScheme') return 'redirect';
  if (declared?.$case !== 'oauth2SecurityScheme') return undefined;
  const flow = declared.value.flows?.flow?.$case;
  return flow === 'authorizationCode'
    ? 'redirect'
    : flow === 'deviceCode'
      ? 'deviceCode'
      : undefined;
}

/**
 * Alternatives in the order the platform follows them (task-20.6 decision 1): the card's, but a
 * sign-in by redirect goes ahead of the device-code flow — each device-code alternative listed
 * before the last redirect alternative moves to just after it. Nothing else moves, a pasted key or
 * token included. Each reader hands the alternatives it can follow, with how each signs in.
 */
export function redirectFirst<T>(
  alternatives: readonly T[],
  flowOf: (alternative: T) => SignInFlow | undefined,
): T[] {
  const last = alternatives.findLastIndex(alternative => flowOf(alternative) === 'redirect');
  if (last < 0) return [...alternatives];
  const isDeviceCode = (alternative: T) => flowOf(alternative) === 'deviceCode';
  return [
    ...alternatives.slice(0, last + 1).filter(alternative => !isDeviceCode(alternative)),
    ...alternatives.slice(0, last).filter(isDeviceCode),
    ...alternatives.slice(last + 1),
  ];
}
