/**
 * Navigation from a merged cell (SPEC §7; phase-7 decisions 8–10; task-7.7 decisions 3, 5, 6): a
 * tap on a derived value lands on the element its target names in the vendor's fragment. The
 * target's key-based pointer is located in the partition now — a position is where an element is
 * at this moment — and looked up in the binding index, degrading to the nearest bound ancestor,
 * then the fragment boundary, then the source's slot when no fragment is mounted for it. Client-
 * local: nothing is sent, nothing is journaled.
 *
 * Landing scrolls the element into view, moves keyboard focus to it, and draws a ring over it in
 * the shell's own layer. The shell never styles inside a fragment: the one thing written into a
 * vendor's element is a `tabindex` it carries while it holds the focus.
 */
import {locatePointer, PointerSyntaxError} from '@a2uiverse/sdk';
import type {CellTarget} from '@a2uiverse/shell-catalog';
import {FRAGMENT_BOUNDARY_ATTR} from '../composition/FragmentBoundary';
import type {BindingIndex} from './bindingIndex';

/** How long the ring stays; a starting value, adjusted in 7.9's live sitting. */
export const RING_MS = 1500;

export const RING_CLASS = 'canvas-landing-ring';

/** Where a navigation ended: the bound element, or how far it degraded. */
export type LandingKind = 'bound' | 'boundary' | 'slot';

export interface Landing {
  kind: LandingKind;
  element: HTMLElement;
}

function locate(index: BindingIndex, target: CellTarget): string {
  try {
    return locatePointer(index.modelOf(target.surface), target.pointer).path;
  } catch (error) {
    if (error instanceof PointerSyntaxError) return '';
    throw error;
  }
}

const attr = (name: string, value: string) => `[${name}="${CSS.escape(value)}"]`;

/** The element a target lands on; undefined when its source holds no slot on this canvas. */
export function resolveLanding(index: BindingIndex, target: CellTarget): Landing | undefined {
  const bound = index.nearest(target.surface, locate(index, target));
  if (bound) return {kind: 'bound', element: bound};
  const boundary = document.querySelector<HTMLElement>(
    `[${FRAGMENT_BOUNDARY_ATTR}]${attr('data-surface', target.surface)}`,
  );
  if (boundary) return {kind: 'boundary', element: boundary};
  const slot = document.querySelector<HTMLElement>(attr('data-slot', target.app));
  return slot ? {kind: 'slot', element: slot} : undefined;
}

function reducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function focus(element: HTMLElement): void {
  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '-1');
    element.addEventListener('blur', () => element.removeAttribute('tabindex'), {once: true});
  }
  element.focus({preventScroll: true});
}

function inView(element: HTMLElement): boolean {
  const box = element.getBoundingClientRect();
  return box.top >= 0 && box.bottom <= window.innerHeight;
}

/** How long a landing waits for its scroll to end before it takes the focus anyway. */
export const SCROLL_SETTLE_MS = 700;

/**
 * Scrolls the element to the middle of the view and calls back once the scroll has ended. Focus
 * has to wait for it: a `focus()` during a smooth scroll cancels the scroll where it stands. With
 * reduced motion the scroll is instant and nothing waits. The returned function calls it off.
 */
function scrollTo(element: HTMLElement, arrived: () => void): () => void {
  const smooth = !reducedMotion() && typeof element.scrollIntoView === 'function';
  element.scrollIntoView?.({block: 'center', behavior: smooth ? 'smooth' : 'auto'});
  if (!smooth) {
    arrived();
    return () => {};
  }
  const done = () => {
    cancel();
    // A smooth scroll can stall — a tab in the background animates nothing — or be cut short.
    // Landing is the promise, the glide is not: what is still out of view is brought in at once.
    if (!inView(element)) element.scrollIntoView({block: 'center', behavior: 'auto'});
    arrived();
  };
  // `scrollend` fires on whichever container moved and does not bubble: capture it. Nothing
  // fires when the element already sat in the middle, so the timer is the other way out.
  const timer = window.setTimeout(done, SCROLL_SETTLE_MS);
  const cancel = () => {
    window.clearTimeout(timer);
    window.removeEventListener('scrollend', done, true);
  };
  window.addEventListener('scrollend', done, true);
  return cancel;
}

export interface Navigator {
  navigate(target: CellTarget): void;
}

export function createNavigator(index: BindingIndex): Navigator {
  let clearRing: (() => void) | undefined;
  let cancelScroll: (() => void) | undefined;

  /** The ring follows the element's box while it shows, so a smooth scroll carries it along. */
  const ring = (element: HTMLElement) => {
    clearRing?.();
    const mark = document.createElement('div');
    mark.className = RING_CLASS;
    mark.setAttribute('aria-hidden', 'true');
    if (reducedMotion()) mark.dataset.still = 'true';
    (document.querySelector('.canvas-app') ?? document.body).append(mark);
    let frame = 0;
    const follow = () => {
      if (!element.isConnected) return clear();
      const box = element.getBoundingClientRect();
      Object.assign(mark.style, {
        left: `${box.left}px`,
        top: `${box.top}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
      });
      frame = requestAnimationFrame(follow);
    };
    const timer = window.setTimeout(() => clear(), RING_MS);
    const clear = () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      mark.remove();
      if (clearRing === clear) clearRing = undefined;
    };
    clearRing = clear;
    follow();
  };

  return {
    navigate: target => {
      const landing = resolveLanding(index, target);
      if (!landing) {
        console.warn('[A2UI:shell] navigation names a source with no slot on this canvas', target);
        return;
      }
      const {element} = landing;
      cancelScroll?.();
      ring(element);
      cancelScroll = scrollTo(element, () => focus(element));
    },
  };
}
