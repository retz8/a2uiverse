import type {CSSProperties} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {DividerApi} from '@a2ui/web_core/v0_9';
import {Separator} from '@radix-ui/themes';
import {weightStyle} from '../shared/layout.js';

export type DividerAxis = 'horizontal' | 'vertical';

/**
 * `Divider` on Radix `Separator` at full length. A vertical one stretches to the row it sits in
 * rather than to a percentage of an auto-height parent, which would be nothing.
 */
export function DividerView({
  axis = 'horizontal',
  style,
}: {
  axis?: DividerAxis;
  style?: CSSProperties;
}) {
  const vertical = axis === 'vertical';
  return (
    <Separator
      orientation={axis}
      size="4"
      style={vertical ? {height: 'auto', alignSelf: 'stretch', ...style} : style}
    />
  );
}

/** Catalog entry. */
export const DividerComponent = createComponentImplementation(DividerApi, ({props}) => (
  <DividerView axis={props.axis} style={weightStyle(props.weight)} />
));
