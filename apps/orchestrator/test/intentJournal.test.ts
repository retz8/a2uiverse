import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import type {Message} from '@a2a-js/sdk';
import {IntentJournal} from '../src/journal/intentJournal.js';
import type {DispatchRecord} from '../src/agentsPool/types.js';
import type {Plan} from '../src/planner/planSchema.js';
import {FakeEmbedder} from './fakeEmbedder.js';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'a2uiverse-journal-'));
});
afterEach(() => rm(dir, {recursive: true, force: true}));

const utterance: Message = {
  kind: 'message',
  messageId: 'u1',
  role: 'user',
  parts: [{kind: 'text', text: 'what needs my review?'}],
  metadata: {a2uiClientDataModel: {version: 'v0.9', surfaces: {}}, a2uiForkContext: {paintId: 1}},
};

const record: DispatchRecord = {
  appId: 'github',
  clientContextId: 'c1',
  clientTaskId: 't1',
  vendorContextId: 'v1',
  vendorTaskId: 'vt1',
  startedAt: '2026-08-23T00:00:00.000Z',
  endedAt: '2026-08-23T00:00:01.000Z',
  outcome: 'completed',
  sawFinal: true,
  deadlineMs: 30000,
};

async function lines(file: string): Promise<Record<string, unknown>[]> {
  const text = await readFile(file, 'utf8');
  return text
    .split('\n')
    .filter(Boolean)
    .map(l => JSON.parse(l) as Record<string, unknown>);
}

describe('IntentJournal', () => {
  test('close appends one JSON line per turn, creating the state dir', async () => {
    const file = join(dir, 'nested', 'intent-journal.jsonl');
    const journal = new IntentJournal(file);
    const turn = journal.open({
      turnId: 't1',
      clientContextId: 'c1',
      message: utterance,
      appId: 'github',
    });
    turn.dispatched(record);
    turn.surfaces({created: ['s1'], updated: [], deleted: []});
    await turn.close('completed');

    const [entry] = await lines(file);
    expect(entry).toMatchObject({
      turnId: 't1',
      clientContextId: 'c1',
      kind: 'utterance',
      descriptor: 'what needs my review?',
      outcome: 'completed',
      dispatch: [record],
      surfaces: {created: ['s1'], updated: [], deleted: []},
      embedding: null,
    });
    expect(typeof entry.at).toBe('string');
  });

  test('embeds the descriptor at write time and records the plan', async () => {
    const file = join(dir, 'intent-journal.jsonl');
    const journal = new IntentJournal(file, new FakeEmbedder());
    const plan: Plan = {
      direction: 'column',
      groups: [{slots: [{appId: 'github', archetype: 'card', request: 'x'}]}],
    };
    const turn = journal.open({turnId: 't1', clientContextId: 'c1', message: utterance});
    turn.plan(plan);
    await turn.close('completed');

    const [entry] = await lines(file);
    expect(entry.plan).toEqual(plan);
    expect(Array.isArray(entry.embedding)).toBe(true);
    expect((entry.embedding as number[]).some(x => x !== 0)).toBe(true);
  });

  test('an embedding failure journals null and never throws', async () => {
    const file = join(dir, 'intent-journal.jsonl');
    const journal = new IntentJournal(file, {
      embed: async () => {
        throw new Error('model gone');
      },
    });
    const turn = journal.open({turnId: 't1', clientContextId: 'c1', message: utterance});
    await turn.close('completed');
    const [entry] = await lines(file);
    expect(entry.embedding).toBeNull();
  });

  test('records client metadata as keys plus data-model byte size, not contents', async () => {
    const file = join(dir, 'j.jsonl');
    const turn = new IntentJournal(file).open({
      turnId: 't1',
      clientContextId: 'c1',
      message: utterance,
      appId: 'github',
    });
    await turn.close('completed');
    const [entry] = await lines(file);
    expect(entry.clientMetadata).toEqual({
      keys: ['a2uiClientDataModel', 'a2uiForkContext'],
      dataModelBytes: Buffer.byteLength(JSON.stringify({version: 'v0.9', surfaces: {}})),
    });
    expect(JSON.stringify(entry)).not.toContain('"surfaces":{}');
  });

  test('two turns produce two lines', async () => {
    const file = join(dir, 'j.jsonl');
    const journal = new IntentJournal(file);
    await journal
      .open({turnId: 't1', clientContextId: 'c1', message: utterance, appId: 'github'})
      .close('completed');
    await journal
      .open({turnId: 't2', clientContextId: 'c1', message: utterance, appId: 'github'})
      .close('failed');
    const entries = await lines(file);
    expect(entries.map(e => e.turnId)).toEqual(['t1', 't2']);
    expect(entries[1].outcome).toBe('failed');
  });

  test('a failed write never throws out of close', async () => {
    const journal = new IntentJournal(join(dir, 'not-a-dir', 'x.jsonl'));
    await rm(dir, {recursive: true, force: true});
    // Make the parent path unwritable by occupying it with a file.
    const {writeFile, mkdir} = await import('node:fs/promises');
    await mkdir(dir);
    await writeFile(join(dir, 'not-a-dir'), 'file, not dir');
    const turn = journal.open({
      turnId: 't1',
      clientContextId: 'c1',
      message: utterance,
      appId: 'github',
    });
    await expect(turn.close('completed')).resolves.toBeUndefined();
  });
});

test('a turn records its synthesis outcome beside the plan', async () => {
  const journal = new IntentJournal(join(dir, 'j.jsonl'), new FakeEmbedder());
  const turn = journal.open({turnId: 't1', clientContextId: 'c1', message: utterance});
  turn.synthesis({outcome: 'declined', reason: 'nothing joinable', deadAirMs: 12});
  await turn.close('completed');
  const [line] = await lines(join(dir, 'j.jsonl'));
  expect(line!.synthesis).toEqual({outcome: 'declined', reason: 'nothing joinable', deadAirMs: 12});
});
