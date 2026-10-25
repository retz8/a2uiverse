/**
 * A beat's builds read against the registry it replays over (task-16.10 decision 2): a build the
 * registry holds stays named, one it does not is left to the table's.
 */
import {describe, expect, it} from 'vitest';
import type {BeatBatch, BeatFixture} from './beatFixtures';
import {buildsAgainstRegistry} from './recordedBuilds';

const SHOP_A = 'shop-a-catalog';
const SHOP_B = 'shop-b-catalog';

const batch = (builds?: Record<string, string>): BeatBatch => ({
  offsetMs: 0,
  messages: [],
  texts: [],
  stamp: {source: 'shop-a', role: 'fragment', ...(builds ? {builds} : {})},
});

function fixture(batches: BeatBatch[]): BeatFixture {
  return {
    name: 'beat-31-test',
    beat: 31,
    title: 'test beat',
    prompt: 'compare',
    model: 'test-model',
    recordedAt: '2026-10-22T00:00:00Z',
    contextId: 'ctx',
    chainedFrom: null,
    turns: [
      {
        taskId: 't1',
        kind: 'utterance',
        prompt: 'compare',
        action: null,
        outcome: 'completed',
        durationMs: 0,
        batches,
      },
    ],
  };
}

const holding =
  (...held: string[]) =>
  async (_catalogId: string, artifactId: string) =>
    held.includes(artifactId);

describe('buildsAgainstRegistry', () => {
  it('leaves a beat whose builds the registry holds as it is', async () => {
    const beat = fixture([batch({[SHOP_A]: 'sha256-a'}), batch()]);
    expect(await buildsAgainstRegistry(beat, holding('sha256-a'))).toBe(beat);
  });

  it('drops a build the registry does not hold, keeping the rest of the stamp', async () => {
    const beat = fixture([batch({[SHOP_A]: 'sha256-old-a', [SHOP_B]: 'sha256-b'})]);
    const read = await buildsAgainstRegistry(beat, holding('sha256-b'));
    expect(read.turns[0]!.batches[0]!.stamp).toEqual({
      source: 'shop-a',
      role: 'fragment',
      builds: {[SHOP_B]: 'sha256-b'},
    });
  });

  it('takes the field off a stamp whose every build is unheld', async () => {
    const beat = fixture([batch({[SHOP_A]: 'sha256-old-a'})]);
    const read = await buildsAgainstRegistry(beat, holding());
    expect(read.turns[0]!.batches[0]!.stamp).toEqual({source: 'shop-a', role: 'fragment'});
  });

  it('asks the registry once per build, and leaves the recording unchanged', async () => {
    const beat = fixture([batch({[SHOP_A]: 'sha256-old-a'}), batch({[SHOP_A]: 'sha256-old-a'})]);
    const asked: string[] = [];
    await buildsAgainstRegistry(beat, async (catalogId, artifactId) => {
      asked.push(`${catalogId}@${artifactId}`);
      return false;
    });
    expect(asked).toEqual([`${SHOP_A}@sha256-old-a`]);
    expect(beat.turns[0]!.batches[0]!.stamp?.builds).toEqual({[SHOP_A]: 'sha256-old-a'});
  });
});
