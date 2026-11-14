/**
 * Captures the wires under `test/fixtures/` from a scratch agent on Python's `a2a-sdk` 1.x,
 * `serve_a2ui.py` (task-20.4 decision 15; task-20.5 decision 15): each request is sent through the
 * platform's dial, by the A2A SDK's client, over JSON-RPC and HTTP+JSON, to the agent's A2A 1.0
 * interface and to its 0.3 layer, and saved with the answer as the server wrote it. Its answers
 * over gRPC are then asked again on both A2A versions, through the smoke runner, and printed: a
 * gRPC stream is not replayed in the suites. Run from the package, after a build of the
 * workspace, naming the bindings to run, or none for all three:
 *
 *   node scripts/capture-fixtures.mjs [JSONRPC] [HTTP+JSON] [GRPC]
 *
 * It needs `uv` on the PATH.
 */
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Role} from '@a2a-js/sdk';
import {ServiceParameters, withA2AExtensions} from '@a2a-js/sdk/client';
import {fetchLiveCard, readCard} from '@a2uiverse/card';
import {
  A2UI_CLIENT_CAPABILITIES_KEY,
  A2UI_EXTENSION_URIS,
  a2uiPart,
  clientCapabilities,
} from '@a2uiverse/sdk';
import {a2aSmokeRunner, Dialer} from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, '..', 'test', 'fixtures');
const PORT = 18741;
const GRPC_PORT = 18742;
const cardUrl = `http://127.0.0.1:${PORT}/.well-known/agent-card.json`;
const PYTHON_SDK = 'a2a-sdk[http-server,grpc]==1.3.0';
/** The six paths, as the scratch agent's card lists them. */
const PATHS = ['JSONRPC', 'HTTP+JSON', 'GRPC'].flatMap(binding =>
  ['1.0', '0.3'].map(version => `${binding}@${version}`),
);
const RUN =
  process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['JSONRPC', 'HTTP+JSON', 'GRPC'];
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

/** One request to the agent's first interface, sent through the dial; what rode the wire. */
async function capture(served, asked) {
  const card = readCard(served);
  let request;
  let recording;
  const fetchImpl = async (input, init) => {
    const headers = new Headers(init.headers);
    request = {
      url: String(input),
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
  const left = new AbortController();
  let silence = setTimeout(() => left.abort(), HELD_AFTER_MS);
  let taken;
  try {
    const dialed = await new Dialer({connectTimeoutMs: 5000, fetchImpl}).dial({
      card,
      params: {
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
      serviceParameters: ServiceParameters.create(
        withA2AExtensions(...Object.values(A2UI_EXTENSION_URIS)),
      ),
      signal: left.signal,
    });
    taken = dialed.taken;
    if (dialed.notReached.length > 0) throw new Error('the capture passed an interface over');
    for await (const _event of dialed.events) {
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
    binding: taken.protocolBinding,
    a2aVersion: taken.protocolVersion,
    card: served,
    request,
    response: {status: 200, contentType: 'text/event-stream', body, closedByAgent},
  };
}

/** The scratch agent listing the six paths, `first` ahead of the rest, for as long as `use` runs. */
async function withScratchAgent(first, use) {
  const order = [first, ...PATHS.filter(path => path !== first)].join(',');
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
      String(GRPC_PORT),
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

/** A fixture's name: JSON-RPC's as 20.4 named them, the binding ahead of the version otherwise. */
const fixtureName = (binding, version, asked) =>
  binding === 'JSONRPC'
    ? `python-${version}-${asked}.json`
    : `python-${binding.toLowerCase()}-${version}-${asked}.json`;

await mkdir(fixtures, {recursive: true});
for (const binding of RUN.filter(named => named !== 'GRPC')) {
  for (const version of ['1.0', '0.3']) {
    await withScratchAgent(`${binding}@${version}`, async served => {
      for (const asked of ASKED) {
        const wire = await capture(served, asked);
        const name = fixtureName(binding, version, asked);
        await writeFile(join(fixtures, name), `${JSON.stringify(wire, null, 2)}\n`);
        console.log(
          `captured ${name}${wire.response.closedByAgent ? '' : ' (the agent held its stream open)'}`,
        );
      }
    });
  }
}

/** The parts the agent held of a press sent over gRPC, as the `echo` answer gives them back. */
async function echoedOverGrpc(card) {
  const dialed = await new Dialer({connectTimeoutMs: 5000}).dial({
    card,
    params: {
      tenant: '',
      message: {
        messageId: randomUUID(),
        contextId: '',
        taskId: '',
        role: Role.ROLE_USER,
        parts: [text('echo'), PRESS],
        metadata: undefined,
        extensions: [],
        referenceTaskIds: [],
      },
      configuration: undefined,
      metadata: undefined,
    },
  });
  let echoed = '';
  for await (const event of dialed.events) {
    const message = event.payload?.value?.status?.message;
    const part = message?.parts?.[0]?.content;
    if (part?.$case === 'text') echoed = part.value;
  }
  return echoed;
}

// gRPC, asked live on both A2A versions through the smoke runner: what each answer ended on, and
// what the agent held of a press.
for (const version of RUN.includes('GRPC') ? ['1.0', '0.3'] : []) {
  await withScratchAgent(`GRPC@${version}`, async served => {
    const card = readCard(served);
    for (const asked of ASKED) {
      if (asked === 'echo') {
        console.log(`GRPC at A2A ${version} · echo · the agent held ${await echoedOverGrpc(card)}`);
        continue;
      }
      const seen = await a2aSmokeRunner()({
        card,
        entitlement: [CATALOG],
        words: asked,
        timeoutMs: 10_000,
      });
      const painted = (seen.messages ?? []).map(m => Object.keys(m).find(k => k !== 'version'));
      console.log(
        [
          `GRPC at A2A ${version}`,
          asked,
          seen.kind,
          seen.state ?? '',
          painted.join('+') || 'no A2UI',
          seen.taken
            ? `took ${seen.taken.protocolBinding} at A2A ${seen.taken.protocolVersion}`
            : '',
          seen.data ? JSON.stringify(seen.data) : '',
        ]
          .filter(Boolean)
          .join(' · '),
      );
    }
  });
}
