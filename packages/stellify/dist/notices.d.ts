/**
 * The ahead-of-the-Store notices (phase-13 decision 14; task-13.4 decision 10): the publisher's
 * own entries flagged by the marketplace, read off `index.json`, told at every contact.
 */
import type { IndexEntry } from '@a2uiverse/sdk';
import type { Notice } from './types.js';
/** The flagged entries among the publisher's, as notices. */
export declare function noticesOf(entries: readonly IndexEntry[], publisher: string): Notice[];
/** What the Store lacks, in words: the catalog ids it has no artifact for, the version it does not know. */
export declare function describeLacks(flag: {
    catalogIds: readonly string[];
    version?: string;
}): string;
/** One line per notice, for the command line. */
export declare function describeNotice(notice: Notice): string;
