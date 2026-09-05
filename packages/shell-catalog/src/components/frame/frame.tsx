import {createComponentImplementation} from '@a2ui/react/v0_9';
import {Box, Flex} from '@radix-ui/themes';
import type {ReactNode} from 'react';
import {FrameApi, type FrameProps} from './frame.schema.js';

/**
 * The composed screen's layout frame.
 *
 * Its whole job is the one thing a child cannot do for itself: decide how children divide the
 * axis. Along a **row** they share it equally — `flex: 1 1 0`, so the basis is zero and the free
 * space splits evenly rather than being handed to whichever fragment happened to be wordier.
 * Down a **column** they keep their natural height and simply span the width.
 *
 * Each child is wrapped in its own flex item rather than styled directly, because a child is an
 * opaque node built by the renderer — the frame owns the box, the child owns what is in it.
 * The frame is a Radix `Flex` at Radix's space-3 gap and each item a Radix `Box`
 * (task-5.9 decision 5); the share is still written as the flex longhands, because "basis
 * zero" — the reason shares come out equal — is the point and should stay legible.
 */
export function FrameView({
  direction,
  children,
  buildChild,
}: FrameProps & {buildChild: (id: string) => ReactNode}) {
  const row = direction === 'row';
  return (
    <Flex
      data-frame={direction}
      direction={direction}
      align="stretch"
      gap="3"
      width="100%"
      style={{minWidth: 0}}
    >
      {children.map(id => (
        <Box
          key={id}
          style={{
            flexGrow: row ? 1 : 0,
            flexShrink: row ? 1 : 0,
            flexBasis: row ? 0 : 'auto',
            // Lets a fragment with long unbroken content shrink instead of forcing the row wider.
            minWidth: 0,
          }}
        >
          {buildChild(id)}
        </Box>
      ))}
    </Flex>
  );
}

/** Catalog entry: the generic binder resolves props, then renders FrameView. */
export const FrameComponent = createComponentImplementation(FrameApi, ({props, buildChild}) => (
  <FrameView direction={props.direction} children={props.children} buildChild={buildChild} />
));
