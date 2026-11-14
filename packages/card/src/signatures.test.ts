/**
 * The check of a signed card (task-20.7 decisions 1 to 7, 9, 10; invariant 1): cards signed by the
 * Python A2A SDK's own signers, 1.3.0 and 0.3.26, as fixtures, each failure decision 9 names, a
 * key set that does not answer, several signatures of which one passes, and cards signed here
 * over the A2A SDK's own canonical form.
 */
import {AgentCard, canonicalizeAgentCard, generateAgentCardSignature} from '@a2a-js/sdk';
import {describe, expect, test} from 'vitest';
import {readCard} from './readCard.js';
import {
  checkSignatures,
  isLocalMachine,
  passedNote,
  UnconfirmedCardError,
  type CheckSignaturesOptions,
} from './signatures.js';
import {keySetOf, signServed, testSigner} from './testing/signer.js';
import {fixture} from './trackedCards.js';

/** The origin the Python fixtures were captured on: their key sets name it. */
const ORIGIN = 'http://127.0.0.1:18731';
const CARD_URL = `${ORIGIN}/es256/agent-card.json`;
const KEY_SET_URL = `${ORIGIN}/.well-known/jwks.json`;
const KEY_SET = fixture('python-1.0-signed-key-set.json');
const signed = (variant: string) => fixture(`python-1.0-signed-${variant}.json`) as object;

/** A fetch answering each URL from `documents`, recording what it was asked. */
function documentsFetch(documents: Record<string, unknown | Response>) {
  const asked: {url: string; init: RequestInit | undefined}[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    asked.push({url, init});
    const document = documents[url];
    if (document === undefined) throw new Error(`connect ECONNREFUSED ${url}`);
    if (document instanceof Response) return document;
    return new Response(JSON.stringify(document), {headers: {'content-type': 'application/json'}});
  };
  return {fetchImpl, asked};
}

function options(
  documents: Record<string, unknown | Response> = {[KEY_SET_URL]: KEY_SET},
  overrides: Partial<CheckSignaturesOptions> = {},
): CheckSignaturesOptions & {asked: ReturnType<typeof documentsFetch>['asked']} {
  const {fetchImpl, asked} = documentsFetch(documents);
  return {
    cardUrl: CARD_URL,
    signal: AbortSignal.timeout(5000),
    timeoutMs: 5000,
    fetchImpl,
    asked,
    ...overrides,
  };
}

async function refusal(served: object, opts = options()): Promise<string> {
  const failure = await checkSignatures(served, opts).then(
    () => undefined,
    (err: unknown) => err,
  );
  expect(failure).toBeInstanceOf(UnconfirmedCardError);
  return (failure as Error).message;
}

describe('a card signed by the Python A2A SDK 1.3.0 (task-20.7 decision 19)', () => {
  test.each([
    ['es256', 'es-1', 'ES256'],
    ['rs256', 'rs-1', 'RS256'],
    ['eddsa', 'ed-1', 'EdDSA'],
  ])(
    '%s passes, against the key it names in the key set on the card URL’s origin',
    async (variant, kid, alg) => {
      const opts = options();
      expect(await checkSignatures(signed(variant), opts)).toEqual({kid, jku: KEY_SET_URL, alg});
      expect(opts.asked.map(({url}) => url)).toEqual([KEY_SET_URL]);
    },
  );

  test('several signatures, one by a key no longer in the key set: one passing is enough (decision 9)', async () => {
    expect(await checkSignatures(signed('rotated'), options())).toEqual({
      kid: 'es-1',
      jku: KEY_SET_URL,
      alg: 'ES256',
    });
  });

  test('the key set is fetched once for the signatures that name it', async () => {
    const opts = options();
    await checkSignatures(signed('rotated'), opts);
    expect(opts.asked).toHaveLength(1);
  });

  test('any value of typ is taken (decision 3)', async () => {
    expect(await checkSignatures(signed('typ-jwt'), options())).toMatchObject({kid: 'es-1'});
  });

  test('a protected header that names no typ does not pass (decision 3)', async () => {
    expect(await refusal(signed('no-typ'))).toBe(
      "the card's signature did not pass: its protected header names no typ",
    );
  });

  test('a protected header that names no jku does not pass', async () => {
    expect(await refusal(signed('no-jku'))).toBe(
      "the card's signature did not pass: its protected header names no jku",
    );
  });

  test('kid and jku in the unprotected header alone are not read (decision 3)', async () => {
    const opts = options();
    expect(await refusal(signed('unprotected'), opts)).toBe(
      "the card's signature did not pass: its protected header names no kid",
    );
    expect(opts.asked).toEqual([]);
  });

  test('a key set on another origin is not fetched (decision 2)', async () => {
    const opts = options();
    expect(await refusal(signed('other-origin'), opts)).toBe(
      `the card's signature did not pass: its key set http://127.0.0.1:18732/.well-known/jwks.json is not on the card URL's origin, ${ORIGIN}`,
    );
    expect(opts.asked).toEqual([]);
  });

  test('a shared-secret algorithm does not pass (decision 4)', async () => {
    expect(await refusal(signed('hs256'))).toBe(
      "the card's signature did not pass: it is signed with HS256, which A2UIVerse does not take: it takes RS256, RS384, RS512, PS256, PS384, PS512, ES256, ES384, ES512 and EdDSA",
    );
  });

  test('a card changed after it was signed does not pass', async () => {
    const served = {...signed('es256'), description: 'a different agent'};
    expect(await refusal(served)).toBe(
      `the card's signature did not pass: it does not match the card, checked against key "es-1" at ${KEY_SET_URL}`,
    );
  });

  test('a field outside A2A 1.0’s schema is outside the signature, and the card passes (decision 7)', async () => {
    const served = {...signed('es256'), somethingElse: 'not in the schema'};
    expect(await checkSignatures(served, options())).toMatchObject({kid: 'es-1'});
  });

  test('a key no longer in the key set no longer passes (decision 2)', async () => {
    const without = {keys: (KEY_SET as {keys: {kid: string}[]}).keys.filter(k => k.kid !== 'es-1')};
    expect(await refusal(signed('es256'), options({[KEY_SET_URL]: without}))).toBe(
      `the card's signature did not pass: the key set at ${KEY_SET_URL} holds no key under kid "es-1" for ES256`,
    );
  });

  test('several signatures none of which passes: each one’s reason', async () => {
    const only = {keys: (KEY_SET as {keys: {kid: string}[]}).keys.filter(k => k.kid === 'rs-1')};
    expect(await refusal(signed('rotated'), options({[KEY_SET_URL]: only}))).toBe(
      `none of the card's 2 signatures passed: 1: the key set at ${KEY_SET_URL} holds no key under kid "es-0" for ES256; 2: the key set at ${KEY_SET_URL} holds no key under kid "es-1" for ES256`,
    );
  });

  test('a card from the A2A SDK’s in-memory form with sign-in schemes passes, checked over the card as served (decision 5)', async () => {
    // The fixture carries an OAuth scheme and an API key scheme, the case @a2a-js/sdk’s own
    // verifier fails when handed a card already read (issue 663).
    expect(
      Object.keys((signed('es256') as {securitySchemes: object}).securitySchemes),
    ).toHaveLength(2);
    expect(await checkSignatures(signed('es256'), options())).toMatchObject({kid: 'es-1'});
  });
});

describe('the key set’s fetch (task-20.7 decisions 2, 9, 10)', () => {
  test('it follows no redirect', async () => {
    const opts = options({
      [KEY_SET_URL]: new Response(null, {status: 302, headers: {location: `${ORIGIN}/other`}}),
    });
    expect(await refusal(signed('es256'), opts)).toBe(
      `the card's signature did not pass: the key set at ${KEY_SET_URL} answered with a redirect, which is not followed`,
    );
    expect(opts.asked[0]!.init?.redirect).toBe('manual');
  });

  test.each([
    [new Response('no', {status: 404}), `answered HTTP 404`],
    [new Response('not json', {status: 200}), `is not JSON`],
    [new Response('{"keys": "none"}', {status: 200}), `is no JSON Web Key Set`],
  ])('a key set that answers but is not one refuses the card', async (answer, words) => {
    expect(await refusal(signed('es256'), options({[KEY_SET_URL]: answer}))).toBe(
      `the card's signature did not pass: the key set at ${KEY_SET_URL} ${words}`,
    );
  });

  test('a key set that does not answer within the time limit is the card not answering, never a refusal', async () => {
    const controller = new AbortController();
    const fetchImpl: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
        setTimeout(() => controller.abort(), 20);
      });
    const failure = await checkSignatures(signed('es256'), {
      cardUrl: CARD_URL,
      signal: controller.signal,
      timeoutMs: 10_000,
      fetchImpl,
    }).catch((err: unknown) => err);
    expect(failure).not.toBeInstanceOf(UnconfirmedCardError);
    expect((failure as Error).message).toBe(
      `the key set at ${KEY_SET_URL} did not answer within 10 s`,
    );
  });

  test('a key set whose connection fails did not answer either', async () => {
    const failure = await checkSignatures(signed('es256'), options({})).catch(
      (err: unknown) => err,
    );
    expect(failure).not.toBeInstanceOf(UnconfirmedCardError);
    expect((failure as Error).message).toBe(
      `the key set at ${KEY_SET_URL} did not answer: connect ECONNREFUSED ${KEY_SET_URL}`,
    );
  });

  test('a key set that does not answer leaves a later signature that passes passing', async () => {
    const silent = await testSigner({kid: 'silent'});
    const answering = await testSigner({kid: 'answering'});
    const card = await signServed(
      await signServed(readyCard('https://shop.example'), silent, {
        jku: 'https://shop.example/silent.json',
      }),
      answering,
      {jku: 'https://shop.example/jwks.json'},
    );
    const opts = options(
      {'https://shop.example/jwks.json': keySetOf(answering)},
      {cardUrl: 'https://shop.example/.well-known/agent-card.json'},
    );
    expect(await checkSignatures(card, opts)).toMatchObject({kid: 'answering'});
    expect(opts.asked.map(({url}) => url)).toEqual([
      'https://shop.example/silent.json',
      'https://shop.example/jwks.json',
    ]);
  });
});

describe('the origin and https (task-20.7 decision 2)', () => {
  test('a key set over http off the local machine does not pass', async () => {
    const signer = await testSigner();
    const card = await signServed(readyCard('http://shop.example'), signer, {
      jku: 'http://shop.example/jwks.json',
    });
    const opts = options(
      {'http://shop.example/jwks.json': keySetOf(signer)},
      {cardUrl: 'http://shop.example/.well-known/agent-card.json'},
    );
    expect(await refusal(card, opts)).toBe(
      "the card's signature did not pass: its key set http://shop.example/jwks.json is not fetched over https",
    );
    expect(opts.asked).toEqual([]);
  });

  test('a key set over https on the card URL’s own origin passes', async () => {
    const signer = await testSigner({alg: 'PS256', kid: 'ps'});
    const card = await signServed(readyCard('https://shop.example'), signer, {
      jku: 'https://shop.example/keys/jwks.json',
    });
    const opts = options(
      {'https://shop.example/keys/jwks.json': keySetOf(signer)},
      {cardUrl: 'https://shop.example/.well-known/agent-card.json'},
    );
    expect(await checkSignatures(card, opts)).toEqual({
      kid: 'ps',
      jku: 'https://shop.example/keys/jwks.json',
      alg: 'PS256',
    });
  });

  test('the origin is scheme, host and port: another port is another origin', async () => {
    const signer = await testSigner();
    const card = await signServed(readyCard('https://shop.example'), signer, {
      jku: 'https://shop.example:8443/jwks.json',
    });
    expect(
      await refusal(
        card,
        options({}, {cardUrl: 'https://shop.example/.well-known/agent-card.json'}),
      ),
    ).toBe(
      "the card's signature did not pass: its key set https://shop.example:8443/jwks.json is not on the card URL's origin, https://shop.example",
    );
  });

  test.each(['localhost', '127.0.0.1', '::1', '[::1]'])('%s is the local machine', host => {
    expect(isLocalMachine(host)).toBe(true);
  });

  test('a host that only starts like one is not', () => {
    expect(isLocalMachine('localhost.example')).toBe(false);
  });
});

describe('cards taken as an unsigned card is (task-20.7 decisions 6, 8)', () => {
  test('an unsigned card: no key set fetched', async () => {
    const opts = options();
    expect(await checkSignatures(fixture('python-1.0.json') as object, opts)).toBeUndefined();
    expect(opts.asked).toEqual([]);
  });

  test('a card signed by the Python A2A SDK 0.3.26, written for A2A 0.3: kept and not judged', async () => {
    const opts = options();
    expect(
      await checkSignatures(fixture('python-0.3-signed.json') as object, opts),
    ).toBeUndefined();
    expect(opts.asked).toEqual([]);
  });

  test('a 1.0 card the Python A2A SDK 1.3.0 put in A2A 0.3’s shape, its 1.0 signature carried: not judged', async () => {
    const served = signed('as-0.3') as {signatures?: unknown[]};
    expect(served.signatures).toHaveLength(1);
    expect(await checkSignatures(served, options())).toBeUndefined();
  });

  test('a card whose signatures were removed is an unsigned card', async () => {
    const {signatures: _removed, ...unsigned} = signed('es256') as {signatures: unknown};
    expect(await checkSignatures(unsigned, options())).toBeUndefined();
  });
});

describe('the A2A SDK’s own signer (task-20.7 decision 5)', () => {
  test('a card signed by @a2a-js/sdk’s generateAgentCardSignature passes', async () => {
    const signer = await testSigner({alg: 'ES384', kid: 'js-1'});
    const jsSign = generateAgentCardSignature(signer.privateKey, {
      alg: 'ES384',
      kid: 'js-1',
      typ: 'JOSE',
      jku: 'https://shop.example/jwks.json',
    });
    const card = await jsSign(readyCard('https://shop.example') as unknown as AgentCard);
    expect(
      await checkSignatures(
        card,
        options(
          {'https://shop.example/jwks.json': keySetOf(signer)},
          {cardUrl: 'https://shop.example/card.json'},
        ),
      ),
    ).toEqual({kid: 'js-1', jku: 'https://shop.example/jwks.json', alg: 'ES384'});
  });
});

describe('invariant 1: nothing is read from a signed card that its signature does not cover', () => {
  test.each(['es256', 'rs256', 'eddsa', 'rotated', 'typ-jwt'])(
    'the reading of %s is the reading of its checked payload',
    variant => {
      const served = signed(variant);
      const payload = JSON.parse(canonicalizeAgentCard(served as AgentCard)) as object;
      expect({...readCard(served), signatures: []}).toEqual(readCard(payload));
    },
  );
});

test('the note a publisher reads of a pass', () => {
  expect(passedNote({kid: 'es-1', jku: KEY_SET_URL, alg: 'ES256'})).toBe(
    `the card's signature passed: key "es-1" (ES256) in the key set at ${KEY_SET_URL}`,
  );
});

/** A card in A2A 1.0's JSON served at `origin`. */
function readyCard(origin: string): object {
  return AgentCard.toJSON(
    AgentCard.fromJSON({
      name: 'Shop',
      description: 'a shop',
      version: '1.0.0',
      supportedInterfaces: [
        {url: `${origin}/a2a`, protocolBinding: 'JSONRPC', protocolVersion: '1.0'},
      ],
      skills: [{id: 'shop', name: 'Shop', description: 'shops', tags: []}],
    }),
  ) as object;
}
