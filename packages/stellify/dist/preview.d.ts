/**
 * `preview` (SPEC §9.3; phase-13 decision 13; task-13.4 decisions 5–8, 12): the smoke test on the
 * publisher's machine, against their running agent, with their own credential — the paint
 * captured as the document `publish` sends for an app whose card requires sign-in, and the
 * developer's look at what the Store will show for any app. The card is fetched and read, the
 * credential's header chosen from it, each handed artifact gated, the schema of a catalog the marketplace holds
 * fetched from it, one request sent, the answer judged as the marketplace judges a live paint, the
 * paint checked through the sdk and kept as it judged it, settled. Every failure is a finding, never
 * a throw.
 */
import type { AgentCard } from '@a2a-js/sdk';
import { type ExtendedCardOptions, type FetchedExtendedCard, type SmokeRunner, type TakenExtendedCard } from '@a2uiverse/smoke-transport';
import type { PreviewOptions, PreviewResult } from './types.js';
export declare const DEFAULT_CARD_TIMEOUT_MS = 10000;
export declare const DEFAULT_SMOKE_TIMEOUT_MS = 60000;
export declare const CREDENTIAL_NEEDED = "the card requires sign-in: set STELLIFY_CREDENTIAL to a credential of your own for this agent";
export declare const CREDENTIAL_NOT_SENT = "the card requires no sign-in: the credential is not sent, and the marketplace captures this app\u2019s preview itself at publish";
/** Test seams: the transport and the fetch under the card and the marketplace reads. */
export interface PreviewDeps {
    smoke?: SmokeRunner;
    fetchImpl?: typeof fetch;
    /** A2A's Get Extended Agent Card over the walk; the dial's own when omitted. */
    extendedCard?: (options: ExtendedCardOptions) => Promise<FetchedExtendedCard>;
}
/** What the publisher reads of the card the agent serves their account (task-20.8 decision 14). */
export declare const ACCOUNT_CARD_READ = "the agent serves your account a card of its own: the request walks its interfaces, as a dispatch to your account will";
/** The note when the agent served the publisher's account no card of its own. */
export declare function noAccountCardNote(taken: TakenExtendedCard, timeoutMs: number): string;
/**
 * The notes on what the account's card names that the platform will not use (task-20.8 decision
 * 5): a sign-in scheme or a scope the public card does not ask, and a catalog id it does not name.
 */
export declare function unusedOnAccountCard(publicCard: AgentCard, accountCard: AgentCard): string[];
/** The public verb: no transport in its signature, so nothing of the A2A SDK's client reaches the API's types. */
export declare function preview(options: PreviewOptions): Promise<PreviewResult>;
export declare function previewWith(options: PreviewOptions, deps: PreviewDeps): Promise<PreviewResult>;
