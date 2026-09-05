import type {CSSProperties} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {IconApi} from '@a2ui/web_core/v0_9';
import {QuestionMarkIcon} from '@radix-ui/react-icons';
import {weightStyle} from '../shared/layout.js';
import {ICON_GLYPHS, isIconName} from './glyphs.js';

/** The icon's box: Radix Icons draw on a 15-unit grid, shown here at a size that sits with body text. */
const SIZE = 20;

const boxStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  lineHeight: 1,
  color: 'inherit',
};

/**
 * `Icon` on Radix Icons (decision 3). A name from the schema's enum renders its glyph from the
 * table — the stated nearest one where Radix has no honest counterpart; `{svgPath}` stays an
 * inline SVG on Material's 24-unit grid; a bound name the table does not know renders a question
 * mark carrying the name, never a blank. No font, no stylesheet.
 */
export function IconView({
  name,
  style,
}: {
  name: string | {svgPath: string} | undefined;
  style?: CSSProperties;
}) {
  if (typeof name === 'object' && name !== null && 'svgPath' in name) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={SIZE}
        height={SIZE}
        fill="currentColor"
        aria-hidden="true"
        data-icon="svgPath"
        style={{...boxStyle, ...style}}
      >
        <path d={name.svgPath} />
      </svg>
    );
  }
  const key = typeof name === 'string' ? name : '';
  if (isIconName(key)) {
    const {glyph: Glyph} = ICON_GLYPHS[key];
    return (
      <span data-icon={key} style={{...boxStyle, ...style}}>
        <Glyph width={SIZE} height={SIZE} aria-hidden="true" />
      </span>
    );
  }
  return (
    <span data-icon="unknown" data-icon-name={key} title={key} style={{...boxStyle, ...style}}>
      <QuestionMarkIcon width={SIZE} height={SIZE} aria-hidden="true" />
    </span>
  );
}

/**
 * Catalog entry: `name` is an enum, an `{svgPath}` object, or a binding the binder resolves to
 * whatever the data model holds — a string is looked up by name; anything else is unknown.
 */
export const IconComponent = createComponentImplementation(IconApi, ({props}) => (
  <IconView
    name={props.name as string | {svgPath: string} | undefined}
    style={weightStyle(props.weight)}
  />
));
