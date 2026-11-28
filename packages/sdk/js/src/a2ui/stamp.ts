/**
 * The A2UI version a message is stamped with (task-21.10 decision 8): the one reading the
 * validator, the smoke check and the hub share. The platform speaks v1.0 alone, so a stamp is
 * either `"1.0"` or another version, which may read below 1.0 — `v0.9`, `v0.9.1`, `0.8` — or not.
 */

/** The A2UI version the platform speaks, as a message is stamped with it. */
export const A2UI_VERSION = '1.0';

/** A message's stamp, read. */
export interface A2uiStamp {
  /** The stamp as written. */
  stamp: string;
  /** Whether it is {@link A2UI_VERSION}. */
  current: boolean;
  /** Whether it reads as a version below 1.0. */
  older: boolean;
  /** Whether it reads as a version above 1.0. */
  newer: boolean;
}

const VERSION_PATTERN = /^v?(\d+)\.(\d+)(?:\.(\d+))?$/;

/**
 * Whether a version, written as a stamp or as the tail of an A2UI extension URI — `v0.9`,
 * `0.9.1`, `v0.8` — reads as one below 1.0. A version that does not read as one is not below.
 */
export function readsBelowV1(version: string): boolean {
  const parts = VERSION_PATTERN.exec(version);
  return parts !== null && Number(parts[1]) < 1;
}

/** Whether a version, written as {@link readsBelowV1} reads one, reads as one above 1.0. */
export function readsAboveV1(version: string): boolean {
  const parts = VERSION_PATTERN.exec(version);
  if (parts === null) return false;
  const [major, minor, patch] = [parts[1], parts[2], parts[3] ?? '0'].map(Number);
  return major! > 1 || (major === 1 && (minor! > 0 || patch! > 0));
}

/**
 * The stamp a message carries: its `version`, when that is a string. Undefined when it is not,
 * and the message is not read as A2UI — v0.8 writes none.
 */
export function readA2uiStamp(message: unknown): A2uiStamp | undefined {
  if (typeof message !== 'object' || message === null || Array.isArray(message)) return undefined;
  const stamp = (message as {version?: unknown}).version;
  if (typeof stamp !== 'string') return undefined;
  return {
    stamp,
    current: stamp === A2UI_VERSION,
    older: readsBelowV1(stamp),
    newer: readsAboveV1(stamp),
  };
}
