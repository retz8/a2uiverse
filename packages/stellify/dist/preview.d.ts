import { type SmokeRunner } from './transport.js';
import type { PreviewOptions, PreviewResult } from './types.js';
export declare const DEFAULT_CARD_TIMEOUT_MS = 10000;
export declare const DEFAULT_SMOKE_TIMEOUT_MS = 60000;
export declare const CREDENTIAL_NEEDED = "the card requires sign-in: set STELLIFY_CREDENTIAL to a credential of your own for this agent";
export declare const CREDENTIAL_NOT_SENT = "the card requires no sign-in: the credential is not sent, and the marketplace captures this app\u2019s preview itself at publish";
/** Test seams: the transport and the fetch under the card and the marketplace reads. */
export interface PreviewDeps {
    smoke?: SmokeRunner;
    fetchImpl?: typeof fetch;
}
/** The public verb: no transport in its signature, so nothing of the A2A client reaches the API's types. */
export declare function preview(options: PreviewOptions): Promise<PreviewResult>;
export declare function previewWith(options: PreviewOptions, deps: PreviewDeps): Promise<PreviewResult>;
