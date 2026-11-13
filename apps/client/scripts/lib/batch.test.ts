/**
 * The recorder's one judgement per stream event: what the canvas would have received, kept as
 * a `BeatBatch`. Task 5.7 decision 11 adds the synthesis payload beside the stamp — without it
 * a recorded merged turn would replay as an empty slot.
 */
import {expect, test} from 'vitest';
import {TaskState, type Part} from '@a2a-js/sdk';
import {STAMP_KEY, SYNTHESIS_KEY} from '@a2uiverse/sdk';
import {
  dataPart,
  statusUpdateEvent,
  textPart,
  type A2AStreamEventData,
} from '../../src/a2a/messages';
import {PAYLOAD} from '../../src/beats/synthesisFixture';
import {batchOf} from './batch';

const paint = {version: 'v0.9', createSurface: {surfaceId: 'shell:synthesis', catalogId: 'shell'}};

function event(metadata: Record<string, unknown>, parts: Part[]): A2AStreamEventData {
  return statusUpdateEvent({
    taskId: 't1',
    contextId: 'c1',
    state: TaskState.TASK_STATE_WORKING,
    parts,
    metadata,
  });
}

test('a stamped paint keeps its stamp and its synthesis payload', () => {
  const stamp = {source: 'shell', role: 'fragment'};
  const batch = batchOf(
    event({[STAMP_KEY]: stamp, [SYNTHESIS_KEY]: PAYLOAD}, [dataPart(paint), textPart('Merged.')]),
    2600,
  );
  expect(batch).toEqual({
    offsetMs: 2600,
    messages: [paint],
    texts: ['Merged.'],
    stamp,
    synthesis: PAYLOAD,
  });
});

test('a vendor paint carries no synthesis key; an event with nothing to replay is dropped', () => {
  const stamp = {source: 'gmail', role: 'fragment'};
  const batch = batchOf(event({[STAMP_KEY]: stamp}, [dataPart(paint)]), 400);
  expect(batch).toEqual({offsetMs: 400, messages: [paint], texts: [], stamp});
  expect('synthesis' in batch!).toBe(false);
  expect(batchOf(event({[STAMP_KEY]: stamp}, []), 500)).toBeUndefined();
});
