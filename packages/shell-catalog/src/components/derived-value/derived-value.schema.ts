import {z} from 'zod';
import {BindingSchema} from '../../binding.js';

/**
 * Runtime (zod) representation of DerivedValue, props-only (task-4.3 decisions 3, 5).
 *
 * - `cell` is the one binding: a path to the cell object the BindingEvaluator writes —
 *   value together with contributor state — so the component cannot be half-wired.
 * - `format` is fixed authoring-time configuration for rendering the value, never bound.
 */
export const FormatSchema = z
  .object({
    kind: z.enum(['text', 'number', 'currency']),
    currency: z.string().optional(),
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
    })
    .strict(),
} as const;

export type DerivedValueProps = z.infer<typeof DerivedValueApi.schema>;
export type Format = z.infer<typeof FormatSchema>;

/** What the evaluator writes at the bound path (the catalog ↔ evaluator contract). */
export interface CellObject {
  /** The computed value; undefined when nothing contributed. */
  value: unknown;
  /** Inputs that resolved. */
  contributed: number;
  /** Inputs the formula declared. */
  of: number;
  /** Namespaced surface ids whose refs did not resolve. */
  absent: string[];
  /** A generation mismatch was seen; the value is from the previous wiring. */
  stale?: boolean;
}
