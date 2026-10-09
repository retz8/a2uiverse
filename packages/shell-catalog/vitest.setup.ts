import '@testing-library/jest-dom/vitest';

// Time is shown in the viewer's zone (task-12.13 decision 52): the tests view from one zone, so
// what they expect holds on any machine.
process.env.TZ = 'America/New_York';

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
