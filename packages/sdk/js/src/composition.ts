/**
 * The composition extension (SPEC §14): the A2A metadata contract for
 * cross-agent UI composition, internal to the platform (orchestrator ↔
 * client) — nothing a2uiverse-specific rides the vendor wire. The normative
 * definition is `../contracts/composition.v0.4.json`;
 * `composition.contract.test.ts` asserts this projection against it. The
 * synthesis half of the contract (the synthesize data model) lives in `synthesis.ts`.
 */

/** The A2A extension URI this project declares for composition. */
export const COMPOSITION_EXTENSION_URI = 'https://a2uiverse.dev/ext/composition/v0.4';

/** Metadata key the orchestrator owns on relayed events. */
export const STAMP_KEY = 'a2uiverse';

/** Separator in a namespaced surface id: `<appId>:<surfaceId>`. */
export const SURFACE_NS_SEPARATOR = ':';

/** Inbound, orchestrator → client, on every relayed event's metadata under {@link STAMP_KEY}. */
export interface CompositionStamp {
  /** Provenance: the app that painted this. */
  source: string;
  /** Placement: the layout slot this event's surface fills; absent on the shell's own events. */
  slot?: string;
  /** Which surface the canvas renders as the composition root. */
  role?: 'shell' | 'fragment';
  /**
   * Per-partition generation counters, keyed by namespaced surfaceId, for every surface this
   * event touched. Bumped when an array a live ref indexes into is mutated in place (SPEC §6.2);
   * absent on the shell's own events.
   */
  generations?: Record<string, number>;
  /** Debug only, gated by orchestrator config. */
  vendorContextId?: string;
  vendorTaskId?: string;
}

/** Wire field names, typechecked against the interface; the contract test compares them to the contract. */
export const STAMP_FIELDS = [
  'source',
  'slot',
  'role',
  'generations',
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
