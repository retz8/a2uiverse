import {z} from 'zod';
import {BindingSchema} from '../../binding.js';
import type {CellJoin, CellTarget} from './join.js';

/**
 * Runtime (zod) representation of DerivedValue, props-only (task-4.3 decisions 3, 5).
 *
 * - `cell` is the one binding: a path to the cell object the BindingEvaluator writes —
 *   value together with contributor state — so the component cannot be half-wired.
 * - `format` is fixed authoring-time configuration for rendering the value, never bound;
 *   `datetime` (task 5.7) renders any spelling of a date-and-time in one human form; `prefix`
 *   (task 7.16) is written before a present value, so a number reads as a handle (`#8`).
 * - `danger` (task 7.16) is the values a reader must act on, named by the Synthesizer and never
 *   bound: the view compares the evaluated value against them and draws a match in the danger
 *   tone. The Synthesizer judges what a word means; the client only compares.
 */
export const FormatSchema = z
  .object({
    kind: z.enum(['text', 'number', 'currency', 'datetime']),
    currency: z.string().optional(),
    prefix: z.string().optional(),
  })
  .strict()
  .refine(f => f.kind !== 'currency' || typeof f.currency === 'string', {
    message: 'currency format needs a currency code',
  });

export const DerivedValueApi = {
  name: 'DerivedValue',
  schema: z
    .object({
      cell: BindingSchema,
      format: FormatSchema.optional(),
      danger: z.array(z.string()).min(1).optional(),
    })
    .strict(),
} as const;

export type DerivedValueProps = z.infer<typeof DerivedValueApi.schema>;
export type Format = z.infer<typeof FormatSchema>;

/** What the evaluator writes at the bound path (the catalog ↔ evaluator contract). */
export interface CellObject {
  /** The computed value; undefined when nothing contributed. */
  value: unknown;
  /**
   * What the value names, when it names something the host has its own name for: a source
   * selector's value is an app id, drawn by the app's display name. Sorting and the data keep the id.
   */
  names?: 'app';
  /** Inputs that resolved. */
  contributed: number;
  /** Inputs the formula declared. */
  of: number;
  /** Namespaced surface ids whose refs did not resolve. */
  absent: string[];
  /** The join of the object the cell belongs to; none when that object carries no match claim. */
  join?: CellJoin;
  /** The element the cell navigates to; none when the formula has no refs, or none that resolves. */
  target?: CellTarget;
}
