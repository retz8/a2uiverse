/**
 * The ambient notice (task 8.2): agent prose as a transient auto-fading element — the outcome
 * register of phase-8 spec decision 2. Shown, then gone; stored nowhere.
 */
import {describe, it, expect, vi, afterEach} from 'vitest';
import {act, screen} from '@testing-library/react';
import {renderWithShell} from '../../../tests/helpers';
import {AmbientNotice, NOTICE_DURATION_MS} from './AmbientNotice';

afterEach(() => {
  vi.useRealTimers();
});

describe('AmbientNotice', () => {
  it('renders nothing without a notice', () => {
    renderWithShell(<AmbientNotice notice={null} onDismiss={() => {}} />);
    expect(screen.queryByTestId('canvas-notice')).toBeNull();
  });

  it('shows the notice text', () => {
    renderWithShell(
      <AmbientNotice notice={{key: 1, text: 'here are the PRs'}} onDismiss={() => {}} />,
    );
    expect(screen.getByTestId('canvas-notice')).toHaveTextContent('here are the PRs');
  });

  it('auto-dismisses its notice after the fade duration', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    renderWithShell(<AmbientNotice notice={{key: 7, text: 'done'}} onDismiss={onDismiss} />);
    act(() => {
      vi.advanceTimersByTime(NOTICE_DURATION_MS - 1);
    });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledWith(7);
  });

  it('a replacing notice restarts the fade for the new key', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const {rerender} = renderWithShell(
      <AmbientNotice notice={{key: 1, text: 'first'}} onDismiss={onDismiss} />,
    );
    act(() => {
      vi.advanceTimersByTime(NOTICE_DURATION_MS - 1);
    });
    rerender(<AmbientNotice notice={{key: 2, text: 'second'}} onDismiss={onDismiss} />);
    act(() => {
      vi.advanceTimersByTime(NOTICE_DURATION_MS - 1);
    });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledWith(2);
    expect(onDismiss).not.toHaveBeenCalledWith(1);
  });
});
