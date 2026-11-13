/**
 * Captures the A2A 1.0 card fixtures under `test/fixtures/` from two real servers (task-20.3
 * decision 21): the 1.x `@a2a-js/sdk` server's card handler and Python's `a2a-sdk` 1.x. Each card
 * is fetched over HTTP by this package's own fetch and written as served. Run from the package:
 *
 *   node scripts/capture-fixtures.mjs
 *
 * It needs `uv` on the PATH for the Python captures.
 */
import {spawn} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import express from 'express';
import {AgentCard} from '@a2a-js/sdk';
import {DefaultRequestHandler, InMemoryTaskStore} from '@a2a-js/sdk/server';
import {agentCardHandler} from '@a2a-js/sdk/server/express';
import {fetchLiveCard} from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, '..', 'test', 'fixtures');
const PORT = 18731;
const CARD_PATH = '/.well-known/agent-card.json';
const cardUrl = `http://127.0.0.1:${PORT}${CARD_PATH}`;
const PYTHON_SDK = 'a2a-sdk[http-server]==1.3.0';

async function write(name, card) {
  await writeFile(join(fixtures, name), `${JSON.stringify(card, null, 2)}\n`);
  console.log(`captured ${name}`);
}

/** The card the 1.x JavaScript server is given: one JSON-RPC interface at A2A 1.0. */
function javascriptCard({signIn}) {
  const base = `http://127.0.0.1:${PORT}`;
  return AgentCard.fromJSON({
    name: 'Fake Agent',
    description: 'an agent for tests',
    version: '0.1.0',
    supportedInterfaces: [
      {url: `${base}/`, protocolBinding: 'JSONRPC', protocolVersion: '1.0'},
      {url: `${base}/`, protocolBinding: 'JSONRPC', protocolVersion: '0.3'},
    ],
    provider: {organization: 'Acme', url: 'https://example.com'},
    documentationUrl: 'https://example.com/docs',
    capabilities: {
      streaming: true,
      extensions: [
        {
          uri: 'https://a2ui.org/a2a-extension/a2ui/v0.9.1',
          params: {supportedCatalogIds: ['https://example.com/catalogs/fake/v1/catalog.json']},
        },
      ],
    },
    ...(signIn
      ? {
          securitySchemes: {
            signIn: {
              oauth2SecurityScheme: {
                flows: {
                  authorizationCode: {
                    authorizationUrl: `${base}/authorize`,
                    tokenUrl: `${base}/token`,
                    scopes: {'things.read': 'Read your things'},
                  },
                },
              },
            },
          },
          securityRequirements: [{schemes: {signIn: {list: ['things.read']}}}],
        }
      : {}),
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: [
      {
        id: 'fake',
        name: 'Fake',
        description: 'A fake skill',
        tags: ['fake'],
        examples: ['show my things'],
      },
    ],
  });
}

/** One card served by the 1.x `@a2a-js/sdk` server's card handler, fetched as `fetch` asks. */
async function fromJavascriptServer({signIn, legacyCompat, headers}) {
  const executor = {execute: async () => {}, cancelTask: async () => {}};
  const handler = new DefaultRequestHandler(
    javascriptCard({signIn}),
    new InMemoryTaskStore(),
    executor,
  );
  const app = express();
  app.use(
    CARD_PATH,
    agentCardHandler({
      agentCardProvider: handler,
      ...(legacyCompat ? {legacyCompat: {enabled: true}} : {}),
    }),
  );
  const server = createServer(app);
  await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));
  try {
    if (!headers) return await fetchLiveCard(cardUrl, {timeoutMs: 5000});
    return await (await fetch(cardUrl, {headers})).json();
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

/** One card served by Python's `a2a-sdk`, fetched by this package's fetch. */
async function fromPythonServer(variant) {
  const child = spawn(
    'uv',
    [
      'run',
      '--no-project',
      '--with',
      PYTHON_SDK,
      '--with',
      'uvicorn',
      join(here, 'serve_card.py'),
      String(PORT),
      variant,
    ],
    {stdio: ['ignore', 'inherit', 'inherit']},
  );
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fetchLiveCard(cardUrl, {timeoutMs: 2000});
      } catch (err) {
        if (attempt === 60) throw err;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  } finally {
    child.kill();
    await new Promise(resolve => child.once('exit', resolve));
  }
}

await mkdir(fixtures, {recursive: true});
await write('javascript-1.0.json', await fromJavascriptServer({signIn: false}));
await write('javascript-1.0-sign-in.json', await fromJavascriptServer({signIn: true}));
await write(
  'javascript-no-version-named.json',
  await fromJavascriptServer({signIn: true, legacyCompat: true, headers: {}}),
);
await write('python-1.0.json', await fromPythonServer('jsonrpc'));
await write('python-1.0-then-0.3.json', await fromPythonServer('both'));
await write('python-1.0-grpc-and-rest.json', await fromPythonServer('grpc'));
await write('python-as-0.3.json', await fromPythonServer('as-0.3'));
