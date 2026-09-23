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
 * - `noun` (fragment content) is what the source was asked for, as the plan's join calls it —
 *   "CircleCI runs" — written by the painter at plan time; the failure tile's line is composed
 *   from it and the label (task-8.2 decision 3).
 * - `failure` (fragment content) is why the source failed, painted by the runtime with `state:
 *   "failed"` (task-8.2 decision 2): one of four causes, and the vendor's own message only when
 *   the vendor ended its task itself.
 * - `content` says whose content fills the region (task-5.5 decision 1): an agent's
 *   fragment (default), or the shell's own — the merged view — which keeps its reserved
 *   position but is painted like the shell's own UI, no tile: while pending, reserved as the
 *   merged view's label, its planned column headers and skeleton rows (task-7.15).
 * - `columns` (shell content) are the merged view's planned column headers.
 * - `columnSources` (shell content) marks each planned column to the source it belongs to, or
 *   null for a column of no single source, one entry per column (task-8.2 decision 6).
 * - `join` (shell content) is the entity as each source calls it — the home source and a plural
 *   noun per source — which the slot does not draw; the host reads it for its progress line.
 * - `declined` (shell content) is the Synthesizer's reason for declining the merge, painted by
 *   the runtime with `state: "collapsed"` and drawn as one line (task-8.2 decision 9).
 */
export const FAILURE_CAUSES = ['vendor', 'unreachable', 'timeout', 'invalid'] as const;
export type FailureCause = (typeof FAILURE_CAUSES)[number];

const FailureSchema = z
  .object({
    cause: z.enum(FAILURE_CAUSES),
    message: z.string().optional(),
  })
  .strict()
  .refine(failure => failure.message === undefined || failure.cause === 'vendor', {
    message: 'a failure carries a message only when the vendor said it',
  });

export const SlotApi = {
  name: 'Slot',
  schema: z
    .object({
      source: z.string().optional(),
      gap: z.string().optional(),
      weight: z.number().optional(),
      state: z.enum(['pending', 'failed', 'collapsed']).optional(),
      label: z.string().optional(),
      noun: z.string().optional(),
      failure: FailureSchema.optional(),
      content: z.enum(['fragment', 'shell']).optional(),
      columns: z.array(z.string()).optional(),
      columnSources: z.array(z.string().nullable()).optional(),
      join: z
        .object({home: z.string(), nouns: z.record(z.string(), z.string())})
        .strict()
        .optional(),
      declined: z.object({reason: z.string()}).strict().optional(),
    })
    .strict()
    .refine(props => (props.source === undefined) !== (props.gap === undefined), {
      message: 'a Slot holds exactly one of source or gap',
    })
    .refine(
      props =>
        props.columnSources === undefined ||
        (props.columns !== undefined && props.columnSources.length === props.columns.length),
      {message: 'columnSources has one entry per column'},
    ),
} as const;

export type SlotProps = z.infer<typeof SlotApi.schema>;
export type SlotFailure = z.infer<typeof FailureSchema>;
