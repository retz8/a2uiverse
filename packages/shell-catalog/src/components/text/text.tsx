import type {CSSProperties} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {TextApi} from '@a2ui/web_core/v0_9';
import {Heading, Text} from '@radix-ui/themes';
import {weightStyle} from '../shared/layout.js';
import {useMarkdownHtml} from '../shared/markdown.js';

export type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'caption' | 'body';

/**
 * The heading variants onto Radix `Heading`: the element the variant names, at one Radix size
 * step per level. Radix's own default heading size is 6; the catalog's `h1` sits one step above
 * it and `h5` three below, which keeps a fragment's headings inside the canvas's scale.
 */
const HEADINGS: Record<
  Exclude<TextVariant, 'caption' | 'body'>,
  {as: 'h1' | 'h2' | 'h3' | 'h4' | 'h5'; size: '7' | '6' | '5' | '4' | '3'}
> = {
  h1: {as: 'h1', size: '7'},
  h2: {as: 'h2', size: '6'},
  h3: {as: 'h3', size: '5'},
  h4: {as: 'h4', size: '4'},
  h5: {as: 'h5', size: '3'},
};

/**
 * `Text` on Radix Themes. Headings are Radix `Heading`; a caption is Radix `Text` at size 1 in
 * gray; body is Radix `Text` at size 2 (Radix's own body size) — rendered through the host's
 * markdown renderer when one is installed (decision 4), plain otherwise. Upstream renders body
 * as a block and caption inline, and this keeps that.
 */
export function TextView({
  text,
  variant = 'body',
  style,
}: {
  text: string;
  variant?: TextVariant;
  style?: CSSProperties;
}) {
  if (variant === 'body') return <BodyText text={text} style={style} />;
  if (variant === 'caption') {
    return (
      <Text as="span" size="1" color="gray" style={style}>
        {text}
      </Text>
    );
  }
  const heading = HEADINGS[variant];
  return (
    <Heading as={heading.as} size={heading.size} style={style}>
      {text}
    </Heading>
  );
}

function BodyText({text, style}: {text: string; style?: CSSProperties}) {
  const html = useMarkdownHtml(text);
  if (html === null) {
    return (
      <Text as="div" size="2" style={style}>
        {text}
      </Text>
    );
  }
  return <Text as="div" size="2" style={style} dangerouslySetInnerHTML={{__html: html}} />;
}

/** Catalog entry: `text` arrives resolved; upstream stringifies a non-string bound value the same way. */
export const TextComponent = createComponentImplementation(TextApi, ({props}) => (
  <TextView
    text={typeof props.text === 'string' ? props.text : String(props.text ?? '')}
    variant={props.variant}
    style={weightStyle(props.weight)}
  />
));
