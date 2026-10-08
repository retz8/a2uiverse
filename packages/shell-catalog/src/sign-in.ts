/**
 * The fifth seam between the shell catalog and its host (task-12.3 decision 2): sign-in. The
 * authority tile's Sign in and Sign in again, the quiet line's Sign in and the escalation card's
 * Allow start a sign-in for one source; Cancel stops it. The host opens the sign-in window, so the
 * handler is called synchronously inside the click. Which sources have a sign-in window open is
 * state that changes over time, like `SlotStateContext`, and the catalog draws the waiting form
 * from it; the handler goes on `createCatalog`'s options. Neither carries scopes: the orchestrator
 * knows what a source is missing, and the client never reads a card.
 */
import {createContext} from 'react';

/**
 * Start or cancel a source's sign-in, and where it was raised. `addAccount` starts a sign-in for
 * the app's next account, from the add-account tile, its source the bare app id (task-12.13
 * decision 27); Cancel stops either.
 */
export interface SignInRequest {
  kind: SignInKind;
  source: string;
  surfaceId: string;
  componentId: string;
}

export type SignInKind = 'start' | 'addAccount' | 'cancel';

export type SignInHandler = (request: SignInRequest) => void;

/** Whether a sign-in window is open for a source, as the host knows it. */
export type SignInResolver = (source: string) => boolean;

/** Default resolver: no sign-in window is open — every surface draws what was painted. */
export const SignInContext = createContext<SignInResolver>(() => false);
