import {z} from 'zod';

/**
 * Runtime (zod) representation of Attribution, props-only.
 *
 * All props are fixed authoring-time configuration painted by the orchestrator
 * from its registry — none are data-bound (a fragment must not be able to
 * rebind who it claims to be), so none use `Dynamic*` wrappers.
 *
 * - `displayName` is the installed app's display name.
 * - `appId` is the stable app id.
 * - `account` is the credential's user-given label; `null` (or absent) for a
 *   single-account app. Populated from M8.
 * - `child` is the id of the region the marker names, rendered under it (task-6.4 decision 3):
 *   the marker and its fragment move as one box of the layout. Absent, the marker stands alone.
 * - `weight` is the box's flex-grow share inside a `Row` or `Column`, copied by the painter from
 *   the wrapped `Slot` so wrapped and bare slots size by one rule.
 */
export const AttributionApi = {
  name: 'Attribution',
  schema: z
    .object({
      displayName: z.string(),
      appId: z.string().optional(),
      account: z.string().nullable().optional(),
      child: z.string().optional(),
      weight: z.number().optional(),
    })
    .strict(),
} as const;

export type AttributionProps = z.infer<typeof AttributionApi.schema>;
