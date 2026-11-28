import type {CSSProperties} from 'react';
import {createComponentImplementation} from '@a2ui/react';
import {TextApi} from '@a2ui/web_core/catalogs/basic/v1';
import {Heading, Text} from '@radix-ui/themes';
import {weightStyle} from '../shared/layout.js';
import {useMarkdownHtml} from '../shared/markdown.js';

export type TextVariant = 'caption' | 'body';

/**
 * A heading is a text of one line: one to five `#`, a space and its words (task-21.12 decision
 * 4), the level the number of markers.
 */
const HEADING_LINE = /^(#{1,5}) (\S[^\n\r]*)$/;

interface HeadingLine {
  level: 1 | 2 | 3 | 4 | 5;
  words: string;
}

/** The heading a text is, or null when it is anything else. */
function headingLine(text: string): HeadingLine | null {
  const match = HEADING_LINE.exec(text);
  if (!match) return null;
  return {level: match[1]!.length as HeadingLine['level'], words: match[2]!};
}

/**
 * The heading levels onto Radix `Heading`: the element the level names, at one Radix size step
 * per level. Radix's own default heading size is 6; a level-one heading sits one step above it
 * and level four two below, which keeps a fragment's headings inside the canvas's scale. Level
 * five is the label, below.
 */
const HEADINGS: Record<
  1 | 2 | 3 | 4,
  {as: 'h1' | 'h2' | 'h3' | 'h4'; size: '7' | '6' | '5' | '4'}
> = {
  1: {as: 'h1', size: '7'},
  2: {as: 'h2', size: '6'},
  3: {as: 'h3', size: '5'},
  4: {as: 'h4', size: '4'},
};

/**
 * Level five, `#####`, is the label a merged view carries on its sort control's row (task 7.16,
 * the design canvas's F3): the model's title named small, since the user's question is the
 * canvas's header (SPEC §4.3). Still a heading element, so the view keeps its accessible name.
 */
const LABEL_STYLE: CSSProperties = {
  fontSize: 13,
  lineHeight: '20px',
  fontWeight: 600,
  letterSpacing: 'normal',
  color: 'var(--a2v-ink-2, var(--gray-12))',
  // One line beside the sort control, as the canvas draws it; a narrow slot ends it in an
  // ellipsis, the whole title still in the heading's text and its tooltip.
  minWidth: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

/**
 * `Text` on Radix Themes. A caption is Radix `Text` at size 1 in gray, drawn literally whatever it
 * starts with. A body text that is one heading line (`headingLine`) is Radix `Heading`, its words
 * plain, drawn by the shell in the first frame with or without a markdown renderer (task-21.12
 * decision 4). Any other body text is Radix `Text` at size 2 (Radix's own body size), rendered
 * through the host's markdown renderer when one is installed, plain otherwise; a heading inside a
 * longer text is the renderer's (task-21.12 decision 5). Upstream renders body as a block and
 * caption inline, and this keeps that.
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
  if (variant === 'caption') {
    return (
      <Text as="span" size="1" color="gray" style={style}>
        {text}
      </Text>
    );
  }
  const heading = headingLine(text);
  if (!heading) return <BodyText text={text} style={style} />;
  if (heading.level === 5) {
    return (
      <Heading as="h5" title={heading.words} style={{...LABEL_STYLE, ...style}}>
        {heading.words}
      </Heading>
    );
  }
  const {as, size} = HEADINGS[heading.level];
  return (
    <Heading as={as} size={size} style={style}>
      {heading.words}
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
  return (
    <Text
      as="div"
      size="2"
      className="a2uiverse-shell-markdown"
      style={style}
      dangerouslySetInnerHTML={{__html: html}}
    />
  );
}

/** Catalog entry: `text` arrives resolved; upstream stringifies a non-string bound value the same way. */
export const TextComponent = createComponentImplementation(TextApi, ({props}) => (
  <TextView
    text={typeof props.text === 'string' ? props.text : String(props.text ?? '')}
    variant={props.variant}
    style={weightStyle(props.weight)}
  />
));
