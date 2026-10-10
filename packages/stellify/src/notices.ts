/**
 * The ahead-of-the-Store notices (phase-13 decision 14; task-13.4 decision 10): the publisher's
 * own entries flagged by the marketplace, read off `index.json`, told at every contact.
 */
import type {IndexEntry} from '@a2uiverse/sdk';
import type {Notice} from './types.js';

/** The flagged entries among the publisher's, as notices. */
export function noticesOf(entries: readonly IndexEntry[], publisher: string): Notice[] {
  return entries.flatMap(entry => {
    const flag = entry.aheadOfStore;
    if (entry.publisher !== publisher || !flag) return [];
    return [
      {
        appId: entry.appId,
        catalogIds: [...flag.catalogIds],
        ...(flag.version === undefined ? {} : {version: flag.version}),
        seenAt: flag.seenAt,
      },
    ];
  });
}

/** What the Store lacks, in words: the catalog ids it has no artifact for, the version it does not know. */
export function describeLacks(flag: {catalogIds: readonly string[]; version?: string}): string {
  const lacks: string[] = [];
  if (flag.catalogIds.length > 0) {
    lacks.push(
      `catalog${flag.catalogIds.length === 1 ? '' : 's'} ${flag.catalogIds.join(', ')} the Store has no artifact for`,
    );
  }
  if (flag.version !== undefined) lacks.push(`version ${flag.version} the Store does not know`);
  return lacks.join(', and ');
}

/** One line per notice, for the command line. */
export function describeNotice(notice: Notice): string {
  return `notice: ${notice.appId} is ahead of the Store: its card declares ${describeLacks(notice)}; publish it`;
}
