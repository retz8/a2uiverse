/** The credential's header, chosen from the card as the vault chooses it (task-13.4 decision 5). */
import {describe, expect, test} from 'vitest';
import {credentialHeaders, requiresSignIn} from '../src/credential.js';

const oauth = {
  securitySchemes: {
    signIn: {
      type: 'oauth2',
      flows: {
        authorizationCode: {
          authorizationUrl: 'https://a/authorize',
          tokenUrl: 'https://a/token',
          scopes: {read: ''},
        },
      },
    },
  },
  security: [{signIn: ['read']}],
};

describe('requiresSignIn', () => {
  test('no security, an empty list, or an empty alternative asks nothing', () => {
    expect(requiresSignIn({})).toBe(false);
    expect(requiresSignIn({security: []})).toBe(false);
    expect(requiresSignIn({security: [{signIn: ['read']}, {}]})).toBe(false);
  });

  test('every alternative naming a scheme requires sign-in', () => {
    expect(requiresSignIn(oauth)).toBe(true);
  });
});

describe('credentialHeaders', () => {
  test('oauth2, openIdConnect and http bearer ride as a bearer Authorization header', () => {
    expect(credentialHeaders(oauth, 'tok')).toEqual({
      ok: true,
      headers: {Authorization: 'Bearer tok'},
    });
    expect(
      credentialHeaders(
        {
          securitySchemes: {
            oidc: {type: 'openIdConnect', openIdConnectUrl: 'https://a/.well-known'},
          },
          security: [{oidc: []}],
        },
        'tok',
      ),
    ).toEqual({ok: true, headers: {Authorization: 'Bearer tok'}});
    expect(
      credentialHeaders(
        {securitySchemes: {t: {type: 'http', scheme: 'Bearer'}}, security: [{t: []}]},
        'tok',
      ),
    ).toEqual({ok: true, headers: {Authorization: 'Bearer tok'}});
  });

  test('apiKey in a header rides as that header', () => {
    expect(
      credentialHeaders(
        {
          securitySchemes: {k: {type: 'apiKey', in: 'header', name: 'X-Shop-Key'}},
          security: [{k: []}],
        },
        'tok',
      ),
    ).toEqual({ok: true, headers: {'X-Shop-Key': 'tok'}});
  });

  test('the first usable alternative in the card’s order; one naming two schemes is skipped', () => {
    expect(
      credentialHeaders(
        {
          securitySchemes: {
            k: {type: 'apiKey', in: 'header', name: 'X-Key'},
            t: {type: 'http', scheme: 'bearer'},
          },
          security: [{k: [], t: []}, {t: []}, {k: []}],
        },
        'tok',
      ),
    ).toEqual({ok: true, headers: {Authorization: 'Bearer tok'}});
  });

  test('a card whose alternatives name no supported scheme is refused with the vault’s words', () => {
    const result = credentialHeaders(
      {securitySchemes: {k: {type: 'apiKey', in: 'query', name: 'key'}}, security: [{k: []}]},
      'tok',
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.finding).toMatch(/sign-in.*not supported here/);
  });
});
