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
    store.beginPaint('“status” — generating…', 'utterance');
    renderWithShell(<ProgressLine state={store.getState()} since={Date.now()} />);
    expect(screen.getByTestId('canvas-pending')).toHaveTextContent(
      'Planning which apps can answer',
    );
  });

  it('merging: every source ticked, the join in flight', () => {
    const store = createCanvasStore();
    store.beginPaint('“status” — generating…', 'utterance');
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

  it('a platform answer, no vendor dispatched: the line is empty', () => {
    const store = createCanvasStore();
    renderWithShell(<ProgressLine state={store.getState()} since={null} />);
    expect(screen.getByTestId('canvas-progress')).toBeEmptyDOMElement();
  });
});
