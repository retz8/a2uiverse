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
 * - `content` says whose content fills the region (task-5.5 decision 1): an agent's
 *   fragment (default), or the shell's own — the merged view — which keeps its reserved
 *   position but is painted like the shell's own UI: a quiet pending marker, no tile.
 */
export const SlotApi = {
  name: 'Slot',
  schema: z
    .object({
      name: z.string(),
      state: z.enum(['pending', 'failed', 'collapsed']).optional(),
      label: z.string().optional(),
      content: z.enum(['fragment', 'shell']).optional(),
    })
    .strict(),
} as const;

export type SlotProps = z.infer<typeof SlotApi.schema>;
