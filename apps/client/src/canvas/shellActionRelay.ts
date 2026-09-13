/**
 * The seam between the shell catalog and the canvas for shell actions (SPEC §7; task-6.5
 * decisions 2–4). The catalog is built once, at the entry, before any canvas exists — its
 * `onShellAction` handler has to be bound to a canvas later. The relay is that handler: it
 * forwards to whatever the canvas bound, and drops a raise that arrives with nothing bound.
 */
import type {ShellAction, ShellActionHandler} from '@a2uiverse/shell-catalog';

export interface ShellActionRelay {
  /** The handler the catalog is built with. */
  readonly handler: ShellActionHandler;
  /** Bind the canvas's handler; the returned function unbinds it. */
  bind(target: ShellActionHandler): () => void;
}

export function createShellActionRelay(): ShellActionRelay {
  let target: ShellActionHandler | null = null;
  return {
    handler: (action: ShellAction) => {
      if (target) target(action);
      else console.warn('[A2UI:shell] shell action raised before the canvas mounted', action);
    },
    bind: next => {
      target = next;
      return () => {
        if (target === next) target = null;
      };
    },
  };
}
