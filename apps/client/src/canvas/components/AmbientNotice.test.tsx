/**
 * The notice stack: what each source said about the turn, transient and stored nowhere. Each
 * line keeps its own clock, restarted by its own streaming.
 */
import {describe, it, expect, vi, afterEach} from 'vitest';
import {act, render, screen} from '@testing-library/react';
import {AmbientNotice, NOTICE_DURATION_MS} from './AmbientNotice';
import type {RenderedNotice} from '../canvasStore';

const line = (over: Partial<RenderedNotice> = {}): RenderedNotice => ({
  key: 1,
  source: 'github',
  label: 'GitHub',
  text: 'here are the PRs',
  ...over,
});

const noop = () => {};

afterEach(() => {
  vi.useRealTimers();
});

describe('AmbientNotice', () => {
  it('renders nothing with an empty stack', () => {
    render(<AmbientNotice notices={[]} onDismiss={noop} />);
    expect(screen.queryByTestId('canvas-notice-stack')).toBeNull();
  });

  it('names the source of each line and keeps the shell unlabeled', () => {
    render(
      <AmbientNotice
        notices={[line(), line({key: 2, source: null, label: null, text: 'canvas cleared'})]}
        onDismiss={noop}
      />,
    );
    const [fragment, shell] = screen.getAllByTestId('canvas-notice');
    expect(fragment).toHaveTextContent('GitHub');
    expect(fragment).toHaveTextContent('here are the PRs');
    expect(shell).toHaveTextContent('canvas cleared');
    expect(shell.querySelector('.canvas-notice__source')).toBeNull();
  });

  it('renders one line per source, in the order given', () => {
    render(
      <AmbientNotice
        notices={[
          line({key: 1, source: 'github', label: 'GitHub', text: 'four PRs'}),
          line({key: 2, source: 'gmail', label: 'Gmail', text: 'three unread'}),
          line({key: 3, source: 'calendar', label: 'Google Calendar', text: 'two events'}),
        ]}
        onDismiss={noop}
      />,
    );
    expect(
      screen.getAllByTestId('canvas-notice').map(el => el.getAttribute('data-notice-source')),
    ).toEqual(['github', 'gmail', 'calendar']);
  });

  it('each line fades on its own clock, not the turn’s', () => {
    // Sources finish minutes apart over live MCP. A fast source's line must not sit pinned
    // behind a slow one that is still streaming.
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const fast = line({key: 1, source: 'calendar', label: 'Google Calendar', text: 'two events'});
    const slow = line({key: 2, source: 'gmail', label: 'Gmail', text: 'still reading '});
    const {rerender} = render(<AmbientNotice notices={[fast, slow]} onDismiss={onDismiss} />);

    act(() => {
      vi.advanceTimersByTime(NOTICE_DURATION_MS - 1);
    });
    // The slow source is still speaking: its chunk restarts only its own clock.
    rerender(
      <AmbientNotice
        notices={[fast, {...slow, text: 'still reading the inbox'}]}
        onDismiss={onDismiss}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledWith(1);
    expect(onDismiss).not.toHaveBeenCalledWith(2);

    act(() => {
      vi.advanceTimersByTime(NOTICE_DURATION_MS);
    });
    expect(onDismiss).toHaveBeenCalledWith(2);
  });

  it('a still-streaming line never fades mid-sentence', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    let text = 'Here are';
    const {rerender} = render(<AmbientNotice notices={[line({text})]} onDismiss={onDismiss} />);
    // Chunks keep arriving just inside the fade window; the clock keeps restarting.
    for (const chunk of [' the 4 P', 'Rs awaiting', ' your review.']) {
      act(() => {
        vi.advanceTimersByTime(NOTICE_DURATION_MS - 1);
      });
      text += chunk;
      rerender(<AmbientNotice notices={[line({text})]} onDismiss={onDismiss} />);
    }
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(NOTICE_DURATION_MS);
    });
    expect(onDismiss).toHaveBeenCalledWith(1);
  });
});
