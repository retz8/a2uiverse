/**
 * The fragment's history on the composition (task 9.4): each agent's steps counted from the
 * stream, the accepted wiring remembered per combination of the agents' steps.
 */
import type {TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {describe, expect, test} from 'vitest';
import {History, type Remembered} from '../src/composition/history.js';

function paint(...ops: Array<Record<string, unknown>>): TaskStatusUpdateEvent {
  return {
    kind: 'status-update',
    taskId: 't',
    contextId: 'c',
    final: false,
    status: {
      state: 'working',
      message: {
        kind: 'message',
        messageId: 'm',
        role: 'agent',
        parts: ops.map(op => ({kind: 'data' as const, data: {version: 'v0.9', ...op}})),
      },
    },
  };
}

const create = (surfaceId: string) => ({createSurface: {surfaceId, catalogId: 'c'}});
const update = (surfaceId: string) => ({updateDataModel: {surfaceId, value: {n: 1}}});

function wiring(tag: string): Remembered {
  return {
    synthesis: {document: {note: tag}, payload: {}, watch: new Map(), seen: new Map()} as never,
    merged: new Set(['github', 'gmail']),
  };
}

describe('steps', () => {
  test('every createSurface from a source is a step, from 0; an update or a delete is not', () => {
    const history = new History();
    expect(history.stackOf('github')).toBeUndefined();
    history.observe(paint(create('github:s1'), update('github:s1')));
    expect(history.stackOf('github')).toEqual({length: 1, at: 0});
    history.observe(paint(update('github:s1')));
    history.observe(paint({deleteSurface: {surfaceId: 'github:s1'}}));
    expect(history.stackOf('github')).toEqual({length: 1, at: 0});
    // A repeat create of the same id, and a create of a new id, each a step.
    history.observe(paint(create('github:s1')));
    history.observe(paint(create('github:s2')));
    expect(history.stackOf('github')).toEqual({length: 3, at: 2});
    // Another source counts on its own; the shell's surfaces never count.
    history.observe(paint(create('gmail:s1')));
    history.observe(paint(create('shell:synthesis')));
    expect(history.stackOf('gmail')).toEqual({length: 1, at: 0});
    expect(history.stackOf('shell')).toBeUndefined();
  });

  test('a step moves the cursor within the stack; past the end, or on a source with no stack, it is refused', () => {
    const history = new History();
    history.observe(paint(create('github:s1')));
    history.observe(paint(create('github:s2')));
    expect(history.stepTo('github', 0)).toBe(true);
    expect(history.stackOf('github')).toEqual({length: 2, at: 0});
    expect(history.stepTo('github', 1)).toBe(true);
    expect(history.stepTo('github', 2)).toBe(false);
    expect(history.stepTo('gmail', 0)).toBe(false);
    expect(history.stackOf('github')).toEqual({length: 2, at: 1});
  });

  test('a create after a step back takes the next index and drops the steps past it', () => {
    const history = new History();
    for (const id of ['s1', 's2', 's3']) history.observe(paint(create(`github:${id}`)));
    history.stepTo('github', 0);
    history.observe(paint(create('github:s4')));
    expect(history.stackOf('github')).toEqual({length: 2, at: 1});
  });
});

describe('the remembered wiring', () => {
  test('filed under the combination of every painted source, recalled at that combination alone', () => {
    const history = new History();
    history.observe(paint(create('github:s1')));
    history.observe(paint(create('gmail:s1')));
    expect(history.recall()).toBeUndefined();
    history.remember(wiring('list-list'));
    expect(history.recall()).toEqual(wiring('list-list'));
    expect(history.combination()).toEqual({github: 0, gmail: 0});

    history.observe(paint(create('github:s2')));
    expect(history.combination()).toEqual({github: 1, gmail: 0});
    expect(history.recall()).toBeUndefined();
    history.remember(wiring('detail-list'));

    history.stepTo('github', 0);
    expect(history.recall()).toEqual(wiring('list-list'));
    history.stepTo('github', 1);
    expect(history.recall()).toEqual(wiring('detail-list'));
  });

  test('a later filing at the same combination overwrites the earlier', () => {
    const history = new History();
    history.observe(paint(create('github:s1')));
    history.remember(wiring('first'));
    history.remember(wiring('second'));
    expect(history.recall()).toEqual(wiring('second'));
  });

  test('a source painting for the first time changes the combination; the earlier entry stays where it was', () => {
    const history = new History();
    history.observe(paint(create('github:s1')));
    history.remember(wiring('github-alone'));
    history.observe(paint(create('gmail:s1')));
    expect(history.combination()).toEqual({github: 0, gmail: 0});
    expect(history.recall()).toBeUndefined();
  });

  test('a combination never seen is covered by the entry naming the most sources, each where it stands now; the rest painted since (task-9.9 decision 16)', () => {
    const history = new History();
    history.observe(paint(create('github:s1')));
    history.remember(wiring('github-alone'));
    history.observe(paint(create('gmail:s1')));
    history.remember(wiring('list-list'));
    history.observe(paint(create('github:s2')));
    history.remember(wiring('detail-list'));
    history.observe(paint(create('calendar:s1')));
    expect(history.combination()).toEqual({github: 1, gmail: 0, calendar: 0});
    history.remember(wiring('detail-list-calendar'));

    // GitHub back to its list: {github 0, gmail 0, calendar 0} was never filed.
    history.stepTo('github', 0);
    expect(history.recall()).toBeUndefined();
    expect(history.recallCovering()).toEqual({
      remembered: wiring('list-list'),
      since: ['calendar'],
    });
    // Seen: the step recalls it; an entry over fewer sources still covers it, and is not asked for.
    history.stepTo('github', 1);
    expect(history.recall()).toEqual(wiring('detail-list-calendar'));
    expect(history.recallCovering()).toEqual({
      remembered: wiring('detail-list'),
      since: ['calendar'],
    });
  });

  test('no entry covers a combination where a source it names stands elsewhere', () => {
    const history = new History();
    history.observe(paint(create('github:s1')));
    history.observe(paint(create('gmail:s1')));
    history.remember(wiring('list-list'));
    history.observe(paint(create('github:s2')));
    history.observe(paint(create('calendar:s1')));
    // GitHub on its detail: the only entry names GitHub on its list.
    expect(history.recallCovering()).toBeUndefined();
  });

  test('dropping steps purges every entry filed with the source at a dropped index', () => {
    const history = new History();
    history.observe(paint(create('github:s1')));
    history.observe(paint(create('gmail:s1')));
    history.remember(wiring('0-0'));
    history.observe(paint(create('github:s2')));
    history.remember(wiring('1-0'));
    history.observe(paint(create('github:s3')));
    history.remember(wiring('2-0'));

    history.stepTo('github', 0);
    history.observe(paint(create('github:s4')));
    // GitHub is at 1 again, on a paint the '1-0' entry was never accepted over.
    expect(history.combination()).toEqual({github: 1, gmail: 0});
    expect(history.recall()).toBeUndefined();
    history.stepTo('github', 0);
    expect(history.recall()).toEqual(wiring('0-0'));
  });
});
