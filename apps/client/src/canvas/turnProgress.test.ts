/**
 * The progress line's reading of the store: planning, a step per source, the merge — every
 * sentence computed from what the client holds, the join's nouns the plan's (task-7.15), the
 * merge's states from what the orchestrator painted and the reader pressed (task 8.5).
 */
import {describe, it, expect} from 'vitest';
import {createCanvasStore, type RosterEntry} from './canvasStore';
import {listed, turnProgress} from './turnProgress';

const ROSTER = [
  {appId: 'shell', displayName: 'Synthesis'},
  {appId: 'linear', displayName: 'Linear'},
  {appId: 'github', displayName: 'GitHub'},
  {appId: 'circleci', displayName: 'CircleCI'},
];

const JOINED: RosterEntry[] = [
  {
    appId: 'shell',
    displayName: 'Synthesis',
    join: {home: 'linear', nouns: {linear: 'issues', github: 'PRs', circleci: 'runs'}},
  },
  {appId: 'linear', displayName: 'Linear'},
  {appId: 'github', displayName: 'GitHub'},
  {appId: 'circleci', displayName: 'CircleCI'},
];

/** A composition whose merge landed over Linear and GitHub, the turn over. */
function landed() {
  const store = createCanvasStore();
  store.setRoster(JOINED);
  for (const app of ['linear', 'github', 'shell'])
    store.placeFragment(app, {surfaceId: `${app}:s`, source: app});
  store.setMerge({merged: ['linear', 'github']});
  return store;
}

describe('turnProgress', () => {
  it('an utterance in flight with nothing planned is the Planner at work', () => {
    const store = createCanvasStore();
    store.beginPaint('“status” — generating…', 'utterance');
    expect(turnProgress(store.getState())).toEqual({
      working: {kind: 'planning', label: 'Planning which apps can answer'},
      sources: [],
      merge: null,
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

  it('an action inside the composition runs beside its ticks and merge step', () => {
    const store = landed();
    store.beginPaint('Open #8 — generating…', 'surface-action');
    const progress = turnProgress(store.getState());
    expect(progress.working).toEqual({kind: 'other', label: 'Open #8 — generating…'});
    expect(progress.sources.map(s => s.appId)).toEqual(['linear', 'github', 'circleci']);
    expect(progress.merge).not.toBeNull();
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
    // One arrived, one failed: no merge is possible yet, so the step waits for the one still out.
    expect(progress.merge).toEqual({
      text: 'Waiting for GitHub, then joining',
      status: 'working',
    });
    store.placeFragment('github', {surfaceId: 'github:s', source: 'github'});
    expect(turnProgress(store.getState()).merge).toEqual({
      text: 'Joining Linear and GitHub · without CircleCI',
      status: 'working',
    });
  });

  it('a source that answered in words without painting has answered', () => {
    const store = createCanvasStore();
    store.beginPaint('“status” — generating…', 'utterance');
    store.setRoster(ROSTER);
    store.appendProse('github', 'You have no open pull requests.');
    expect(turnProgress(store.getState()).sources[1]?.status).toBe('done');
  });

  it('a Retry brings the spinner back at the press, long after the turn ended', () => {
    const store = landed();
    store.mergeSlotStates(new Map([['circleci', 'failed' as const]]));
    expect(turnProgress(store.getState()).sources[2]?.status).toBe('failed');
    const key = store.addPress({kind: 'retry', sources: ['circleci']});
    expect(turnProgress(store.getState()).sources[2]?.status).toBe('working');
    store.updatePress(key, 'running');
    store.mergeSlotStates(new Map([['circleci', 'pending' as const]]));
    expect(turnProgress(store.getState()).sources[2]?.status).toBe('working');
    store.removePress(key);
    expect(turnProgress(store.getState()).sources[2]?.status).toBe('idle');
  });

  it('the merge is joined once its slot is placed, and stays after the turn ends', () => {
    const store = createCanvasStore();
    store.beginPaint('“status” — generating…', 'utterance');
    store.setRoster(ROSTER);
    for (const app of ['linear', 'github', 'circleci', 'shell'])
      store.placeFragment(app, {surfaceId: `${app}:s`, source: app});
    store.endPaint();
    expect(turnProgress(store.getState()).merge).toEqual({
      text: 'Joined Linear, GitHub and CircleCI',
      status: 'done',
    });
  });

  it('a merge never painted by the end did not join', () => {
    const unfinished = createCanvasStore();
    unfinished.setRoster(ROSTER);
    expect(turnProgress(unfinished.getState()).merge).toEqual({
      text: 'Could not join Linear, GitHub and CircleCI',
      status: 'failed',
    });
  });

  it('a merge over an entity names the rows’ app first, each app with its noun', () => {
    const store = createCanvasStore();
    store.beginPaint('“status” — generating…', 'utterance');
    store.setRoster([JOINED[0]!, JOINED[2]!, JOINED[1]!, JOINED[3]!]);
    // Nothing arrived: the plan in one sentence (task-8.7 decision 20, shortened on case 9).
    expect(turnProgress(store.getState()).merge?.text).toBe(
      'Joining Linear issues to GitHub PRs and CircleCI runs',
    );
    for (const app of ['linear', 'github'])
      store.placeFragment(app, {surfaceId: `${app}:s`, source: app});
    // The home source and one other arrived: joining them, the straggler said still loading.
    expect(turnProgress(store.getState()).merge?.text).toBe(
      'Joining Linear issues to GitHub PRs · CircleCI runs still loading',
    );
    store.placeFragment('circleci', {surfaceId: 'circleci:s', source: 'circleci'});
    expect(turnProgress(store.getState()).merge?.text).toBe(
      'Joining Linear issues to GitHub PRs and CircleCI runs',
    );
  });

  it('a union join names the thing across the sources (task-8.7 decision 30)', () => {
    const store = createCanvasStore();
    store.beginPaint('“cameras” — generating…', 'utterance');
    store.setRoster([
      {
        appId: 'shell',
        displayName: 'Synthesis',
        join: {home: null, entity: 'cameras', nouns: {'shop-a': 'cameras', 'shop-b': 'cameras'}},
      },
      {appId: 'shop-a', displayName: 'Aperture & Co'},
      {appId: 'shop-b', displayName: 'Northlight'},
    ]);
    const text = () => turnProgress(store.getState()).merge?.text;
    expect(text()).toBe('Joining cameras across Aperture & Co and Northlight');
    store.placeFragment('shop-a', {surfaceId: 'shop-a:s', source: 'shop-a'});
    // One arrived among peers: no home exemption, the other awaited.
    expect(text()).toBe('Waiting for Northlight cameras, then joining');
    store.placeFragment('shop-b', {surfaceId: 'shop-b:s', source: 'shop-b'});
    store.placeFragment('shell', {surfaceId: 'shell:s', source: 'shell'});
    store.setMerge({merged: ['shop-a', 'shop-b']});
    expect(text()).toBe('Joined cameras across Aperture & Co and Northlight');
  });

  it('under a join, the home source alone still loading: waiting for it, then joining', () => {
    const store = createCanvasStore();
    store.beginPaint('“status” — generating…', 'utterance');
    store.setRoster(JOINED);
    store.placeFragment('github', {surfaceId: 'github:s', source: 'github'});
    expect(turnProgress(store.getState()).merge?.text).toBe(
      'Waiting for Linear issues and CircleCI runs, then joining',
    );
    store.mergeSlotStates(new Map([['circleci', 'failed' as const]]));
    expect(turnProgress(store.getState()).merge).toEqual({
      text: 'Waiting for Linear issues, then joining',
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
    expect(turnProgress(store.getState()).merge?.text).toBe('Could not join GitHub PRs and Gmail');
  });

  it('a single-source turn has no merge step', () => {
    const store = createCanvasStore();
    store.setRoster([{appId: 'github', displayName: 'GitHub'}]);
    expect(turnProgress(store.getState()).merge).toBeNull();
  });
});

describe('the merge step, landed without a source', () => {
  it('failed: no runs to join, after the design canvas’s F6', () => {
    const store = landed();
    store.mergeSlotStates(new Map([['circleci', 'failed' as const]]));
    expect(turnProgress(store.getState()).merge).toEqual({
      text: 'Joined Linear issues to GitHub PRs · no CircleCI runs to join',
      status: 'done',
    });
  });

  it('still loading, arrived after this merge, being included, couldn’t include', () => {
    const store = landed();
    const text = () => turnProgress(store.getState()).merge?.text;
    expect(text()).toBe('Joined Linear issues to GitHub PRs · CircleCI runs still loading');
    store.placeFragment('circleci', {surfaceId: 'circleci:s', source: 'circleci'});
    store.setMerge({merged: ['linear', 'github'], late: ['circleci']});
    expect(text()).toBe('Joined Linear issues to GitHub PRs · CircleCI runs not in this view yet');
    const key = store.addPress({kind: 'include', sources: ['circleci']});
    expect(text()).toBe('Joined Linear issues to GitHub PRs · including CircleCI runs');
    store.removePress(key);
    store.setMerge({
      merged: ['linear', 'github'],
      late: ['circleci'],
      callFailed: {kind: 'include', sources: ['circleci']},
    });
    expect(text()).toBe('Joined Linear issues to GitHub PRs · couldn’t include CircleCI runs');
  });

  it('with no noun, a failed source is left out by name', () => {
    const store = createCanvasStore();
    store.setRoster([
      {appId: 'shell', displayName: 'Synthesis'},
      {appId: 'github', displayName: 'GitHub'},
      {appId: 'gmail', displayName: 'Gmail'},
      {appId: 'calendar', displayName: 'Google Calendar'},
    ]);
    for (const app of ['github', 'gmail', 'shell'])
      store.placeFragment(app, {surfaceId: `${app}:s`, source: app});
    store.setMerge({merged: ['github', 'gmail']});
    store.mergeSlotStates(new Map([['calendar', 'failed' as const]]));
    expect(turnProgress(store.getState()).merge?.text).toBe(
      'Joined GitHub and Gmail · without Google Calendar',
    );
  });

  it('a Try again re-walking the view is joining again', () => {
    const store = landed();
    store.setMerge({merged: ['linear', 'github'], working: {sources: []}});
    expect(turnProgress(store.getState()).merge).toEqual({
      text: 'Joining Linear issues to GitHub PRs',
      status: 'working',
    });
  });
});

describe('the merge step, collapsed', () => {
  const collapsed = () => {
    const store = createCanvasStore();
    store.setRoster(JOINED);
    for (const app of ['github', 'circleci'])
      store.placeFragment(app, {surfaceId: `${app}:s`, source: app});
    store.mergeSlotStates(new Map([['shell', 'collapsed' as const]]));
    return store;
  };

  it('declined: its own sentence in the client’s words', () => {
    const store = collapsed();
    store.setMerge({declined: {reason: 'Nothing lines up.'}});
    expect(turnProgress(store.getState()).merge).toEqual({
      text: 'Found nothing to join across GitHub PRs and CircleCI runs',
      status: 'idle',
    });
  });

  it('declined: a source that answered since is not among what found nothing to join', () => {
    const store = collapsed();
    store.setMerge({declined: {reason: 'Nothing lines up.'}});
    store.placeFragment('linear', {surfaceId: 'linear:s', source: 'linear'});
    store.setMerge({declined: {reason: 'Nothing lines up.'}, late: ['linear']});
    expect(turnProgress(store.getState()).merge).toEqual({
      text: 'Found nothing to join across GitHub PRs and CircleCI runs · Linear issues answered since',
      status: 'idle',
    });
    // Include makes the merge over every arrived source, the late one among them.
    store.addPress({kind: 'include', sources: ['linear']});
    expect(turnProgress(store.getState()).merge?.text).toBe(
      'Joining Linear issues to GitHub PRs and CircleCI runs',
    );
  });

  it('the home source failed, too few answered, couldn’t be made', () => {
    const store = collapsed();
    const text = () => turnProgress(store.getState()).merge?.text;
    store.setMerge({collapse: {cause: 'home', home: 'Linear issues'}});
    expect(text()).toBe('Can’t join without Linear issues');
    store.setMerge({collapse: {cause: 'few', answered: ['GitHub']}});
    expect(text()).toBe('Only GitHub answered, nothing to join');
    store.setMerge({collapse: {cause: 'few', answered: []}});
    expect(text()).toBe('No app answered, nothing to join');
    store.setMerge({collapse: {cause: 'unmade'}});
    expect(turnProgress(store.getState()).merge).toEqual({
      text: 'Could not join Linear issues to GitHub PRs and CircleCI runs',
      status: 'failed',
    });
  });

  it('a Retry that could bring it back: waiting; a press making it: joining', () => {
    const store = collapsed();
    store.setMerge({collapse: {cause: 'home', home: 'Linear issues'}, retrying: ['linear']});
    expect(turnProgress(store.getState()).merge).toEqual({
      text: 'Waiting for Linear issues, then joining',
      status: 'working',
    });
    store.setMerge({collapse: {cause: 'unmade'}, working: {sources: []}});
    expect(turnProgress(store.getState()).merge).toEqual({
      text: 'Joining GitHub PRs and CircleCI runs',
      status: 'working',
    });
  });
});

describe('listed', () => {
  it('lists one, two and three plainly', () => {
    expect(listed(['Gmail'])).toBe('Gmail');
    expect(listed(['Gmail', 'Calendar'])).toBe('Gmail and Calendar');
    expect(listed(['Linear', 'GitHub', 'CircleCI'])).toBe('Linear, GitHub and CircleCI');
  });
});

describe('the merge step on a step back (task-9.7 decision 4)', () => {
  it('works while the merged view follows a step to a combination the client has not seen', () => {
    const store = landed();
    store.setMergeFollowingStep(true);
    expect(turnProgress(store.getState()).merge).toEqual({
      text: 'Joining Linear issues to GitHub PRs',
      status: 'working',
    });
    store.setMergeFollowingStep(false);
    expect(turnProgress(store.getState()).merge?.status).toBe('done');
  });
});
