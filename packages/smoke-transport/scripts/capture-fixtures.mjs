/**
 * Captures the wires under `test/fixtures/` from a scratch agent on Python's `a2a-sdk` 1.x,
 * `serve_a2ui.py` (task-20.4 decision 15): each request is sent by the A2A SDK's client, as the
 * platform sends one, to the agent's A2A 1.0 interface and to its 0.3 layer, and saved with the
 * answer as the server wrote it. Run from the package, after a build of the workspace:
 *
 *   node scripts/capture-fixtures.mjs
 *
 * It needs `uv` on the PATH.
 */
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Role} from '@a2a-js/sdk';
import {
  ClientFactory,
  JsonRpcTransportFactory,
  ServiceParameters,
  withA2AExtensions,
} from '@a2a-js/sdk/client';
import {cardToDial, fetchLiveCard, readCard, spokenInterfaces} from '@a2uiverse/card';
import {
  A2UI_CLIENT_CAPABILITIES_KEY,
  A2UI_EXTENSION_URIS,
  a2uiPart,
  clientCapabilities,
} from '@a2uiverse/sdk';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, '..', 'test', 'fixtures');
const PORT = 18741;
const cardUrl = `http://127.0.0.1:${PORT}/.well-known/agent-card.json`;
const PYTHON_SDK = 'a2a-sdk[http-server]==1.3.0';
const CATALOG = 'https://example.com/catalogs/fake/v1/catalog.json';
/** How long a stream may stay silent before the capture leaves it as held open. */
const HELD_AFTER_MS = 3000;

/** What the scratch agent is asked for, each the first text part of one request. */
const ASKED = [
  'one',
  'list',
  'media-type',
  'artifact',
  'auth-1.0',
  'auth-0.3',
  'auth-held',
  'echo',
];

/** The press the `echo` request carries, in the platform's one spelling of an A2UI part. */
const PRESS = a2uiPart({
  version: 'v0.9',
  action: {
    name: 'open',
    surfaceId: 's1',
    sourceComponentId: 'root',
    timestamp: '2026-11-13T00:00:00.000Z',
    context: {},
  },
});

/** The headers of a request that name the protocol: the rest say nothing of the wire. */
const NAMED = ['a2a-version', 'a2a-extensions', 'x-a2a-extensions', 'accept', 'content-type'];

const text = value => ({
  content: {$case: 'text', value},
  metadata: undefined,
  filename: '',
  mediaType: '',
});

/** One request to the agent's first interface, sent by the A2A SDK's client; what rode the wire. */
async function capture(served, asked) {
  const card = readCard(served);
  const [taken] = spokenInterfaces(card);
  let request;
  let recording;
  const fetchImpl = async (input, init) => {
    const headers = new Headers(init.headers);
    request = {
      headers: Object.fromEntries(NAMED.filter(n => headers.has(n)).map(n => [n, headers.get(n)])),
      body: JSON.parse(init.body),
    };
    const response = await fetch(input, init);
    const [forClient, forRecord] = response.body.tee();
    recording = (async () => {
      const decoder = new TextDecoder();
      let body = '';
      try {
        for await (const chunk of forRecord) body += decoder.decode(chunk, {stream: true});
        return {body, closedByAgent: true};
      } catch {
        return {body, closedByAgent: false};
      }
    })();
    return new Response(forClient, {status: response.status, headers: response.headers});
  };
  const factory = new ClientFactory({
    transports: [new JsonRpcTransportFactory({fetchImpl, legacyCompat: {enabled: true}})],
    cardResolver: {resolve: () => Promise.reject(new Error('the capture fetches no card'))},
  });
  const client = await factory.createFromAgentCard(cardToDial(card, taken));
  const left = new AbortController();
  let silence = setTimeout(() => left.abort(), HELD_AFTER_MS);
  try {
    const stream = client.sendMessageStream(
      {
        tenant: '',
        message: {
          messageId: randomUUID(),
          contextId: '',
          taskId: '',
          role: Role.ROLE_USER,
          parts: asked === 'echo' ? [text(asked), PRESS] : [text(asked)],
          metadata: {[A2UI_CLIENT_CAPABILITIES_KEY]: clientCapabilities([CATALOG])},
          extensions: [],
          referenceTaskIds: [],
        },
        configuration: undefined,
        metadata: undefined,
      },
      {
        signal: left.signal,
        serviceParameters: ServiceParameters.create(
          withA2AExtensions(...Object.values(A2UI_EXTENSION_URIS)),
        ),
      },
    );
    for await (const _event of stream) {
      clearTimeout(silence);
      silence = setTimeout(() => left.abort(), HELD_AFTER_MS);
    }
  } catch (err) {
    if (!left.signal.aborted) throw err;
  } finally {
    clearTimeout(silence);
  }
  const {body, closedByAgent} = await recording;
  return {
    agent: `Python ${PYTHON_SDK}`,
    asked,
    a2aVersion: taken.protocolVersion,
    card: served,
    request,
    response: {status: 200, contentType: 'text/event-stream', body, closedByAgent},
  };
}

/** The scratch agent listing JSON-RPC at the A2A versions of `order`, for as long as `use` runs. */
async function withScratchAgent(order, use) {
  const child = spawn(
    'uv',
    [
      'run',
      '--no-project',
      '--with',
      PYTHON_SDK,
      '--with',
      'uvicorn',
      join(here, 'serve_a2ui.py'),
      String(PORT),
      order,
    ],
    {stdio: ['ignore', 'inherit', 'inherit']},
  );
  try {
    let served;
    for (let attempt = 0; served === undefined; attempt++) {
      try {
        served = await fetchLiveCard(cardUrl, {timeoutMs: 2000});
      } catch (err) {
        if (attempt === 60) throw err;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    await use(served);
  } finally {
    child.kill();
    await new Promise(resolve => child.once('exit', resolve));
  }
}

await mkdir(fixtures, {recursive: true});
for (const order of ['1.0,0.3', '0.3,1.0']) {
  await withScratchAgent(order, async served => {
    for (const asked of ASKED) {
      const wire = await capture(served, asked);
      const name = `python-${wire.a2aVersion}-${asked}.json`;
      await writeFile(join(fixtures, name), `${JSON.stringify(wire, null, 2)}\n`);
      console.log(
        `captured ${name}${wire.response.closedByAgent ? '' : ' (the agent held its stream open)'}`,
      );
    }
  });
}
