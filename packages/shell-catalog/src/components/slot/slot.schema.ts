import {z} from 'zod';

/**
 * Runtime (zod) representation of Slot, props-only.
 *
 * All props are fixed authoring-time configuration — none are data-bound, so none use `Dynamic*`
 * wrappers.
 *
 * - A slot holds exactly one of `source` or `gap`.
 * - `source` is the dispatched source whose content fills the region: an app id, or `shell` for
 *   the merged view. It is the slot's identity within the layout; the host resolves content by it.
 * - `gap` is a capability no installed app serves, in words (task-6.3 decision 6): the region is
 *   the capability tile, and the gap is its Store query.
 * - `weight` is the basic catalog's flex-grow share inside a `Row` or `Column`.
 * - `state` is the lifecycle state the orchestrator paints (`pending` default in catalog.json).
 *   `filled` is not a wire state: content arriving via the host resolver is what fills a slot.
 * - `label` names the awaited content while pending or failed.
 * - `content` says whose content fills the region (task-5.5 decision 1): an agent's
 *   fragment (default), or the shell's own — the merged view — which keeps its reserved
 *   position but is painted like the shell's own UI: a quiet pending marker, no tile.
 */
export const SlotApi = {
  name: 'Slot',
  schema: z
    .object({
      source: z.string().optional(),
      gap: z.string().optional(),
      weight: z.number().optional(),
      state: z.enum(['pending', 'failed', 'collapsed']).optional(),
      label: z.string().optional(),
      content: z.enum(['fragment', 'shell']).optional(),
    })
    .strict()
    .refine(props => (props.source === undefined) !== (props.gap === undefined), {
      message: 'a Slot holds exactly one of source or gap',
    }),
} as const;

export type SlotProps = z.infer<typeof SlotApi.schema>;
