/**
 * The composition extension (SPEC §14): the A2A metadata contract for
 * cross-agent UI composition. The normative definition is
 * `../contracts/composition.v0.1.json`; `composition.contract.test.ts` asserts
 * this projection against it. The Python projection (`packages/sdk/python`,
 * PyPI `a2uiverse-sdk`) carries the agent-facing half.
 */

/** The A2A extension URI this project declares for composition. */
export const COMPOSITION_EXTENSION_URI = 'https://a2uiverse.dev/ext/composition/v0.1';

/** Metadata key the orchestrator owns on relayed events. */
export const STAMP_KEY = 'a2uiverse';

/** Separator in a namespaced surface id: `<appId>:<surfaceId>`. */
export const SURFACE_NS_SEPARATOR = ':';

/** The shapes an agent can be asked to paint for (SPEC §4.4). */
export const SLOT_ARCHETYPES = ['card', 'panel', 'row', 'full'] as const;
export type SlotArchetype = (typeof SLOT_ARCHETYPES)[number];

/** Outbound, orchestrator → vendor agent, on the request message's metadata under {@link COMPOSITION_EXTENSION_URI}. */
export interface SlotRequest {
  archetype: SlotArchetype;
  /** The budget's unit is task-internal (SPEC §4.4). */
  budget: string;
}

/** Inbound, orchestrator → client, on every relayed event's metadata under {@link STAMP_KEY}. */
export interface CompositionStamp {
  /** Provenance: the app that painted this. */
  source: string;
  /** Placement: the layout slot this event's surface fills; absent on the shell's own events. */
  slot?: string;
  /** Which surface the canvas renders as the composition root. */
  role?: 'shell' | 'fragment';
  /** Debug only, gated by orchestrator config. */
  vendorContextId?: string;
  vendorTaskId?: string;
}

/** Wire field names, typechecked against the interfaces; the contract test compares them to the contract. */
export const SLOT_REQUEST_FIELDS = [
  'archetype',
  'budget',
] as const satisfies readonly (keyof SlotRequest)[];
export const STAMP_FIELDS = [
  'source',
  'slot',
  'role',
  'vendorContextId',
  'vendorTaskId',
] as const satisfies readonly (keyof CompositionStamp)[];

// Completeness: adding a field to an interface without adding it to its field list is a type error.
const _slotRequestComplete: Exclude<
  keyof SlotRequest,
  (typeof SLOT_REQUEST_FIELDS)[number]
> extends never
  ? true
  : never = true;
const _stampComplete: Exclude<keyof CompositionStamp, (typeof STAMP_FIELDS)[number]> extends never
  ? true
  : never = true;
void _slotRequestComplete;
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

/** The slot request on a message's metadata, if present and well-shaped. */
export function readSlotRequest(
  metadata: Record<string, unknown> | undefined,
): SlotRequest | undefined {
  const raw = metadata?.[COMPOSITION_EXTENSION_URI];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const {archetype, budget} = raw as Record<string, unknown>;
  if (typeof archetype !== 'string' || typeof budget !== 'string') return undefined;
  return {archetype, budget} as SlotRequest;
}
