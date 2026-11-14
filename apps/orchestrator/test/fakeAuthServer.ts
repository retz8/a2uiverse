/**
 * An OAuth authorization server for the vault's tests (task-12.5 decision 13): standard OAuth as
 * the kit's sign-in serves it — RFC 8414 metadata, dynamic registration and client ID metadata
 * documents, the authorization code with S256 PKCE, rotating refresh tokens whose reuse ends the
 * sign-in, ES256 ID tokens, revocation — and the device authorization grant of RFC 8628
 * (task-20.6 decision 16). It signs in whichever account a test sets: a redirect approving at
 * once, a device code after the asks a test sets, ending as the test sets. It records what it
 * issued so a test can search the journal for every secret.
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
  /** The revocation endpoint cannot be reached: it answers 503 and ends nothing. */
  revocationFails: boolean;
  /** Whether the metadata names an authorization endpoint: none at a device-code-only server. */
  redirect: boolean;
  /** The grants the metadata lists as `grant_types_supported`; none listed when undefined. */
  grantTypes: string[] | undefined;
  /** The device authorization requests' parameters, in order, and the user codes answered. */
  deviceAuthorizations: URLSearchParams[];
  userCodes: string[];
  /** How many asks of the token endpoint a device code has had, over every code. */
  devicePolls: number;
  /** The device answer's lifetime and interval in seconds; no interval named when undefined. */
  deviceExpiresIn: number;
  deviceInterval: number | undefined;
  /** Whether the device answer carries `verification_uri_complete`. */
  complete: boolean;
  /** The verification address the device answer names. */
  verificationUri: string;
  /** For each new device code: its first asks answer `slow_down`, then `authorization_pending`. */
  deviceSlowDowns: number;
  devicePendings: number;
  /** Then the person approves, refuses, or the code runs out. */
  deviceEnd: 'approve' | 'deny' | 'expire';
  close(): Promise<void>;
}

export const DEVICE_CODE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';

interface DeviceCode {
  clientId: string;
  scope: string[];
  hint: string | undefined;
  slowDowns: number;
  pendings: number;
  end: FakeAuthServer['deviceEnd'];
  done: boolean;
}

export async function startFakeAuthServer(
  options: {documents?: boolean; registration?: boolean; scopes?: string[]} = {},
): Promise<FakeAuthServer> {
  const {privateKey, publicKey} = generateKeyPairSync('ec', {namedCurve: 'P-256'});
  const kid = 'k1';
  const clients = new Map<string, string[]>();
  /** The grants each client registered or declared in its document. */
  const clientGrants = new Map<string, string[]>();
  const deviceCodes = new Map<string, DeviceCode>();
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
    revocationFails: false,
    redirect: true,
    grantTypes: undefined,
    deviceAuthorizations: [],
    userCodes: [],
    devicePolls: 0,
    deviceExpiresIn: 600,
    deviceInterval: 5,
    complete: true,
    verificationUri: `${url}/activate`,
    deviceSlowDowns: 0,
    devicePendings: 1,
    deviceEnd: 'approve',
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
      ...(fake.redirect ? {authorization_endpoint: `${url}/authorize`} : {}),
      token_endpoint: `${url}/token`,
      device_authorization_endpoint: `${url}/device`,
      ...(fake.registration ? {registration_endpoint: `${url}/register`} : {}),
      revocation_endpoint: `${url}/revoke`,
      jwks_uri: `${url}/jwks`,
      scopes_supported: ['openid', ...(options.scopes ?? ['read', 'write'])],
      ...(fake.grantTypes ? {grant_types_supported: fake.grantTypes} : {}),
      code_challenge_methods_supported: ['S256'],
      ...(fake.documents ? {client_id_metadata_document_supported: true} : {}),
    });
  });
  app.get('/jwks', (_req, res) => {
    res.json({keys: [{...publicKey.export({format: 'jwk'}), kid, use: 'sig', alg: 'ES256'}]});
  });
  /** What each registration asked for, in order. */
  const registrations: Record<string, unknown>[] = [];
  app.post('/register', (req, res) => {
    const body = req.body as {
      redirect_uris?: string[];
      token_endpoint_auth_method?: string;
      grant_types?: string[];
    };
    if (body.token_endpoint_auth_method !== 'none' || !body.redirect_uris?.length) {
      res.status(400).json({error: 'invalid_client_metadata'});
      return;
    }
    registrations.push(body);
    const clientId = `client-${randomBytes(6).toString('hex')}`;
    clients.set(clientId, body.redirect_uris);
    clientGrants.set(clientId, body.grant_types ?? ['authorization_code']);
    fake.registered.push(clientId);
    res.status(201).json({client_id: clientId, token_endpoint_auth_method: 'none'});
  });
  app.get('/registrations', (_req, res) => void res.json(registrations));

  const redirectsOf = async (clientId: string): Promise<string[] | undefined> => {
    if (clients.has(clientId)) return clients.get(clientId);
    if (!fake.documents || !clientId.startsWith('http')) return undefined;
    const response = await fetch(clientId);
    const document = (await response.json()) as {
      client_id?: string;
      redirect_uris?: string[];
      grant_types?: string[];
    };
    if (document.client_id !== clientId) return undefined;
    clientGrants.set(clientId, document.grant_types ?? ['authorization_code']);
    return document.redirect_uris;
  };

  /** Whether the client may use the device-code grant: known, and declaring the grant. */
  const takesDeviceCode = async (clientId: string): Promise<boolean | undefined> => {
    if (!(await redirectsOf(clientId))) return undefined;
    return (clientGrants.get(clientId) ?? []).includes(DEVICE_CODE_GRANT);
  };

  // RFC 8628 §3.1: the device authorization request, from a public client.
  app.post('/device', async (req, res) => {
    const body = req.body as Record<string, string>;
    fake.deviceAuthorizations.push(new URLSearchParams(body));
    const takes = await takesDeviceCode(body.client_id ?? '');
    if (takes === undefined) {
      res.status(401).json({error: 'invalid_client'});
      return;
    }
    if (!takes) {
      res.status(400).json({error: 'unauthorized_client'});
      return;
    }
    const deviceCode = mint();
    const userCode =
      `${randomBytes(2).toString('hex')}-${randomBytes(2).toString('hex')}`.toUpperCase();
    // Not a secret, but shown on the code page alone: searched for beside the secrets.
    fake.issued.push(userCode);
    fake.userCodes.push(userCode);
    deviceCodes.set(deviceCode, {
      clientId: body.client_id!,
      scope: (body.scope ?? '').split(' ').filter(Boolean),
      hint: body.login_hint,
      slowDowns: fake.deviceSlowDowns,
      pendings: fake.devicePendings,
      end: fake.deviceEnd,
      done: false,
    });
    res.json({
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: fake.verificationUri,
      ...(fake.complete
        ? {verification_uri_complete: `${fake.verificationUri}?user_code=${userCode}`}
        : {}),
      expires_in: fake.deviceExpiresIn,
      ...(fake.deviceInterval === undefined ? {} : {interval: fake.deviceInterval}),
    });
  });

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

  app.post('/token', async (req, res) => {
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
    if (body.grant_type === DEVICE_CODE_GRANT) {
      // RFC 8628 §3.4–3.5: pending, slow down, then the end the test set.
      fake.devicePolls += 1;
      const device = deviceCodes.get(body.device_code ?? '');
      if (!device || device.done || device.clientId !== body.client_id) {
        res.status(400).json({error: 'invalid_grant'});
        return;
      }
      if (!(await takesDeviceCode(device.clientId))) {
        res.status(400).json({error: 'unauthorized_client'});
        return;
      }
      if (device.slowDowns > 0) {
        device.slowDowns -= 1;
        res.status(400).json({error: 'slow_down'});
        return;
      }
      if (device.pendings > 0) {
        device.pendings -= 1;
        res.status(400).json({error: 'authorization_pending'});
        return;
      }
      device.done = true;
      // A hint naming another account than the one signing in: the person is refused there.
      const refused = device.hint && device.hint !== fake.account.sub && !fake.forgets;
      if (device.end === 'deny' || refused) {
        res.status(400).json({error: 'access_denied'});
        return;
      }
      if (device.end === 'expire') {
        res.status(400).json({error: 'expired_token'});
        return;
      }
      const earlier = grants
        .filter(g => g.sub === fake.account.sub && g.clientId === device.clientId && !g.ended)
        .flatMap(g => g.scope);
      const grant: Grant = {
        sub: fake.account.sub,
        clientId: device.clientId,
        scope: [...new Set([...earlier, ...device.scope])],
        ended: false,
      };
      for (const g of grants) {
        if (g.sub === grant.sub && g.clientId === grant.clientId) g.ended = true;
      }
      grants.push(grant);
      res.json(tokens(grant, undefined, grant.scope.includes('openid')));
      return;
    }
    res.status(400).json({error: 'unsupported_grant_type'});
  });

  app.post('/revoke', (req, res) => {
    if (fake.revocationFails) {
      res.status(503).json({});
      return;
    }
    const token = (req.body as Record<string, string>).token ?? '';
    fake.revoked.push(token);
    const grant = refresh.get(token)?.grant ?? access.get(token);
    if (grant) grant.ended = true;
    res.status(200).json({});
  });

  server.on('request', app);
  return fake;
}
