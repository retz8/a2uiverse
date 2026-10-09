/**
 * The A2UIVerse extension (SPEC §14), the platform's one A2A extension: between orchestrator and
 * client, the metadata contract for cross-agent UI composition; from an agent, read and never
 * required, the `auth-required` request in A2A's own requirement shape — nothing a2uiverse-specific
 * rides the vendor wire. The normative definition is `../contracts/a2uiverse.v0.9.json`;
 * `a2uiverse.contract.test.ts` asserts this projection against it. The synthesis half of the
 * contract (the synthesize data model) lives in `synthesis.ts`.
 *
 * A canvas is an A2A context (task-9.2 decision 1): the utterance that opens one carries no
 * contextId, the orchestrator mints it, and every later message in the canvas carries it. The
 * contract therefore names no canvas id of its own; it names the parent on the opening utterance.
 */

/** The A2A extension URI this project declares: the platform's one extension. */
export const A2UIVERSE_EXTENSION_URI = 'https://a2uiverse.dev/ext/a2uiverse/v0.9';

/**
 * Metadata key the orchestrator owns on relayed events — and, inbound, the key the parent canvas
 * rides under on the utterance that opens a child (task-9.2 decision 2).
 */
export const STAMP_KEY = 'a2uiverse';

/** Separator in a source id: `<appId>.<n>` (task-12.2 decision 3). App ids never contain it. */
export const SOURCE_ID_SEPARATOR = '.';

/**
 * A source — the app and the account it paints under (task-12.2 decision 3): `gmail` + `2` →
 * `gmail.2`; with no account — an app whose card needs no sign-in, and `shell` — the bare app id.
 * `account` is the AuthVault's per-app ordinal, assigned at that account's first sign-in and never
 * reused.
 */
export function sourceId(appId: string, account?: number): string {
  return account === undefined ? appId : `${appId}${SOURCE_ID_SEPARATOR}${account}`;
}

/**
 * `gmail.2` → `{appId: 'gmail', account: 2}`; `github` → `{appId: 'github'}`; undefined when the
 * id is empty or its account part is not a positive integer.
 */
export function parseSourceId(source: string): {appId: string; account?: number} | undefined {
  const i = source.indexOf(SOURCE_ID_SEPARATOR);
  if (i < 0) return source ? {appId: source} : undefined;
  const appId = source.slice(0, i);
  const n = source.slice(i + 1);
  if (!appId || !/^[1-9][0-9]*$/.test(n)) return undefined;
  return {appId, account: Number(n)};
}

/**
 * A source's one name in words (task-12.4 decision 5): the app's display name, with the account's
 * label when the app has more than one account — `Gmail · alice@example.com` — otherwise the app's
 * name alone. The attribution marker, every word on the canvas naming a source and the
 * Synthesizer's prompt read it.
 */
export function sourceName(displayName: string, account?: string | null): string {
  return account ? `${displayName} · ${account}` : displayName;
}

/** Separator in a namespaced surface id: `<source>:<surfaceId>`. */
export const SURFACE_NS_SEPARATOR = ':';

/** Inbound, orchestrator → client, on every relayed event's metadata under {@link STAMP_KEY}. */
export interface CompositionStamp {
  /**
   * Provenance and placement: the source that painted this — the app and the account it painted
   * under. A fragment's surface fills the layout's `Slot` whose `source` is this id.
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
  /**
   * The source's paint was refused at the hub for a credential input (task-12.7 decisions 2, 7):
   * set on one event the orchestrator emits carrying a `deleteSurface` for each surface of the
   * refused answer it had already relayed. The client takes those surfaces down — off the slot,
   * out of staging — and none of them is a paint the way back returns to.
   */
  refused?: boolean;
  /** Debug only, gated by orchestrator config. */
  vendorContextId?: string;
  vendorTaskId?: string;
}

/** Wire field names, typechecked against the interface; the contract test compares them to the contract. */
export const STAMP_FIELDS = [
  'source',
  'role',
  'settled',
  'refused',
  'vendorContextId',
  'vendorTaskId',
] as const satisfies readonly (keyof CompositionStamp)[];

// Completeness: adding a field to the interface without adding it to its field list is a type error.
const _stampComplete: Exclude<keyof CompositionStamp, (typeof STAMP_FIELDS)[number]> extends never
  ? true
  : never = true;
void _stampComplete;

/** `pr-list` + `gmail.2` → `gmail.2:pr-list`. */
export function namespaceSurfaceId(source: string, surfaceId: string): string {
  return `${source}${SURFACE_NS_SEPARATOR}${surfaceId}`;
}

/** `gmail.2:inbox` → `{source: 'gmail.2', surfaceId: 'inbox'}`; undefined when un-namespaced. */
export function parseSurfaceId(id: string): {source: string; surfaceId: string} | undefined {
  const i = id.indexOf(SURFACE_NS_SEPARATOR);
  if (i <= 0 || i === id.length - 1) return undefined;
  return {source: id.slice(0, i), surfaceId: id.slice(i + 1)};
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

/**
 * Outbound, client → orchestrator, on every client message: the client's page load, under
 * {@link STAMP_KEY} beside the parent of an opening utterance (task-12.5 decision 6). Minted once
 * per page load; a reload is a new session.
 */
export interface ClientSession {
  /** The page load's id: what the orchestrator keeps one sitting's memory by. */
  session: string;
  /**
   * The person's local time when the message was sent, RFC 3339 with its offset — with
   * `timeZone`, what the orchestrator tells an app the person's "now" is (task-12.13 decision 47).
   */
  now?: string;
  /** The person's IANA time zone, as the browser has it. */
  timeZone?: string;
}

/** The person's clock as the client reads it: both halves or neither. */
export type ClientClock = Required<Pick<ClientSession, 'now' | 'timeZone'>>;

/** Wire field names, typechecked against the interface; the contract test compares them to the contract. */
export const CLIENT_SESSION_FIELDS = [
  'session',
  'now',
  'timeZone',
] as const satisfies readonly (keyof ClientSession)[];

const _sessionComplete: Exclude<
  keyof ClientSession,
  (typeof CLIENT_SESSION_FIELDS)[number]
> extends never
  ? true
  : never = true;
void _sessionComplete;

/**
 * The message metadata naming the session, with the parent when the utterance has one and the
 * person's clock when the client reads it.
 */
export function clientSessionMetadata(
  session: string,
  parent?: string,
  clock?: ClientClock,
): Record<string, unknown> {
  return {[STAMP_KEY]: {session, ...(parent !== undefined ? {parent} : {}), ...clock}};
}

/** The session a client message's metadata names, if any. */
export function readClientSession(
  metadata: Record<string, unknown> | undefined,
): ClientSession | undefined {
  const raw = metadata?.[STAMP_KEY];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const {session, now, timeZone} = raw as Record<string, unknown>;
  if (typeof session !== 'string' || session === '') return undefined;
  // The clock is read whole or not at all: a time without its zone says no wall-clock time.
  return typeof now === 'string' && now !== '' && typeof timeZone === 'string' && timeZone !== ''
    ? {session, now, timeZone}
    : {session};
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
 * The reader's presses on the composition (task-8.4 decisions 9, 14), from task 9.2 a fragment's
 * step in its own history and the canvas closed, from task 12.2 a scope request dismissed, and
 * from task 12.6 an account chosen on the account choice.
 */
export const OPERATION_KINDS = [
  'retry',
  'include',
  'tryAgain',
  'step',
  'dismiss',
  'close',
  'useAccount',
] as const;
export type OperationKind = (typeof OPERATION_KINDS)[number];

/**
 * Outbound, client → orchestrator: a press on the composition, as a data part of its own —
 * `{version, operation}` — on a new A2A message in the canvas's context. `retry` names the one
 * source whose slot sends again what it keeps — also the resume after sign-in (task-12.2 decision
 * 9) — `include` the late sources it folds in, `tryAgain` none; `dismiss` the one source whose
 * scope request Not now drops (task-12.2 decision 10); `useAccount` the one account the account
 * choice's request goes to, painting in that slot (task-12.6 decision 6); `step`
 * names the one agent whose fragment stepped and, in `step`, the paint id it now shows — one paint
 * per `createSurface`, from 0, never reused (task-10.9 decision 6) — the paint's data model riding
 * `a2uiClientDataModel` as on an action; `close` names nothing.
 */
export interface CompositionOperation {
  kind: OperationKind;
  sources: string[];
  /** With `step` only: the paint id the fragment now shows. */
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
  dismiss: {exactly: 1},
  close: {exactly: 0},
  useAccount: {exactly: 1},
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

/** The code of a catalog load failure: A2UI's generic client error, a code of the platform's own. */
export const CATALOG_LOAD_FAILED = 'CATALOG_LOAD_FAILED';

/**
 * Outbound, client → orchestrator (task-11.5 decision 4): a fragment whose catalog the client could
 * not load, reported as A2UI's client error — `{version, error}` — under the protocol's generic
 * error, which admits the catalog id beside the code. The hub fails the slot the surface fills
 * with cause `load`, carrying the id.
 */
export interface CatalogLoadFailure {
  code: typeof CATALOG_LOAD_FAILED;
  /** Namespaced, as the hub sent it. */
  surfaceId: string;
  /** The client's reason, for the journal. */
  message: string;
  catalogId: string;
}

/** Wire field names, typechecked against the interface; the contract test compares them to the contract. */
export const CATALOG_LOAD_FAILURE_FIELDS = [
  'code',
  'surfaceId',
  'message',
  'catalogId',
] as const satisfies readonly (keyof CatalogLoadFailure)[];

const _catalogLoadFailureComplete: Exclude<
  keyof CatalogLoadFailure,
  (typeof CATALOG_LOAD_FAILURE_FIELDS)[number]
> extends never
  ? true
  : never = true;
void _catalogLoadFailureComplete;

/** The catalog load failure an A2UI client error carries, if it is one and well formed. */
export function readCatalogLoadFailure(error: unknown): CatalogLoadFailure | undefined {
  if (typeof error !== 'object' || error === null || Array.isArray(error)) return undefined;
  const {code, surfaceId, message, catalogId} = error as Record<string, unknown>;
  if (code !== CATALOG_LOAD_FAILED) return undefined;
  if (typeof surfaceId !== 'string' || surfaceId === '') return undefined;
  if (typeof catalogId !== 'string' || catalogId === '') return undefined;
  return {code, surfaceId, message: typeof message === 'string' ? message : '', catalogId};
}

/** The A2A task state an agent moves to when it needs authority mid-task (A2A 0.3 §4.5). */
export const AUTH_REQUIRED_STATE = 'auth-required';

/**
 * One alternative of a card's `security` requirement, A2A's own shape: a scheme key on the card →
 * the scope keys in that scheme's `scopes` map. An empty list asks for the scheme alone.
 */
export type SecurityRequirement = Record<string, string[]>;

/**
 * From an agent, agent → orchestrator (task-12.2 decision 12): the data part of an `auth-required`
 * status message — `{security}`, the card's own requirement shape, at least one alternative, each
 * naming what the agent is missing by its keys on the card. Recognized by the task state and the
 * `security` key; whether the keys are the installed card's is the orchestrator's to check.
 */
export interface AuthRequired {
  security: SecurityRequirement[];
}

/** Wire field names, typechecked against the interface; the contract test compares them to the contract. */
export const AUTH_REQUIRED_FIELDS = ['security'] as const satisfies readonly (keyof AuthRequired)[];

const _authRequiredComplete: Exclude<
  keyof AuthRequired,
  (typeof AUTH_REQUIRED_FIELDS)[number]
> extends never
  ? true
  : never = true;
void _authRequiredComplete;

/** The data part's body carrying an `auth-required` request: `{security}`. */
export function authRequiredData(request: AuthRequired): AuthRequired {
  return {
    security: request.security.map(alternative =>
      Object.fromEntries(
        Object.entries(alternative).map(([scheme, scopes]) => [scheme, [...scopes]]),
      ),
    ),
  };
}

/**
 * The `auth-required` request a data part's body carries, if it is one and well formed: at least
 * one alternative, each naming at least one scheme by a non-empty key, each scheme a list of
 * distinct non-empty scope keys.
 */
export function readAuthRequired(data: unknown): AuthRequired | undefined {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return undefined;
  const {security} = data as Record<string, unknown>;
  if (!Array.isArray(security) || security.length === 0) return undefined;
  const alternatives: SecurityRequirement[] = [];
  for (const alternative of security) {
    if (typeof alternative !== 'object' || alternative === null || Array.isArray(alternative)) {
      return undefined;
    }
    const entries = Object.entries(alternative as Record<string, unknown>);
    if (entries.length === 0) return undefined;
    const requirement: SecurityRequirement = {};
    for (const [scheme, scopes] of entries) {
      if (scheme === '' || !Array.isArray(scopes)) return undefined;
      if (!scopes.every(scope => typeof scope === 'string' && scope !== '')) return undefined;
      if (new Set(scopes).size !== scopes.length) return undefined;
      requirement[scheme] = [...(scopes as string[])];
    }
    alternatives.push(requirement);
  }
  return {security: alternatives};
}
