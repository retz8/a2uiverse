/**
 * A skeleton bar: the shape of content that has not arrived, in `--a2v-skel`. The reserved merge
 * slot draws four rows of them (task 7.15); a reserved column draws one per cell (task 8.2).
 */
export function SkeletonBar({width, height}: {width: number | string; height: number}) {
  return (
    <i
      aria-hidden
      data-skeleton-bar=""
      style={{
        display: 'block',
        width,
        height,
        borderRadius: height / 2,
        background: 'var(--a2v-skel, var(--gray-a3))',
      }}
    />
  );
}
