import type {CSSProperties, ReactNode} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {ListApi} from '@a2ui/web_core/v0_9';
import {Flex} from '@radix-ui/themes';
import {renderChildList} from '../shared/child-list.js';
import {alignProp, weightStyle, type BasicAlign} from '../shared/layout.js';

export type ListDirection = 'vertical' | 'horizontal';

/**
 * `List` on Radix `Flex`: a scrolling run of items along one axis at Radix's space-2 gap
 * (upstream's small spacing), overflow along the axis, as upstream lays it out.
 */
export function ListView({
  direction = 'vertical',
  align,
  style,
  children,
}: {
  direction?: ListDirection;
  align?: BasicAlign;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const horizontal = direction === 'horizontal';
  return (
    <Flex
      direction={horizontal ? 'row' : 'column'}
      gap="2"
      align={alignProp(align)}
      style={{
        overflowX: horizontal ? 'auto' : 'hidden',
        overflowY: horizontal ? 'hidden' : 'auto',
        ...style,
      }}
    >
      {children}
    </Flex>
  );
}

/** Catalog entry: the binder resolves `children` (static ids or a template expansion); `buildChild` renders each. */
export const ListComponent = createComponentImplementation(ListApi, ({props, buildChild}) => (
  <ListView direction={props.direction} align={props.align} style={weightStyle(props.weight)}>
    {renderChildList(props.children, buildChild)}
  </ListView>
));
