/**
 * A link inside the trusted page: its own address, so it opens in a new tab too, and a plain press
 * that moves the page in place — on the history as `history.ts` keeps it (phase-14 decision 11;
 * task-14.11 decision 28).
 */
import type {MouseEvent} from 'react';
import type {TrustedPageState} from '../trail/trailStore';
import {addressOf} from './address';

export function pageLink(
  target: TrustedPageState,
  onNavigate: (page: TrustedPageState) => void,
): {href: string; onClick: (event: MouseEvent<HTMLAnchorElement>) => void} {
  return {
    href: addressOf(target, new URL(window.location.href)),
    onClick: event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
        return;
      event.preventDefault();
      onNavigate(target);
    },
  };
}
