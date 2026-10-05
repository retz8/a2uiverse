/**
 * The dev-only fault map (phase-8 decision 13, task-8.3 decision 14): source → one fault the
 * AgentsPool applies as it forwards that source's stream, so recorded beats and end-to-end runs
 * reach lateness, the hard cap and an answer held past it, a broken stream, a refused connection,
 * a vendor failure, a paint the client cannot draw, and a paint carrying a credential input — the
 * repair going through clean on the plan's dispatch alone, refused again with `every` (task-12.7
 * decision 9). Vendors are untouched. Read from the
 * orchestrator's environment only, never from the wire.
 */

export const FAULT_KINDS = [
  'delay',
  'hang',
  'break',
  'refuse',
  'fail',
  'invalid',
  'credential',
] as const;
export type FaultKind = (typeof FAULT_KINDS)[number];

export interface Fault {
  fault: FaultKind;
  /**
   * Seconds before the fault takes effect. `delay` holds the vendor's stream this long, then
   * forwards it; every other fault starts after it, so a failure can be fast or slow.
   */
  seconds?: number;
  /** `fail` only: the words of the vendor's failed final. */
  message?: string;
  /**
   * Hit every dispatch of the source; by default only the plan's dispatch is hit. A `credential`
   * fault hits the repair inside a dispatch only with this set.
   */
  every?: boolean;
}

/** By source; a bare app id covers every source of the app (task-12.4 decision 8). */
export type FaultMap = ReadonlyMap<string, Fault>;

const KEY = 'A2UIVERSE_FAULTS';

/**
 * `{"github": {"fault": "delay", "seconds": 40}, "gmail.2": {"fault": "fail", "message": "…"}}`.
 * Unset or blank is no fault; anything malformed fails boot naming the entry.
 */
export function parseFaults(raw: string | undefined): FaultMap {
  if (raw === undefined || raw.trim() === '') return new Map();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${KEY}: invalid JSON (${(err as Error).message})`);
  }
  if (!isRecord(parsed)) throw new Error(`${KEY}: expected a JSON object of source → fault`);
  const faults = new Map<string, Fault>();
  for (const [source, entry] of Object.entries(parsed)) {
    faults.set(source, parseFault(source, entry));
  }
  return faults;
}

function parseFault(source: string, entry: unknown): Fault {
  const where = `${KEY}.${source}`;
  if (!isRecord(entry)) throw new Error(`${where}: expected an object with a "fault"`);
  const {fault, seconds, message, every, ...rest} = entry;
  const unknown = Object.keys(rest);
  if (unknown.length > 0) throw new Error(`${where}: unknown field(s) ${unknown.join(', ')}`);
  if (!FAULT_KINDS.includes(fault as FaultKind)) {
    throw new Error(`${where}.fault: expected one of ${FAULT_KINDS.join(', ')}`);
  }
  if (seconds !== undefined && !(typeof seconds === 'number' && seconds >= 0)) {
    throw new Error(`${where}.seconds: expected a non-negative number`);
  }
  if (fault === 'delay' && seconds === undefined) {
    throw new Error(`${where}.seconds: a delay says how long`);
  }
  if (message !== undefined && (fault !== 'fail' || typeof message !== 'string')) {
    throw new Error(`${where}.message: a string, and only on a fail`);
  }
  if (every !== undefined && typeof every !== 'boolean') {
    throw new Error(`${where}.every: expected a boolean`);
  }
  return {
    fault: fault as FaultKind,
    ...(seconds !== undefined ? {seconds: seconds as number} : {}),
    ...(message !== undefined ? {message: message as string} : {}),
    ...(every ? {every: true} : {}),
  };
}

/** One line per fault, for the boot log: a run with faults is never mistaken for a clean one. */
export function describeFaults(faults: FaultMap): string {
  return [...faults]
    .map(([source, f]) => {
      const detail = [
        f.seconds !== undefined ? `${f.seconds} s` : undefined,
        f.message !== undefined ? JSON.stringify(f.message) : undefined,
        f.every ? 'every dispatch' : 'the plan’s dispatch',
      ].filter(Boolean);
      return `${source}: ${f.fault} (${detail.join(', ')})`;
    })
    .join('; ');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
