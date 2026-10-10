import assert from 'node:assert/strict';
import {test} from 'node:test';

import {ROSTER} from './dev-roster.mjs';
import {previewCredential, requiresSignIn} from './launch-preview.mjs';

const OAUTH_CARD = {
  securitySchemes: {
    signIn: {
      type: 'oauth2',
      oauth2MetadataUrl: 'http://localhost:11001/.well-known/oauth-authorization-server',
      flows: {authorizationCode: {}},
    },
  },
  security: [{signIn: ['issues.read', 'repo.read']}],
};

const KEY_CARD = {
  securitySchemes: {key: {type: 'apiKey', in: 'header', name: 'X-Shop-Key'}},
  security: [{key: []}],
};

/**
 * A kit agent's sign-in front door as a scripted fetch: the metadata, the registration, the
 * authorize address answering with the code when it names a fake account the agent holds, the
 * exchange. Every request is recorded.
 */
function kitAgent({accounts = ['retz8']} = {}) {
  const seen = [];
  const json = (status, body) => new Response(JSON.stringify(body), {status});
  const fetchImpl = async (input, init = {}) => {
    const url = new URL(String(input));
    seen.push({url, init});
    switch (url.pathname) {
      case '/.well-known/oauth-authorization-server':
        return json(200, {
          authorization_endpoint: 'http://localhost:11001/oauth/authorize',
          token_endpoint: 'http://localhost:11001/oauth/token',
          registration_endpoint: 'http://localhost:11001/oauth/register',
        });
      case '/oauth/register':
        return json(201, {client_id: 'client-1'});
      case '/oauth/authorize': {
        if (!accounts.includes(url.searchParams.get('fake_account'))) {
          return json(400, {error: 'invalid_request'});
        }
        const back = new URL(url.searchParams.get('redirect_uri'));
        back.searchParams.set('code', 'code-1');
        return new Response(null, {status: 302, headers: {location: String(back)}});
      }
      case '/oauth/token':
        return json(200, {access_token: 'token-for-retz8'});
      default:
        return json(404, {});
    }
  };
  return {seen, fetchImpl};
}

test('a card requires sign-in when every alternative names a scheme; an empty one means none', () => {
  assert.equal(requiresSignIn(OAUTH_CARD), true);
  assert.equal(requiresSignIn(KEY_CARD), true);
  assert.equal(requiresSignIn({}), false);
  assert.equal(requiresSignIn({security: []}), false);
  assert.equal(requiresSignIn({security: [{signIn: []}, {}]}), false);
});

test("a kit app's preview signs in through the non-interactive entry as its roster account, for the card's first alternative's scopes (task-13.6 decision 8)", async () => {
  const agent = kitAgent();
  const got = await previewCredential(
    OAUTH_CARD,
    {id: 'github', previewAs: 'retz8'},
    {
      fetchImpl: agent.fetchImpl,
    },
  );
  assert.deepEqual(got, {credential: 'token-for-retz8'});
  const authorize = agent.seen.find(r => r.url.pathname === '/oauth/authorize').url;
  assert.equal(authorize.searchParams.get('fake_account'), 'retz8');
  assert.equal(authorize.searchParams.get('scope'), 'issues.read repo.read');
  assert.equal(authorize.searchParams.get('code_challenge_method'), 'S256');
  const exchange = agent.seen.find(r => r.url.pathname === '/oauth/token');
  assert.equal(new URLSearchParams(exchange.init.body).get('code'), 'code-1');
});

test('a sign-in the agent refuses leaves the app out with the reason', async () => {
  const agent = kitAgent({accounts: ['someone-else']});
  const got = await previewCredential(
    OAUTH_CARD,
    {id: 'github', previewAs: 'retz8'},
    {
      fetchImpl: agent.fetchImpl,
    },
  );
  assert.match(got.reason, /could not sign in as retz8: the sign-in page answered 400/);
});

test("an app on an API key previews with its roster entry's demo key", async () => {
  assert.deepEqual(await previewCredential(KEY_CARD, {id: 'shop-b', previewKey: 'demo'}), {
    credential: 'demo',
  });
});

test('a roster entry naming no preview credential, or a scheme the launcher cannot drive, is a reason', async () => {
  assert.match((await previewCredential(OAUTH_CARD, {id: 'github'})).reason, /no previewAs/);
  assert.match((await previewCredential(KEY_CARD, {id: 'shop-b'})).reason, /no previewKey/);
  const basic = {
    securitySchemes: {basic: {type: 'http', scheme: 'basic'}},
    security: [{basic: []}],
  };
  assert.match((await previewCredential(basic, {id: 'x'})).reason, /cannot sign a preview in/);
});

test('every roster preview credential names one account or one key', () => {
  for (const entry of ROSTER) {
    assert.ok(!(entry.previewAs && entry.previewKey), `${entry.id} names both`);
    for (const field of ['previewAs', 'previewKey']) {
      if (field in entry) assert.equal(typeof entry[field], 'string');
    }
  }
});
