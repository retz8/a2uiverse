import {ChildListSchema} from '@a2ui/web_core/v0_9';
import {z} from 'zod';

/**
 * Runtime (zod) representation of Table and TableRow, props-only (task 5.7).
 *
 * The merged view's list of like entries with several values each. The basic catalog can only
 * draw it as a header `Row` over a `Column` of `Row`s, and a `Row` sizes its children by content,
 * so the columns never line up. A table is the one shape whose columns align by construction.
 *
 * - `columns` are the headings, authored once — fixed configuration, plain strings.
 * - `columnSources` marks each column to the source it belongs to, or null for a column of no
 *   single source, one entry per column (task-8.2 decision 6). A column whose source has not
 *   arrived is drawn reserved from the host's slot state, the authored cell held back. That the
 *   lengths agree is the orchestrator's validator's check, not this schema's: the binder reads a
 *   component's child lists off the object's shape, and a refinement on the object hides it.
 * - `children` are the rows: static ids or a template over an array, as any child list.
 * - A `TableRow`'s `children` are its cells, one per column, in column order.
 */
export const TableApi = {
  name: 'Table',
  schema: z
    .object({
      columns: z.array(z.string()),
      columnSources: z.array(z.string().nullable()).optional(),
      children: ChildListSchema,
    })
    .strict(),
} as const;

export const TableRowApi = {
  name: 'TableRow',
  schema: z.object({children: ChildListSchema}).strict(),
} as const;

export type TableProps = z.infer<typeof TableApi.schema>;
export type TableRowProps = z.infer<typeof TableRowApi.schema>;
