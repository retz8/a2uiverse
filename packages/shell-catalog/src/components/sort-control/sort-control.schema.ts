import {z} from 'zod';
import {BindingSchema} from '../../binding.js';

/**
 * Runtime (zod) representation of SortControl, props-only (task-4.3 decision 4).
 *
 * `sort` is the one binding: a path to a sort declaration as the runtime writes it at
 * `/sorts/N` of the synthesis surface — the sdk's `SortDeclaration` with the user's
 * current choice applied. A user change writes the whole object back to the same path;
 * the evaluator re-orders on the write. Nothing here is authored.
 */
export const SortControlApi = {
  name: 'SortControl',
  schema: z.object({sort: BindingSchema}).strict(),
} as const;

export type SortControlProps = z.infer<typeof SortControlApi.schema>;

/**
 * LEGACY — the Phase 4 sort object the client's evaluator still writes at `/sort`.
 * Kept so the client compiles until 5.5 switches it to the sdk's `SortDeclaration`;
 * removed with 5.5.
 */
export interface SortObject {
  field: string;
  direction: 'asc' | 'desc';
  fields: readonly {name: string; label: string}[];
}
