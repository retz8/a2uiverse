/**
 * The update on the canvas (SPEC §10's update tile; task 15.5): whether an app can paint in what it
 * is installed with — before the call from the live card this run holds, after a refused paint or a
 * call that ended with no UI from the card fetched again — and the finding a slot's update tile is drawn from: the update state of
 * a check of that one app, its publisher and the line it chooses.
 */
import {readSupportedCatalogIds, type UpdateState} from '@a2uiverse/sdk';
import {updateLineOf, type UpdateLine} from '@a2uiverse/shell-catalog/schema';
import {LIVE_CARD_TIMEOUT_MS} from '../timeout.js';
import type {Registry} from './registry.js';
import type {UpdateCheck} from './updates.js';

/** Why a slot takes the update tile: its catalogs, or a permission its live card newly asks. */
export type UpdateCase = 'catalogs' | 'permission';

/** What a slot's update tile is drawn from, and what the journal keeps of it (task-15.5 decisions 8, 12). */
export interface UpdateFinding {
  case: UpdateCase;
  state: UpdateState;
  /** The app's publisher, whenever the Store has its entry. */
  publisher?: string;
  line: UpdateLine;
}

/**
 * What fetching the live card again after a refused paint, or a call that ended with no UI, found
 * (task-15.5 decision 4; task-15.11 decision 5).
 */
export type Refetched = 'changed' | 'unchanged' | 'unanswered';

export interface UpdateTileDeps {
  registry: Registry;
  updates: UpdateCheck;
  /**
   * Whether the source's account falls short of the live card where the card as installed is met:
   * the vault's judgement (task-15.5 decision 3). None judges no permission.
   */
  liveShort?(source: string): boolean;
  /** How long a live card fetched again is waited on; five seconds unless a test says otherwise. */
  refetchMs?: number;
}

export class UpdateTile {
  readonly #deps: UpdateTileDeps;

  constructor(deps: UpdateTileDeps) {
    this.#deps = deps;
  }

  /**
   * The catalog case (task-15.5 decision 2): the live card this run holds names no catalog id in the
   * app's entitlement — a card naming none is on the public catalog, which every entitlement holds.
   * Nothing is judged with no live card held, or one whose catalogs do not read.
   */
  catalogsChanged(appId: string): boolean {
    const {registry} = this.#deps;
    const live = registry.card(appId);
    const app = registry.find(appId);
    if (!live || !app) return false;
    const read = readSupportedCatalogIds(live);
    if (!read.ok || read.value.length === 0) return false;
    return !read.value.some(id => app.entitlement.includes(id));
  }

  /** The new-permission case (task-15.5 decision 3), for the account the source names. */
  permissionChanged(source: string): boolean {
    return this.#deps.liveShort?.(source) ?? false;
  }

  /**
   * The finding (task-15.5 decisions 5, 6): the update state of a check of that one app — its entry
   * read now — with its publisher and the line it chooses. None when the app is not installed.
   */
  async finding(appId: string, why: UpdateCase): Promise<UpdateFinding | undefined> {
    const checked = await this.#deps.updates.forApp(appId);
    if (!checked) return undefined;
    return {
      case: why,
      state: checked.state,
      ...(checked.publisher !== undefined ? {publisher: checked.publisher} : {}),
      line: updateLineOf(checked.state.state),
    };
  }

  /**
   * The catch after the call (task-15.5 decisions 4, 14; task-15.11 decision 5): the live card
   * fetched again, given five seconds, the run holding what answers; changed when it names a
   * catalog id beyond the app's entitlement.
   */
  async refetched(appId: string): Promise<Refetched> {
    const {registry} = this.#deps;
    const card = await registry.refetchLiveCard(
      appId,
      this.#deps.refetchMs ?? LIVE_CARD_TIMEOUT_MS,
    );
    const app = registry.find(appId);
    if (!card || !app) return 'unanswered';
    const read = readSupportedCatalogIds(card);
    if (!read.ok) return 'unchanged';
    return read.value.some(id => !app.entitlement.includes(id)) ? 'changed' : 'unchanged';
  }
}
