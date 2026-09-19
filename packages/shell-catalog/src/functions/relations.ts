import {createFunctionImplementation, type FunctionImplementation} from '@a2ui/web_core/v0_9';
import {z} from 'zod';
import {instantPrecision, parseInstant} from '../components/shared/instant.js';

/**
 * The relations (SPEC §5.2, task-7.5 decisions 1–5): the match claim's evidence, declared in
 * `catalog.json` like any other function and kept apart from the formula operators — a relation
 * is written only inside `match`, and an operator never is. `equal` and `contains` are facts
 * checked against the data; `judged` is the Synthesizer's judgment that two values name one thing
 * where no fact links them.
 *
 * Like the operators, a relation is a pure function over positional values: the evaluator
 * resolves both refs and calls the relation absent when either does not resolve, so a relation
 * only ever sees two values and answers whether it holds.
 */
export const RELATIONS = ['equal', 'contains', 'judged'] as const;
export type RelationOp = (typeof RELATIONS)[number];

/** A fact is checked against the data and can fail; a judgment holds while both values resolve. */
export type RelationKind = 'fact' | 'judged';

export function relationKind(op: RelationOp): RelationKind {
  return op === 'judged' ? 'judged' : 'fact';
}

type Plain = string | number | boolean;

function isPlain(value: unknown): value is Plain {
  return (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

function isPlainList(value: unknown): value is Plain[] {
  return Array.isArray(value) && value.length > 0 && value.every(isPlain);
}

/** Scripts written without spaces between words: each character is a token of its own. */
const SPACELESS =
  '\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Thai}\\p{Script=Lao}\\p{Script=Khmer}\\p{Script=Myanmar}';
const TOKEN = new RegExp(
  `[${SPACELESS}]\\p{M}*|(?:(?![${SPACELESS}])[\\p{L}\\p{N}]\\p{M}*)+`,
  'gu',
);

/** Text as its words: Unicode normalized, case ignored, split on anything not a letter or digit. */
export function tokens(text: string): string[] {
  return text.normalize('NFKC').toLowerCase().match(TOKEN) ?? [];
}

const DECIMAL_READINGS: ReadonlyArray<[decimal: string, groupings: readonly string[]]> = [
  ['.', [',', "'", '’', ' ']],
  [',', ['.', "'", '’', ' ']],
];
const ALL_GROUPINGS = [',', '.', "'", '’', ' '];

/** Digits, or digits grouped in threes by one of the given separators. */
function groupedInteger(text: string, groupings: readonly string[]): string | undefined {
  if (/^\d+$/.test(text)) return text;
  const separator = text.replace(/\d/g, '')[0];
  if (separator === undefined || !groupings.includes(separator)) return undefined;
  const [head, ...rest] = text.split(separator);
  if (!/^\d{1,3}$/.test(head!) || !rest.every(group => /^\d{3}$/.test(group))) return undefined;
  return [head, ...rest].join('');
}

/** Every value a run of digits and separators can be read as. */
function readings(body: string): Set<number> {
  const values = new Set<number>();
  const whole = groupedInteger(body, ALL_GROUPINGS);
  if (whole !== undefined) values.add(Number(whole));
  for (const [decimal, groupings] of DECIMAL_READINGS) {
    const at = body.lastIndexOf(decimal);
    if (at < 0) continue;
    const fraction = body.slice(at + 1);
    const integer = groupedInteger(body.slice(0, at), groupings);
    if (integer !== undefined && /^\d+$/.test(fraction))
      values.add(Number(`${integer}.${fraction}`));
  }
  return values;
}

/** A sign and one currency symbol, on either side, around digits and grouping separators. */
const NUMBER_TEXT = /^([+\-−]?)\s*(\p{Sc}?)\s*([+\-−]?)\s*(\d[\d.,'’ ]*\d|\d)\s*(\p{Sc}?)$/u;

/**
 * The number a value reads as: a JSON number, or text that is only a number — a currency symbol
 * and grouping separators allowed. A spelling that reads two ways (`1,234`) is not a number.
 */
export function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;
  const parts = NUMBER_TEXT.exec(value.normalize('NFKC').trim());
  if (!parts) return undefined;
  const [, before, prefix, after, body, suffix] = parts;
  if ((before && after) || (prefix && suffix)) return undefined;
  const values = readings(body!);
  if (values.size !== 1) return undefined;
  const magnitude = [...values][0]!;
  const sign = before || after;
  return sign === '-' || sign === '−' ? -magnitude : magnitude;
}

function sameTokens(a: string[], b: string[]): boolean {
  return a.length > 0 && a.length === b.length && a.every((token, i) => token === b[i]);
}

/** Two plain values: as instants, as numbers, else as token sequences. */
function equalPlain(a: Plain, b: Plain): boolean {
  const [x, y] = [parseInstant(a), parseInstant(b)];
  if (x !== undefined && y !== undefined) {
    const unit = Math.max(instantPrecision(a)!, instantPrecision(b)!);
    return Math.floor(x / unit) === Math.floor(y / unit);
  }
  const [m, n] = [readNumber(a), readNumber(b)];
  if (m !== undefined && n !== undefined) return m === n;
  return sameTokens(tokens(String(a)), tokens(String(b)));
}

function containsPlain(a: Plain, b: Plain): boolean {
  const [haystack, needle] = [tokens(String(a)), tokens(String(b))];
  if (needle.length === 0) return false;
  for (let start = 0; start + needle.length <= haystack.length; start++) {
    if (needle.every((token, i) => token === haystack[start + i])) return true;
  }
  return false;
}

const among = (list: Plain[], value: Plain) => list.some(member => equalPlain(member, value));

export function equal(a: unknown, b: unknown): boolean {
  if (isPlainList(a) && isPlainList(b)) {
    return b.every(member => among(a, member)) && a.every(member => among(b, member));
  }
  return isPlain(a) && isPlain(b) && equalPlain(a, b);
}

/** b inside a: its words inside a's text, or among a list's members. */
export function contains(a: unknown, b: unknown): boolean {
  if (isPlainList(a)) {
    if (isPlainList(b)) return b.every(member => among(a, member));
    return isPlain(b) && among(a, b);
  }
  return isPlain(a) && isPlain(b) && containsPlain(a, b);
}

const pair = z.object({values: z.array(z.any()).length(2)});

export const relationFunctions: readonly FunctionImplementation[] = [
  createFunctionImplementation({name: 'equal', returnType: 'boolean', schema: pair}, ({values}) =>
    equal(values[0], values[1]),
  ),
  createFunctionImplementation(
    {name: 'contains', returnType: 'boolean', schema: pair},
    ({values}) => contains(values[0], values[1]),
  ),
  createFunctionImplementation({name: 'judged', returnType: 'boolean', schema: pair}, () => true),
];
