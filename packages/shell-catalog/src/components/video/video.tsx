import type {CSSProperties} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {VideoApi} from '@a2ui/web_core/v0_9';
import {weightStyle} from '../shared/layout.js';

/** `Video` has no Radix Themes counterpart (decision 2): the native player, rounded on the Theme's radius token. */
export function VideoView({url, style}: {url: string; style?: CSSProperties}) {
  return (
    <video
      src={url}
      controls
      style={{
        display: 'block',
        boxSizing: 'border-box',
        width: '100%',
        height: 'auto',
        borderRadius: 'var(--radius-3)',
        ...style,
      }}
    />
  );
}

/** Catalog entry: `url` arrives resolved. */
export const VideoComponent = createComponentImplementation(VideoApi, ({props}) => (
  <VideoView url={props.url} style={weightStyle(props.weight)} />
));
