import {ChildListSchema, componentId, DynamicStringSchema, spec} from '@a2ui/web_core/v1_0';
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
  schema: spec(
    z
      .object({
        orientation: z.enum(['horizontal', 'vertical']).optional(),
        children: ChildListSchema,
      })
      .strict(),
    {mixins: []},
  ),
} as const;

export const DataListItemApi = {
  name: 'DataListItem',
  schema: spec(
    z
      .object({
        label: DynamicStringSchema,
        child: componentId(),
      })
      .strict(),
    {mixins: []},
  ),
} as const;

export type DataListProps = z.infer<typeof DataListApi.schema>;
export type DataListItemProps = z.infer<typeof DataListItemApi.schema>;
