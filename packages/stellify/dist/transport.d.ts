import type { AgentCard } from '@a2a-js/sdk';
import { type A2uiMessage } from '@a2uiverse/sdk';
/** The final states that end a task as a failure the agent declared itself. */
export declare const FAILED_STATES: ReadonlySet<string>;
export interface SmokeRequest {
    card: AgentCard;
    /** What the request advertises: the app's declared catalog ids plus the basic catalog. */
    entitlement: readonly string[];
    words: string;
    timeoutMs: number;
    /** The credential, as the header the card's scheme names; none for a card that needs no sign-in. */
    headers?: Readonly<Record<string, string>>;
}
/** What the transport saw. */
export type SmokeObservation = 
/** The agent answered HTTP 401. */
{
    kind: 'unauthorized';
}
/** The task ended — a final event or a task in a terminal state — in `state`, with every A2UI message the stream carried, the final status message's auth-required data part when it carried one, and the agent's own words. */
 | {
    kind: 'ended';
    state: string;
    messages: A2uiMessage[];
    data?: unknown;
    text?: string;
}
/** The stream ended with no final event. */
 | {
    kind: 'unfinished';
    messages: A2uiMessage[];
}
/** The request could not be made: unreachable, or past the timeout. */
 | {
    kind: 'error';
    message: string;
};
export type SmokeRunner = (request: SmokeRequest) => Promise<SmokeObservation>;
/** The transport over `@a2a-js/sdk`'s client, a client built per request from the fetched card. */
export declare function a2aSmokeRunner(options?: {
    fetchImpl?: typeof fetch;
}): SmokeRunner;
