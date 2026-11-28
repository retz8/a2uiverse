/**
 * The two shapes a recorded file has (task-21.11 decision 5) and the walk over its messages. A beat
 * file — the client's and the agent kit's — keeps its messages in its turns' batches, each turn on
 * a canvas: an utterance opens one, anything else lands on the canvas it names or the one last
 * opened. A bare list of messages is one canvas, and so is the list an example shown to the model
 * keeps under `messages`.
 *
 * A surface is walked paint by paint, as `scripts/recorded-verdicts.mjs` judged it before the flip:
 * a paint runs from a surface's `createSurface` to the next, or to its `deleteSurface`, within one
 * canvas; the messages for a surface the file never creates are one paint, numbered 0.
 */

export type Json = Record<string, unknown>;

export const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const OPERATIONS = ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface'];

/** The A2UI operation a message carries, if it carries one. */
export const operationOf = (message: unknown): string | undefined =>
  isObject(message) ? OPERATIONS.find(op => isObject(message[op])) : undefined;

/** The surface id the agent kit stamps on a fixture that names none. */
export const FIXTURE_SURFACE = 'fixture';

export type RecordedShape = 'beat' | 'list' | 'example';

/** The shape of a recorded file, or undefined when it is neither. */
export function shapeOf(file: unknown): RecordedShape | undefined {
  if (Array.isArray(file)) return 'list';
  if (isObject(file) && Array.isArray(file.turns)) return 'beat';
  if (isObject(file) && Array.isArray(file.messages)) return 'example';
  return undefined;
}

/** One message of a file, where it sits and the canvas it lands on. */
export interface Placed {
  message: unknown;
  canvas: number;
  /** Puts a rewritten message in its place. */
  replace(message: unknown): void;
}

/** Every message of a file in arrival order. */
export function placedMessages(file: unknown): Placed[] {
  const shape = shapeOf(file);
  const list = (messages: unknown[], canvas: number): Placed[] =>
    messages.map((message, i) => ({
      message,
      canvas,
      replace: next => {
        messages[i] = next;
      },
    }));
  if (shape === 'list') return list(file as unknown[], 0);
  if (shape === 'example') return list((file as Json).messages as unknown[], 0);
  if (shape !== 'beat') return [];
  const out: Placed[] = [];
  let opened = -1;
  for (const turn of (file as Json).turns as Json[]) {
    const canvas =
      turn.kind === 'utterance' ? ++opened : typeof turn.canvas === 'number' ? turn.canvas : opened;
    for (const batch of (turn.batches as Json[] | undefined) ?? []) {
      if (Array.isArray(batch.messages)) out.push(...list(batch.messages, canvas));
    }
  }
  return out;
}

/** A surface's id as the file names it, the kit's stamp standing in for none. */
export function surfaceIdOf(message: Json, op: string): string {
  const body = message[op] as Json;
  return typeof body.surfaceId === 'string' ? body.surfaceId : FIXTURE_SURFACE;
}

/** One paint of one surface, the messages it carries in order. */
export interface Paint {
  surface: string;
  canvas: number;
  /** 1 for the surface's first `createSurface` in the file, 2 for its second, 0 for none. */
  paint: number;
  /** The catalog its `createSurface` names; undefined for a paint the file never creates. */
  catalogId: string | undefined;
  messages: Json[];
}

/** A file's A2UI messages, paint by paint. */
export function paintsOf(messages: readonly Pick<Placed, 'message' | 'canvas'>[]): Paint[] {
  const paints: Paint[] = [];
  const open = new Map<string, Paint>();
  const counts = new Map<string, number>();
  for (const {message, canvas} of messages) {
    const op = operationOf(message);
    if (!op) continue;
    const json = message as Json;
    const surface = surfaceIdOf(json, op);
    const key = `${canvas}|${surface}`;
    if (op === 'createSurface' || !open.has(key)) {
      const created = op === 'createSurface';
      const n = created ? (counts.get(surface) ?? 0) + 1 : 0;
      if (created) counts.set(surface, n);
      const catalogId = created ? ((json.createSurface as Json).catalogId as string) : undefined;
      const paint: Paint = {surface, canvas, paint: n, catalogId, messages: []};
      paints.push(paint);
      open.set(key, paint);
    }
    open.get(key)!.messages.push(json);
    if (op === 'deleteSurface') open.delete(key);
  }
  return paints;
}
