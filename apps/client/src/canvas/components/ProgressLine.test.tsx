/**
 * The progress line under the question: the Planner's wait with its count, a tick per source,
 * the merge in computed words — and the in-flight marker on whatever step is working.
 */
import {describe, it, expect} from 'vitest';
import {screen} from '@testing-library/react';
import {renderWithShell} from '../../../tests/helpers';
import {createCanvasStore} from '../canvasStore';
import {ProgressLine} from './ProgressLine';

const ROSTER = [
  {appId: 'shell', displayName: 'Synthesis'},
  {appId: 'linear', displayName: 'Linear'},
  {appId: 'github', displayName: 'GitHub'},
  {appId: 'circleci', displayName: 'CircleCI'},
];

describe('ProgressLine', () => {
  it('planning: the Planner at work, marked in flight', () => {
    const store = createCanvasStore();
    store.beginPaint('utterance');
    renderWithShell(<ProgressLine state={store.getState()} since={Date.now()} />);
    expect(screen.getByTestId('canvas-pending')).toHaveTextContent(
      'Planning which apps can answer',
    );
  });

  it('merging: every source ticked, the join in flight', () => {
    const store = createCanvasStore();
    store.beginPaint('utterance');
    store.setRoster(ROSTER);
    for (const source of ['linear', 'github', 'circleci']) {
      store.placeFragment(source, {surfaceId: `${source}:x`, source});
    }
    renderWithShell(<ProgressLine state={store.getState()} since={null} />);
    const line = screen.getByTestId('canvas-progress');
    expect(line).toHaveTextContent('LinearGitHubCircleCIJoining Linear, GitHub and CircleCI');
    expect(screen.getByTestId('canvas-pending')).toHaveTextContent(
      'Joining Linear, GitHub and CircleCI',
    );
  });

  it('landed: the line stays, the join in the past tense, nothing in flight', () => {
    const store = createCanvasStore();
    store.setRoster(ROSTER);
    for (const source of ['linear', 'github', 'circleci', 'shell']) {
      store.placeFragment(source, {surfaceId: `${source}:x`, source});
    }
    renderWithShell(<ProgressLine state={store.getState()} since={null} />);
    expect(screen.getByTestId('canvas-progress')).toHaveTextContent(
      'Joined Linear, GitHub and CircleCI',
    );
    expect(screen.queryByTestId('canvas-pending')).toBeNull();
  });

  it('a merge over an entity: the join in the nouns the plan painted (task-7.15)', () => {
    const store = createCanvasStore();
    store.beginPaint('utterance');
    store.setRoster([
      {
        appId: 'shell',
        displayName: 'Synthesis',
        join: {home: 'linear', nouns: {linear: 'issues', github: 'PRs', circleci: 'runs'}},
      },
      ...ROSTER.filter(entry => entry.appId !== 'shell'),
    ]);
    for (const source of ['linear', 'github', 'circleci']) {
      store.placeFragment(source, {surfaceId: `${source}:x`, source});
    }
    renderWithShell(<ProgressLine state={store.getState()} since={null} />);
    expect(screen.getByTestId('canvas-pending')).toHaveTextContent(
      'Joining Linear issues to GitHub PRs and CircleCI runs',
    );
  });

  it("the canvas's error closes the line as an alert, after what the turn did; alone when nothing else is said (task-9.9 decision 20)", () => {
    const store = createCanvasStore();
    store.setRoster(ROSTER);
    for (const source of ['linear', 'github', 'circleci', 'shell']) {
      store.placeFragment(source, {surfaceId: `${source}:x`, source});
    }
    store.reportError('That action failed. The orchestrator did not answer.');
    const {rerender} = renderWithShell(<ProgressLine state={store.getState()} since={null} />);
    expect(screen.getByTestId('canvas-progress')).toHaveTextContent(
      'Joined Linear, GitHub and CircleCIThat action failed. The orchestrator did not answer.',
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'That action failed. The orchestrator did not answer.',
    );
    // The condensed bar's copy says it too, but is not a second alert.
    rerender(<ProgressLine state={store.getState()} since={null} compact />);
    expect(screen.queryByRole('alert')).toBeNull();

    const alone = createCanvasStore();
    alone.reportError('The agent request failed.');
    rerender(<ProgressLine state={alone.getState()} since={null} />);
    expect(screen.getByRole('alert')).toHaveTextContent('The agent request failed.');
  });

  it('a platform answer, no vendor dispatched: no line, no room taken (task-8.7 decision 28)', () => {
    const store = createCanvasStore();
    renderWithShell(<ProgressLine state={store.getState()} since={null} />);
    expect(screen.queryByTestId('canvas-progress')).toBeNull();
  });
});
