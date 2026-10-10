/**
 * The credential's header (SPEC §8; task-13.4 decision 5): chosen from the card exactly as the
 * orchestrator's vault chooses it. The first usable alternative of the card's `security`, in the
 * card's order, names the scheme — an alternative naming two schemes at once is beyond it. OAuth
 * with the authorization-code flow, OpenID Connect and `http` bearer ride as a bearer
 * `Authorization` header; `apiKey` in a header rides as that named header. Anything else is not
 * supported here. The publisher never names the header.
 */

/** The part of a card the credential reads; structural, as the sdk reads cards. */
export interface CardSecurity {
  securitySchemes?: Record<string, unknown>;
  security?: Record<string, string[]>[];
}

/** Whether the card requires sign-in: an OR of ANDs, an empty requirement meaning none. */
export function requiresSignIn(card: CardSecurity): boolean {
  const security = card.security;
  return (
    Array.isArray(security) &&
    security.length > 0 &&
    security.every(
      alternative =>
        typeof alternative === 'object' &&
        alternative !== null &&
        Object.keys(alternative).length > 0,
    )
  );
}

export type CredentialHeaders =
  {ok: true; headers: Record<string, string>} | {ok: false; finding: string};

export const UNSUPPORTED_SCHEME =
  'the card’s sign-in scheme is not supported here: a credential rides as a header, for OAuth with the authorization-code flow, OpenID Connect, http bearer, or apiKey in a header';

/** The header the secret rides in, for the first usable alternative of the card's `security`. */
export function credentialHeaders(card: CardSecurity, secret: string): CredentialHeaders {
  for (const alternative of card.security ?? []) {
    const keys = Object.keys(alternative);
    if (keys.length !== 1) continue;
    const headers = headersFor(card.securitySchemes?.[keys[0]!], secret);
    if (headers) return {ok: true, headers};
  }
  return {ok: false, finding: UNSUPPORTED_SCHEME};
}

function headersFor(scheme: unknown, secret: string): Record<string, string> | undefined {
  if (typeof scheme !== 'object' || scheme === null) return undefined;
  const s = scheme as Record<string, unknown>;
  const bearer = {Authorization: `Bearer ${secret}`};
  switch (s.type) {
    case 'oauth2': {
      const flows = s.flows as Record<string, unknown> | undefined;
      return flows?.authorizationCode ? bearer : undefined;
    }
    case 'openIdConnect':
      return bearer;
    case 'http':
      return typeof s.scheme === 'string' && s.scheme.toLowerCase() === 'bearer'
        ? bearer
        : undefined;
    case 'apiKey':
      return s.in === 'header' && typeof s.name === 'string' && s.name !== ''
        ? {[s.name]: secret}
        : undefined;
    default:
      return undefined;
  }
}
