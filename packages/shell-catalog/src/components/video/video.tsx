import type {CSSProperties} from 'react';
import {createComponentImplementation} from '@a2ui/react';
import {VideoApi} from '@a2ui/web_core/catalogs/basic/v1';
import {weightStyle} from '../shared/layout.js';

/**
 * `Video` has no Radix Themes counterpart (decision 2): the native player, rounded on the Theme's
 * radius token. `posterUrl` is the player's poster, shown before the video plays.
 */
export function VideoView({
  url,
  posterUrl,
  style,
}: {
  url: string;
  posterUrl?: string;
  style?: CSSProperties;
}) {
  return (
    <video
      src={url}
      poster={posterUrl || undefined}
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

/** Catalog entry: `url` and `posterUrl` arrive resolved. */
export const VideoComponent = createComponentImplementation(VideoApi, ({props}) => (
  <VideoView url={props.url} posterUrl={props.posterUrl} style={weightStyle(props.weight)} />
));
