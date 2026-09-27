/**
 * The fragment's history on the client (tasks 9.7, 10.9): each source's paints counted at the wire
 * as the orchestrator counts them and never dropped, the visits the arrows walk, the paint
 * captured as last seen when the reader moves off it, the placeholders the arrows skip, the wiring
 * remembered per combination of the paints on screen.
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

/** A history whose `land` paints a source and lands it under `title`, capturing what it leaves. */
function walker() {
  const {history, live} = setup();
  const land = (source: string, title: string, question = false) => {
    history.leaving(source);
    live.set(source, copy(`${source}:${title}`, title));
    history.paint(source);
    history.landed(source, {title, ...(question ? {question} : {})});
  };
  return {history, live, land};
}

describe('the count', () => {
  it('every create counts a paint of its source, from 0, visited at once — as the orchestrator counts (task-9.4 decision 1)', () => {
    const {history} = setup();
    expect(history.visitsOf('github')).toBeUndefined();
    history.paint('github');
    expect(history.visitsOf('github')).toEqual({visits: [0], at: 0});
    history.paint('github');
    history.paint('gmail');
    expect(history.visitsOf('github')).toEqual({visits: [0, 1], at: 1});
    expect(history.visitsOf('gmail')).toEqual({visits: [0], at: 0});
    expect(history.combination()).toEqual({github: 1, gmail: 0});
  });
});

describe('the visits (task-10.9 decisions 2–4)', () => {
  it('a create after a Back visits where the reader landed, then the new paint; nothing is dropped', () => {
    const {history, land} = walker();
    land('github', 'List');
    land('github', 'Detail');
    land('github', 'Review');
    expect(history.visitsOf('github')).toEqual({visits: [0, 1, 2], at: 2});

    history.stepTo('github', 0);
    history.paint('github');
    expect(history.visitsOf('github')).toEqual({visits: [0, 1, 2, 0, 3], at: 4});
    expect(history.combination()).toEqual({github: 3});
    // Until the create lands the list is on screen, its Back the paint the reader came from.
    expect(history.neighbours('github')).toEqual({back: {step: 2, title: 'Review'}});
    history.leaving('github');
    history.landed('github', {title: 'Other'});
    expect(history.neighbours('github')).toEqual({back: {step: 3, title: 'List'}});

    // Back walks the visits: the list, then the review left behind.
    expect(history.stepTo('github', 3)).toMatchObject({title: 'List', id: 0});
    expect(history.neighbours('github')).toEqual({
      back: {step: 2, title: 'Review'},
      forward: {step: 4, title: 'Other'},
    });
    expect(history.stepTo('github', 2)).toMatchObject({title: 'Review', id: 2});
    expect(history.combination()).toEqual({github: 2});
  });

  it('the paints passed through on the way back are not visited again: runs, a run, its job, Back, Back, another run', () => {
    const {history, land} = walker();
    land('circleci', 'Recent runs');
    land('circleci', 'Run 812');
    land('circleci', 'build-and-test');
    history.stepTo('circleci', 1);
    history.stepTo('circleci', 0);
    land('circleci', 'Run 813');
    expect(history.visitsOf('circleci')).toEqual({visits: [0, 1, 2, 0, 3], at: 4});
    expect(history.stepTo('circleci', 3)).toMatchObject({title: 'Recent runs', id: 0});
    expect(history.stepTo('circleci', 2)).toMatchObject({title: 'build-and-test', id: 2});
    expect(history.neighbours('circleci')).toEqual({
      back: {step: 1, title: 'Run 812'},
      forward: {step: 3, title: 'Recent runs'},
    });
  });

  it('Back and Forward may name the same paint: each lands on its own visit', () => {
    const {history, land} = walker();
    land('gmail', 'Unread');
    land('gmail', 'Thread A');
    history.stepTo('gmail', 0);
    land('gmail', 'Thread B');
    expect(history.visitsOf('gmail')).toEqual({visits: [0, 1, 0, 2], at: 3});
    history.stepTo('gmail', 2);
    history.stepTo('gmail', 1);
    expect(history.neighbours('gmail')).toEqual({
      back: {step: 0, title: 'Unread'},
      forward: {step: 2, title: 'Unread'},
    });
    expect(history.stepTo('gmail', 2)).toMatchObject({title: 'Unread', id: 0});
    expect(history.neighbours('gmail')).toEqual({
      back: {step: 1, title: 'Thread A'},
      forward: {step: 3, title: 'Thread B'},
    });
    history.stepTo('gmail', 1);
    expect(history.stepTo('gmail', 0)).toMatchObject({title: 'Unread', id: 0});
    expect(history.neighbours('gmail')).toEqual({forward: {step: 1, title: 'Thread A'}});
  });

  it('a visit holding the paint on screen is neither a neighbour nor a step', () => {
    const {history, land} = walker();
    land('gmail', 'Unread');
    land('gmail', 'Thread A');
    history.stepTo('gmail', 0);
    land('gmail', 'Question', true);
    history.stepTo('gmail', 2);
    // Visits 0 · 1 · 0 · 2, on the list at 2: the question is a placeholder, the list at 0 is on screen.
    expect(history.neighbours('gmail')).toEqual({back: {step: 1, title: 'Thread A'}});
    expect(history.stepTo('gmail', 0)).toBeUndefined();
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
      id: 0,
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
    expect(history.visitsOf('github')).toEqual({visits: [0, 1, 2], at: 2});
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
  it('filed under every painted source’s paint on screen, recalled there, absent elsewhere', () => {
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

  it('a combination never seen is covered by the entry filed over the most fewer sources, each where it stands now (task-9.9 decision 16)', () => {
    const {history, live} = setup();
    const land = (source: string, text: string) => {
      history.leaving(source);
      live.set(source, copy(`${source}:${text}`, text));
      history.paint(source);
      history.landed(source, {title: text});
    };
    land('github', 'list');
    land('gmail', 'list');
    history.remember(wiring('list-list'));
    land('github', 'detail');
    history.remember(wiring('detail-list'));
    land('calendar', 'list');
    history.remember(wiring('detail-list-calendar'));
    // GitHub back to its list with Calendar painted since: never filed, covered.
    expect(history.stepTo('github', 0)).toBeDefined();
    expect(history.recall()).toBeUndefined();
    expect(history.recallCovering()).toEqual(wiring('list-list'));
    // Forward again: seen; an entry naming GitHub on its list no longer covers.
    history.stepTo('github', 1);
    expect(history.recall()).toEqual(wiring('detail-list-calendar'));
    expect(history.recallCovering()).toEqual(wiring('detail-list'));
  });

  it('a later filing at the same combination overwrites the earlier', () => {
    const {history} = setup();
    history.paint('github');
    history.remember(wiring('first'));
    history.remember(wiring('second'));
    expect(history.recall()).toEqual(wiring('second'));
  });

  it('a paint left by a Back and opened past keeps its wiring: reached again by any route, it is seen (task-10.9 decision 5)', () => {
    const {history, land} = walker();
    land('github', 'List');
    history.remember(wiring('on the list'));
    land('github', 'Detail');
    history.remember(wiring('on the detail'));
    history.stepTo('github', 0);
    land('github', 'Other');
    expect(history.recall()).toBeUndefined();
    history.remember(wiring('on the other'));
    // Visits 0 · 1 · 0 · 2: Back to the list visited again, then to the detail.
    history.stepTo('github', 2);
    expect(history.recall()).toEqual(wiring('on the list'));
    history.stepTo('github', 1);
    expect(history.recall()).toEqual(wiring('on the detail'));
    history.stepTo('github', 3);
    expect(history.recall()).toEqual(wiring('on the other'));
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

  it('retiring the composition forgets the paints, the visits and the wiring', () => {
    const {history} = setup();
    history.paint('github');
    history.remember(wiring('x'));
    history.retire();
    expect(history.visitsOf('github')).toBeUndefined();
    expect(history.combination()).toEqual({});
    expect(history.recall()).toBeUndefined();
  });
});
