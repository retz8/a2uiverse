/**
 * The progress line's reading of the store: planning, a step per source, the merge — every
 * sentence computed from what the client holds, the join's nouns the plan's (task-7.15).
 */
import {describe, it, expect} from 'vitest';
import {createCanvasStore} from './canvasStore';
import {joinSentence, listed, turnProgress} from './turnProgress';

const ROSTER = [
  {appId: 'shell', displayName: 'Synthesis'},
  {appId: 'linear', displayName: 'Linear'},
  {appId: 'github', displayName: 'GitHub'},
  {appId: 'circleci', displayName: 'CircleCI'},
];

describe('turnProgress', () => {
  it('an utterance in flight with nothing planned is the Planner at work', () => {
    const store = createCanvasStore();
    store.beginPaint('“status” — generating…', 'utterance');
    expect(turnProgress(store.getState())).toEqual({
      working: {kind: 'planning', label: 'Planning which apps can answer'},
      sources: [],
      join: null,
    });
  });

  it('an action in flight says what it is doing, not that it plans', () => {
    const store = createCanvasStore();
    store.beginPaint('Approve — generating…', 'surface-action');
    expect(turnProgress(store.getState()).working).toEqual({
      kind: 'other',
      label: 'Approve — generating…',
    });
  });

  it('a step per vendor source in slot order: done once placed, failed as painted, working until then', () => {
    const store = createCanvasStore();
    store.beginPaint('“status” — generating…', 'utterance');
    store.setRoster(ROSTER);
    store.placeFragment('linear', {surfaceId: 'linear:issues', source: 'linear'});
    store.mergeSlotStates(new Map([['circleci', 'failed' as const]]));
    const progress = turnProgress(store.getState());
    expect(progress.working).toBeNull();
    expect(progress.sources).toEqual([
      {appId: 'linear', name: 'Linear', status: 'done'},
      {appId: 'github', name: 'GitHub', status: 'working'},
      {appId: 'circleci', name: 'CircleCI', status: 'failed'},
    ]);
    expect(progress.join).toEqual({names: ['Linear', 'GitHub', 'CircleCI'], status: 'working'});
  });

  it('a source that answered in words without painting has answered', () => {
    const store = createCanvasStore();
    store.beginPaint('“status” — generating…', 'utterance');
    store.setRoster(ROSTER);
    store.appendProse('github', 'You have no open pull requests.');
    expect(turnProgress(store.getState()).sources[1]?.status).toBe('done');
  });

  it('the merge is joined once its slot is placed, and stays after the turn ends', () => {
    const store = createCanvasStore();
    store.beginPaint('“status” — generating…', 'utterance');
    store.setRoster(ROSTER);
    store.placeFragment('shell', {surfaceId: 'shell:synthesis', source: 'shell'});
    store.endPaint();
    expect(turnProgress(store.getState()).join?.status).toBe('done');
  });

  it('a merge the shell declined in words, or never painted by the end, did not join', () => {
    const declined = createCanvasStore();
    declined.beginPaint('“status” — generating…', 'utterance');
    declined.setRoster(ROSTER);
    declined.appendProse('shell', 'These could not be joined.');
    expect(turnProgress(declined.getState()).join?.status).toBe('failed');

    const unfinished = createCanvasStore();
    unfinished.setRoster(ROSTER);
    expect(turnProgress(unfinished.getState()).join?.status).toBe('failed');
  });

  it('a merge over an entity names the rows’ app first, each app with its noun, in slot order', () => {
    const store = createCanvasStore();
    store.beginPaint('“status” — generating…', 'utterance');
    store.setRoster([
      {
        appId: 'shell',
        displayName: 'Synthesis',
        join: {home: 'linear', nouns: {linear: 'issues', github: 'PRs', circleci: 'runs'}},
      },
      {appId: 'github', displayName: 'GitHub'},
      {appId: 'linear', displayName: 'Linear'},
      {appId: 'circleci', displayName: 'CircleCI'},
    ]);
    expect(turnProgress(store.getState()).join).toEqual({
      home: 'Linear issues',
      names: ['GitHub PRs', 'CircleCI runs'],
      status: 'working',
    });
  });

  it('a join whose home is not among the sources names the apps alone', () => {
    const store = createCanvasStore();
    store.setRoster([
      {appId: 'shell', displayName: 'Synthesis', join: {home: 'jira', nouns: {github: 'PRs'}}},
      {appId: 'github', displayName: 'GitHub'},
      {appId: 'gmail', displayName: 'Gmail'},
    ]);
    expect(turnProgress(store.getState()).join).toEqual({
      names: ['GitHub PRs', 'Gmail'],
      status: 'failed',
    });
  });

  it('a single-source turn has no merge step', () => {
    const store = createCanvasStore();
    store.setRoster([{appId: 'github', displayName: 'GitHub'}]);
    expect(turnProgress(store.getState()).join).toBeNull();
  });
});

describe('the join sentence', () => {
  it('lists the apps and speaks in the tense of where the merge stands', () => {
    const names = ['Linear', 'GitHub', 'CircleCI'];
    expect(joinSentence({names, status: 'working'})).toBe('Joining Linear, GitHub and CircleCI');
    expect(joinSentence({names, status: 'done'})).toBe('Joined Linear, GitHub and CircleCI');
    expect(joinSentence({names, status: 'failed'})).toBe(
      'Could not join Linear, GitHub and CircleCI',
    );
  });

  it('over an entity: the rows’ phrase joined to the others, in the same tenses', () => {
    const join = {home: 'Linear issues', names: ['GitHub PRs', 'CircleCI runs']};
    expect(joinSentence({...join, status: 'working'})).toBe(
      'Joining Linear issues to GitHub PRs and CircleCI runs',
    );
    expect(joinSentence({...join, status: 'done'})).toBe(
      'Joined Linear issues to GitHub PRs and CircleCI runs',
    );
    expect(joinSentence({...join, status: 'failed'})).toBe(
      'Could not join Linear issues to GitHub PRs and CircleCI runs',
    );
  });

  it('lists one and two apps plainly', () => {
    expect(listed(['Gmail'])).toBe('Gmail');
    expect(listed(['Gmail', 'Calendar'])).toBe('Gmail and Calendar');
  });
});
