/**
 * The command palette: the summonable language input — speak and dismiss.
 * Summoning (⌘K, the strip affordance, auto-open) is CanvasApp's job, not the palette's;
 * so is last-intent-wins (the palette itself never blocks).
 */
import {describe, it, expect, vi} from 'vitest';
import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {renderWithShell} from '../../../tests/helpers';
import {Palette} from './Palette';

describe('Palette', () => {
  it('renders nothing while closed', () => {
    renderWithShell(<Palette open={false} onDismiss={() => {}} onSubmit={() => {}} />);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('focuses its input when opened', () => {
    renderWithShell(<Palette open onDismiss={() => {}} onSubmit={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('Enter dispatches the trimmed utterance and clears the input', async () => {
    const onSubmit = vi.fn();
    renderWithShell(<Palette open onDismiss={() => {}} onSubmit={onSubmit} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, '  show my PRs  {Enter}');
    expect(onSubmit).toHaveBeenCalledWith('show my PRs');
    expect(input).toHaveValue('');
  });

  it('Enter on an empty input dispatches nothing', async () => {
    const onSubmit = vi.fn();
    renderWithShell(<Palette open onDismiss={() => {}} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByRole('textbox'), '{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Escape dismisses without dispatching', async () => {
    const onDismiss = vi.fn();
    const onSubmit = vi.fn();
    renderWithShell(<Palette open onDismiss={onDismiss} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByRole('textbox'), 'half-typed{Escape}');
    expect(onDismiss).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Escape dismisses even after focus has left the input (clicked outside)', async () => {
    const onDismiss = vi.fn();
    renderWithShell(<Palette open onDismiss={onDismiss} onSubmit={() => {}} />);
    screen.getByRole('textbox').blur();
    expect(screen.getByRole('textbox')).not.toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(onDismiss).toHaveBeenCalled();
  });
});
