import {z} from 'zod';

/**
 * Runtime (zod) representation of Attribution, props-only.
 *
 * All props are fixed authoring-time configuration painted by the orchestrator
 * from its registry — none are data-bound (a fragment must not be able to
 * rebind who it claims to be), so none use `Dynamic*` wrappers.
 *
 * - `displayName` is the installed app's display name.
 * - `source` is the source id of the region it names — the app and the account it painted
 *   under (task-12.2 decision 8): the fragment's history and every press key off it.
 * - `account` is the account's label from the sign-in; `null` (or absent) for an app with a
 *   single account.
 * - `escalation` is a scope request waiting on Allow or Not now, painted by the runtime: the
 *   missing scopes only, at least one, in the words of the card's `scopes` map.
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
      source: z.string().optional(),
      account: z.string().nullable().optional(),
      escalation: z
        .object({scopes: z.array(z.string()).min(1)})
        .strict()
        .optional(),
      child: z.string().optional(),
      weight: z.number().optional(),
    })
    .strict(),
} as const;

export type AttributionProps = z.infer<typeof AttributionApi.schema>;
