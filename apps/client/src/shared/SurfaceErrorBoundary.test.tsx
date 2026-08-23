import {describe, it, expect, afterEach, vi, beforeEach} from 'vitest';
import {render, screen, cleanup} from '@testing-library/react';
import {SurfaceErrorBoundary} from './SurfaceErrorBoundary';

afterEach(cleanup);

// React logs the caught error; keep test output clean.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

function Bomb(): never {
  throw new Error('surface render exploded');
}

describe('SurfaceErrorBoundary', () => {
  it('renders its child when nothing throws', () => {
    render(
      <SurfaceErrorBoundary surfaceId="s1">
        <div>healthy surface</div>
      </SurfaceErrorBoundary>,
    );
    expect(screen.getByText('healthy surface')).toBeInTheDocument();
  });

  it('shows the fallback instead of propagating a render crash', () => {
    render(
      <SurfaceErrorBoundary surfaceId="s1">
        <Bomb />
      </SurfaceErrorBoundary>,
    );
    expect(screen.getByTestId('surface-error-s1')).toBeInTheDocument();
    expect(screen.getByText('This view failed to render.')).toBeInTheDocument();
  });

  it('contains the crash to the failing surface only', () => {
    render(
      <>
        <SurfaceErrorBoundary surfaceId="bad">
          <Bomb />
        </SurfaceErrorBoundary>
        <SurfaceErrorBoundary surfaceId="good">
          <div>still alive</div>
        </SurfaceErrorBoundary>
      </>,
    );
    expect(screen.getByTestId('surface-error-bad')).toBeInTheDocument();
    expect(screen.getByText('still alive')).toBeInTheDocument();
  });
});

describe('SurfaceErrorBoundary — recovery on new content', () => {
  // A streamed surface renders mid-parse: a component can carry `call` before its `args` have
  // arrived, which throws in the renderer's binder. That window is milliseconds long, but a
  // boundary that latched turned it into a surface that stayed dead for the session.
  function Flaky({explode}: {explode: boolean}) {
    if (explode) throw new Error('half-parsed component');
    return <div>recovered surface</div>;
  }

  it('retries once the next message arrives', () => {
    const {rerender} = render(
      <SurfaceErrorBoundary surfaceId="s1" resetKey={0}>
        <Flaky explode />
      </SurfaceErrorBoundary>,
    );
    expect(screen.getByTestId('surface-error-s1')).toBeInTheDocument();

    // Next applied message: same surface, now complete.
    rerender(
      <SurfaceErrorBoundary surfaceId="s1" resetKey={1}>
        <Flaky explode={false} />
      </SurfaceErrorBoundary>,
    );
    expect(screen.getByText('recovered surface')).toBeInTheDocument();
    expect(screen.queryByTestId('surface-error-s1')).not.toBeInTheDocument();
  });

  it('settles into the fallback when the content stays broken', () => {
    const {rerender} = render(
      <SurfaceErrorBoundary surfaceId="s1" resetKey={0}>
        <Flaky explode />
      </SurfaceErrorBoundary>,
    );
    rerender(
      <SurfaceErrorBoundary surfaceId="s1" resetKey={1}>
        <Flaky explode />
      </SurfaceErrorBoundary>,
    );
    expect(screen.getByTestId('surface-error-s1')).toBeInTheDocument();
  });

  it('stays failed while no new content arrives', () => {
    const {rerender} = render(
      <SurfaceErrorBoundary surfaceId="s1" resetKey={7}>
        <Flaky explode />
      </SurfaceErrorBoundary>,
    );
    rerender(
      <SurfaceErrorBoundary surfaceId="s1" resetKey={7}>
        <div>would render</div>
      </SurfaceErrorBoundary>,
    );
    expect(screen.getByTestId('surface-error-s1')).toBeInTheDocument();
  });
});
