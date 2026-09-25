/**
 * The trusted-page layer: the placeholder for the Store and the App Library until Phase 14
 * builds them — the page's name, the query it opened with, and the way back.
 */
import {describe, it, expect, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {TrustedPageOverlay} from './TrustedPageOverlay';

describe('TrustedPageOverlay', () => {
  it('renders nothing while no page is open', () => {
    render(<TrustedPageOverlay page={null} onClose={() => {}} />);
    expect(screen.queryByTestId('trusted-page-overlay')).toBeNull();
  });

  it('names the Store and shows the query it was opened with', () => {
    render(
      <TrustedPageOverlay page={{page: 'store', query: 'flight booking'}} onClose={() => {}} />,
    );
    const overlay = screen.getByRole('dialog', {name: 'Store'});
    expect(overlay).toHaveAttribute('data-page', 'store');
    expect(overlay).toHaveAttribute('data-query', 'flight booking');
    expect(screen.getByTestId('trusted-page-query')).toHaveTextContent('flight booking');
  });

  it('names the App Library, with no query line', () => {
    render(<TrustedPageOverlay page={{page: 'appLibrary'}} onClose={() => {}} />);
    expect(screen.getByRole('dialog', {name: 'App Library'})).toHaveAttribute(
      'data-page',
      'appLibrary',
    );
    expect(screen.queryByTestId('trusted-page-query')).toBeNull();
  });

  it('the way back closes it', async () => {
    const onClose = vi.fn();
    render(<TrustedPageOverlay page={{page: 'store'}} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', {name: 'Back to the canvas'}));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
