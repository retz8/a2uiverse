/**
 * The install and the update from the trusted page (task-14.7 decision 7): one press, the
 * orchestrator's install by app id — an update is the same install over the held app — and its
 * outcome in place: running, done with the other installed apps it updated along with it, named by
 * their cards (decision 2), or refused with its cause (decision 6). Built once, for the Store and
 * the App Library. The press holds its app in the page's installed apps until it ends, so no
 * slot and no other page acts on it meanwhile, and once it lands they are read again (task-15.9
 * decision 1); an install that lands fills the slot the page was opened from, where that slot
 * offered the app (decision 3).
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import type {InstallRefusal} from '@a2uiverse/sdk';
import {installApp, readInstalledApps} from '../../orchestratorApi';
import {useInstalledApps} from '../installedApps';

export type AppAct = 'install' | 'update';

/** The last press's outcome, for the app it was made on. */
export type AppActOutcome =
  | {kind: 'idle'}
  | {kind: 'running'; appId: string; act: AppAct}
  /**
   * Done: the names of the installed apps it updated along with it, and whether the install filled
   * the slot the page was opened from.
   */
  | {kind: 'done'; appId: string; act: AppAct; followed: string[]; fills?: true}
  | {kind: 'refused'; appId: string; act: AppAct; cause: InstallRefusal};

export interface UseAppActOptions {
  orchestrator: string;
  /** The registry changed: the page re-reads what it shows, the loader the builds it now names. */
  onChanged: () => void;
  /** An install landed: whether it filled the slot the page was opened from. */
  onInstalled?: (appId: string) => boolean;
}

export function useAppAct({orchestrator, onChanged, onInstalled}: UseAppActOptions) {
  const {apps} = useInstalledApps();
  const [outcome, setOutcome] = useState<AppActOutcome>({kind: 'idle'});
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  const run = useCallback(
    async (appId: string, act: AppAct) => {
      // One install or update of an app at a time, anywhere on the page.
      if (apps && !apps.hold(appId)) return;
      setOutcome({kind: 'running', appId, act});
      try {
        const answer = await installApp(orchestrator, appId);
        if (!answer.ok) {
          if (live.current) setOutcome({kind: 'refused', appId, act, cause: answer.cause});
          return;
        }
        const installed = answer.followed.length > 0 ? await readInstalledApps(orchestrator) : [];
        const followed = answer.followed.map(
          id => installed.find(app => app.id === id)?.card.name ?? id,
        );
        await apps?.read();
        onChanged();
        const fills = act === 'install' && onInstalled?.(appId) === true;
        if (live.current)
          setOutcome({kind: 'done', appId, act, followed, ...(fills ? {fills: true} : {})});
      } finally {
        apps?.release(appId);
      }
    },
    [apps, orchestrator, onChanged, onInstalled],
  );

  /** A press that could not reach the install: refused with its cause, nothing sent. */
  const refuse = useCallback((appId: string, act: AppAct, cause: InstallRefusal) => {
    setOutcome({kind: 'refused', appId, act, cause});
  }, []);

  return {outcome, run, refuse};
}
