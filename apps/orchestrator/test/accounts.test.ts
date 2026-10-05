import type {AgentCard} from '@a2a-js/sdk';
import {describe, expect, test} from 'vitest';
import {asksSignIn, NO_ACCOUNTS, Sources, type AccountStore} from '../src/accounts/accounts.js';
import {cardFor, testRegistry} from './registryFixture.js';

/** A card asking for sign-in: one OAuth scheme, required. */
const signingIn = (agentUrl: string, name: string): AgentCard => ({
  ...cardFor(agentUrl, {name}),
  securitySchemes: {
    oauth: {
      type: 'oauth2',
      flows: {
        authorizationCode: {
          authorizationUrl: `${agentUrl}/authorize`,
          tokenUrl: `${agentUrl}/token`,
          scopes: {read: 'Read your issues'},
        },
      },
    },
  },
  security: [{oauth: ['read']}],
});

/** The vault's accounts, held in memory: two for Gmail, one for Linear. */
const held: AccountStore = {
  accountsOf: appId =>
    appId === 'gmail'
      ? [
          {n: 1, label: 'alice@example.com'},
          {n: 2, label: 'bob@example.com'},
        ]
      : appId === 'linear'
        ? [{n: 3, label: 'alice'}]
        : [],
  nextAccount: appId => (appId === 'linear' ? 4 : 1),
};

async function sources(accounts: AccountStore) {
  const {registry} = await testRegistry([
    {id: 'github', card: cardFor('http://127.0.0.1:1/github', {name: 'GitHub'})},
    {id: 'gmail', card: cardFor('http://127.0.0.1:1/gmail', {name: 'Gmail'})},
    {id: 'linear', card: signingIn('http://127.0.0.1:1/linear', 'Linear')},
  ]);
  return new Sources(registry, accounts);
}

describe('the accounts seam (task-12.4 decision 3)', () => {
  test('an app whose card asks no sign-in is its bare app id', async () => {
    expect((await sources(NO_ACCOUNTS)).of('github')).toEqual([{source: 'github'}]);
  });

  test('an app that asks sign-in with no account held is named for the account its sign-in will create', async () => {
    expect((await sources(NO_ACCOUNTS)).of('linear')).toEqual([{source: 'linear.1'}]);
  });

  test('an app with accounts held is one source per account, each with its label', async () => {
    const two = await sources(held);
    expect(two.of('gmail')).toEqual([
      {source: 'gmail.1', label: 'alice@example.com'},
      {source: 'gmail.2', label: 'bob@example.com'},
    ]);
    expect(two.of('linear')).toEqual([{source: 'linear.3', label: 'alice'}]);
  });

  test('the account is named only when its app has more than one (phase-12 decision 22)', async () => {
    const two = await sources(held);
    expect(two.account('gmail.2')).toBe('bob@example.com');
    expect(two.name('gmail.2')).toBe('Gmail · bob@example.com');
    expect(two.account('linear.3')).toBeUndefined();
    expect(two.name('linear.3')).toBe('Linear');
    expect(two.name('github')).toBe('GitHub');
    expect(two.displayName('gmail.1')).toBe('Gmail');
    expect(two.appOf('gmail.1')).toBe('gmail');
    expect(two.appOf('github')).toBe('github');
  });

  test('a card asks sign-in when every alternative of its security names a scheme', () => {
    const card = cardFor('http://127.0.0.1:1/x');
    expect(asksSignIn(card)).toBe(false);
    expect(asksSignIn({...card, security: []})).toBe(false);
    expect(asksSignIn({...card, security: [{oauth: []}]})).toBe(true);
    expect(asksSignIn({...card, security: [{oauth: ['read']}, {}]})).toBe(false);
    expect(asksSignIn(undefined)).toBe(false);
  });
});
