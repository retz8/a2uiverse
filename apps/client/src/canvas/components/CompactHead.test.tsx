/**
 * The header condensed: nothing while the full header is in view; once it has scrolled out, the
 * question on one line, the progress beside it while the turn runs, and the way back into the
 * palette.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, fireEvent, screen} from '@testing-library/react';
import {createRef} from 'react';
import {renderWithShell} from '../../../tests/helpers';
import {createCanvasStore} from '../canvasStore';
import {CompactHead} from './CompactHead';

/** One IntersectionObserver the test drives by hand. */
let report: ((intersecting: boolean) => void) | undefined;
class FakeObserver {
  constructor(callback: IntersectionObserverCallback) {
    report = intersecting =>
      callback(
        [{isIntersecting: intersecting} as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
  }
  observe() {}
  disconnect() {}
}

beforeEach(() => vi.stubGlobal('IntersectionObserver', FakeObserver));
afterEach(() => {
  vi.unstubAllGlobals();
  report = undefined;
});

const question = {text: "what's the status of what I'm working on?", askedAt: Date.now()};

function setup(inFlight: boolean) {
  const store = createCanvasStore();
  if (inFlight) store.beginPaint('“status” — generating…', 'utterance');
  const scroller = createRef<HTMLElement>();
  const head = createRef<HTMLElement>();
  const onEdit = vi.fn();
  renderWithShell(
    <section ref={scroller}>
      <CompactHead
        scroller={scroller}
        head={head}
        question={question}
        state={store.getState()}
        showProgress
        onEdit={onEdit}
      />
      <header ref={head} />
    </section>,
  );
  return {onEdit};
}

describe('CompactHead', () => {
  it('draws nothing while the full header is in view', () => {
    setup(true);
    act(() => report?.(true));
    expect(screen.queryByTestId('canvas-compact-head')).toBeNull();
  });

  it('once the header has scrolled out: the question on one line and the running progress, no second live region', () => {
    setup(true);
    act(() => report?.(false));
    const bar = screen.getByTestId('canvas-compact-head');
    expect(bar).toHaveTextContent(question.text);
    const progress = screen.getByTestId('canvas-progress-compact');
    expect(progress).toHaveTextContent('Planning which apps can answer');
    expect(progress).not.toHaveAttribute('aria-live');
    expect(screen.queryByTestId('canvas-pending')).toBeNull();
    act(() => report?.(true));
    expect(screen.queryByTestId('canvas-compact-head')).toBeNull();
  });

  it('after the turn lands it carries the question alone, which opens the palette with it', () => {
    const {onEdit} = setup(false);
    act(() => report?.(false));
    expect(screen.queryByTestId('canvas-progress-compact')).toBeNull();
    fireEvent.click(screen.getByRole('button', {name: question.text}));
    expect(onEdit).toHaveBeenCalledWith(question.text);
  });
});
