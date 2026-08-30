import {z} from 'zod';

/**
 * Runtime (zod) representation of Frame, props-only.
 *
 * The shell's own layout container for a composed screen. It exists because the basic
 * catalog's `Row` and `Column` expose only `justify` and `align` — no way to say that
 * children should *share* the axis. A child cannot supply that itself either: it sits
 * inside its own wrapper and growing along its own main axis stretches it the wrong way.
 * So the decision belongs to the parent, and this is that parent.
 *
 * - `direction` is the axis its children are laid on.
 * - `children` are the ids it builds, in order.
 */
export const FrameApi = {
  name: 'Frame',
  schema: z
    .object({
      direction: z.enum(['row', 'column']),
      children: z.array(z.string()),
    })
    .strict(),
} as const;

export type FrameProps = z.infer<typeof FrameApi.schema>;
