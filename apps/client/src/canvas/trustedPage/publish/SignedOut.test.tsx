/** The claim's board when the claim's answer never came and it was read back as kept here. */
import {describe, expect, it, vi} from 'vitest';
import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {renderWithShell} from '../../../../tests/helpers';
import {TokenBoard} from './SignedOut';

describe('TokenBoard with no secret to show (task-14.11 decision 40)', () => {
  it('says the name is yours and kept here, the secret lost on the way, and continues at once', async () => {
    const onContinue = vi.fn();
    renderWithShell(
      <TokenBoard
        claimed={{ok: true, publisher: 'northlight', token: null, kept: true}}
        onContinue={onContinue}
      />,
    );
    const board = screen.getByTestId('publish-token');
    expect(board).toHaveTextContent('“northlight” is yours');
    expect(board).toHaveTextContent(
      'This computer keeps your publisher secret (token), so you can publish from here. The connection dropped before the secret reached this page, so it can’t be shown, and it won’t be shown again.',
    );
    expect(screen.queryByRole('checkbox')).toBeNull();
    await userEvent.click(screen.getByRole('button', {name: 'Continue'}));
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
