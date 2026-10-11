/**
 * The trusted page on the browser's history (phase-14 decision 11). Opening it pushes its address,
 * so browser Back closes it to the canvas untouched beneath; a move inside it — another tab, Publish,
 * a raise while it is open — replaces that entry, so Back still closes the page rather than walking
 * its tabs. Closing it from the page goes back over the entry it pushed; on a page the address
 * landed on (a reload, a link) there is none, so the page leaves the address in place. An address
 * carrying a page opens it at once.
 */
import type {TrailStore, TrustedPageState} from '../trail/trailStore';
import {addressOf, pageOfAddress} from './address';

export function bindTrustedPageHistory(trail: TrailStore, win: Window = window): () => void {
  const here = () => new URL(win.location.href);
  /** Whether the entry on screen is one this binding pushed, with the canvas's entry behind it. */
  let pushedEntry = false;
  /** Whether this binding has pushed any entry: a page reached by Forward is one of them. */
  let pushedAny = false;
  /** A change the history made itself, which writes nothing back. */
  let following = false;

  const landed = pageOfAddress(here());
  if (landed) trail.openTrustedPage(landed);
  let shown: TrustedPageState | null = trail.getState().trustedPage;

  const unsubscribe = trail.subscribe(() => {
    const next = trail.getState().trustedPage;
    if (next === shown) return;
    const previous = shown;
    shown = next;
    if (following) return;
    if (previous === null && next !== null) {
      win.history.pushState(null, '', addressOf(next, here()));
      pushedEntry = pushedAny = true;
    } else if (next !== null) {
      win.history.replaceState(null, '', addressOf(next, here()));
    } else if (pushedEntry) {
      pushedEntry = false;
      win.history.back();
    } else {
      win.history.replaceState(null, '', addressOf(null, here()));
    }
  });

  const onPopState = () => {
    const page = pageOfAddress(here());
    following = true;
    try {
      if (page) trail.openTrustedPage(page);
      else trail.closeTrustedPage();
    } finally {
      following = false;
    }
    pushedEntry = page !== null && pushedAny;
  };
  win.addEventListener('popstate', onPopState);

  return () => {
    unsubscribe();
    win.removeEventListener('popstate', onPopState);
  };
}
