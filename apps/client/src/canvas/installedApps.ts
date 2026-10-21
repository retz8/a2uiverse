/**
 * The installed apps the client holds (task-15.4 decision 14, task-15.9 decision 1): each app's
 * card version and name as the registry lists them — read at boot and after every install, update
 * and uninstall made through the page or a slot — and the apps a press holds. An install or update
 * under way anywhere — a slot on any canvas, the Store, the App Library — holds its app, and so does
 * a slot's press while its entry is read again and its consent card is open: every Install, Update
 * and Show it here for that app waits until it ends. One for the page, read by the slots, the Store
 * and the App Library alike.
 */
import {createContext, useContext, useSyncExternalStore} from 'react';
import type {InstalledApp} from '../orchestratorApi';

export interface InstalledAppsState {
  /** Each installed app's card version as installed, by app id; empty until the first read lands. */
  versions: ReadonlyMap<string, string>;
  /** Each installed app's name, by app id. */
  names: ReadonlyMap<string, string>;
  /** The apps a press holds, anywhere on the page. */
  held: ReadonlySet<string>;
}

export interface InstalledApps {
  getState(): InstalledAppsState;
  subscribe(listener: () => void): () => void;
  /** Reads the installed apps again; a registry that cannot be read leaves what was held. */
  read(): Promise<void>;
  /** Holds an app for one press; false, holding nothing, when a press already holds it. */
  hold(appId: string): boolean;
  release(appId: string): void;
}

export interface InstalledAppsOptions {
  /** The registry's installed apps; null when it cannot be read. */
  read: () => Promise<InstalledApp[] | null>;
}

export function createInstalledApps({read}: InstalledAppsOptions): InstalledApps {
  let state: InstalledAppsState = {versions: new Map(), names: new Map(), held: new Set()};
  const listeners = new Set<() => void>();
  const set = (patch: Partial<InstalledAppsState>) => {
    state = {...state, ...patch};
    for (const listener of listeners) listener();
  };
  /** The read in flight: an older one's answer is dropped. */
  let reads = 0;

  return {
    getState: () => state,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read: async () => {
      const mine = ++reads;
      const apps = await read();
      if (!apps || mine !== reads) return;
      set({
        versions: new Map(apps.map(app => [app.id, app.card.version])),
        names: new Map(apps.map(app => [app.id, app.card.name])),
      });
    },
    hold: appId => {
      if (state.held.has(appId)) return false;
      set({held: new Set(state.held).add(appId)});
      return true;
    },
    release: appId => {
      if (!state.held.has(appId)) return;
      const held = new Set(state.held);
      held.delete(appId);
      set({held});
    },
  };
}

/** The page's holder; none for a page drawn with no holder above it, which holds nothing. */
export const InstalledAppsContext = createContext<InstalledApps | null>(null);

const EMPTY: InstalledAppsState = {versions: new Map(), names: new Map(), held: new Set()};
const NO_SUBSCRIPTION = () => () => {};

/** The page's holder, if any, and what it holds now. */
export function useInstalledApps(): {apps: InstalledApps | null; state: InstalledAppsState} {
  const apps = useContext(InstalledAppsContext);
  const state = useSyncExternalStore(
    apps?.subscribe ?? NO_SUBSCRIPTION,
    apps?.getState ?? (() => EMPTY),
  );
  return {apps, state};
}
