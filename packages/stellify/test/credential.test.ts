/** The credential's header, chosen from the card as the vault chooses it (task-13.4 decision 5). */
import {describe, expect, test} from 'vitest';
import {asksSignIn, readCard} from '@a2uiverse/card';
import {credentialHeaders} from '../src/credential.js';

/** A card written for A2A 0.3 carrying `signIn`, read as the preview reads it. */
const legacy = (signIn: {securitySchemes?: object; security?: object[]}) =>
  readCard({
    name: 'Star Agent',
    description: 'an agent for tests',
    version: '0.1.0',
    url: 'http://127.0.0.1:1',
    capabilities: {},
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: [],
    ...signIn,
  });

/** The same in A2A 1.0's shape. */
const current = (signIn: {securitySchemes?: object; securityRequirements?: object[]}) =>
  readCard({
    name: 'Star Agent',
    description: 'an agent for tests',
    version: '0.1.0',
    supportedInterfaces: [
      {url: 'http://127.0.0.1:1', protocolBinding: 'JSONRPC', protocolVersion: '1.0'},
    ],
    ...signIn,
  });

const oauth = legacy({
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
});

describe('a card that asks for sign-in', () => {
  test('no requirement, or an empty alternative, asks nothing', () => {
    expect(asksSignIn(legacy({}))).toBe(false);
    expect(asksSignIn(legacy({security: []}))).toBe(false);
    expect(asksSignIn(legacy({security: [{signIn: ['read']}, {}]}))).toBe(false);
  });

  test('every alternative naming a scheme requires sign-in', () => {
    expect(asksSignIn(oauth)).toBe(true);
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
        legacy({
          securitySchemes: {
            oidc: {type: 'openIdConnect', openIdConnectUrl: 'https://a/.well-known'},
          },
          security: [{oidc: []}],
        }),
        'tok',
      ),
    ).toEqual({ok: true, headers: {Authorization: 'Bearer tok'}});
    expect(
      credentialHeaders(
        legacy({securitySchemes: {t: {type: 'http', scheme: 'Bearer'}}, security: [{t: []}]}),
        'tok',
      ),
    ).toEqual({ok: true, headers: {Authorization: 'Bearer tok'}});
  });

  test('apiKey in a header rides as that header', () => {
    expect(
      credentialHeaders(
        legacy({
          securitySchemes: {k: {type: 'apiKey', in: 'header', name: 'X-Shop-Key'}},
          security: [{k: []}],
        }),
        'tok',
      ),
    ).toEqual({ok: true, headers: {'X-Shop-Key': 'tok'}});
  });

  test('the first usable alternative in the card’s order; one naming two schemes is skipped', () => {
    expect(
      credentialHeaders(
        legacy({
          securitySchemes: {
            k: {type: 'apiKey', in: 'header', name: 'X-Key'},
            t: {type: 'http', scheme: 'bearer'},
          },
          security: [{k: [], t: []}, {t: []}, {k: []}],
        }),
        'tok',
      ),
    ).toEqual({ok: true, headers: {Authorization: 'Bearer tok'}});
  });

  test('a card whose alternatives name no supported scheme is refused with the vault’s words', () => {
    const result = credentialHeaders(
      legacy({
        securitySchemes: {k: {type: 'apiKey', in: 'query', name: 'key'}},
        security: [{k: []}],
      }),
      'tok',
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.finding).toMatch(/sign-in.*not supported here/);
  });

  test('a card in A2A 1.0’s shape: the code flow and a key in a header ride; the device-code flow does not', () => {
    const flow = (name: string) => ({
      oauth2SecurityScheme: {
        flows: {[name]: {tokenUrl: 'https://a/token', scopes: {read: ''}}},
      },
    });
    expect(
      credentialHeaders(
        current({
          securitySchemes: {signIn: flow('authorizationCode')},
          securityRequirements: [{schemes: {signIn: {list: ['read']}}}],
        }),
        'tok',
      ),
    ).toEqual({ok: true, headers: {Authorization: 'Bearer tok'}});
    expect(
      credentialHeaders(
        current({
          securitySchemes: {
            k: {apiKeySecurityScheme: {location: 'header', name: 'X-Shop-Key'}},
          },
          securityRequirements: [{schemes: {k: {list: []}}}],
        }),
        'tok',
      ),
    ).toEqual({ok: true, headers: {'X-Shop-Key': 'tok'}});
    expect(
      credentialHeaders(
        current({
          securitySchemes: {signIn: flow('deviceCode')},
          securityRequirements: [{schemes: {signIn: {list: ['read']}}}],
        }),
        'tok',
      ).ok,
    ).toBe(false);
  });
});
