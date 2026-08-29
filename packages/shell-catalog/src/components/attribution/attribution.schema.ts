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
 */
export const AttributionApi = {
  name: 'Attribution',
  schema: z
    .object({
      displayName: z.string(),
      appId: z.string().optional(),
      account: z.string().nullable().optional(),
    })
    .strict(),
} as const;

export type AttributionProps = z.infer<typeof AttributionApi.schema>;
