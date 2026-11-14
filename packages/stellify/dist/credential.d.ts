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
import type { AgentCard } from '@a2a-js/sdk';
export type CredentialHeaders = {
    ok: true;
    headers: Record<string, string>;
} | {
    ok: false;
    finding: string;
};
export declare const UNSUPPORTED_SCHEME = "the card\u2019s sign-in scheme is not supported here: a credential rides as a header, for OAuth with the authorization-code flow or the device-code flow, OpenID Connect, http bearer, or apiKey in a header";
/** The header the secret rides in, for the first usable alternative of the card's requirements. */
export declare function credentialHeaders(card: AgentCard, secret: string): CredentialHeaders;
