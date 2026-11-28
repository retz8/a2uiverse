import type {CSSProperties, ReactNode} from 'react';
import {createComponentImplementation} from '@a2ui/react';
import {ColumnApi} from '@a2ui/web_core/catalogs/basic/v1';
import {Flex} from '@radix-ui/themes';
import {renderChildList} from '../shared/child-list.js';
import {
  alignProp,
  justifyProps,
  weightStyle,
  type BasicAlign,
  type BasicJustify,
  LAYOUT_GAP,
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
      style={{gap: LAYOUT_GAP, ...style, ...j.style}}
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
