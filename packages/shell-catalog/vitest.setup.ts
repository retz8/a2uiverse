import '@testing-library/jest-dom/vitest';

// jsdom lacks the pointer-capture and scroll APIs Radix's Select uses; user-event drives it fine once they exist.
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}
if (typeof ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as {ResizeObserver?: unknown}).ResizeObserver = ResizeObserverStub;
}
