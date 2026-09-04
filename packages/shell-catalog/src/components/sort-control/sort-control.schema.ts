import {z} from 'zod';
import {BindingSchema} from '../../binding.js';

/**
 * Runtime (zod) representation of SortControl, props-only (task-4.3 decision 4).
 *
 * `sort` is the one binding: a path to the object the BindingEvaluator writes — the current
 * field and direction plus the field list with labels. A user change writes the whole object
 * back to the same path; the evaluator re-orders on the write. Nothing here is authored.
 */
export const SortControlApi = {
  name: 'SortControl',
  schema: z.object({sort: BindingSchema}).strict(),
} as const;

export type SortControlProps = z.infer<typeof SortControlApi.schema>;

/** What the evaluator writes at the bound path. */
export interface SortObject {
  field: string;
  direction: 'asc' | 'desc';
  fields: readonly {name: string; label: string}[];
}
