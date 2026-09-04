import {createFunctionImplementation, type FunctionImplementation} from '@a2ui/web_core/v0_9';
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
 * reason — mapping it back to a source is the evaluator's.
 */
export const OPERATORS = [
  'value',
  'min',
  'max',
  'sum',
  'avg',
  'count',
  'argmin',
  'argmax',
] as const;
export type Operator = (typeof OPERATORS)[number];

const numbers = z.object({values: z.array(z.number()).min(1)});
const anyValues = z.object({values: z.array(z.any())});

const indexOf = (values: number[], pick: (a: number, b: number) => boolean) =>
  values.reduce((best, v, i) => (pick(v, values[best]!) ? i : best), 0);

export const operatorFunctions: readonly FunctionImplementation[] = [
  createFunctionImplementation(
    {name: 'value', returnType: 'any', schema: z.object({values: z.array(z.any()).length(1)})},
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
];
