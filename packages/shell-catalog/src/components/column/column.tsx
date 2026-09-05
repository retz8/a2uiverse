import type {CSSProperties, ReactNode} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {ColumnApi} from '@a2ui/web_core/v0_9';
import {Flex} from '@radix-ui/themes';
import {renderChildList} from '../shared/child-list.js';
import {
  alignProp,
  justifyProps,
  weightStyle,
  type BasicAlign,
  type BasicJustify,
} from '../shared/layout.js';

/** `Column` on Radix `Flex`, direction column — `Row` turned on its side; see `row.tsx`. */
export function ColumnView({
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
      direction="column"
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
export const ColumnComponent = createComponentImplementation(ColumnApi, ({props, buildChild}) => (
  <ColumnView justify={props.justify} align={props.align} style={weightStyle(props.weight)}>
    {renderChildList(props.children, buildChild)}
  </ColumnView>
));
