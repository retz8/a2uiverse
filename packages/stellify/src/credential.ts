/**
 * The credential's header (SPEC §8; task-13.4 decision 5): chosen from the card as read, exactly
 * as the orchestrator's vault chooses it. The first usable alternative of the card's sign-in
 * requirements, in the card's order, names the scheme — an alternative naming two schemes at once
 * is beyond it. OAuth with the authorization-code flow, OpenID Connect and `http` bearer ride as
 * a bearer `Authorization` header; `apiKey` in a header rides as that named header. Anything else
 * is not supported here. The publisher never names the header.
 */
import type {AgentCard, SecurityScheme} from '@a2a-js/sdk';
import {signInAlternatives} from '@a2uiverse/card';

export type CredentialHeaders =
  {ok: true; headers: Record<string, string>} | {ok: false; finding: string};

export const UNSUPPORTED_SCHEME =
  'the card’s sign-in scheme is not supported here: a credential rides as a header, for OAuth with the authorization-code flow, OpenID Connect, http bearer, or apiKey in a header';

/** The header the secret rides in, for the first usable alternative of the card's requirements. */
export function credentialHeaders(card: AgentCard, secret: string): CredentialHeaders {
  for (const alternative of signInAlternatives(card)) {
    const keys = Object.keys(alternative);
    if (keys.length !== 1) continue;
    const headers = headersFor(card.securitySchemes[keys[0]!], secret);
    if (headers) return {ok: true, headers};
  }
  return {ok: false, finding: UNSUPPORTED_SCHEME};
}

function headersFor(
  scheme: SecurityScheme | undefined,
  secret: string,
): Record<string, string> | undefined {
  const declared = scheme?.scheme;
  const bearer = {Authorization: `Bearer ${secret}`};
  switch (declared?.$case) {
    case 'oauth2SecurityScheme':
      return declared.value.flows?.flow?.$case === 'authorizationCode' ? bearer : undefined;
    case 'openIdConnectSecurityScheme':
      return bearer;
    case 'httpAuthSecurityScheme':
      return declared.value.scheme.toLowerCase() === 'bearer' ? bearer : undefined;
    case 'apiKeySecurityScheme':
      return declared.value.location === 'header' && declared.value.name !== ''
        ? {[declared.value.name]: secret}
        : undefined;
    default:
      return undefined;
  }
}
