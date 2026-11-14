/**
 * Captures the extended-card fixtures under `test/fixtures/` (task-20.8 decision 16) from two real
 * servers, each on A2A 1.0 and through its A2A 0.3 layer: the 1.x `@a2a-js/sdk` server, as the
 * fake A2A 1.0 agent runs it, and a scratch agent on Python's `a2a-sdk` 1.x,
 * `serve_extended_card.py`. Each answer is asked through the platform's dial with Alice's key and
 * written as served: on JSON-RPC the result, on HTTP+JSON the body, on gRPC at A2A 1.0 the JSON
 * form of the message; on gRPC at A2A 0.3, where the A2A SDK hands back only its own reading, that
 * reading, in A2A 1.0's JSON. A scratch agent on `a2a-sdk` 0.3, `serve_extended_card_v0_3.py`, is
 * asked on JSON-RPC and gRPC. What the task spec left to check by running, and the findings the
 * runs confirm, are printed. Run from the package, after a build of the workspace:
 *
 *   node scripts/capture-extended-cards.mjs
 *
 * It needs `uv` on the PATH.
 */
import {spawn} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {AgentCard} from '@a2a-js/sdk';
import {ClientFactory} from '@a2a-js/sdk/client';
import {cardReadError, fetchLiveCard, readCard} from '@a2uiverse/card';
import {Dialer} from '../dist/index.js';
import {
  cardForV1,
  completingScriptV1,
  startFakeAgentV1,
  textPartV1,
} from '../dist/testing/fakeAgentV1.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, '..', 'test', 'fixtures');
const PORT = 18751;
const GRPC_PORT = 18752;
const PORT_0_3 = 18761;
const GRPC_PORT_0_3 = 18762;
const PYTHON_SDK = 'a2a-sdk[http-server,grpc]==1.3.0';
const PYTHON_0_3_SDK = 'a2a-sdk[http-server,grpc]==0.3.26';
const KEY = 'X-Scratch-Key';
const PATHS = ['JSONRPC', 'HTTP+JSON', 'GRPC'].flatMap(binding =>
  ['1.0', '0.3'].map(version => ({binding, version})),
);
const nameOf = ({binding, version}) => `${binding.toLowerCase().replace('+', '-')}-${version}`;

async function write(name, value) {
  await writeFile(join(fixtures, name), `${JSON.stringify(value, null, 2)}\n`);
  console.log(`captured ${name}`);
}

/** A Python server under `uv`, for as long as `use` takes; `use` is retried while it starts. */
async function withPython(sdk, script, args, use) {
  const child = spawn(
    'uv',
    ['run', '--no-project', '--with', sdk, '--with', 'uvicorn', join(here, script), ...args],
    {stdio: ['ignore', 'inherit', 'inherit']},
  );
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        return await use();
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

/**
 * Alice's answer on one interface of `card`, as served: what the dial's fetch received, or on
 * gRPC what the dial made of it.
 */
async function asServed(card, agentInterface, credential = {[KEY]: 'alice'}) {
  let body;
  const fetchImpl = async (input, init) => {
    const response = await fetch(input, init);
    body = await response.clone().text();
    return response;
  };
  const fetched = await new Dialer({connectTimeoutMs: 2000, fetchImpl}).fetchExtendedCard({
    card: {...card, supportedInterfaces: [agentInterface]},
    credential,
    signal: AbortSignal.timeout(5000),
  });
  const {answer} = fetched;
  if (agentInterface.protocolBinding === 'GRPC') {
    if (answer.kind === 'served') return {answer, served: answer.served};
    if (answer.kind === 'read') return {answer, served: AgentCard.toJSON(answer.card)};
    return {answer};
  }
  const parsed = body === undefined ? undefined : JSON.parse(body);
  const served = agentInterface.protocolBinding === 'JSONRPC' ? parsed?.result : parsed;
  return {answer, served};
}

/** Each of the six paths of a server whose public card is `card`, written under `prefix`. */
async function captureSix(prefix, card) {
  const answers = {};
  for (const path of PATHS) {
    const listed = card.supportedInterfaces.find(
      i => i.protocolBinding === path.binding && i.protocolVersion === path.version,
    );
    const {answer, served} = await asServed(card, listed);
    if (served === undefined)
      throw new Error(`${prefix} ${nameOf(path)}: ${JSON.stringify(answer)}`);
    const read = path.binding === 'GRPC' && path.version === '0.3' ? '-read' : '';
    await write(`extended-${prefix}-${nameOf(path)}${read}.json`, served);
    answers[nameOf(path)] = {answer, served};
  }
  return answers;
}

function facts(label, answers) {
  const json1 = answers['jsonrpc-1.0'].served;
  const grpc1 = answers['grpc-1.0'].served;
  const same =
    JSON.stringify(AgentCard.toJSON(readCard(json1))) ===
    JSON.stringify(AgentCard.toJSON(readCard(grpc1)));
  console.log(
    `${label}: the gRPC answer's JSON form reads the same as the JSON-RPC answer: ${same}`,
  );
  const rest03 = answers['http-json-0.3'];
  console.log(
    `${label}: over A2A 0.3 on HTTP+JSON the answer's sign-in scheme reads ${JSON.stringify(
      rest03.served.securitySchemes,
    )}; the reading ${cardReadError(rest03.served) ? `refuses it (${cardReadError(rest03.served)})` : 'reads it'}; the dial took it as ${rest03.answer.kind}`,
  );
}

await mkdir(fixtures, {recursive: true});

// The 1.x `@a2a-js/sdk` server, as the fake A2A 1.0 agent runs it.
// A key asked as Python's scratch agent asks it, and a skill with no tags: what A2A 0.3's two JSON
// forms write differently.
const skills = [
  {id: 'shop', name: 'Shop', description: 'The front page', tags: ['shop']},
  {id: 'lanterns', name: 'Lantern repairs', description: 'Your lantern repairs', tags: []},
];
const signIn = {
  securitySchemes: {key: {apiKeySecurityScheme: {location: 'header', name: KEY}}},
  securityRequirements: [{schemes: {key: {list: []}}}],
};
const javascript = await startFakeAgentV1({
  script: completingScriptV1([textPartV1('hi')]),
  card: urls =>
    cardForV1(urls, {name: 'Scratch Shop', paths: PATHS, extendedCard: true, card: signIn}),
  extendedCard: request =>
    request.header(KEY) === 'alice'
      ? cardForV1(javascript.urls, {
          name: 'Scratch Shop',
          paths: PATHS,
          extendedCard: true,
          skills,
          card: signIn,
        })
      : undefined,
});
try {
  const card = readCard(javascript.served);
  facts('@a2a-js/sdk 1.3.0', await captureSix('javascript', card));
  // Finding 25: the gRPC status for an operation the agent does not support.
  javascript.serveExtendedCard(undefined);
} finally {
  await javascript.close();
}
const unflagged = await startFakeAgentV1({
  script: completingScriptV1([textPartV1('hi')]),
  card: urls => cardForV1(urls, {paths: PATHS}),
});
try {
  const card = readCard(unflagged.served);
  for (const version of ['1.0', '0.3']) {
    const grpc = card.supportedInterfaces.find(
      i => i.protocolBinding === 'GRPC' && i.protocolVersion === version,
    );
    const flagged = {...card, capabilities: {...card.capabilities, extendedAgentCard: true}};
    const {answer} = await asServed(flagged, grpc);
    console.log(
      `@a2a-js/sdk 1.3.0, gRPC at A2A ${version}, the operation not supported: ${JSON.stringify(answer)}`,
    );
  }
} finally {
  await unflagged.close();
}

// Python's `a2a-sdk` 1.x.
const scratch = `http://127.0.0.1:${PORT}/.well-known/agent-card.json`;
const six = PATHS.map(({binding, version}) => `${binding}@${version}`).join(',');
await withPython(
  PYTHON_SDK,
  'serve_extended_card.py',
  [String(PORT), String(GRPC_PORT), six],
  async () => {
    const card = readCard((await fetchLiveCard(scratch, {timeoutMs: 2000})).served);
    const answers = await captureSix('python', card);
    facts('a2a-sdk 1.3.0', answers);
    // Finding 24: asked with no credential at all, the handler answers.
    const {answer} = await asServed(card, card.supportedInterfaces[0], {});
    console.log(`a2a-sdk 1.3.0, asked with no credential: ${answer.kind}`);
  },
);
await withPython(
  PYTHON_SDK,
  'serve_extended_card.py',
  [String(PORT), String(GRPC_PORT), six, 'no-flag'],
  async () => {
    const card = readCard((await fetchLiveCard(scratch, {timeoutMs: 2000})).served);
    for (const version of ['1.0', '0.3']) {
      const grpc = card.supportedInterfaces.find(
        i => i.protocolBinding === 'GRPC' && i.protocolVersion === version,
      );
      const flagged = {...card, capabilities: {...card.capabilities, extendedAgentCard: true}};
      const {answer} = await asServed(flagged, grpc);
      console.log(
        `a2a-sdk 1.3.0, gRPC at A2A ${version}, the operation not supported: ${JSON.stringify(answer)}`,
      );
    }
  },
);

// Python's `a2a-sdk` 0.3: JSON-RPC serves the extended card, gRPC the public one (finding 22).
await withPython(
  PYTHON_0_3_SDK,
  'serve_extended_card_v0_3.py',
  [String(PORT_0_3), String(GRPC_PORT_0_3)],
  async () => {
    const served = (
      await fetchLiveCard(`http://127.0.0.1:${PORT_0_3}/.well-known/agent-card.json`, {
        timeoutMs: 2000,
      })
    ).served;
    const card = readCard(served);
    for (const listed of card.supportedInterfaces) {
      const {answer, served: answered} = await asServed(card, listed);
      const name = listed.protocolBinding === 'GRPC' ? 'grpc-0.3-read' : 'jsonrpc-0.3';
      await write(`extended-python-0.3.26-${name}.json`, answered);
      const read = answer.kind === 'read' ? answer.card : readCard(answered);
      console.log(
        `a2a-sdk 0.3.26, ${listed.protocolBinding}: skills ${read.skills.map(s => s.id).join(', ')}`,
      );
    }
  },
);

// Finding 23: a refusal for sign-in on JSON-RPC, through the A2A SDK's own client.
const refusing = await startFakeAgentV1({
  script: completingScriptV1([textPartV1('hi')]),
  card: urls => cardForV1(urls, {extendedCard: true}),
  admit: () => false,
});
try {
  const client = await new ClientFactory().createFromAgentCard(readCard(refusing.served));
  try {
    await client.getAgentCard();
  } catch (err) {
    console.log(
      `@a2a-js/sdk 1.3.0's client, a 401 on JSON-RPC: ${err.constructor.name}, status ${err.status ?? err.statusCode ?? 'none'}: ${err.message}`,
    );
  }
} finally {
  await refusing.close();
}
process.exit(0);
