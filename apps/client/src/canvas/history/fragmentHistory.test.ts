/**
 * The fragment's history on the client (task 9.7): each source's stack counted at the wire as
 * the orchestrator counts it, the paint captured as last seen when the stack moves off it, the
 * placeholders the arrows skip, the wiring remembered per combination, the forward steps and
 * their entries dropped by a new paint, each paint's own time.
 */
import {describe, expect, it, vi} from 'vitest';
import type {SynthesisPayload} from '@a2uiverse/sdk';
import {createFragmentHistory, type PaintCopy} from './fragmentHistory';

const copy = (surfaceId: string, text: string): PaintCopy => ({
  surfaceId,
  catalogId: 'github-catalog',
  sendDataModel: true,
  tree: {root: {id: 'root', type: 'Text', text}},
  dataModel: {text},
});

const payload = (name: string): SynthesisPayload => ({
  dataModel: {name: {op: 'value', args: [{surface: 'shop-a:list', pointer: `/${name}`}]}},
  sorts: [],
});
const wiring = (name: string) => ({
  target: {surfaceId: 'shell:synthesis', source: 'shell'},
  payload: payload(name),
});

/** A history over a canvas whose capture hands back whatever the test set per source. */
function setup() {
  const live = new Map<string, PaintCopy>();
  const capture = vi.fn((source: string) => live.get(source));
  const history = createFragmentHistory({capture});
  return {history, live, capture};
}

describe('the count', () => {
  it('every create counts a step of its source, from 0, the newest current — as the orchestrator counts (task-9.4 decision 1)', () => {
    const {history} = setup();
    expect(history.stackOf('github')).toBeUndefined();
    history.paint('github');
    expect(history.stackOf('github')).toEqual({length: 1, at: 0});
    history.paint('github');
    history.paint('gmail');
    expect(history.stackOf('github')).toEqual({length: 2, at: 1});
    expect(history.stackOf('gmail')).toEqual({length: 1, at: 0});
    expect(history.combination()).toEqual({github: 1, gmail: 0});
  });

  it('a create after a step back takes the next index and drops the steps past it', () => {
    const {history, live} = setup();
    live.set('github', copy('github:list', 'list'));
    history.paint('github');
    history.landed('github', {title: 'List'});
    history.leaving('github');
    live.set('github', copy('github:detail', 'detail'));
    history.paint('github');
    history.landed('github', {title: 'Detail'});
    history.leaving('github');
    history.paint('github');
    history.landed('github', {title: 'Review'});
    expect(history.stackOf('github')).toEqual({length: 3, at: 2});

    history.stepTo('github', 0);
    expect(history.stackOf('github')).toEqual({length: 3, at: 0});
    history.paint('github');
    expect(history.stackOf('github')).toEqual({length: 2, at: 1});
    // Until the create lands the list is still on screen, with nowhere to go either way.
    expect(history.neighbours('github')).toEqual({});
    history.leaving('github');
    history.landed('github', {title: 'Other'});
    expect(history.neighbours('github')).toEqual({back: {step: 0, title: 'List'}});
  });
});

describe('the paint as last seen (task-9.7 decision 1)', () => {
  it('the current step is the live surface; leaving it captures the copy once, and the next leaving captures nothing more', () => {
    const {history, live, capture} = setup();
    live.set('github', copy('github:list', 'four PRs'));
    history.paint('github');
    history.landed('github', {title: 'List'});
    expect(capture).not.toHaveBeenCalled();
    // The vendor pushed an update in the meantime: what is captured is what is on screen now.
    live.set('github', copy('github:list', 'five PRs'));
    history.leaving('github');
    history.leaving('github');
    expect(capture).toHaveBeenCalledTimes(1);
    history.paint('github');
    history.landed('github', {title: 'Detail'});
    expect(history.stepTo('github', 0)).toEqual({
      paint: copy('github:list', 'five PRs'),
      title: 'List',
    });
  });

  it('a step back to the copy makes it live again: leaving it later captures it afresh', () => {
    const {history, live} = setup();
    live.set('github', copy('github:list', 'list'));
    history.paint('github');
    history.landed('github', {title: 'List'});
    history.leaving('github');
    live.set('github', copy('github:detail', 'detail'));
    history.paint('github');
    history.landed('github', {title: 'Detail'});
    history.leaving('github');
    history.stepTo('github', 0);
    // Restored, then edited in place before stepping forward.
    live.set('github', copy('github:list', 'list, edited'));
    expect(history.stepTo('github', 1)?.paint).toEqual(copy('github:detail', 'detail'));
    expect(history.stepTo('github', 0)?.paint).toEqual(copy('github:list', 'list, edited'));
  });
});

describe("the paint's time (phase-9 decision 8, task-9.9 decision 13)", () => {
  it('each paint is stamped when it lands; a step back shows the older paint its own time', () => {
    const live = new Map<string, PaintCopy>();
    let now = 1_000;
    const history = createFragmentHistory({capture: source => live.get(source), now: () => now});
    expect(history.landedAt('github')).toBeUndefined();
    live.set('github', copy('github:list', 'list'));
    history.paint('github');
    // Arrived, not yet landed: nothing on screen to stamp.
    expect(history.landedAt('github')).toBeUndefined();
    history.landed('github', {title: 'List'});
    expect(history.landedAt('github')).toBe(1_000);
    now = 5_000;
    history.leaving('github');
    live.set('github', copy('github:detail', 'detail'));
    history.paint('github');
    history.landed('github', {title: 'Detail'});
    expect(history.landedAt('github')).toBe(5_000);
    now = 9_000;
    history.stepTo('github', 0);
    expect(history.landedAt('github')).toBe(1_000);
    history.stepTo('github', 1);
    expect(history.landedAt('github')).toBe(5_000);
  });
});

describe('placeholders the arrows skip (task-9.7 decision 2)', () => {
  it('a create that never landed occupies its index and is skipped: Back lands on the nearest paint', () => {
    const {history, live} = setup();
    live.set('github', copy('github:list', 'list'));
    history.paint('github');
    history.landed('github', {title: 'List'});
    history.leaving('github');
    // A create the client discarded: counted, never landed.
    history.paint('github');
    history.paint('github');
    history.landed('github', {title: 'Detail'});
    expect(history.stackOf('github')).toEqual({length: 3, at: 2});
    expect(history.neighbours('github')).toEqual({back: {step: 0, title: 'List'}});
    expect(history.stepTo('github', 1)).toBeUndefined();
  });

  it('a question-kind create is a placeholder', () => {
    const {history, live} = setup();
    live.set('github', copy('github:list', 'list'));
    history.paint('github');
    history.landed('github', {title: 'List'});
    history.leaving('github');
    live.set('github', copy('github:ask', 'sure?'));
    history.paint('github');
    history.landed('github', {title: 'Confirm', question: true});
    history.leaving('github');
    history.paint('github');
    history.landed('github', {title: 'Done'});
    expect(history.neighbours('github')).toEqual({back: {step: 0, title: 'List'}});
  });

  it('a paint whose slot failed is not returned to', () => {
    const {history, live} = setup();
    live.set('github', copy('github:list', 'list'));
    history.paint('github');
    history.landed('github', {title: 'List'});
    history.leaving('github');
    history.paint('github');
    history.landed('github', {title: 'Broken'});
    history.dropped('github');
    history.leaving('github');
    history.paint('github');
    history.landed('github', {title: 'Retried'});
    expect(history.neighbours('github')).toEqual({back: {step: 0, title: 'List'}});
  });

  it('"Back" alone when the paint named nothing; no neighbours for a source with one paint; nothing for a source that never painted', () => {
    const {history, live} = setup();
    live.set('github', copy('github:list', 'list'));
    history.paint('github');
    history.landed('github', {});
    expect(history.neighbours('github')).toEqual({});
    expect(history.neighbours('gmail')).toBeUndefined();
    history.leaving('github');
    history.paint('github');
    history.landed('github', {title: 'Detail'});
    expect(history.neighbours('github')).toEqual({back: {step: 0}});
    history.stepTo('github', 0);
    expect(history.neighbours('github')).toEqual({forward: {step: 1, title: 'Detail'}});
  });
});

describe('the wiring remembered per combination (task-9.7 decision 3)', () => {
  it('filed under every painted source’s current index, recalled there, absent elsewhere', () => {
    const {history, live} = setup();
    live.set('github', copy('github:list', 'list'));
    live.set('gmail', copy('gmail:inbox', 'inbox'));
    history.paint('github');
    history.landed('github', {title: 'List'});
    history.paint('gmail');
    history.landed('gmail', {title: 'Inbox'});
    history.remember(wiring('over the lists'));
    history.leaving('github');
    history.paint('github');
    history.landed('github', {title: 'Detail'});
    expect(history.recall()).toBeUndefined();
    history.remember(wiring('over the detail'));
    expect(history.stepTo('github', 0)).toBeTruthy();
    expect(history.recall()).toEqual(wiring('over the lists'));
    history.stepTo('github', 1);
    expect(history.recall()).toEqual(wiring('over the detail'));
  });

  it('a later filing at the same combination overwrites the earlier', () => {
    const {history} = setup();
    history.paint('github');
    history.remember(wiring('first'));
    history.remember(wiring('second'));
    expect(history.recall()).toEqual(wiring('second'));
  });

  it('a create that drops steps purges every entry filed with the source at a dropped index (task-9.4 decision 3)', () => {
    const {history, live} = setup();
    live.set('github', copy('github:list', 'list'));
    history.paint('github');
    history.landed('github', {title: 'List'});
    history.remember(wiring('at 0'));
    history.leaving('github');
    history.paint('github');
    history.landed('github', {title: 'Detail'});
    history.remember(wiring('at 1'));
    history.stepTo('github', 0);
    history.paint('github');
    history.landed('github', {title: 'Other'});
    expect(history.recall()).toBeUndefined();
    history.stepTo('github', 0);
    expect(history.recall()).toEqual(wiring('at 0'));
  });
});

describe('listeners and retirement', () => {
  it('every change bumps the version and tells the listeners', () => {
    const {history, live} = setup();
    const listener = vi.fn();
    history.subscribe(listener);
    const before = history.version();
    history.paint('github');
    expect(history.version()).not.toBe(before);
    expect(listener).toHaveBeenCalledTimes(1);
    live.set('github', copy('github:list', 'list'));
    history.landed('github', {title: 'List'});
    history.leaving('github');
    history.paint('github');
    history.landed('github', {title: 'Detail'});
    history.stepTo('github', 0);
    expect(listener.mock.calls.length).toBeGreaterThan(1);
  });

  it('retiring the composition forgets the stacks and the wiring', () => {
    const {history} = setup();
    history.paint('github');
    history.remember(wiring('x'));
    history.retire();
    expect(history.stackOf('github')).toBeUndefined();
    expect(history.combination()).toEqual({});
    expect(history.recall()).toBeUndefined();
  });
});
