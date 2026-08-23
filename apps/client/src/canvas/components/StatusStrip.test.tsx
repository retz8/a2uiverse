/**
 * The status strip: the thin always-visible region for the status register — idle hint,
 * in-flight spinner + label, sticky error. Status only: the palette affordance is the canvas's
 * floating Ask pill, not strip furniture.
 */
import {describe, it, expect} from 'vitest';
import {screen} from '@testing-library/react';
import {renderWithShell} from '../../../tests/helpers';
import {createCanvasStore} from '../canvasStore';
import {StatusStrip} from './StatusStrip';

describe('StatusStrip', () => {
  it('idle: shows the quiet identity label, no shortcut hint (the Ask pill carries that)', () => {
    const store = createCanvasStore();
    renderWithShell(<StatusStrip state={store.getState()} />);
    expect(screen.queryByText(/⌘K/)).toBeNull();
    expect(screen.getByTestId('canvas-status')).toHaveTextContent('A2UIVerse');
  });

  it('carries status only — no buttons live in the strip', () => {
    const store = createCanvasStore();
    renderWithShell(<StatusStrip state={store.getState()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('in flight: shows the paint label', () => {
    const store = createCanvasStore();
    store.beginPaint('open PRs — generating…');
    renderWithShell(<StatusStrip state={store.getState()} />);
    expect(screen.getByTestId('canvas-pending')).toHaveTextContent('open PRs — generating…');
  });

  it('error: sticky failure text as an alert', () => {
    const store = createCanvasStore();
    store.reportError('The agent request failed.');
    renderWithShell(<StatusStrip state={store.getState()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('The agent request failed.');
  });
});
