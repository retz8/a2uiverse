import '@testing-library/jest-dom/vitest';
import {vi} from 'vitest';

// jsdom does not implement IntersectionObserver. Primer's ActionBar items (IconButton, Divider,
// Group, Menu) subscribe one through `useActionBarItem` to measure overflow, so rendering any
// ActionBar fixture through the renderer throws "IntersectionObserver is not defined". Provide a
// no-op stub: nothing is reported as intersecting, so items render inline (overflow is a
// browser-only concern covered by the Playwright baseline, not the jsdom render tests).
if (typeof globalThis !== 'undefined' && typeof globalThis.IntersectionObserver === 'undefined') {
  class IntersectionObserverStub {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds: ReadonlyArray<number> = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  globalThis.IntersectionObserver =
    IntersectionObserverStub as unknown as typeof IntersectionObserver;
}

// jsdom does not implement window.matchMedia. Primer's Spinner (and any other
// component using the useMedia hook, e.g. prefers-reduced-motion) reads it, so
// provide a minimal no-op shim for the test environment.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

// jsdom has no ResizeObserver; Primer's `useOverflow` constructs one in a passive effect and throws
// without it — used by PageLayout.Pane / .Sidebar (scroll overflow) and by ConfirmationDialog
// (wrapped by TreeView.ErrorDialog, scrollable-body detection). Provide a no-op stub so those regions
// render under vitest (the overflow branch simply never fires — no element overflows).
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

// jsdom does not implement element scrolling. Primer's FilteredActionList (used by SelectPanel)
// scrolls its active descendant into view via `scrollIntoView` → `Element.scrollTo`, which throws
// "not a function" in a passive effect under jsdom. Provide no-op stubs so the panel mounts (scroll
// positioning is a browser-only concern covered by the Playwright baseline, not the render tests).
if (typeof Element !== 'undefined') {
  if (typeof Element.prototype.scrollTo !== 'function') {
    Element.prototype.scrollTo = () => {};
  }
  if (typeof Element.prototype.scrollIntoView !== 'function') {
    Element.prototype.scrollIntoView = () => {};
  }
}

// Primer's TooltipV2 (used by IconButton, e.g. inside TextInput.Action) loads the
// `@oddbird/popover-polyfill` under jsdom, whose `injectStyles` spreads
// `root.adoptedStyleSheets`. jsdom does not implement `adoptedStyleSheets`, so the spread
// throws "not iterable" in a passive effect. Provide a writable, per-node array so the
// polyfill's read-then-assign works and the tooltip renders under vitest.
if (typeof document !== 'undefined' && !('adoptedStyleSheets' in Document.prototype)) {
  const store = new WeakMap<object, unknown[]>();
  const protos: Array<object | undefined> = [
    Document.prototype,
    typeof ShadowRoot !== 'undefined' ? ShadowRoot.prototype : undefined,
  ];
  for (const proto of protos) {
    if (!proto) continue;
    Object.defineProperty(proto, 'adoptedStyleSheets', {
      configurable: true,
      get() {
        let sheets = store.get(this as object);
        if (!sheets) {
          sheets = [];
          store.set(this as object, sheets);
        }
        return sheets;
      },
      set(value: unknown[]) {
        store.set(this as object, value);
      },
    });
  }
}

// Primer announces screen-reader text (e.g. ToggleSwitch's loadingLabel, Button's
// loadingAnnouncement) through a `<live-region>` custom element. Its node build fails to
// upgrade under jsdom, so `announceFromElement` throws in a MutationObserver microtask.
// Pre-register a no-op element: Primer sees one already defined and skips its own, and the
// announcement becomes a harmless no-op (the AT text itself is asserted structurally).
if (typeof customElements !== 'undefined' && !customElements.get('live-region')) {
  class LiveRegionStub extends HTMLElement {
    announce() {
      return {cancel() {}};
    }
    announceFromElement() {
      return {cancel() {}};
    }
    getMessage() {
      return '';
    }
    clear() {}
  }
  customElements.define('live-region', LiveRegionStub);
}
