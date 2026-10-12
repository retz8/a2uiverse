/**
 * The install and the update from the trusted page (task-14.7 decision 7): one press, the
 * orchestrator's install by app id — an update is the same install over the held app — and its
 * outcome in place: running, done with the other installed apps it updated along with it, named by
 * their cards (decision 2), or refused with its cause (decision 6). Built once, for the Store and
 * the App Library.
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import type {InstallRefusal} from '@a2uiverse/sdk';
import {installApp, readInstalledApps} from '../../orchestratorApi';

export type AppAct = 'install' | 'update';

/** The last press's outcome, for the app it was made on. */
export type AppActOutcome =
  | {kind: 'idle'}
  | {kind: 'running'; appId: string; act: AppAct}
  /** Done: the names of the installed apps it updated along with it. */
  | {kind: 'done'; appId: string; act: AppAct; followed: string[]}
  | {kind: 'refused'; appId: string; act: AppAct; cause: InstallRefusal};

export interface UseAppActOptions {
  orchestrator: string;
  /** The registry changed: the page re-reads what it shows, the loader the builds it now names. */
  onChanged: () => void;
}

export function useAppAct({orchestrator, onChanged}: UseAppActOptions) {
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
      setOutcome({kind: 'running', appId, act});
      const answer = await installApp(orchestrator, appId);
      if (!answer.ok) {
        if (live.current) setOutcome({kind: 'refused', appId, act, cause: answer.cause});
        return;
      }
      const installed = answer.followed.length > 0 ? await readInstalledApps(orchestrator) : [];
      const followed = answer.followed.map(
        id => installed.find(app => app.id === id)?.card.name ?? id,
      );
      onChanged();
      if (live.current) setOutcome({kind: 'done', appId, act, followed});
    },
    [orchestrator, onChanged],
  );

  /** A press that could not reach the install: refused with its cause, nothing sent. */
  const refuse = useCallback((appId: string, act: AppAct, cause: InstallRefusal) => {
    setOutcome({kind: 'refused', appId, act, cause});
  }, []);

  return {outcome, run, refuse};
}
