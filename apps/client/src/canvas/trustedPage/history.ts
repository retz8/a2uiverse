/**
 * The trusted page on the browser's history (phase-14 decision 11; task-14.11 decision 28). Opening
 * it pushes its address, so browser Back closes it to the canvas untouched beneath. Opening an app's
 * view from its list — the Store's, the App Library's — pushes the view too, so Back returns to that
 * list, as the view's own way back does, and that way back goes back over the view's entry. Every
 * other move inside the page — another tab, Publish, a search, a view with no list behind it —
 * replaces the entry on screen. Closing it from the page goes back over every entry it pushed; on a
 * page the address landed on (a reload, a link) none is behind, so the page leaves the address in
 * place. An address carrying a page opens it at once.
 */
import type {TrailStore, TrustedPageState} from '../trail/trailStore';
import {addressOf, pageOfAddress} from './address';

/** What this binding writes on each entry it pushes, read back when the browser moves to it. */
interface Entry {
  /** The binding that pushed it: an entry from an earlier load of the page is not this one's. */
  binding: string;
  /** The entries this binding pushed up to this one: 1 the page over the canvas, 2 a view over its list. */
  depth: number;
  /** The list this entry's app view was pushed over. */
  under?: TrustedPageState;
}

export function bindTrustedPageHistory(trail: TrailStore, win: Window = window): () => void {
  const here = () => new URL(win.location.href);
  const binding = Math.random().toString(36).slice(2);
  const ours = (state: unknown): Entry | null =>
    (state as Entry | null)?.binding === binding ? (state as Entry) : null;

  /** The entry on screen, as this binding wrote it; none on the canvas's or a landed page's. */
  let entry: Entry | null = null;
  /** Whether the entry under every one this binding pushed carries a page: the address landed on it. */
  let landed = false;
  /** A close gone back to a landed page's entry, which then takes the page out of the address. */
  let closingLanded = false;
  /** A change the history made itself, which writes nothing back. */
  let following = false;

  const landedOn = pageOfAddress(here());
  if (landedOn) {
    landed = true;
    trail.openTrustedPage(landedOn);
  }
  let shown: TrustedPageState | null = trail.getState().trustedPage;

  const push = (page: TrustedPageState, under?: TrustedPageState) => {
    entry = {binding, depth: (entry?.depth ?? 0) + 1, ...(under ? {under} : {})};
    win.history.pushState(entry, '', addressOf(page, here()));
  };
  const replace = (page: TrustedPageState | null) => {
    if (entry?.under) entry = {binding, depth: entry.depth};
    win.history.replaceState(entry, '', addressOf(page, here()));
  };

  const unsubscribe = trail.subscribe(() => {
    const next = trail.getState().trustedPage;
    if (next === shown) return;
    const previous = shown;
    shown = next;
    if (following) return;
    if (previous === null && next !== null) {
      push(next);
    } else if (next === null) {
      const depth = entry?.depth ?? 0;
      if (depth === 0) return replace(null);
      if (landed) closingLanded = true;
      entry = null;
      win.history.go(-depth);
    } else if (opensViewFromList(previous!, next)) {
      push(next, previous!);
    } else if (entry?.under && samePlace(entry.under, next)) {
      win.history.back();
    } else {
      replace(next);
    }
  });

  const onPopState = (event: PopStateEvent) => {
    entry = ours(event.state);
    if (closingLanded) {
      closingLanded = false;
      landed = false;
      win.history.replaceState(null, '', addressOf(null, here()));
      return;
    }
    const page = pageOfAddress(here());
    following = true;
    try {
      if (page) trail.openTrustedPage(page);
      else trail.closeTrustedPage();
    } finally {
      following = false;
    }
  };
  win.addEventListener('popstate', onPopState);

  return () => {
    unsubscribe();
    win.removeEventListener('popstate', onPopState);
  };
}

/** A move from the Store's or the App Library's list onto one app's view on that page. */
function opensViewFromList(from: TrustedPageState, to: TrustedPageState): boolean {
  return from.page === to.page && from.page !== 'publish' && !from.app && Boolean(to.app);
}

const samePlace = (a: TrustedPageState, b: TrustedPageState) =>
  a.page === b.page &&
  a.query === b.query &&
  a.publisher === b.publisher &&
  a.app === b.app &&
  Boolean(a.form) === Boolean(b.form);
