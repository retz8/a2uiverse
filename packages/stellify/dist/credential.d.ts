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
export declare function requiresSignIn(card: CardSecurity): boolean;
export type CredentialHeaders = {
    ok: true;
    headers: Record<string, string>;
} | {
    ok: false;
    finding: string;
};
export declare const UNSUPPORTED_SCHEME = "the card\u2019s sign-in scheme is not supported here: a credential rides as a header, for OAuth with the authorization-code flow, OpenID Connect, http bearer, or apiKey in a header";
/** The header the secret rides in, for the first usable alternative of the card's `security`. */
export declare function credentialHeaders(card: CardSecurity, secret: string): CredentialHeaders;
