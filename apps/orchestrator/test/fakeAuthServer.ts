/**
 * An OAuth authorization server for the vault's tests (task-12.5 decision 13): standard OAuth as
 * the kit's sign-in serves it — RFC 8414 metadata, dynamic registration and client ID metadata
 * documents, the authorization code with S256 PKCE, rotating refresh tokens whose reuse ends the
 * sign-in, ES256 ID tokens, revocation. It signs in whichever account a test sets, approving at
 * once; it records what it issued so a test can search the journal for every secret.
 */
import {createHash, generateKeyPairSync, randomBytes, sign, type KeyObject} from 'node:crypto';
import {createServer, type Server} from 'node:http';
import express from 'express';

export interface FakeAccountClaims {
  sub: string;
  email?: string;
  preferred_username?: string;
  name?: string;
}

interface Grant {
  sub: string;
  clientId: string;
  scope: string[];
  ended: boolean;
}

export interface FakeAuthServer {
  url: string;
  /** The account the next sign-in approves as. */
  account: FakeAccountClaims;
  /** Access-token lifetime in seconds. */
  expiresIn: number;
  /** Whether the server advertises client ID metadata documents and dynamic registration. */
  documents: boolean;
  registration: boolean;
  /** Every secret it issued: codes, access and refresh tokens, ID tokens. */
  issued: string[];
  /** What it was asked: the authorization requests' parameters, the refreshes, the revocations. */
  authorizations: URLSearchParams[];
  refreshes: number;
  revoked: string[];
  registered: string[];
  /** The scopes an access token grants, or undefined when it is not live. */
  scopesOf(token: string): string[] | undefined;
  /** Ends every sign-in, so a refresh is refused. */
  endAll(): void;
  /**
   * The server lost its accounts: a hint naming none binds nothing, and the person signs in
   * under whatever account comes back.
   */
  forgets: boolean;
  close(): Promise<void>;
}

export async function startFakeAuthServer(
  options: {documents?: boolean; registration?: boolean; scopes?: string[]} = {},
): Promise<FakeAuthServer> {
  const {privateKey, publicKey} = generateKeyPairSync('ec', {namedCurve: 'P-256'});
  const kid = 'k1';
  const clients = new Map<string, string[]>();
  const codes = new Map<
    string,
    {clientId: string; redirectUri: string; challenge: string; grant: Grant; nonce?: string}
  >();
  const grants: Grant[] = [];
  const access = new Map<string, Grant>();
  const refresh = new Map<string, {grant: Grant; rotated: boolean}>();

  const server: Server = createServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('fake auth server: no port');
  const url = `http://127.0.0.1:${address.port}`;

  const fake: FakeAuthServer = {
    url,
    account: {sub: 'sub-ada', email: 'ada@example.com', name: 'Ada'},
    expiresIn: 3600,
    documents: options.documents ?? false,
    registration: options.registration ?? true,
    issued: [],
    authorizations: [],
    refreshes: 0,
    revoked: [],
    registered: [],
    scopesOf: token => {
      const grant = access.get(token);
      return grant && !grant.ended ? grant.scope : undefined;
    },
    endAll: () => grants.forEach(grant => (grant.ended = true)),
    forgets: false,
    close: () => new Promise<void>(resolve => server.close(() => resolve())),
  };
  const mint = (bytes = 24) => {
    const value = randomBytes(bytes).toString('base64url');
    fake.issued.push(value);
    return value;
  };

  const app = express();
  app.use(express.urlencoded({extended: false}));
  app.use(express.json());
  app.get('/.well-known/oauth-authorization-server', (_req, res) => {
    res.json({
      issuer: url,
      authorization_endpoint: `${url}/authorize`,
      token_endpoint: `${url}/token`,
      ...(fake.registration ? {registration_endpoint: `${url}/register`} : {}),
      revocation_endpoint: `${url}/revoke`,
      jwks_uri: `${url}/jwks`,
      scopes_supported: ['openid', ...(options.scopes ?? ['read', 'write'])],
      code_challenge_methods_supported: ['S256'],
      ...(fake.documents ? {client_id_metadata_document_supported: true} : {}),
    });
  });
  app.get('/jwks', (_req, res) => {
    res.json({keys: [{...publicKey.export({format: 'jwk'}), kid, use: 'sig', alg: 'ES256'}]});
  });
  app.post('/register', (req, res) => {
    const body = req.body as {redirect_uris?: string[]; token_endpoint_auth_method?: string};
    if (body.token_endpoint_auth_method !== 'none' || !body.redirect_uris?.length) {
      res.status(400).json({error: 'invalid_client_metadata'});
      return;
    }
    const clientId = `client-${randomBytes(6).toString('hex')}`;
    clients.set(clientId, body.redirect_uris);
    fake.registered.push(clientId);
    res.status(201).json({client_id: clientId, token_endpoint_auth_method: 'none'});
  });

  const redirectsOf = async (clientId: string): Promise<string[] | undefined> => {
    if (clients.has(clientId)) return clients.get(clientId);
    if (!fake.documents || !clientId.startsWith('http')) return undefined;
    const response = await fetch(clientId);
    const document = (await response.json()) as {client_id?: string; redirect_uris?: string[]};
    return document.client_id === clientId ? document.redirect_uris : undefined;
  };

  app.get('/authorize', async (req, res) => {
    const query = new URLSearchParams(req.url.split('?')[1] ?? '');
    fake.authorizations.push(query);
    const clientId = query.get('client_id') ?? '';
    const redirectUri = query.get('redirect_uri') ?? '';
    const redirects = await redirectsOf(clientId);
    if (!redirects?.includes(redirectUri)) {
      res.status(400).send('bad client or redirect');
      return;
    }
    const back = new URL(redirectUri);
    back.searchParams.set('state', query.get('state') ?? '');
    if (query.get('code_challenge_method') !== 'S256' || !query.get('code_challenge')) {
      back.searchParams.set('error', 'invalid_request');
      res.redirect(302, back.toString());
      return;
    }
    const hint = query.get('login_hint');
    if (hint && hint !== fake.account.sub && !fake.forgets) {
      back.searchParams.set('error', 'access_denied');
      res.redirect(302, back.toString());
      return;
    }
    const asked = (query.get('scope') ?? '').split(' ').filter(Boolean);
    // The new sign-in carries what the account already granted this client.
    const earlier = grants
      .filter(g => g.sub === fake.account.sub && g.clientId === clientId && !g.ended)
      .flatMap(g => g.scope);
    const grant: Grant = {
      sub: fake.account.sub,
      clientId,
      scope: [...new Set([...earlier, ...asked])],
      ended: false,
    };
    const code = mint();
    codes.set(code, {
      clientId,
      redirectUri,
      challenge: query.get('code_challenge')!,
      grant,
      ...(query.get('nonce') ? {nonce: query.get('nonce')!} : {}),
    });
    back.searchParams.set('code', code);
    res.redirect(302, back.toString());
  });

  const idToken = (grant: Grant, nonce: string | undefined) => {
    const head = Buffer.from(JSON.stringify({alg: 'ES256', kid})).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const {sub, ...display} = fake.account;
    void sub;
    const body = Buffer.from(
      JSON.stringify({
        iss: url,
        aud: grant.clientId,
        sub: grant.sub,
        iat: now,
        exp: now + 3600,
        ...(nonce ? {nonce} : {}),
        ...display,
      }),
    ).toString('base64url');
    const signature = sign('sha256', Buffer.from(`${head}.${body}`), {
      key: privateKey as KeyObject,
      dsaEncoding: 'ieee-p1363',
    }).toString('base64url');
    const token = `${head}.${body}.${signature}`;
    fake.issued.push(token);
    return token;
  };

  const tokens = (grant: Grant, nonce?: string, withId = false) => {
    const accessToken = mint();
    const refreshToken = mint(32);
    access.set(accessToken, grant);
    refresh.set(refreshToken, {grant, rotated: false});
    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: fake.expiresIn,
      refresh_token: refreshToken,
      scope: grant.scope.join(' '),
      ...(withId ? {id_token: idToken(grant, nonce)} : {}),
    };
  };

  app.post('/token', (req, res) => {
    const body = req.body as Record<string, string>;
    if (body.grant_type === 'authorization_code') {
      const code = codes.get(body.code ?? '');
      codes.delete(body.code ?? '');
      const verified =
        code &&
        code.clientId === body.client_id &&
        code.redirectUri === body.redirect_uri &&
        createHash('sha256')
          .update(body.code_verifier ?? '')
          .digest('base64url') === code.challenge;
      if (!verified) {
        res.status(400).json({error: 'invalid_grant'});
        return;
      }
      for (const g of grants) {
        if (g.sub === code.grant.sub && g.clientId === code.grant.clientId) g.ended = true;
      }
      grants.push(code.grant);
      res.json(tokens(code.grant, code.nonce, code.grant.scope.includes('openid')));
      return;
    }
    if (body.grant_type === 'refresh_token') {
      fake.refreshes += 1;
      const held = refresh.get(body.refresh_token ?? '');
      if (!held || held.grant.ended || held.grant.clientId !== body.client_id) {
        res.status(400).json({error: 'invalid_grant'});
        return;
      }
      if (held.rotated) {
        held.grant.ended = true;
        res.status(400).json({error: 'invalid_grant'});
        return;
      }
      held.rotated = true;
      res.json(tokens(held.grant));
      return;
    }
    res.status(400).json({error: 'unsupported_grant_type'});
  });

  app.post('/revoke', (req, res) => {
    const token = (req.body as Record<string, string>).token ?? '';
    fake.revoked.push(token);
    const grant = refresh.get(token)?.grant ?? access.get(token);
    if (grant) grant.ended = true;
    res.status(200).json({});
  });

  server.on('request', app);
  return fake;
}
