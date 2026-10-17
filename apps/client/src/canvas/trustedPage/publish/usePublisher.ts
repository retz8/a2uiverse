/**
 * Publish's reads (task-14.9 decision 6): who is signed in — the orchestrator asking the Store
 * whether the held secret is still accepted — and, for a publisher it accepts, the listings through
 * the orchestrator's `listings.json`: the Store's index filtered on the name (phase-14 decision 7),
 * each app's live card read again first (task-14.11 decision 38), by the app's name. Both run when
 * Publish is entered and on Try again; after a publish or an unpublish only the listings are read
 * again.
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {
  readPublisher,
  readPublisherListings,
  type PublisherStatus,
  type StoreListing,
} from '../../../orchestratorApi';

/** Who is signed in, as last read; unreached when the orchestrator could not be asked. */
export type Who =
  {status: 'loading'} | {status: 'unreached'} | {status: 'ready'; value: PublisherStatus};

/** The publisher's listings, as last read. */
export type Listings =
  {status: 'loading'} | {status: 'unreached'} | {status: 'ready'; value: StoreListing[]};

/** Each app by its card's name. */
const byName = (a: StoreListing, b: StoreListing) =>
  a.entry.card.name.localeCompare(b.entry.card.name, 'en', {sensitivity: 'base'});

/** The publisher signed in and accepted by the Store; none otherwise. */
export function acceptedPublisher(who: Who): string | undefined {
  return who.status === 'ready' && who.value.state === 'signed-in' && who.value.store === 'accepted'
    ? who.value.publisher
    : undefined;
}

export function usePublisher(orchestrator: string) {
  const [who, setWho] = useState<Who>({status: 'loading'});
  const [listings, setListings] = useState<Listings>({status: 'loading'});
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  /** The listings of `publisher`, by the app's name. */
  const readListings = useCallback(
    async (publisher: string) => {
      const read = await readPublisherListings(orchestrator, publisher);
      if (!live.current) return;
      setListings(
        read.ok ? {status: 'ready', value: [...read.value].sort(byName)} : {status: 'unreached'},
      );
    },
    [orchestrator],
  );

  /** Who is signed in, and the listings with it for a publisher the Store accepts. */
  const read = useCallback(async () => {
    const status = await readPublisher(orchestrator);
    if (!live.current) return;
    const next: Who = status ? {status: 'ready', value: status} : {status: 'unreached'};
    setWho(next);
    const publisher = acceptedPublisher(next);
    if (publisher) await readListings(publisher);
  }, [orchestrator, readListings]);

  // Entering Publish checks who is signed in; a move inside it does not (task-14.9 decision 6).
  useEffect(() => {
    void read();
  }, [read]);

  /** The check run again — Try again, or who is signed in changed under an act. */
  const check = useCallback(async () => {
    setWho({status: 'loading'});
    setListings({status: 'loading'});
    await read();
  }, [read]);

  /** The listings read again, in place: those on screen stay until the new ones land. */
  const refreshListings = useCallback(() => {
    const publisher = acceptedPublisher(who);
    if (publisher) void readListings(publisher);
  }, [who, readListings]);

  return {who, listings, check, refreshListings};
}
