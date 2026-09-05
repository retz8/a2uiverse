import type {CSSProperties, ReactNode} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {RowApi} from '@a2ui/web_core/v0_9';
import {Flex} from '@radix-ui/themes';
import {renderChildList} from '../shared/child-list.js';
import {
  alignProp,
  justifyProps,
  weightStyle,
  type BasicAlign,
  type BasicJustify,
} from '../shared/layout.js';

/**
 * `Row` on Radix `Flex`, direction row, at Radix's space-3 gap (upstream's medium spacing).
 * `justify` and `align` translate per `shared/layout`; children are the resolved child list.
 */
export function RowView({
  justify,
  align,
  style,
  children,
}: {
  justify?: BasicJustify;
  align?: BasicAlign;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const j = justifyProps(justify);
  return (
    <Flex
      direction="row"
      gap="3"
      justify={j.justify}
      align={alignProp(align)}
      style={{...style, ...j.style}}
    >
      {children}
    </Flex>
  );
}

/** Catalog entry: the binder resolves `children` (static ids or a template expansion); `buildChild` renders each. */
export const RowComponent = createComponentImplementation(RowApi, ({props, buildChild}) => (
  <RowView justify={props.justify} align={props.align} style={weightStyle(props.weight)}>
    {renderChildList(props.children, buildChild)}
  </RowView>
));
