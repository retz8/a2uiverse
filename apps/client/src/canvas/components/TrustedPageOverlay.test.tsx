/**
 * The trusted page's frame (task-14.2 decisions 18, 19): the way back, the Store and the App Library
 * as its two tabs, Publish a mode at the header's right; each destination's body is its own.
 */
import {describe, it, expect, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {TrustedPageOverlay} from './TrustedPageOverlay';

const noop = () => {};

describe('TrustedPageOverlay', () => {
  it('renders nothing while no page is open', () => {
    render(<TrustedPageOverlay page={null} onClose={noop} onNavigate={noop} />);
    expect(screen.queryByTestId('trusted-page-overlay')).toBeNull();
  });

  it('names the Store and shows the query it was opened with', () => {
    render(
      <TrustedPageOverlay
        page={{page: 'store', query: 'flight booking'}}
        onClose={noop}
        onNavigate={noop}
      />,
    );
    const overlay = screen.getByRole('dialog', {name: 'Store'});
    expect(overlay).toHaveAttribute('data-page', 'store');
    expect(overlay).toHaveAttribute('data-query', 'flight booking');
    expect(screen.getByTestId('trusted-page-query')).toHaveTextContent('flight booking');
  });

  it('names the App Library and the app it opened on', () => {
    render(
      <TrustedPageOverlay
        page={{page: 'appLibrary', app: 'linear'}}
        onClose={noop}
        onNavigate={noop}
      />,
    );
    expect(screen.getByRole('dialog', {name: 'App Library'})).toHaveAttribute('data-app', 'linear');
    expect(screen.queryByTestId('trusted-page-query')).toBeNull();
  });

  it('marks the tab of the destination open; Publish is no tab', () => {
    render(<TrustedPageOverlay page={{page: 'appLibrary'}} onClose={noop} onNavigate={noop} />);
    const tabs = screen.getByRole('navigation', {name: 'Pages'});
    expect(tabs).toHaveTextContent('StoreApp Library');
    expect(screen.getByRole('link', {name: 'App Library'})).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', {name: 'Store'})).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', {name: 'Publish'})).not.toHaveAttribute('aria-current');
  });

  it('Publish, open, is filled and no tab is marked', () => {
    render(<TrustedPageOverlay page={{page: 'publish'}} onClose={noop} onNavigate={noop} />);
    expect(screen.getByRole('dialog', {name: 'Publish'})).toHaveAttribute('data-page', 'publish');
    const publish = screen.getByRole('link', {name: 'Publish'});
    expect(publish).toHaveAttribute('aria-current', 'page');
    expect(publish).toHaveClass('trusted-page__publish--on');
    expect(screen.getByRole('link', {name: 'Store'})).not.toHaveAttribute('aria-current');
  });

  it('a tab or Publish moves the page to that destination, at its front', async () => {
    const onNavigate = vi.fn();
    render(
      <TrustedPageOverlay
        page={{page: 'store', query: 'mail'}}
        onClose={noop}
        onNavigate={onNavigate}
      />,
    );
    await userEvent.click(screen.getByRole('link', {name: 'App Library'}));
    await userEvent.click(screen.getByRole('link', {name: 'Publish'}));
    await userEvent.click(screen.getByRole('link', {name: 'Store'}));
    expect(onNavigate.mock.calls).toEqual([
      [{page: 'appLibrary'}],
      [{page: 'publish'}],
      [{page: 'store'}],
    ]);
  });

  it('each tab carries its own address, so it opens in a new tab too', () => {
    render(<TrustedPageOverlay page={{page: 'store'}} onClose={noop} onNavigate={noop} />);
    expect(screen.getByRole('link', {name: 'App Library'}).getAttribute('href')).toMatch(
      /[?&]page=library(&|$)/,
    );
    expect(screen.getByRole('link', {name: 'Publish'}).getAttribute('href')).toMatch(
      /[?&]page=publish(&|$)/,
    );
  });

  it('the way back closes it', async () => {
    const onClose = vi.fn();
    render(<TrustedPageOverlay page={{page: 'store'}} onClose={onClose} onNavigate={noop} />);
    await userEvent.click(screen.getByRole('button', {name: 'Close, back to your canvas'}));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
