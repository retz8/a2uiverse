import type {A2uiClientDataModel} from '@a2ui/web_core/v0_9';

/**
 * Measures what the client data model costs on the wire, so its growth through a conversation is
 * observable rather than inferred.
 *
 * Every surface created with `sendDataModel: true` contributes its whole data tree to the metadata
 * of *every* subsequent send, and the agent frames that payload onto the model prompt — so the
 * bytes counted here are billed as prompt tokens on each turn. The client never drops a surface,
 * which is why the total is expected to climb monotonically within one conversation.
 */

export interface ClientDataModelSize {
  /** Serialized size of the whole payload, including the version envelope. */
  totalBytes: number;
  surfaceCount: number;
  /** Per-surface sizes, largest first — names the surface actually responsible for the total. */
  surfaces: {surfaceId: string; bytes: number}[];
}

/** Console prefix, so a live session can be filtered down to just these lines. */
export const CLIENT_DATA_MODEL_LOG_PREFIX = '[a2ui:datamodel]';

const encoder = new TextEncoder();

function jsonByteLength(value: unknown): number {
  return encoder.encode(JSON.stringify(value)).length;
}

export function measureClientDataModel(model: A2uiClientDataModel): ClientDataModelSize {
  const surfaces = Object.entries(model.surfaces)
    .map(([surfaceId, dataModel]) => ({surfaceId, bytes: jsonByteLength(dataModel)}))
    .sort((a, b) => b.bytes - a.bytes);
  return {totalBytes: jsonByteLength(model), surfaceCount: surfaces.length, surfaces};
}

export function formatClientDataModelSize(size: ClientDataModelSize): string {
  const breakdown = size.surfaces.map(s => `${s.surfaceId}=${s.bytes}B`).join(' ');
  return (
    `${CLIENT_DATA_MODEL_LOG_PREFIX} send carries ${size.surfaceCount} surface(s), ` +
    `${size.totalBytes}B total${breakdown ? ` — ${breakdown}` : ''}`
  );
}

/** Logs the payload size of one send. Injectable sink so the format stays under test. */
export function logClientDataModelSize(
  model: A2uiClientDataModel,
  log: (message: string) => void = console.info,
): void {
  log(formatClientDataModelSize(measureClientDataModel(model)));
}
