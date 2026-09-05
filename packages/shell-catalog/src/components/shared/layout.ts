import type {CSSProperties} from 'react';

/**
 * The basic catalog's `weight`: a flex-grow share inside a `Row` or `Column`, exactly as
 * upstream's implementation applies it. `minWidth`/`minHeight: 0` let a weighted child shrink
 * below its content size instead of forcing the container wider.
 */
export function weightStyle(weight: number | undefined): CSSProperties {
  return typeof weight === 'number' ? {flex: `${weight}`, minWidth: 0, minHeight: 0} : {};
}

export type BasicJustify =
  'center' | 'end' | 'spaceAround' | 'spaceBetween' | 'spaceEvenly' | 'start' | 'stretch';

export type BasicAlign = 'start' | 'center' | 'end' | 'stretch';

type RadixJustify = 'start' | 'center' | 'end' | 'between';

/**
 * The basic catalog's `justify` onto Radix `Flex`. Radix names four of the seven values as a
 * prop (`start` · `center` · `end` · `between`); the other three have no prop and are set as the
 * CSS property directly on the same element, which is all the prop does anyway.
 */
export function justifyProps(justify: BasicJustify | undefined): {
  justify?: RadixJustify;
  style?: CSSProperties;
} {
  switch (justify) {
    case 'center':
    case 'end':
    case 'start':
      return {justify};
    case 'spaceBetween':
      return {justify: 'between'};
    case 'spaceAround':
      return {style: {justifyContent: 'space-around'}};
    case 'spaceEvenly':
      return {style: {justifyContent: 'space-evenly'}};
    case 'stretch':
      return {style: {justifyContent: 'stretch'}};
    default:
      return {justify: 'start'};
  }
}

/** The basic catalog's `align` is a subset of Radix `Flex`'s `align`; upstream's default is `stretch`. */
export function alignProp(align: BasicAlign | undefined): BasicAlign {
  return align ?? 'stretch';
}
