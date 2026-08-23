import {Component, type ReactNode} from 'react';

type Props = {surfaceId: string; resetKey?: number; children: ReactNode};
type State = {failed: boolean; seenResetKey?: number};

/**
 * Containment for one agent surface: surfaces render progressively from an unvalidated
 * stream, so a bad component must degrade to a fallback note instead of unmounting the
 * whole chat. Keyed per surface — a retried surface mounts a fresh boundary.
 *
 * **Recoverable by design.** A streamed surface is rendered mid-parse, so a component can
 * be momentarily incomplete — a function-call-valued prop carrying `call` before its `args`
 * have arrived makes the renderer's binder throw. That state is transient: the very next
 * message completes the component. A boundary that latched permanently turned a
 * milliseconds-long parse window into a surface that stayed dead for the whole session.
 * `resetKey` is bumped by the caller on every applied message, so each message buys exactly
 * one retry — a genuinely broken component still settles into the fallback instead of
 * looping.
 */
export class SurfaceErrorBoundary extends Component<Props, State> {
  state: State = {failed: false};

  static getDerivedStateFromError(): Partial<State> {
    return {failed: true};
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey === state.seenResetKey) return null;
    // New content arrived: record it, and give a previously failed surface one more chance.
    return {seenResetKey: props.resetKey, failed: false};
  }

  componentDidCatch(error: unknown) {
    console.error(`[A2UI:render] surface ${this.props.surfaceId} failed to render`, error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="chat-surface-error" data-testid={`surface-error-${this.props.surfaceId}`}>
          This view failed to render.
        </div>
      );
    }
    return this.props.children;
  }
}
