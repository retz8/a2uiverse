/**
 * Which of a card's declared schemes the vault can sign in with (task-12.5 decision 4), and what
 * a card asks for. A credential travels only as an HTTP header (phase-12 decision 4): OAuth with
 * the authorization-code flow and OpenID Connect against a server the vault can register with;
 * `http` bearer and `apiKey` in a header, through the token page. Anything else is not supported
 * here. A card's sign-in requirements are an OR of ANDs; one alternative naming only supported
 * schemes makes it usable, and the first such, in the card's order, is followed. The card is read
 * in A2A 1.0's shape, whichever A2A version it was written in (task-20.3 decision 1).
 */
import type {AgentCard, SecurityScheme} from '@a2a-js/sdk';
import {signInAlternatives} from '@a2uiverse/card';
import type {CredentialKind} from './store.js';

/** A scheme the vault can sign in with, read off the card. */
export type SupportedScheme =
  | {
      key: string;
      kind: 'oauth';
      /** Where the server's metadata is read: the scheme's own URL, or the well-known address. */
      metadataUrl: string;
      openId: boolean;
      /** The scope words, from the card's `scopes` map; none for OpenID Connect. */
      words: Record<string, string>;
    }
  | {
      key: string;
      kind: Exclude<CredentialKind, 'oauth'>;
      /** For `apiKey`: the header the key rides. */
      header?: string;
      description?: string;
    };

/** One alternative of the card's sign-in requirements: a scheme key → the scope keys it asks. */
export type Requirement = Record<string, string[]>;

/** What the card asks, as the vault reads it. */
export type CardNeed =
  | {kind: 'none'}
  /** No alternative names only schemes the vault supports. */
  | {kind: 'unsupported'}
  /** The usable alternatives, in the card's order, each with its one scheme. */
  | {kind: 'signIn'; alternatives: {requirement: Requirement; scheme: SupportedScheme}[]};

/** The scheme read, or undefined when the vault cannot sign in with it. */
export function supportedScheme(
  key: string,
  scheme: SecurityScheme | undefined,
): SupportedScheme | undefined {
  const declared = scheme?.scheme;
  switch (declared?.$case) {
    case 'oauth2SecurityScheme': {
      // The authorization-code flow alone; the device-code flow waits for 20.6.
      const flow = declared.value.flows?.flow;
      if (flow?.$case !== 'authorizationCode') return undefined;
      const metadataUrl =
        declared.value.oauth2MetadataUrl ||
        wellKnown(flow.value.authorizationUrl, 'oauth-authorization-server');
      if (!metadataUrl) return undefined;
      return {key, kind: 'oauth', metadataUrl, openId: false, words: {...flow.value.scopes}};
    }
    case 'openIdConnectSecurityScheme':
      return {
        key,
        kind: 'oauth',
        metadataUrl: declared.value.openIdConnectUrl,
        openId: true,
        words: {},
      };
    case 'httpAuthSecurityScheme':
      return declared.value.scheme.toLowerCase() === 'bearer'
        ? {
            key,
            kind: 'bearer',
            ...(declared.value.description ? {description: declared.value.description} : {}),
          }
        : undefined;
    case 'apiKeySecurityScheme':
      return declared.value.location === 'header' && declared.value.name
        ? {
            key,
            kind: 'apiKey',
            header: declared.value.name,
            ...(declared.value.description ? {description: declared.value.description} : {}),
          }
        : undefined;
    default:
      return undefined;
  }
}

/**
 * What the card asks. No requirement, or an empty alternative, asks nothing. An alternative is
 * usable when it names exactly one scheme the vault supports; one naming two at once — a
 * credential of each on one request — is beyond the vault.
 */
export function cardNeed(card: AgentCard | null | undefined): CardNeed {
  const security = card ? signInAlternatives(card) : [];
  if (security.length === 0) return {kind: 'none'};
  if (security.some(requirement => Object.keys(requirement).length === 0)) return {kind: 'none'};
  const alternatives: {requirement: Requirement; scheme: SupportedScheme}[] = [];
  for (const requirement of security) {
    const keys = Object.keys(requirement);
    if (keys.length !== 1) continue;
    const key = keys[0]!;
    const scheme = supportedScheme(key, card?.securitySchemes[key]);
    if (scheme) alternatives.push({requirement: {[key]: [...(requirement[key] ?? [])]}, scheme});
  }
  return alternatives.length === 0 ? {kind: 'unsupported'} : {kind: 'signIn', alternatives};
}

/** The scheme the card declares under `key`, when the vault supports it. */
export function schemeOf(
  card: AgentCard | null | undefined,
  key: string,
): SupportedScheme | undefined {
  return supportedScheme(key, card?.securitySchemes[key]);
}

/** The scope keys in the card's words for the scheme; a key with no words is left out. */
export function wordsFor(scheme: SupportedScheme, keys: readonly string[]): string[] {
  if (scheme.kind !== 'oauth') return [];
  return keys.flatMap(key => (scheme.words[key] ? [scheme.words[key]] : []));
}

/** RFC 8414's well-known address at the origin of `url`. */
function wellKnown(url: string | undefined, name: string): string | undefined {
  if (!url) return undefined;
  try {
    return `${new URL(url).origin}/.well-known/${name}`;
  } catch {
    return undefined;
  }
}
