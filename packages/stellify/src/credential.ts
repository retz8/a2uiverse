/**
 * The credential's header (SPEC §8; task-13.4 decision 5): chosen from the card as read, exactly
 * as the orchestrator's vault chooses it. The first usable alternative of the card's sign-in
 * requirements, in the card's order — a sign-in by redirect ahead of the device-code flow
 * (task-20.6 decision 1) — names the scheme; an alternative naming two schemes at once is beyond
 * it. OAuth with the authorization-code flow or the device-code flow, OpenID Connect and `http`
 * bearer ride as a bearer `Authorization` header; `apiKey` in a header rides as that named header.
 * Anything else is not supported here. Stellify runs no sign-in: the publisher's own token is the
 * secret. The publisher never names the header.
 */
import type {AgentCard, SecurityScheme} from '@a2a-js/sdk';
import {redirectFirst, signInAlternatives, signInFlow} from '@a2uiverse/card';

export type CredentialHeaders =
  {ok: true; headers: Record<string, string>} | {ok: false; finding: string};

export const UNSUPPORTED_SCHEME =
  'the card’s sign-in scheme is not supported here: a credential rides as a header, for OAuth with the authorization-code flow or the device-code flow, OpenID Connect, http bearer, or apiKey in a header';

/** The header the secret rides in, for the first usable alternative of the card's requirements. */
export function credentialHeaders(card: AgentCard, secret: string): CredentialHeaders {
  const usable = signInAlternatives(card).flatMap(alternative => {
    const keys = Object.keys(alternative);
    if (keys.length !== 1) return [];
    const scheme = card.securitySchemes[keys[0]!];
    const headers = headersFor(scheme, secret);
    return headers ? [{headers, flow: signInFlow(scheme)}] : [];
  });
  const [first] = redirectFirst(usable, ({flow}) => flow);
  return first ? {ok: true, headers: first.headers} : {ok: false, finding: UNSUPPORTED_SCHEME};
}

function headersFor(
  scheme: SecurityScheme | undefined,
  secret: string,
): Record<string, string> | undefined {
  const declared = scheme?.scheme;
  const bearer = {Authorization: `Bearer ${secret}`};
  switch (declared?.$case) {
    case 'oauth2SecurityScheme':
      return signInFlow(scheme) ? bearer : undefined;
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
