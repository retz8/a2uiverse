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
 * - `children` are the rows: static ids or a template over an array, as any child list.
 * - A `TableRow`'s `children` are its cells, one per column, in column order.
 */
export const TableApi = {
  name: 'Table',
  schema: z
    .object({
      columns: z.array(z.string()),
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
