/**
 * The composition extension (SPEC §14): the A2A metadata contract for
 * cross-agent UI composition, internal to the platform (orchestrator ↔
 * client) — nothing a2uiverse-specific rides the vendor wire. The normative
 * definition is `../contracts/composition.v0.8.json`;
 * `composition.contract.test.ts` asserts this projection against it. The
 * synthesis half of the contract (the synthesize data model) lives in `synthesis.ts`.
 *
 * A canvas is an A2A context (task-9.2 decision 1): the utterance that opens one carries no
 * contextId, the orchestrator mints it, and every later message in the canvas carries it. The
 * contract therefore names no canvas id of its own; it names the parent on the opening utterance.
 */

/** The A2A extension URI this project declares for composition. */
export const COMPOSITION_EXTENSION_URI = 'https://a2uiverse.dev/ext/composition/v0.8';

/**
 * Metadata key the orchestrator owns on relayed events — and, inbound, the key the parent canvas
 * rides under on the utterance that opens a child (task-9.2 decision 2).
 */
export const STAMP_KEY = 'a2uiverse';

/** Separator in a namespaced surface id: `<appId>:<surfaceId>`. */
export const SURFACE_NS_SEPARATOR = ':';

/** Inbound, orchestrator → client, on every relayed event's metadata under {@link STAMP_KEY}. */
export interface CompositionStamp {
  /**
   * Provenance and placement: the app that painted this. A fragment's surface fills the layout's
   * `Slot` whose `source` is this id.
   */
  source: string;
  /** Which surface the canvas renders as the composition root. */
  role?: 'shell' | 'fragment';
  /**
   * This source's stream has ended (task-8.7 decision 25): set on one event the orchestrator
   * emits after relaying a fragment source's last event, carrying no A2UI parts. The client
   * judges that source's fragments there — a paint it cannot draw is reported before the merge
   * is made — instead of at the turn's end.
   */
  settled?: boolean;
  /** Debug only, gated by orchestrator config. */
  vendorContextId?: string;
  vendorTaskId?: string;
}

/** Wire field names, typechecked against the interface; the contract test compares them to the contract. */
export const STAMP_FIELDS = [
  'source',
  'role',
  'settled',
  'vendorContextId',
  'vendorTaskId',
] as const satisfies readonly (keyof CompositionStamp)[];

// Completeness: adding a field to the interface without adding it to its field list is a type error.
const _stampComplete: Exclude<keyof CompositionStamp, (typeof STAMP_FIELDS)[number]> extends never
  ? true
  : never = true;
void _stampComplete;

/** `pr-list` + `github` → `github:pr-list`. */
export function namespaceSurfaceId(appId: string, surfaceId: string): string {
  return `${appId}${SURFACE_NS_SEPARATOR}${surfaceId}`;
}

/** `github:pr-list` → `{appId: 'github', surfaceId: 'pr-list'}`; undefined when un-namespaced. */
export function parseSurfaceId(id: string): {appId: string; surfaceId: string} | undefined {
  const i = id.indexOf(SURFACE_NS_SEPARATOR);
  if (i <= 0 || i === id.length - 1) return undefined;
  return {appId: id.slice(0, i), surfaceId: id.slice(i + 1)};
}

/** The composition stamp on an event's metadata, if present and object-shaped. */
export function readStamp(
  metadata: Record<string, unknown> | undefined,
): CompositionStamp | undefined {
  const raw = metadata?.[STAMP_KEY];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const source = (raw as Record<string, unknown>).source;
  return typeof source === 'string' ? (raw as unknown as CompositionStamp) : undefined;
}

/**
 * Outbound, client → orchestrator, on the utterance that opens a child canvas: the canvas it was
 * asked from, under {@link STAMP_KEY} (task-9.2 decision 2). Absent on a root canvas.
 */
export interface CanvasParent {
  /** The contextId of the canvas the question was asked from. */
  parent: string;
}

/** Wire field names, typechecked against the interface; the contract test compares them to the contract. */
export const CANVAS_PARENT_FIELDS = ['parent'] as const satisfies readonly (keyof CanvasParent)[];

const _parentComplete: Exclude<
  keyof CanvasParent,
  (typeof CANVAS_PARENT_FIELDS)[number]
> extends never
  ? true
  : never = true;
void _parentComplete;

/** The message metadata naming the parent canvas: `{[STAMP_KEY]: {parent}}`. */
export function canvasParentMetadata(parent: string): Record<string, unknown> {
  return {[STAMP_KEY]: {parent}};
}

/** The parent canvas an opening utterance's metadata names, if any. */
export function readCanvasParent(
  metadata: Record<string, unknown> | undefined,
): CanvasParent | undefined {
  const raw = metadata?.[STAMP_KEY];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const parent = (raw as Record<string, unknown>).parent;
  return typeof parent === 'string' && parent !== '' ? {parent} : undefined;
}

/** The MIME type on the data part's metadata that marks a paintMeta part. */
export const PAINT_META_MIME_TYPE = 'application/json+a2ui-shell';

/** The most characters a paint's title carries; a longer one is clipped (task-9.2 decision 4). */
export const PAINT_META_TITLE_MAX_LENGTH = 48;

/** The paint kinds a paintMeta may declare. */
export const PAINT_META_KINDS = ['question'] as const;
export type PaintMetaKind = (typeof PAINT_META_KINDS)[number];

/** The question-marker value of `PaintMeta.kind`: the canvas routes such a paint to its overlay slot. */
export const QUESTION_PAINT_KIND: PaintMetaKind = 'question';

/**
 * Inbound, orchestrator → client: a per-paint shell object riding the A2A stream as a data part of
 * its own — `{paintMeta: {...}}`, no inline `version`, its part metadata `mimeType`
 * {@link PAINT_META_MIME_TYPE} — emitted ahead of the `createSurface` it names, so the A2UI
 * extractor never sees it. The orchestrator emits one for its layout surface carrying the
 * Planner's title for the canvas; a vendor's is the agent kit's, in this shape, relayed untouched
 * (task-9.2 decision 3).
 */
export interface PaintMeta {
  /** The surface the paint creates, as the client will see it. */
  surfaceId: string;
  /** A short title for the paint; best-effort — absent falls back to cause-derived. */
  title?: string;
  /** The paint's declared kind; `"question"` routes to the overlay slot. */
  kind?: string;
}

/** Wire field names, typechecked against the interface; the contract test compares them to the contract. */
export const PAINT_META_FIELDS = [
  'surfaceId',
  'title',
  'kind',
] as const satisfies readonly (keyof PaintMeta)[];

const _paintMetaComplete: Exclude<keyof PaintMeta, (typeof PAINT_META_FIELDS)[number]> extends never
  ? true
  : never = true;
void _paintMetaComplete;

/** The data part's body carrying a paintMeta: `{paintMeta}`. */
export function paintMetaData(meta: PaintMeta): {paintMeta: PaintMeta} {
  return {
    paintMeta: {
      surfaceId: meta.surfaceId,
      ...(meta.title !== undefined ? {title: meta.title} : {}),
      ...(meta.kind !== undefined ? {kind: meta.kind} : {}),
    },
  };
}

/**
 * A title cut to {@link PAINT_META_TITLE_MAX_LENGTH}, an ellipsis taking the last place when it
 * had to be; whitespace collapsed first. Empty when nothing is left.
 */
export function clipPaintMetaTitle(title: string): string {
  const text = title.replace(/\s+/g, ' ').trim();
  if (text.length <= PAINT_META_TITLE_MAX_LENGTH) return text;
  return `${text.slice(0, PAINT_META_TITLE_MAX_LENGTH - 1).trimEnd()}…`;
}

/** The paintMeta a data part's body carries, if it is one and names a surface. */
export function readPaintMeta(data: unknown): PaintMeta | undefined {
  const meta = (data as {paintMeta?: unknown} | null | undefined)?.paintMeta;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return undefined;
  const {surfaceId, title, kind} = meta as {surfaceId?: unknown; title?: unknown; kind?: unknown};
  if (typeof surfaceId !== 'string' || !surfaceId) return undefined;
  return {
    surfaceId,
    ...(typeof title === 'string' && title ? {title} : {}),
    ...(typeof kind === 'string' && kind ? {kind} : {}),
  };
}

/**
 * The reader's presses on the composition (task-8.4 decisions 9, 14) and, from task 9.2, a
 * fragment's step in its own history and the canvas closed.
 */
export const OPERATION_KINDS = ['retry', 'include', 'tryAgain', 'step', 'close'] as const;
export type OperationKind = (typeof OPERATION_KINDS)[number];

/**
 * Outbound, client → orchestrator: a press on the composition, as a data part of its own —
 * `{version, operation}` — on a new A2A message in the canvas's context. `retry` names the one
 * failed source it re-dispatches, `include` the late sources it folds in, `tryAgain` none; `step`
 * names the one agent whose fragment stepped and, in `step`, the index in that agent's stack it
 * now shows — one step per surface replacement, from 0 — the paint's data model riding
 * `a2uiClientDataModel` as on an action; `close` names nothing.
 */
export interface CompositionOperation {
  kind: OperationKind;
  sources: string[];
  /** With `step` only: the index in the agent's stack the fragment now shows. */
  step?: number;
}

/** Wire field names, typechecked against the interface; the contract test compares them to the contract. */
export const OPERATION_FIELDS = [
  'kind',
  'sources',
  'step',
] as const satisfies readonly (keyof CompositionOperation)[];

const _operationComplete: Exclude<
  keyof CompositionOperation,
  (typeof OPERATION_FIELDS)[number]
> extends never
  ? true
  : never = true;
void _operationComplete;

/** How many sources each kind names: exactly, or at least. */
const SOURCES_BY_KIND: Record<OperationKind, {exactly: number} | {atLeast: number}> = {
  retry: {exactly: 1},
  include: {atLeast: 1},
  tryAgain: {exactly: 0},
  step: {exactly: 1},
  close: {exactly: 0},
};

/** The data part's body carrying a press: `{version, operation}`. */
export function operationData(
  operation: CompositionOperation,
  version: string,
): {version: string; operation: CompositionOperation} {
  return {
    version,
    operation: {
      kind: operation.kind,
      sources: [...operation.sources],
      ...(operation.kind === 'step' ? {step: operation.step} : {}),
    },
  };
}

/**
 * The press a data part's body carries, if it is one and well formed: a known kind, a list of
 * distinct source ids as many as the kind names, and `step` — a non-negative integer — with
 * `step` alone.
 */
export function readOperation(data: Record<string, unknown>): CompositionOperation | undefined {
  if (typeof data.version !== 'string') return undefined;
  const raw = data.operation;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const {kind, sources, step} = raw as Record<string, unknown>;
  if (!OPERATION_KINDS.includes(kind as OperationKind)) return undefined;
  if (!Array.isArray(sources) || !sources.every(s => typeof s === 'string' && s !== '')) {
    return undefined;
  }
  const count = sources.length;
  const rule = SOURCES_BY_KIND[kind as OperationKind];
  const fits = 'exactly' in rule ? count === rule.exactly : count >= rule.atLeast;
  if (!fits || new Set(sources).size !== count) return undefined;
  if (kind === 'step') {
    if (typeof step !== 'number' || !Number.isInteger(step) || step < 0) return undefined;
    return {kind, sources: sources as string[], step};
  }
  if (step !== undefined) return undefined;
  return {kind: kind as OperationKind, sources: sources as string[]};
}
