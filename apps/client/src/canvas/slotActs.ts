/**
 * The slot's Install, Update and Show it here (SPEC §7; task 15.9), raised by the shell catalog
 * inside the click with the button pressed (task-15.8 decision 1). Install reads the app's Store
 * entry again — the press and the app held meanwhile, its words unchanged (decision 7) — and asks
 * on the consent card floating over the slot (decision 2); an app the entry says is installed
 * already, made outside the page, fills the slot with no card (task-15.4 decision 14). Update goes
 * straight through, or through the card when it asks for more (task-15.5 decision 7). Confirmed, the
 * install on `orchestratorApi`; landed, the installed apps and the catalog table read again, the
 * apps that followed it named in the canvas's notice line (decision 4), and the press that fills
 * the slot: `useApp` on an offer, the slot's Retry on an update tile. Refused, the Store's cause on
 * the slot until its next press (decision 5). Show it here is the fill press alone.
 *
 * One install or update of an app at a time, anywhere (decision 1): a press holds its app in the
 * page's installed apps from the press until it lands, is refused or is cancelled. The card closes
 * as Cancel once the person leaves its canvas — another canvas on screen, the trusted page open.
 *
 * Beside them, the Store page opened from a slot (decision 3): the slot a shell action opens it
 * from, and an install there filling that slot while it is still an unfilled offer of the app.
 */
import {refusalOf, type CompositionOperation, type InstallRefusal} from '@a2uiverse/sdk';
import type {AppActRequest, AppActSlot, AppActState, ShellAction} from '@a2uiverse/shell-catalog';
import type {InstallAnswer, StoreListing, StoreRead} from '../orchestratorApi';
import type {CanvasRuntime} from './canvasRuntime';
import {appActOf, type CanvasState} from './canvasStore';
import type {InstalledApps, InstalledAppsState} from './installedApps';
import {listed} from './trustedPage/appCard';
import type {ConsentAsk} from './trustedPage/ConsentCard';
import {viewedCanvasId, type SlotOrigin, type TrailStore} from './trail/trailStore';

/** What of a canvas the slot's presses act on. */
export type SlotRuntime = Pick<CanvasRuntime, 'id' | 'store' | 'press' | 'processor'>;

/** The consent card open over a slot. */
export interface SlotConsent {
  /** The canvas whose slot it floats over. */
  canvas: string;
  ask: ConsentAsk;
  /** The button pressed. */
  anchor: HTMLElement;
}

export interface SlotActs {
  /** The card open over a slot, if any. */
  getState(): SlotConsent | null;
  subscribe(listener: () => void): () => void;
  /** The shell catalog's handler: a press in a slot of the canvas on screen. */
  onAppAct(request: AppActRequest): void;
  /** The card's Install or Update. */
  confirm(): void;
  /** Cancel or Not now, Escape, a press outside the card, or the person leaving its canvas. */
  cancel(): void;
  /** The slot a shell action opens the Store from: an unfilled offer of the canvas on screen. */
  originOf(action: ShellAction): SlotOrigin | undefined;
  /**
   * An install on the Store page landed: fills the slot the page was opened from when it is still
   * an unfilled offer of the app, once. True when it did.
   */
  fillFromPage(appId: string): boolean;
}

export interface SlotActsOptions {
  /** The page's installed apps, and the apps a press holds. */
  apps: InstalledApps;
  trail: TrailStore;
  runtimeOf: (id: string) => SlotRuntime | undefined;
  /** The orchestrator's install by app id; an update is the same install over the held app. */
  install: (appId: string) => Promise<InstallAnswer>;
  /** The app's Store entry, read again at the press. */
  readEntry: (appId: string) => Promise<StoreRead<StoreListing>>;
  /** The catalog table read again, and the builds it now names loaded (task-15.6 decision 7). */
  refreshCatalogs: () => void;
}

/** One press in a slot, from the click until it lands, is refused or is cancelled. */
interface Job {
  runtime: SlotRuntime;
  slot: AppActSlot;
  appId: string;
  act: 'install' | 'update';
  /** The press that fills the slot once the app is in. */
  fill: CompositionOperation;
}

/** A slot's props as painted: what an offer and the slot it becomes carry. */
interface PaintedSlot {
  gap?: unknown;
  source?: unknown;
  installed?: unknown;
  offer?: {apps?: {appId?: unknown}[]; none?: unknown};
}

export function createSlotActs({
  apps,
  trail,
  runtimeOf,
  install,
  readEntry,
  refreshCatalogs,
}: SlotActsOptions): SlotActs {
  let consent: SlotConsent | null = null;
  /** The press asking: its entry being read, or its card open. */
  let asking: Job | null = null;
  const listeners = new Set<() => void>();
  const setConsent = (next: SlotConsent | null) => {
    consent = next;
    for (const listener of listeners) listener();
  };

  const viewed = () => {
    const id = viewedCanvasId(trail.getState());
    return id === null ? undefined : runtimeOf(id);
  };

  const refuse = ({runtime, slot, appId}: Job, cause: InstallRefusal) => {
    const version = apps.getState().versions.get(appId);
    runtime.store.setAppAct(slot, {
      appId,
      status: 'refused',
      cause,
      ...(version !== undefined ? {version} : {}),
    });
    apps.release(appId);
  };

  /** The app is in: the slot's press let go, and the press that fills it sent. */
  const land = ({runtime, slot, appId, fill}: Job) => {
    runtime.store.setAppAct(slot, null);
    apps.release(appId);
    void runtime.press(fill);
  };

  const run = async (job: Job) => {
    const {runtime, slot, appId, act} = job;
    runtime.store.setAppAct(slot, {appId, status: 'running'});
    const answer = await install(appId);
    if (!answer.ok) return refuse(job, answer.cause);
    await apps.read();
    refreshCatalogs();
    if (answer.followed.length > 0) {
      const {names} = apps.getState();
      const name = names.get(appId) ?? appId;
      const followed = listed(answer.followed.map(id => names.get(id) ?? id));
      runtime.store.showNotice(
        `${name} is ${act === 'install' ? 'installed' : 'updated'}. Also updated along with it: ${followed}.`,
      );
    }
    land(job);
  };

  const ask = async (
    job: Job,
    anchor: HTMLElement,
    toAsk: (listing: StoreListing) => ConsentAsk,
  ) => {
    asking = job;
    job.runtime.store.setAppAct(job.slot, {appId: job.appId, status: 'asking'});
    const read = await readEntry(job.appId);
    // Cancelled while the entry was read: the person left the canvas.
    if (asking !== job) return;
    if (!read.ok) {
      asking = null;
      return refuse(job, 'store-unreached');
    }
    if (job.act === 'install' && read.value.installed) {
      // Installed outside the page: the row is Show it here, and its press goes with no card.
      asking = null;
      await apps.read();
      return land(job);
    }
    setConsent({canvas: job.runtime.id, ask: toAsk(read.value), anchor});
  };

  const cancel = () => {
    const job = asking;
    if (!job) return;
    asking = null;
    job.runtime.store.setAppAct(job.slot, null);
    apps.release(job.appId);
    if (consent) setConsent(null);
  };

  // Leaving the canvas the card floats over closes it as Cancel.
  trail.subscribe(() => {
    if (!asking) return;
    const state = trail.getState();
    if (state.trustedPage !== null || viewedCanvasId(state) !== asking.runtime.id) cancel();
  });

  const onAppAct = (request: AppActRequest) => {
    const runtime = viewed();
    if (!runtime) return;
    const {appId} = request;
    const slot: AppActSlot =
      request.gap !== undefined ? {gap: request.gap} : {source: request.source!};
    const fill: CompositionOperation =
      request.gap !== undefined
        ? {kind: 'useApp', sources: [appId], gap: request.gap}
        : {kind: 'retry', sources: [request.source!]};
    if (request.kind === 'show') {
      runtime.store.setAppAct(slot, null);
      void runtime.press(fill);
      return;
    }
    if (!apps.hold(appId)) return;
    const act = request.kind;
    const job: Job = {runtime, slot, appId, act, fill};
    // Try again, the Store's press for its cause, goes with no second card.
    const prior = appActOf(runtime.store.getState(), slot);
    if (prior?.status === 'refused' && refusalOf(prior.cause, '', act).press === 'retry') {
      return void run(job);
    }
    if (act === 'update') {
      const newScopes = runtime.store.getState().updates.get(request.source!)?.newScopes ?? [];
      if (newScopes.length === 0) return void run(job);
      return void ask(job, request.anchor, ({entry}) => ({
        kind: 'update',
        entry,
        news: {newScopes, newLook: false},
      }));
    }
    void ask(job, request.anchor, ({entry}) => ({kind: 'install', entry}));
  };

  const confirm = () => {
    const job = asking;
    if (!job || !consent) return;
    asking = null;
    setConsent(null);
    void run(job);
  };

  const paintedSlot = (runtime: SlotRuntime, surfaceId: string, componentId: string) =>
    runtime.processor.model.getSurface(surfaceId)?.componentsModel.get(componentId)?.properties as
      PaintedSlot | undefined;

  /** An offer with apps on it, not yet the slot of an app installed there. */
  const openOffer = (slot: PaintedSlot | undefined): slot is PaintedSlot & {gap: string} =>
    typeof slot?.gap === 'string' &&
    slot.source === undefined &&
    slot.installed === undefined &&
    slot.offer?.none === undefined &&
    (slot.offer?.apps?.length ?? 0) > 0;

  const originOf = (action: ShellAction): SlotOrigin | undefined => {
    if (action.name !== 'openStore' || action.componentId === undefined) return undefined;
    const runtime = viewed();
    if (!runtime) return undefined;
    const slot = paintedSlot(runtime, action.surfaceId, action.componentId);
    if (!openOffer(slot)) return undefined;
    return {
      canvas: runtime.id,
      surfaceId: action.surfaceId,
      componentId: action.componentId,
      gap: slot.gap,
    };
  };

  const fillFromPage = (appId: string): boolean => {
    const origin = trail.getState().openedFrom;
    if (!origin) return false;
    const runtime = runtimeOf(origin.canvas);
    if (!runtime) return false;
    const slot = paintedSlot(runtime, origin.surfaceId, origin.componentId);
    if (!openOffer(slot) || slot.gap !== origin.gap) return false;
    if (!slot.offer?.apps?.some(app => app.appId === appId)) return false;
    trail.untie();
    void runtime.press({kind: 'useApp', sources: [appId], gap: origin.gap});
    return true;
  };

  return {
    getState: () => consent,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onAppAct,
    confirm,
    cancel,
    originOf,
    fillFromPage,
  };
}

/**
 * What the shell catalog reads of a canvas's slots (task-15.8 decision 1): each slot's press as the
 * canvas holds it — a refusal giving way once the app is installed or updated elsewhere (task-15.9
 * decision 5) — the page's installed apps by version, and the apps a press holds anywhere
 * (decision 1).
 */
export function slotActState(
  {appActs}: Pick<CanvasState, 'appActs'>,
  holds: InstalledAppsState,
): AppActState {
  return {
    act: slot => {
      const act = appActOf({appActs}, slot);
      if (act?.status === 'refused' && holds.versions.get(act.appId) !== act.version)
        return undefined;
      return act;
    },
    installed: appId => holds.versions.get(appId),
    busy: appId => holds.held.has(appId),
  };
}
