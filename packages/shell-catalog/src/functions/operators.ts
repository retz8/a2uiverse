import {createFunctionImplementation, spec, type FunctionImplementation} from '@a2ui/web_core/v1_0';
import {z} from 'zod';

/**
 * The formula operators (SPEC §5.2, task-4.3 decisions 1–2): the catalog functions a
 * synthesis cell's `op` may name. Declared in `catalog.json` like any other function;
 * this list is the one thing the catalog file cannot carry — which declared functions
 * the BindingEvaluator may be asked to execute. The parity test pins both directions.
 *
 * Operators are pure functions over positional values. The evaluator resolves refs,
 * drops absent inputs and counts contributors around the call; no operator ever sees a
 * surface id. `argmin`/`argmax` return the *index* of the winning input for the same
 * reason — mapping it back to a source is the evaluator's. `source` (task-5.7) is the
 * degenerate selector: the index of the first input that resolved, so a merged row can name
 * the app its entry came from without copying anything. `difference` takes exactly two numbers
 * (task-13.8 decision 28): with one side absent it has no value, so the cell shows none.
 */
export const OPERATORS = [
  'value',
  'min',
  'max',
  'sum',
  'avg',
  'difference',
  'count',
  'argmin',
  'argmax',
  'source',
] as const;
export type Operator = (typeof OPERATORS)[number];

// Each value is validated once resolved; the document declares what an agent writes there, a
// dynamic value (`REF:` is how upstream's schema serializer names a common type).
const number = z.number().describe('REF:#/$defs/DynamicNumber');
const anyValue = z.any().describe('REF:#/$defs/DynamicValue');
/** A function's arguments, closed in the document as upstream's basic catalog closes them. */
const args = <T extends z.ZodRawShape>(shape: T) =>
  spec(z.object(shape), {closure: 'unevaluatedProperties'});
const numbers = args({values: z.array(number).min(1)});
const anyValues = args({values: z.array(anyValue)});

const indexOf = (values: number[], pick: (a: number, b: number) => boolean) =>
  values.reduce((best, v, i) => (pick(v, values[best]!) ? i : best), 0);

export const operatorFunctions: readonly FunctionImplementation[] = [
  createFunctionImplementation(
    {name: 'value', returnType: 'any', schema: args({values: z.array(anyValue).min(1).max(1)})},
    ({values}) => values[0],
  ),
  createFunctionImplementation({name: 'min', returnType: 'number', schema: numbers}, ({values}) =>
    Math.min(...values),
  ),
  createFunctionImplementation({name: 'max', returnType: 'number', schema: numbers}, ({values}) =>
    Math.max(...values),
  ),
  createFunctionImplementation({name: 'sum', returnType: 'number', schema: numbers}, ({values}) =>
    values.reduce((a, b) => a + b, 0),
  ),
  createFunctionImplementation(
    {name: 'avg', returnType: 'number', schema: numbers},
    ({values}) => values.reduce((a, b) => a + b, 0) / values.length,
  ),
  createFunctionImplementation(
    {
      name: 'difference',
      returnType: 'number',
      schema: args({values: z.array(number).min(2).max(2)}),
    },
    ({values}) => {
      // The evaluator calls an operator without its schema; one side absent is no difference.
      if (values.length !== 2) throw new Error('difference takes exactly two numbers');
      return Math.abs(values[0]! - values[1]!);
    },
  ),
  createFunctionImplementation(
    {name: 'count', returnType: 'number', schema: anyValues},
    ({values}) => values.length,
  ),
  createFunctionImplementation(
    {name: 'argmin', returnType: 'number', schema: numbers},
    ({values}) => indexOf(values, (a, b) => a < b),
  ),
  createFunctionImplementation(
    {name: 'argmax', returnType: 'number', schema: numbers},
    ({values}) => indexOf(values, (a, b) => a > b),
  ),
  createFunctionImplementation(
    {name: 'source', returnType: 'number', schema: args({values: z.array(anyValue).min(1)})},
    () => 0,
  ),
];
