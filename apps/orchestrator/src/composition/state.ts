import type {Message} from '@a2a-js/sdk';
import type {ExecutionEventBus} from '@a2a-js/sdk/server';
import {clipPaintMetaTitle, type OperationKind, type SynthesisPayload} from '@a2uiverse/sdk';
import type {FailureCause, SlotCallFailed, SlotCollapse} from '@a2uiverse/shell-catalog/schema';
import type {Seen, Watch} from './integrity.js';
import type {Synthesis} from '../synthesizer/document.js';
import type {VendorEvent} from '../agentsPool/relay.js';
import type {DispatchHandle, DispatchOutcome, DispatchRecord} from '../agentsPool/types.js';
import type {JournalTurn} from '../journal/intentJournal.js';
import type {SynthesisRecord} from '../journal/types.js';
import {isGap, type JoinNouns, type LayoutSurface} from '../planner/document.js';
import type {Registry} from '../registry/registry.js';
import {SHELL_SOURCE_ID} from '../registry/types.js';
import {SYNTHESIS_DISPLAY_NAME} from './constants.js';
import {History} from './history.js';
import {Partitions} from './partitions.js';
import {Presses} from './presses.js';

/**
 * The orchestrator-side slot states. `filled` is deliberately absent — a slot
 * renders its fragment when a surface claims it, which is inherently the
 * client's (phase decision 12).
 */
export type SlotState = 'pending' | 'failed' | 'collapsed';

export interface SlotPlan {
  /** The dispatched source: an app id, or `shell` for the merged view. The slot's key. */
  source: string;
  displayName: string;
  request: string;
  /** The merged view's planned column headers: painted on its slot, handed to the Synthesizer. */
  columns?: string[];
  /** The merged view's join nouns: painted on its slot for the client's progress line. */
  join?: JoinNouns;
  /** The merged view's column marks, one per column: a source id, or null (task-8.3 decision 12). */
  columnSources?: (string | null)[];
  /** A vendor slot's entries as the join calls them — "CircleCI runs" — for its failure tile. */
  noun?: string;
}

/** Why a vendor slot failed (task-8.3 decision 5): painted on it with `failed`. */
export interface SlotFailure {
  cause: FailureCause;
  /** The vendor's own words, only with `vendor`. */
  message?: string;
}

/** An answer that arrived past the hard cap: held, undrawn, until the reader presses Retry. */
export interface HeldAnswer {
  /** The dispatch's events after the cap, composed as they would have been relayed. */
  events: VendorEvent[];
  record: DispatchRecord;
}

export interface SlotEntry {
  plan: SlotPlan;
  state: SlotState;
  /** A failed vendor slot's cause and words. */
  failure?: SlotFailure;
  /** The merge slot collapsed by a decline: the Synthesizer's reason. */
  declined?: string;
  /** The merge slot collapsed for any other cause (task-8.3 decision 9). */
  collapse?: SlotCollapse;
  /** A vendor slot's answer held past the hard cap (task-8.3 decision 2). */
  held?: HeldAnswer;
  /** A dispatch of this source past its hard cap and still running: what a Retry races. */
  running?: DispatchHandle;
  /** An open Retry race (task-8.4 decision 5): the running dispatch's answer, handed to it. */
  race?: (held: HeldAnswer) => void;
}

/** Where a turn's events go: its task, its stream, its journal line. */
export interface Sink {
  ctx: {taskId: string; contextId: string};
  bus: ExecutionEventBus;
  turn: JournalTurn;
  /** The dispatches it started, which its journal line waits out. */
  drains?: Promise<void>[];
}

/**
 * A press on the composition, or the walk after a press inside a fragment, owed a call (task-8.4
 * decision 7): what it asks of the merge, where the outcome is published, and its settle.
 */
export interface OwedPress {
  /**
   * The presses that owe the merge a call, the walk after a press inside a fragment, and a step
   * in a fragment's history (task 9.4) — a walk with the step's name on it; a close (task 9.3)
   * owes none.
   */
  kind: Exclude<OperationKind, 'close'> | 'walk';
  sink: Sink;
  /** Settles with what became of the call it was made in. */
  resolve(end: SynthesisEnd): void;
}

/** What became of a synthesis: landed, failed with the view kept, collapsed, or nothing to make. */
export type SynthesisEnd = 'landed' | 'kept' | 'collapsed' | 'none' | 'abandoned';

/** Everything owed while the merge is in the making: made as one call once it lands. */
export interface Owed {
  /** Sources to fold into a landed view: an Include's, and each retried source that arrived. */
  joining: Set<string>;
  /** Make the merge afresh over every arrived source — a collapsed merge brought back. */
  make: boolean;
  /** Walk again from the last accepted document — Try again after the view couldn't be updated. */
  walk: boolean;
  presses: OwedPress[];
}

/** A press running on the composition: what closing the composition ends (task-9.3 decision 5). */
export interface Operation {
  taskId: string;
  controller: AbortController;
  journal: JournalTurn;
}

export interface LiveSynthesis {
  document: Synthesis;
  payload: SynthesisPayload;
  /** The key sets the IntegrityChecker compares against on its walk, recorded at accept. */
  watch: Watch;
  /** What every surface held at this accept (task-7.9): a repaint of an unread source is told by it. */
  seen: Seen;
}

/**
 * Composition state is canonical in the orchestrator; the shell surface is
 * its rendered projection (phase decision 12). One per A2A context, from the
 * utterance that opened it until the user closes it (task 9.3).
 */
export interface CompositionState {
  /** The Planner's accepted document: the tree the painter paints, the data model, the dispatch. */
  layout: LayoutSurface;
  /** The utterance the composition came from — the `this_canvas` reader's first line. */
  utterance: string;
  /** The Planner's title for the composition, clipped to the contract's cap — the trail entry's name. */
  title?: string;
  /** The composition this one was asked from (task-9.3 decision 2): the trail's edge. */
  parent?: string;
  /** When the utterance arrived — the composition's stamp (phase-9 decision 8). */
  openedAt: number;
  /** When the utterance turn's final went out; unset while the composition is still loading. */
  answeredAt?: number;
  /** The turn that planned it: what a press's journal line links to. */
  turnId: string;
  /** The utterance's metadata, which a Retry re-dispatches the plan's request with. */
  requestMetadata?: Message['metadata'];
  /** Keyed by source (task-6.3 decision 6), in dispatch order. */
  slots: Map<string, SlotEntry>;
  /** The capability gaps the Planner named, in dispatch order; each has a `Slot` in the tree. */
  gaps: string[];
  /** Every surface's data model. */
  partitions: Partitions;
  /** Each agent's steps in this composition and the wiring accepted per combination of them (task 9.4). */
  history: History;
  /** Sources whose dispatch completed holding a surface, and not failed since — what the first synthesis runs over. */
  arrived: Set<string>;
  /**
   * The merge's own source set (task-8.3 decision 11): the sources the accepted synthesis was
   * built over — or, once it declined or couldn't be made, the ones it was made over. The
   * IntegrityChecker's walk and any re-synthesis it fires cover only these; only Include, Retry
   * and Try again add to it, and a failure removes a source from it.
   */
  merged: Set<string>;
  /** Sources a call owes or is folding into the view, out of the late ones meanwhile. */
  folding: Set<string>;
  /** Calls a press caused, owed or running: while any, the working sentence (task-8.4 decision 13). */
  pressWork: number;
  /** The last call a press caused failed, the landed view kept (task-8.4 decision 3). */
  callFailed?: SlotCallFailed;
  /** On a collapsed merge, the retried sources whose arrival brings it back (task-8.4 decision 8). */
  retrying: Set<string>;
  /** What is owed a call while the merge is in the making (task-8.4 decision 7). */
  owed?: Owed;
  /** How many times the merge collapsed: a merge in the making sees a collapse under it. */
  collapses: number;
  /** Whether the turn's one automatic synthesis has been released, or the merge collapsed instead. */
  mergeDecided: boolean;
  /** The reader's presses in flight, per source: what the merge waits on (task-8.10 decision 1). */
  presses: Presses;
  /** The merge in the making, the first or a re-synthesis — one at a time (task-8.10 decision 3). */
  making?: Promise<void>;
  /**
   * While a walk only steps owed runs: aborted by the next step, the combination it walks no
   * longer on screen (task-9.9 decision 17).
   */
  stepWalk?: AbortController;
  /** While the utterance turn runs: re-weighs the synthesis trigger after a slot changed outside it. */
  reevaluate?: () => void;
  /**
   * While a merge is being made: a source it reads has been reported undrawable and left the
   * set, so the call is thrown away and made again without it (task-8.7 decision 25).
   */
  left?: (appId: string) => void;
  /**
   * While the turn's one automatic synthesis is undecided: a retried source rejoins the pack and
   * settles again (task-8.4 decision 6).
   */
  trigger?: {unsettle(appId: string): void; settle(appId: string): void};
  /** The presses running on it: what closing the composition ends. */
  operations: Set<Operation>;
  /** Aborted once the composition is closed: every call a press caused ends. */
  retired: AbortController;
  /** The live synthesis, once painted: the document as accepted and the payload the client holds; what the IntegrityChecker guards. */
  synthesis?: LiveSynthesis;
  /** What became of the merged view, once decided — what the `this_canvas` reader reports. */
  mergedView?: {outcome: SynthesisRecord['outcome']; reason?: string};
  /** When the last source settled — the start of the dead-air interval. */
  lastSettledAt?: number;
}

export function compositionFrom(
  layout: LayoutSurface,
  registry: Registry,
  utterance: string,
  origin: {
    turnId: string;
    metadata?: Message['metadata'];
    parent?: string;
    openedAt?: number;
  } = {turnId: ''},
): CompositionState {
  const slots = new Map<string, SlotEntry>();
  const gaps: string[] = [];
  const merged = layout.dispatch.find(entry => !isGap(entry) && entry.source === SHELL_SOURCE_ID);
  const join = merged && !isGap(merged) ? merged.join : undefined;
  for (const entry of layout.dispatch) {
    if (isGap(entry)) {
      gaps.push(entry.gap);
      continue;
    }
    const displayName =
      entry.source === SHELL_SOURCE_ID
        ? SYNTHESIS_DISPLAY_NAME
        : registry.get(entry.source).displayName;
    const noun = join?.nouns[entry.source];
    slots.set(entry.source, {
      plan: {
        source: entry.source,
        displayName,
        request: entry.request,
        ...(entry.columns ? {columns: entry.columns} : {}),
        ...(entry.columnSources ? {columnSources: entry.columnSources} : {}),
        ...(entry.join ? {join: entry.join} : {}),
        ...(noun && entry.source !== SHELL_SOURCE_ID ? {noun: `${displayName} ${noun}`} : {}),
      },
      state: 'pending',
    });
  }
  const title = layout.title === undefined ? undefined : clipPaintMetaTitle(layout.title);
  return {
    layout,
    utterance,
    ...(title ? {title} : {}),
    ...(origin.parent !== undefined ? {parent: origin.parent} : {}),
    openedAt: origin.openedAt ?? Date.now(),
    turnId: origin.turnId,
    ...(origin.metadata ? {requestMetadata: origin.metadata} : {}),
    slots,
    gaps,
    partitions: new Partitions(),
    history: new History(),
    arrived: new Set(),
    merged: new Set(),
    folding: new Set(),
    pressWork: 0,
    retrying: new Set(),
    collapses: 0,
    mergeDecided: false,
    presses: new Presses(),
    operations: new Set(),
    retired: new AbortController(),
  };
}

/** The dispatched vendor sources among `appIds`, in slot order. */
export function inSlotOrder(state: CompositionState, appIds: ReadonlySet<string>): string[] {
  return [...state.slots.keys()].filter(appId => appId !== SHELL_SOURCE_ID && appIds.has(appId));
}

/**
 * The sources that arrived after the merge — landed, declined or not made — and wait for Include
 * (task-8.4 decisions 1, 9): arrived, not in the merge's set, not being folded in. A merge still
 * undecided or being made first has none; nor one collapsed for a failed home source or too few.
 */
export function lateSources(state: CompositionState): string[] {
  const outcome = state.mergedView?.outcome;
  if (!synthesisSlot(state) || !outcome || outcome === 'home' || outcome === 'skipped') return [];
  const waiting = new Set(
    [...state.arrived].filter(appId => !state.merged.has(appId) && !state.folding.has(appId)),
  );
  return inSlotOrder(state, waiting);
}

/** The synthesis slot, when the plan reserved one. */
export function synthesisSlot(state: CompositionState): SlotEntry | undefined {
  return state.slots.get(SHELL_SOURCE_ID);
}

/**
 * Maps a settled dispatch to the slot state it ends in — or undefined when the slot is left to
 * the client (a clean completion holding a surface). Collapsed needs no vendor cooperation: a
 * clean completion holding no surface — it painted nothing, or took back what it painted —
 * simply folds away, and a cancellation folds with it.
 */
export function outcomeToSlotState(
  outcome: DispatchOutcome,
  holdsSurface: boolean,
): SlotState | undefined {
  if (outcome === 'failed' || outcome === 'timeout') return 'failed';
  if (outcome === 'cancelled') return 'collapsed';
  return holdsSurface ? undefined : 'collapsed';
}
