import {createServer, type Server} from 'node:http';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import type {Message, Task, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {ClientFactory, type Client} from '@a2a-js/sdk/client';
import type {Express} from 'express';
import {buildOrchestrator} from '../src/app.js';
import {A2UI_EXTENSION_URI_V091} from '../src/agentCard.js';
import {A2UI_PART, startFakeVendor, type FakeVendor, type Script} from './fakeVendor.js';

let dir: string;
let vendor: FakeVendor | undefined;
let server: Server | undefined;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'a2uiverse-orch-'));
});
afterEach(async () => {
  await new Promise<void>(resolve => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
  await vendor?.close().catch(() => {});
  vendor = undefined;
  await rm(dir, {recursive: true, force: true});
});

async function boot(options: {script?: Script; vendorUp?: boolean} = {}) {
  vendor = await startFakeVendor({script: options.script});
  const agentUrl = vendor.url;
  if (options.vendorUp === false) {
    await vendor.close();
    vendor = undefined;
  }
  // The A2A client posts to the card's `url`, so the card must advertise the
  // port we actually listen on: listen first, build the app after.
  const ready: {app?: Express} = {};
  server = createServer((req, res) => ready.app!(req, res));
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  const url = `http://127.0.0.1:${address.port}`;
  ready.app = buildOrchestrator({
    config: {
      port: address.port,
      baseUrl: url,
      stateDir: dir,
      debugIds: false,
      agentUrls: {github: agentUrl},
    },
  }).app;
  const client: Client = await new ClientFactory().createFromUrl(url);
  return {url, client};
}

function utterance(text: string, contextId?: string): Message {
  return {
    kind: 'message',
    messageId: crypto.randomUUID(),
    role: 'user',
    parts: [{kind: 'text', text}],
    ...(contextId ? {contextId} : {}),
    metadata: {a2uiClientDataModel: {version: 'v0.9', surfaces: {}}},
  };
}

async function collect(client: Client, message: Message) {
  const events = [];
  for await (const e of client.sendMessageStream({message})) events.push(e);
  return events;
}

/**
 * The journal line is appended after the client's stream has already ended
 * (the turn closes after its final event), so wait for it rather than race it.
 */
async function journalLines(expected: number) {
  const deadline = Date.now() + 2_000;
  for (;;) {
    const text = await readFile(join(dir, 'intent-journal.jsonl'), 'utf8').catch(() => '');
    const lines = text
      .split('\n')
      .filter(Boolean)
      .map(l => JSON.parse(l) as Record<string, unknown>);
    if (lines.length >= expected || Date.now() > deadline) return lines;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

describe('orchestrator', () => {
  test('serves the minimal card with the A2UI extension at the configured base URL', async () => {
    const {client, url} = await boot();
    const card = await client.getAgentCard();
    expect(card.url).toBe(url);
    expect(card.capabilities.extensions?.map(e => e.uri)).toEqual([A2UI_EXTENSION_URI_V091]);
    expect(card.skills.map(s => s.id)).toEqual(['palette']);
  });

  test('turn 1 streams synthetic task, relayed vendor task, and the vendor final — all with orchestrator ids', async () => {
    const {client} = await boot();
    const events = await collect(client, utterance('what needs my review?'));

    expect(events.map(e => e.kind)).toEqual(['task', 'task', 'status-update']);
    const [synthetic, relayedTask, final] = events as [Task, Task, TaskStatusUpdateEvent];
    expect(synthetic.id).toBe(relayedTask.id);
    expect(synthetic.contextId).toBe(relayedTask.contextId);
    expect(final.taskId).toBe(synthetic.id);
    expect(final.contextId).toBe(synthetic.contextId);
    expect(final.final).toBe(true);
    expect(final.status.message?.parts[0]).toEqual(A2UI_PART);
    for (const e of events) expect(e.metadata?.a2uiverse).toEqual({source: 'github'});
    // The vendor's ids never reach the client.
    expect(synthetic.contextId).not.toBe(vendor!.contextIds[0]);
  });

  test('turn 2 on the same context reuses the vendor conversation and emits no vendor task', async () => {
    const {client} = await boot();
    const [first] = await collect(client, utterance('one'));
    const events = await collect(client, utterance('two', first.contextId));

    expect(events.map(e => e.kind)).toEqual(['task', 'status-update']);
    expect(events[0].contextId).toBe(first.contextId);
    expect(vendor!.contextIds).toHaveLength(1);
    expect(vendor!.requests[1].message.contextId).toBe(vendor!.contextIds[0]);
  });

  test('journals one line per turn with descriptor, surfaces, outcome and a null embedding', async () => {
    const {client} = await boot();
    const [first] = await collect(client, utterance('what needs my review?'));
    const action: Message = {
      kind: 'message',
      messageId: crypto.randomUUID(),
      role: 'user',
      contextId: first.contextId,
      parts: [
        {
          kind: 'data',
          data: {version: 'v0.9', action: {name: 'approve', surfaceId: 's1', context: {n: 1}}},
        },
      ],
    };
    await collect(client, action);

    const lines = await journalLines(2);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      kind: 'utterance',
      descriptor: 'what needs my review?',
      outcome: 'completed',
      surfaces: {created: ['s1'], updated: [], deleted: []},
      embedding: null,
      clientMetadata: {keys: ['a2uiClientDataModel']},
    });
    expect(lines[1]).toMatchObject({
      kind: 'action',
      descriptor: 'approve on surface s1 in github',
      payload: {n: 1},
    });
    expect((lines[0].dispatch as unknown[]).length).toBe(1);
  });

  test('a vendor that is down yields the synthetic task and a failed final; the journal records failed', async () => {
    const {client} = await boot({vendorUp: false});
    const events = await collect(client, utterance('hello'));
    expect(events.map(e => e.kind)).toEqual(['task', 'status-update']);
    const final = events[1] as TaskStatusUpdateEvent;
    expect(final.final).toBe(true);
    expect(final.status.state).toBe('failed');
    const [line] = await journalLines(1);
    expect(line.outcome).toBe('failed');
  });

  test('a non-terminating vendor stream ends with an orchestrator failed final', async () => {
    const script: Script = ({ctx, vendorContextId}) => [
      {
        kind: 'status-update',
        taskId: ctx.taskId,
        contextId: vendorContextId,
        final: false,
        status: {state: 'working'},
      },
    ];
    const {client} = await boot({script});
    const events = await collect(client, utterance('hello'));
    expect(events.map(e => e.kind)).toEqual(['task', 'status-update', 'status-update']);
    const final = events.at(-1) as TaskStatusUpdateEvent;
    expect(final.final).toBe(true);
    expect(final.status.state).toBe('failed');
  });

  test('a vendor failed final is relayed as-is, not followed by a second final', async () => {
    const script: Script = ({ctx, vendorContextId}) => [
      {
        kind: 'status-update',
        taskId: ctx.taskId,
        contextId: vendorContextId,
        final: true,
        status: {state: 'failed'},
      },
    ];
    const {client} = await boot({script});
    const events = await collect(client, utterance('hello'));
    expect(events.map(e => e.kind)).toEqual(['task', 'status-update']);
    expect((events[1] as TaskStatusUpdateEvent).status.state).toBe('failed');
  });

  test('CORS allows a devtunnels origin and localhost', async () => {
    const {url} = await boot();
    for (const origin of ['https://x-5173.asse.devtunnels.ms', 'http://localhost:5173']) {
      const res = await fetch(`${url}/.well-known/agent-card.json`, {headers: {Origin: origin}});
      expect(res.headers.get('access-control-allow-origin')).toBe(origin);
    }
    const res = await fetch(`${url}/.well-known/agent-card.json`, {
      headers: {Origin: 'https://evil.example'},
    });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});
