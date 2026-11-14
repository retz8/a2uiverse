/** What a read card asks of a caller (SPEC §8). */
import type {AgentCard} from '@a2a-js/sdk';
import {describe, expect, test} from 'vitest';
import {readCard} from './readCard.js';
import {
  asksSignIn,
  redirectFirst,
  signInAlternatives,
  signInFlow,
  type SignInFlow,
} from './requirements.js';
import {fixture} from './trackedCards.js';

const asking = (...securityRequirements: AgentCard['securityRequirements']): AgentCard => ({
  ...readCard(fixture('javascript-1.0.json')),
  securityRequirements,
});

describe('signInAlternatives', () => {
  test('each alternative as a scheme’s name to the scopes asked of it, in the card’s order', () => {
    const card = asking(
      {schemes: {signIn: {list: ['read', 'write']}}},
      {schemes: {key: {list: []}, other: {list: ['x']}}},
    );
    expect(signInAlternatives(card)).toEqual([
      {signIn: ['read', 'write']},
      {key: [], other: ['x']},
    ]);
  });

  test('a card asking nothing has none', () => {
    expect(signInAlternatives(asking())).toEqual([]);
  });
});

describe('asksSignIn', () => {
  test('a card with no requirement asks nothing', () => {
    expect(asksSignIn(asking())).toBe(false);
  });

  test('a card whose every alternative names a scheme asks for sign-in', () => {
    expect(asksSignIn(asking({schemes: {key: {list: []}}}))).toBe(true);
  });

  test('an empty alternative means nothing is needed', () => {
    expect(asksSignIn(asking({schemes: {key: {list: []}}}, {schemes: {}}))).toBe(false);
  });

  test('a card written for A2A 0.3 asks what its `security` asks', () => {
    expect(asksSignIn(readCard(fixture('python-as-0.3.json')))).toBe(true);
  });
});

describe('signInFlow', () => {
  const scheme = (json: object) =>
    readCard({
      name: 'Shop',
      supportedInterfaces: [
        {url: 'http://127.0.0.1:1', protocolBinding: 'JSONRPC', protocolVersion: '1.0'},
      ],
      securitySchemes: {s: json},
    }).securitySchemes.s;
  const oauth = (flow: string) =>
    scheme({oauth2SecurityScheme: {flows: {[flow]: {tokenUrl: 't'}}}});

  test('the authorization-code flow and OpenID Connect sign in by redirect; the device-code flow by a code', () => {
    expect(signInFlow(oauth('authorizationCode'))).toBe('redirect');
    expect(signInFlow(scheme({openIdConnectSecurityScheme: {openIdConnectUrl: 'u'}}))).toBe(
      'redirect',
    );
    expect(signInFlow(oauth('deviceCode'))).toBe('deviceCode');
  });

  test('every other scheme and flow is neither', () => {
    expect(signInFlow(oauth('clientCredentials'))).toBeUndefined();
    expect(
      signInFlow(scheme({apiKeySecurityScheme: {location: 'header', name: 'X'}})),
    ).toBeUndefined();
    expect(signInFlow(undefined)).toBeUndefined();
  });
});

describe('redirectFirst (task-20.6 decision 1)', () => {
  const order = (...flows: (SignInFlow | 'key')[]) =>
    redirectFirst(
      flows.map((flow, i) => `${flow}${i}`),
      name => (name.startsWith('key') ? undefined : (name.replace(/\d+$/, '') as SignInFlow)),
    );

  test('a device-code alternative ahead of a redirect one moves to just after the last of them', () => {
    expect(order('deviceCode', 'redirect')).toEqual(['redirect1', 'deviceCode0']);
    expect(order('deviceCode', 'key', 'redirect', 'key')).toEqual([
      'key1',
      'redirect2',
      'deviceCode0',
      'key3',
    ]);
    expect(order('deviceCode', 'redirect', 'deviceCode', 'redirect')).toEqual([
      'redirect1',
      'redirect3',
      'deviceCode0',
      'deviceCode2',
    ]);
  });

  test('with no redirect alternative, or the device code after it, nothing moves', () => {
    expect(order('deviceCode', 'key')).toEqual(['deviceCode0', 'key1']);
    expect(order('key', 'deviceCode')).toEqual(['key0', 'deviceCode1']);
    expect(order('redirect', 'key', 'deviceCode')).toEqual(['redirect0', 'key1', 'deviceCode2']);
  });
});
