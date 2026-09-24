/**
 * The composition extension (SPEC §14): the A2A metadata contract for
 * cross-agent UI composition, internal to the platform (orchestrator ↔
 * client) — nothing a2uiverse-specific rides the vendor wire. The normative
 * definition is `../contracts/composition.v0.7.json`;
 * `composition.contract.test.ts` asserts this projection against it. The
 * synthesis half of the contract (the synthesize data model) lives in `synthesis.ts`.
 */

/** The A2A extension URI this project declares for composition. */
export const COMPOSITION_EXTENSION_URI = 'https://a2uiverse.dev/ext/composition/v0.7';

/** Metadata key the orchestrator owns on relayed events. */
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

/** The reader's presses on the composition (task-8.4 decisions 9, 14). */
export const OPERATION_KINDS = ['retry', 'include', 'tryAgain'] as const;
export type OperationKind = (typeof OPERATION_KINDS)[number];

/**
 * Outbound, client → orchestrator: a press on the composition, as a data part of its own —
 * `{version, operation}` — on a new A2A message in the composition's context. `retry` names the
 * one failed source it re-dispatches, `include` the late sources it folds in, `tryAgain` none.
 */
export interface CompositionOperation {
  kind: OperationKind;
  sources: string[];
}

/** Wire field names, typechecked against the interface; the contract test compares them to the contract. */
export const OPERATION_FIELDS = [
  'kind',
  'sources',
] as const satisfies readonly (keyof CompositionOperation)[];

const _operationComplete: Exclude<
  keyof CompositionOperation,
  (typeof OPERATION_FIELDS)[number]
> extends never
  ? true
  : never = true;
void _operationComplete;

/** The data part's body carrying a press: `{version, operation}`. */
export function operationData(
  operation: CompositionOperation,
  version: string,
): {version: string; operation: CompositionOperation} {
  return {version, operation: {kind: operation.kind, sources: [...operation.sources]}};
}

/**
 * The press a data part's body carries, if it is one and well formed: a known kind, a list of
 * source ids, as many as the kind names — one for `retry`, at least one for `include`, none for
 * `tryAgain`.
 */
export function readOperation(data: Record<string, unknown>): CompositionOperation | undefined {
  if (typeof data.version !== 'string') return undefined;
  const raw = data.operation;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const {kind, sources} = raw as Record<string, unknown>;
  if (!OPERATION_KINDS.includes(kind as OperationKind)) return undefined;
  if (!Array.isArray(sources) || !sources.every(s => typeof s === 'string' && s !== '')) {
    return undefined;
  }
  const count = sources.length;
  const fits = kind === 'retry' ? count === 1 : kind === 'include' ? count >= 1 : count === 0;
  if (!fits || new Set(sources).size !== count) return undefined;
  return {kind: kind as OperationKind, sources: sources as string[]};
}
