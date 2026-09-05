import type {CSSProperties} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {AudioPlayerApi} from '@a2ui/web_core/v0_9';
import {Flex, Text} from '@radix-ui/themes';
import {weightStyle} from '../shared/layout.js';

/**
 * `AudioPlayer` has no Radix Themes counterpart (decision 2): the native player under a Radix
 * `Text` caption for the description, stacked in a Radix `Flex`.
 */
export function AudioPlayerView({
  url,
  description,
  style,
}: {
  url: string;
  description?: string;
  style?: CSSProperties;
}) {
  return (
    <Flex direction="column" gap="1" style={style}>
      {description && (
        <Text as="span" size="1" color="gray">
          {description}
        </Text>
      )}
      <audio src={url} controls style={{width: '100%'}} />
    </Flex>
  );
}

/** Catalog entry: `url` and `description` arrive resolved. */
export const AudioPlayerComponent = createComponentImplementation(AudioPlayerApi, ({props}) => (
  <AudioPlayerView
    url={props.url}
    description={props.description}
    style={weightStyle(props.weight)}
  />
));
