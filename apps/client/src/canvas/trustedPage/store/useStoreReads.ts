/**
 * The Store's reads (phase-14 decision 3): every published app, a search, one app — each through
 * the orchestrator, which relays the marketplace and annotates every listing with whether the app
 * is installed and its update state as last computed. Each read says when it is loading and why it
 * has no answer, and is asked again on `retry`. The lists the Store has shown are held while it is
 * open (task-14.11 decision 29): shown again, one is not read again until the registry changes.
 */
import {useCallback, useEffect, useState} from 'react';
import {
  readStoreEntry,
  readStoreIndex,
  searchStore,
  type StoreListing,
  type StoreRead,
} from '../../../orchestratorApi';

export type Loaded<T> =
  | {status: 'loading'}
  | {status: 'ready'; value: T}
  | {status: 'not-published'}
  /** The Store unreached, or its answer unreadable: the page says the Store can't be reached. */
  | {status: 'unreached'};

/** Answers the Store holds while it is open, by what they read, with the registry they were read under. */
export type HeldReads = Map<string, {refresh: number; retries: number; value: Loaded<unknown>}>;

/**
 * A read under `key`, asked again on `retry` or when `refresh` moves — the registry changed under
 * what it shows. With `held`, an answer it holds for `key` under this registry is shown again
 * without asking; Try again still asks.
 */
function useRead<T>(
  read: () => Promise<StoreRead<T>>,
  key: string,
  refresh: number,
  held?: HeldReads,
) {
  const [retries, setRetries] = useState(0);
  const attempt = `${retries}:${refresh}`;
  const [loaded, setLoaded] = useState<{key: string; attempt: string; value: Loaded<T>}>({
    key: '',
    attempt: '',
    value: {status: 'loading'},
  });
  const kept = held?.get(key);
  const keptValue =
    kept && kept.refresh === refresh && kept.retries >= retries
      ? (kept.value as Loaded<T>)
      : undefined;
  useEffect(() => {
    if (keptValue) return;
    let current = true;
    void read().then(answer => {
      if (!current) return;
      const value: Loaded<T> = answer.ok
        ? {status: 'ready', value: answer.value}
        : answer.reason === 'not-published'
          ? {status: 'not-published'}
          : {status: 'unreached'};
      if (value.status === 'ready') held?.set(key, {refresh, retries, value});
      setLoaded({key, attempt, value});
    });
    return () => {
      current = false;
    };
    // `read` is rebuilt every render; `key` names what it reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);
  const retry = useCallback(() => setRetries(n => n + 1), []);
  // An answer held for this read is shown as it is. Another read's answer is not this one's: it is
  // loading. Asked again, an answer on screen stays until the new one lands — the page stays in
  // place after an install (task-14.2 decision 5) — and a read that had none shows it loading.
  const value: Loaded<T> =
    keptValue ??
    (loaded.key !== key
      ? {status: 'loading'}
      : loaded.attempt !== attempt && loaded.value.status !== 'ready'
        ? {status: 'loading'}
        : loaded.value);
  return {loaded: value, retry};
}

/**
 * Every published app, or the search's matches for `query` in rank order — each held in `held`
 * until `refresh` moves.
 */
export function useStoreListings(
  orchestrator: string,
  query: string | undefined,
  held: HeldReads,
  refresh: number,
) {
  return useRead<StoreListing[]>(
    () => (query ? searchStore(orchestrator, query) : readStoreIndex(orchestrator)),
    `${orchestrator}|${query ?? ''}`,
    refresh,
    held,
  );
}

/** One app's listing, read again whenever `refresh` moves. */
export function useStoreListing(orchestrator: string, appId: string, refresh: number) {
  return useRead<StoreListing>(
    () => readStoreEntry(orchestrator, appId),
    `${orchestrator}|${appId}`,
    refresh,
  );
}
