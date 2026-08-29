import {z} from 'zod';

/**
 * Runtime (zod) representation of Slot, props-only.
 *
 * All props are fixed authoring-time configuration painted by the orchestrator —
 * none are data-bound, so none use `Dynamic*` wrappers.
 *
 * - `name` is the slot's identity within the layout, unique per surface; repaints
 *   reference the slot by it.
 * - `state` is the lifecycle state the orchestrator paints (`pending` default in
 *   catalog.json). `filled` is not a wire state: content arriving via the host
 *   resolver is what fills a slot.
 * - `label` names the awaited content while pending or failed.
 */
export const SlotApi = {
  name: 'Slot',
  schema: z
    .object({
      name: z.string(),
      state: z.enum(['pending', 'failed', 'collapsed']).optional(),
      label: z.string().optional(),
    })
    .strict(),
} as const;

export type SlotProps = z.infer<typeof SlotApi.schema>;
