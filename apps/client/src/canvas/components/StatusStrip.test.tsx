/**
 * The status strip: the thin always-visible region naming the app, and a sticky error. The
 * turn's activity is the progress line's, under the question; the palette affordance is the
 * canvas's floating Ask pill, not strip furniture.
 */
import {describe, it, expect} from 'vitest';
import {screen} from '@testing-library/react';
import {renderWithShell} from '../../../tests/helpers';
import {StatusStrip} from './StatusStrip';

describe('StatusStrip', () => {
  it('idle: shows the quiet identity label, no shortcut hint (the Ask pill carries that)', () => {
    renderWithShell(<StatusStrip error={null} />);
    expect(screen.queryByText(/⌘K/)).toBeNull();
    expect(screen.getByTestId('canvas-status')).toHaveTextContent('A2UIVerse');
  });

  it('carries status only — no buttons live in the strip', () => {
    renderWithShell(<StatusStrip error={null} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('in flight: still names the app — the question and its progress are the canvas head', () => {
    renderWithShell(<StatusStrip error={null} />);
    expect(screen.queryByTestId('canvas-pending')).toBeNull();
    expect(screen.getByTestId('canvas-status')).toHaveTextContent('A2UIVerse');
    expect(screen.getByTestId('canvas-status')).not.toHaveTextContent('open PRs');
  });

  it('error: sticky failure text as an alert', () => {
    renderWithShell(<StatusStrip error="The agent request failed." />);
    expect(screen.getByRole('alert')).toHaveTextContent('The agent request failed.');
  });
});
