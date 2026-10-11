/**
 * The trusted page: the one page over the canvas, opened by a shell action or the entry point
 * (SPEC §7, §9.3). An overlay, not a route — the canvas stays mounted beneath, so Phase 15's resume
 * after an install finds the composition that raised the gap. Drawn to the design canvas of task
 * 14.2: a header with the way back, the Store and the App Library as its two tabs and Publish a mode
 * at its right edge, filled while open (decision 19); under it, the destination's own body. Each tab
 * is a link to its own address, so it opens in a new tab too; a press moves the page to that
 * destination's front.
 *
 * Distinct from `CanvasOverlay`, which mounts a pending question surface.
 */
import {useEffect, useRef, type MouseEvent} from 'react';
import type {TrustedPage, TrustedPageState} from '../trail/trailStore';
import {addressOf} from '../trustedPage/address';

export interface TrustedPageOverlayProps {
  page: TrustedPageState | null;
  onClose: () => void;
  /** A tab or Publish pressed: the page moves to that destination. */
  onNavigate: (page: TrustedPageState) => void;
}

const PAGE_TITLES: Record<TrustedPage, string> = {
  store: 'Store',
  appLibrary: 'App Library',
  publish: 'Publish',
};

const TABS: readonly TrustedPage[] = ['store', 'appLibrary'];

const CloseIcon = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const PublishIcon = () => (
  <svg
    aria-hidden="true"
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M7 9V2.5M4.5 5L7 2.5 9.5 5" />
    <path d="M2.5 9v2.5h9V9" />
  </svg>
);

export function TrustedPageOverlay({page, onClose, onNavigate}: TrustedPageOverlayProps) {
  const root = useRef<HTMLDivElement>(null);
  const open = page !== null;
  // Focus lands on the page as it opens, so the keyboard starts there and not on the canvas beneath.
  useEffect(() => {
    if (open) root.current?.focus();
  }, [open]);
  if (!page) return null;
  const title = PAGE_TITLES[page.page];

  /** A link to a destination's front: its own address, a plain press moving the page in place. */
  const linkTo = (destination: TrustedPage) => ({
    href: addressOf({page: destination}, new URL(window.location.href)),
    ...(page.page === destination ? {'aria-current': 'page' as const} : {}),
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
        return;
      event.preventDefault();
      onNavigate({page: destination});
    },
  });

  return (
    <div
      ref={root}
      tabIndex={-1}
      className="trusted-page"
      data-testid="trusted-page-overlay"
      data-page={page.page}
      data-query={page.query}
      data-app={page.app}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className="trusted-page__head">
        <button
          type="button"
          className="canvas-iconbtn"
          aria-label="Close, back to your canvas"
          title="Back to your canvas"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
        <span className="trusted-page__divider" aria-hidden="true" />
        <nav className="trusted-page__tabs" aria-label="Pages">
          {TABS.map(tab => (
            <a key={tab} className="trusted-page__tab" {...linkTo(tab)}>
              {PAGE_TITLES[tab]}
            </a>
          ))}
        </nav>
        <span className="trusted-page__grow" />
        <a
          className={
            page.page === 'publish'
              ? 'trusted-page__publish trusted-page__publish--on'
              : 'trusted-page__publish'
          }
          {...linkTo('publish')}
        >
          <PublishIcon />
          Publish
        </a>
      </header>
      <main className="trusted-page__main">
        <div className="trusted-page__col">
          {page.query !== undefined && (
            <p className="trusted-page__note" data-testid="trusted-page-query">
              Searching for “{page.query}”
            </p>
          )}
          <p className="trusted-page__note">Not built yet.</p>
        </div>
      </main>
    </div>
  );
}
