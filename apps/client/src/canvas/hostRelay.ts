/**
 * The one seam between the shell catalog and the canvas (SPEC §7; task-6.5 decisions 2–4,
 * task-7.7 decision 11). The catalog is built once, at the entry, before any canvas exists — what
 * it takes from its host has to be bound to a canvas later. The relay is that host: the
 * shell-action, navigation, press and sign-in handlers forward to whatever the canvas bound, a raise
 * that arrives with nothing bound dropped; the source-name lookup answers from the bound canvas
 * and with nothing otherwise, so the source id stands in.
 */
import type {
  CellTarget,
  NavigationHandler,
  PressHandler,
  ShellAction,
  ShellActionHandler,
  SignInHandler,
  SourceName,
} from '@a2uiverse/shell-catalog';

/** What the shell catalog takes from its host. */
export interface ShellHost {
  onShellAction: ShellActionHandler;
  onNavigate: NavigationHandler;
  sourceName: SourceName;
  /** The reader's press — Retry, Include, Try again — on the composition (task 8.5). */
  onPress: PressHandler;
  /** Sign in, Sign in again, Allow and Cancel, inside the click (task 12.8). */
  onSignIn: SignInHandler;
}

export interface HostRelay {
  /** The host the catalog is built with. */
  readonly host: ShellHost;
  /** Bind the canvas's host; the returned function unbinds it. */
  bind(target: ShellHost): () => void;
}

export function createHostRelay(): HostRelay {
  let target: ShellHost | null = null;
  return {
    host: {
      onShellAction: (action: ShellAction) => {
        if (target) target.onShellAction(action);
        else console.warn('[A2UI:shell] shell action raised before the canvas mounted', action);
      },
      onNavigate: (cell: CellTarget) => {
        if (target) target.onNavigate(cell);
        else console.warn('[A2UI:shell] navigation raised before the canvas mounted', cell);
      },
      sourceName: source => target?.sourceName(source),
      onPress: press => {
        if (target) target.onPress(press);
        else console.warn('[A2UI:shell] press raised before the canvas mounted', press);
      },
      onSignIn: request => {
        if (target) target.onSignIn(request);
        else console.warn('[A2UI:shell] sign-in raised before the canvas mounted', request);
      },
    },
    bind: next => {
      target = next;
      return () => {
        if (target === next) target = null;
      };
    },
  };
}
