import type {Message} from '@a2a-js/sdk';
import {parseSurfaceId} from '@a2uiverse/sdk';

/** A2UI-standard metadata key the client sends its data model under. */
export const A2UI_CLIENT_DATA_MODEL_KEY = 'a2uiClientDataModel';

type Metadata = Message['metadata'];

/**
 * The outbound partition filter (phase decision 14): a vendor receives only
 * the surfaces its namespace owns, keys un-namespaced. Undefined when
 * nothing survives — the metadata entry is then omitted entirely.
 */
export function filterClientDataModel(
  metadata: Metadata,
  appId: string,
): Record<string, unknown> | undefined {
  const model = metadata?.[A2UI_CLIENT_DATA_MODEL_KEY];
  if (typeof model !== 'object' || model === null) return undefined;
  const surfaces = (model as {surfaces?: unknown}).surfaces;
  if (typeof surfaces !== 'object' || surfaces === null) return undefined;
  const own: Record<string, unknown> = {};
  let any = false;
  for (const [key, value] of Object.entries(surfaces)) {
    const parsed = parseSurfaceId(key);
    if (parsed?.appId !== appId) continue;
    own[parsed.surfaceId] = value;
    any = true;
  }
  return any ? {...(model as Record<string, unknown>), surfaces: own} : undefined;
}

/**
 * The vendor-bound metadata for one dispatch: the A2UI-standard keys with the
 * data model partition-filtered; every a2uiverse-specific key dropped —
 * nothing a2uiverse-specific rides the vendor wire.
 */
export function vendorMetadata(metadata: Metadata, appId: string): Metadata {
  const out: NonNullable<Metadata> = {};
  const capabilities = metadata?.a2uiClientCapabilities;
  if (capabilities !== undefined) out.a2uiClientCapabilities = capabilities;
  const model = filterClientDataModel(metadata, appId);
  if (model !== undefined) out[A2UI_CLIENT_DATA_MODEL_KEY] = model;
  return Object.keys(out).length > 0 ? out : undefined;
}
