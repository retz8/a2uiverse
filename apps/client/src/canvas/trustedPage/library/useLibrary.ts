/**
 * The App Library's reads (task 14.8): the installed apps, every app's accounts, the Store's
 * listings — each app's publisher and the entry the consent card shows — and the update check,
 * run when the App Library is entered (decision 1) and again on Check again or after an update
 * (decision 3). Each answer that arrives after the page has gone, or after a newer check began,
 * is dropped.
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import type {IndexEntry, UpdateState} from '@a2uiverse/sdk';
import {
  checkUpdates,
  readAccounts,
  readInstalled,
  readStoreIndex,
  type InstalledApp,
  type LibraryApp,
} from '../../../orchestratorApi';

export type InstalledRead =
  {status: 'loading'} | {status: 'ready'; apps: InstalledApp[]} | {status: 'unreached'};

/** The update check: running, or its states with when it began; failed when it got no answer. */
export interface CheckRead {
  running: boolean;
  states: ReadonlyMap<string, UpdateState>;
  failed: boolean;
  at?: Date;
}

export interface Library {
  installed: InstalledRead;
  accounts: ReadonlyMap<string, LibraryApp>;
  /** Each listed app's Store entry, by app id; none for an app the Store does not list. */
  listings: ReadonlyMap<string, IndexEntry>;
  check: CheckRead;
  /** Runs the check, then reads the installed list again: the check reaches every card. */
  runCheck: () => Promise<void>;
  readInstalled: () => Promise<void>;
  readAccounts: () => Promise<void>;
}

const NONE = new Map<never, never>();

export function useLibrary(orchestrator: string): Library {
  const [installed, setInstalled] = useState<InstalledRead>({status: 'loading'});
  const [accounts, setAccounts] = useState<ReadonlyMap<string, LibraryApp>>(NONE);
  const [listings, setListings] = useState<ReadonlyMap<string, IndexEntry>>(NONE);
  const [check, setCheck] = useState<CheckRead>({running: true, states: NONE, failed: false});
  const live = useRef(true);
  /** The check in flight: an older one's answer is dropped. */
  const checks = useRef(0);

  const readInstalledNow = useCallback(async () => {
    const apps = await readInstalled(orchestrator);
    if (!live.current) return;
    setInstalled(apps ? {status: 'ready', apps} : {status: 'unreached'});
  }, [orchestrator]);

  const readAccountsNow = useCallback(async () => {
    const apps = await readAccounts(orchestrator);
    if (!live.current || !apps) return;
    setAccounts(new Map(apps.map(app => [app.appId, app])));
  }, [orchestrator]);

  /** The check, its answer set once it lands; whoever starts it says it is running. */
  const checkNow = useCallback(async () => {
    const mine = ++checks.current;
    const at = new Date();
    const states = await checkUpdates(orchestrator);
    if (!live.current || mine !== checks.current) return;
    // The check fetched every card again: the installed list says which this run now holds.
    await readInstalledNow();
    if (!live.current || mine !== checks.current) return;
    setCheck({
      running: false,
      states: new Map((states ?? []).map(state => [state.appId, state])),
      failed: states === null,
      at,
    });
  }, [orchestrator, readInstalledNow]);

  const runCheck = useCallback(() => {
    setCheck(held => ({...held, running: true}));
    return checkNow();
  }, [checkNow]);

  useEffect(() => {
    live.current = true;
    void readInstalledNow();
    void readAccountsNow();
    void readStoreIndex(orchestrator).then(read => {
      if (!live.current || !read.ok) return;
      setListings(new Map(read.value.map(({entry}) => [entry.appId, entry])));
    });
    // Entering the App Library runs the check (task-14.8 decision 1); it starts out running.
    void checkNow();
    return () => {
      live.current = false;
    };
  }, [orchestrator, readInstalledNow, readAccountsNow, checkNow]);

  return {
    installed,
    accounts,
    listings,
    check,
    runCheck,
    readInstalled: readInstalledNow,
    readAccounts: readAccountsNow,
  };
}
