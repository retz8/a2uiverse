import {ChildListSchema, DynamicStringSchema} from '@a2ui/web_core/v0_9';
import {z} from 'zod';

/**
 * Runtime (zod) representation of DataList and DataListItem, props-only (task 5.7).
 *
 * The labelled values of one thing — an entry's fields, a summary — as label beside value.
 * `orientation` is fixed configuration; an item's `label` is a `DynamicString` like `Text.text`,
 * its `child` the one component that shows the value.
 */
export const DataListApi = {
  name: 'DataList',
  schema: z
    .object({
      orientation: z.enum(['horizontal', 'vertical']).optional(),
      children: ChildListSchema,
    })
    .strict(),
} as const;

export const DataListItemApi = {
  name: 'DataListItem',
  schema: z
    .object({
      label: DynamicStringSchema,
      child: z.string(),
    })
    .strict(),
} as const;

export type DataListProps = z.infer<typeof DataListApi.schema>;
export type DataListItemProps = z.infer<typeof DataListItemApi.schema>;
