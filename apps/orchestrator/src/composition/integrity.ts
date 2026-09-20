import {
  parsePointer,
  refsOf,
  walkModel,
  type Ref,
  type Resolution,
  type Step,
  type SynthesisPayload,
} from '@a2uiverse/sdk';
import type {ChangeAccount, UnheldRelation} from '../synthesizer/prompt.js';
import {runFact} from './relations.js';

/**
 * The IntegrityChecker (SPEC §6.2, §6.3, §10): per-binding validity over the sdk's kit, and the
 * other half of the same walk, appearance. Refs select elements by key, so resolution *is*
 * validity (task-5.10 decisions 1 and 4) — a ref is good while its keys resolve, and a partition
 * that merely reorders or repaints under it breaks nothing. A key that was not in a watched array
 * at the last accept has appeared (task-7.6 decision 14). A surface the document reads nothing
 * from, holding other data than at the last accept, has been repainted (task-7.9): a source the
 * view detached has no ref to go absent and no watched array to appear in, so its painting again
 * is told as itself. Each fires a re-synthesis; a fact that stops holding fires nothing and is
 * told to whatever re-synthesis runs (task-7.6 decision 13).
 */
export function refValid(ref: Ref, partitions: {resolve(ref: Ref): {found: boolean}}): boolean {
  return partitions.resolve(ref).found;
}

/** Whether the live synthesis still holds, and which surfaces broke it. */
export function checkSynthesisPayload(
  payload: SynthesisPayload,
  partitions: {resolve(ref: Ref): {found: boolean}},
): {valid: boolean; invalid: string[]} {
  const invalid: string[] = [];
  for (const ref of refsOf(payload.dataModel)) {
    if (!refValid(ref, partitions) && !invalid.includes(ref.surface)) {
      invalid.push(ref.surface);
    }
  }
  return {valid: invalid.length === 0, invalid};
}

/** An array a ref selects into by key: its surface, its pointer, and the fields its key is made of. */
export interface WatchedArray {
  surface: string;
  array: string;
  fields: string[];
}

/** The watched arrays with the keys each held at the last accept. */
export type Watch = ReadonlyMap<string, {watched: WatchedArray; keys: ReadonlySet<string>}>;

type Partitions = {
  resolve(ref: Ref): Resolution;
  entries?(): Array<[surface: string, model: unknown]>;
};

/** What every surface held at the last accept, to tell a repaint from a standstill. */
export type Seen = ReadonlyMap<string, string>;

export function seenOf(partitions: {entries(): Array<[string, unknown]>}): Seen {
  return new Map(partitions.entries().map(([surface, model]) => [surface, JSON.stringify(model)]));
}

/** The surfaces the payload reads nothing from that hold other data than at the last accept. */
function repainted(payload: SynthesisPayload, partitions: Partitions, seen: Seen): string[] {
  const read = new Set(refsOf(payload.dataModel).map(ref => ref.surface));
  return (partitions.entries?.() ?? [])
    .filter(([surface, model]) => !read.has(surface) && seen.get(surface) !== JSON.stringify(model))
    .map(([surface]) => surface);
}

function escape(key: string): string {
  return key.replace(/~/g, '~0').replace(/\//g, '~1');
}

/** Steps back into a pointer: a predicate joins the segment before it. */
function pointerOf(steps: readonly Step[]): string {
  let pointer = '';
  for (const step of steps) {
    if (step.kind === 'key') pointer += `/${escape(step.key)}`;
    else pointer += `[${step.tests.map(t => `${t.field}=${JSON.stringify(t.value)}`).join(',')}]`;
  }
  return pointer;
}

const idOf = (w: WatchedArray) => JSON.stringify([w.surface, w.array, w.fields]);

/** Every array a payload's refs select into by key — one per field set — in ref order. */
function arraysOf(payload: SynthesisPayload): WatchedArray[] {
  const found = new Map<string, WatchedArray>();
  for (const ref of refsOf(payload.dataModel)) {
    const steps = parsePointer(ref.pointer);
    steps.forEach((step, i) => {
      if (step.kind !== 'predicate') return;
      const fields = step.tests.map(t => t.field).sort();
      const watched = {surface: ref.surface, array: pointerOf(steps.slice(0, i)), fields};
      if (!found.has(idOf(watched))) found.set(idOf(watched), watched);
    });
  }
  return [...found.values()];
}

/** An element's key under a field set; undefined when it does not carry every field. */
function keyOf(element: unknown, fields: readonly string[]): string | undefined {
  if (typeof element !== 'object' || element === null || Array.isArray(element)) return undefined;
  const record = element as Record<string, unknown>;
  if (!fields.every(f => Object.prototype.hasOwnProperty.call(record, f))) return undefined;
  return JSON.stringify(fields.map(f => record[f]));
}

/** The keys a watched array holds now: empty when the array is not there. */
function keysNow(watched: WatchedArray, partitions: Partitions): Map<string, unknown> {
  const keys = new Map<string, unknown>();
  const at = partitions.resolve({surface: watched.surface, pointer: watched.array});
  if (!at.found || !Array.isArray(at.value)) return keys;
  for (const element of at.value) {
    const key = keyOf(element, watched.fields);
    if (key !== undefined && !keys.has(key)) keys.set(key, element);
  }
  return keys;
}

/**
 * The key sets at accept (task-7.6 decision 14): every array the accepted payload selects into by
 * key, and every array an earlier accepted document of the composition did, each recorded now —
 * empty when the array is not there, so its keys appear when it returns.
 */
export function watchOf(
  payload: SynthesisPayload,
  partitions: Partitions,
  previous?: Watch,
): Watch {
  const arrays = new Map<string, WatchedArray>();
  for (const {watched} of previous?.values() ?? []) arrays.set(idOf(watched), watched);
  for (const watched of arraysOf(payload))
    if (!arrays.has(idOf(watched))) arrays.set(idOf(watched), watched);
  const watch = new Map<string, {watched: WatchedArray; keys: ReadonlySet<string>}>();
  for (const [id, watched] of arrays) {
    watch.set(id, {watched, keys: new Set(keysNow(watched, partitions).keys())});
  }
  return watch;
}

/** The arrays a watch covers, in the order it records them. */
export function watchedArrays(watch: Watch): WatchedArray[] {
  return [...watch.values()].map(({watched}) => watched);
}

/** Every element whose key was not in its watched array at the last accept, as a ref selecting it. */
function appeared(watch: Watch, partitions: Partitions): Ref[] {
  const refs: Ref[] = [];
  for (const {watched, keys} of watch.values()) {
    for (const [key, element] of keysNow(watched, partitions)) {
      if (keys.has(key)) continue;
      const record = element as Record<string, unknown>;
      const predicate = watched.fields.map(f => `${f}=${JSON.stringify(record[f])}`).join(',');
      refs.push({surface: watched.surface, pointer: `${watched.array}[${predicate}]`});
    }
  }
  return refs;
}

/** The facts of the payload's match claims that no longer hold while both their refs resolve. */
function unheld(payload: SynthesisPayload, partitions: Partitions): UnheldRelation[] {
  return walkModel(payload.dataModel).claims.flatMap(claim =>
    claim.relations.flatMap(({path, formula}) =>
      runFact(formula, partitions)?.state === 'fails'
        ? [{path, op: formula.op, args: formula.args}]
        : [],
    ),
  );
}

/**
 * The runtime's account of what changed under the live synthesis (task-7.6 decision 15): the refs
 * that no longer resolve, each once; the entries that appeared in a watched array; the facts that
 * no longer hold; the surfaces the view reads nothing from that were repainted (task-7.9). A
 * re-synthesis fires on all but the facts.
 */
export function changeAccount(
  payload: SynthesisPayload,
  partitions: Partitions,
  watch?: Watch,
  seen?: Seen,
): ChangeAccount {
  const absent: Ref[] = [];
  const counted = new Set<string>();
  for (const ref of refsOf(payload.dataModel)) {
    const key = `${ref.surface}${ref.pointer}`;
    if (counted.has(key)) continue;
    counted.add(key);
    if (!refValid(ref, partitions)) absent.push(ref);
  }
  return {
    absent,
    appeared: watch ? appeared(watch, partitions) : [],
    unheld: unheld(payload, partitions),
    repainted: seen ? repainted(payload, partitions, seen) : [],
  };
}

/** Whether the account fires a re-synthesis: something vanished, appeared, or painted again unread. */
export function firesResynthesis(changes: ChangeAccount): boolean {
  return changes.absent.length > 0 || changes.appeared.length > 0 || changes.repainted.length > 0;
}
