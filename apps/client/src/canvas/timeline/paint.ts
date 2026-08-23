/**
 * The paint vocabulary (tasks 8.3 + 8.4): the typed cause every paint records, the timeline's
 * paint entry, and the materialized snapshot (phase-8 spec decisions 4–6, 12; task-8.4 spec
 * decisions 1–2, 6–7, 10). Display strings are derived from the cause at render time, never
 * stored — one derivation (`titleOfCause`) feeds two registers: the history list takes the
 * bare phrase, the status strip decorates it. The one deliberate exception to derive-at-render
 * is `parentTitle`, a fact about the edge recorded at fork time so provenance survives the
 * parent's eviction. These fallbacks are permanent — the 8.5 agent-authored `title` sits on top.
 */
import type {A2uiClientAction} from '@a2ui/web_core/v0_9';
import {describeAction} from '../../shared/describeAction';

/** Fields every cause records, whatever its kind. */
interface CauseCommon {
  /**
   * The paint the user was looking at when the edge fired — positional provenance, never a
   * claim of relatedness. `null` means the canvas was empty.
   */
  parent: number | null;
  /** True when the view was parked at dispatch — the fork marker (provenance renders only then). */
  forked: boolean;
  /** The parent's display title, denormalised at fork time — survives the parent's eviction. */
  parentTitle?: string;
}

/** What produced a paint. */
export type PaintCause = CauseCommon &
  (
    | {kind: 'utterance'; payload: {text: string}}
    | {kind: 'surface-action'; payload: {action: A2uiClientAction}}
    | {
        kind: 'overlay-answer';
        /** The question (the overlay's title, when known) and the raw action event, verbatim. */
        payload: {question?: string; answer: A2uiClientAction};
      }
  );

/**
 * The materialized content of a departed paint: serialized final state, captured once at
 * replacement (serialize-on-swap). The tree is frozen forever; the data model is frozen at
 * every observable moment and changes only by wholesale replacement (parked write-back).
 * Message logs are a different artifact (the verification fixtures), never conflated with this.
 */
export interface PaintSnapshot {
  /** Flat component-id → component-tree-node map — the A2UI wire shape. */
  tree: Readonly<Record<string, unknown>>;
  dataModel: unknown;
  /** Epoch ms of the serialize-on-swap capture. */
  capturedAt: number;
}

/**
 * One timeline entry — appended the moment its paint lands. The newest entry is the live
 * paint and the only one whose `snapshot` is null; it fills when the paint departs the stage.
 */
export interface PaintEntry {
  /** Monotonic, never reused; causes reference ids, not positions. */
  paintId: number;
  surfaceId: string;
  /** The surface's catalog, captured so rehydration can rebuild its createSurface. */
  catalogId: string;
  cause: PaintCause;
  /** Epoch ms of the moment the paint took the stage. */
  paintedAt: number;
  /** Agent-authored per-paint title (8.5). Absent throughout 8.4 — fallbacks carry the UI. */
  title?: string;
  /** Null while the paint holds the stage; filled at serialize-on-swap. */
  snapshot: PaintSnapshot | null;
}

const MAX_UTTERANCE_LABEL = 48;

const truncate = (text: string): string =>
  text.length <= MAX_UTTERANCE_LABEL ? text : `${text.slice(0, MAX_UTTERANCE_LABEL).trimEnd()}…`;

/**
 * The bare cause-derived phrase — the history-list register: the utterance itself, the
 * action's subject, or the answered question. Empty when the cause derives to nothing
 * (the caller falls back further).
 */
export function titleOfCause(cause: PaintCause): string {
  switch (cause.kind) {
    case 'utterance':
      return `“${truncate(cause.payload.text)}”`;
    case 'surface-action':
      return describeAction(cause.payload.action);
    case 'overlay-answer':
      if (cause.payload.question) return `answered “${cause.payload.question}”`;
      return describeAction(cause.payload.answer);
  }
}

/**
 * The activity register: the bare phrase dressed for the status strip. Always ends in
 * "generating…" so the strip reads as activity.
 */
export function describeCause(cause: PaintCause): string {
  const phrase = titleOfCause(cause);
  return phrase ? `${phrase} — generating…` : 'Generating…';
}

/** `pull-request-list` → `Pull request list` — the semantic id as a last-resort title. */
function humanizeSurfaceId(surfaceId: string): string {
  const words = surfaceId.split(/[-_]+/).filter(Boolean).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * An entry's display title: the agent-authored title when present, else the cause phrase,
 * else the humanized surface id.
 */
export function entryTitle(entry: PaintEntry): string {
  return entry.title ?? (titleOfCause(entry.cause) || humanizeSurfaceId(entry.surfaceId));
}
