import type {CSSProperties} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {ImageApi} from '@a2ui/web_core/v0_9';
import {weightStyle} from '../shared/layout.js';

export type ImageFit = 'contain' | 'cover' | 'fill' | 'none' | 'scaleDown';
export type ImageVariant =
  'icon' | 'avatar' | 'smallFeature' | 'mediumFeature' | 'largeFeature' | 'header';

/** The variant sizes upstream fixes, here as plain values under the Theme's radius token. */
const VARIANTS: Record<ImageVariant, CSSProperties> = {
  icon: {width: 24, height: 24},
  avatar: {width: 40, height: 40, borderRadius: '50%'},
  smallFeature: {maxWidth: 100},
  mediumFeature: {maxWidth: '100%'},
  largeFeature: {maxWidth: '100%', maxHeight: 400},
  header: {width: '100%', height: 200, objectFit: 'cover'},
};

/**
 * `Image` has no Radix Themes counterpart (decision 2): a plain `img` inside the Provider,
 * rounded on the Theme's radius token, sized by `variant` as upstream sizes it. `fit` is the CSS
 * `object-fit` the schema says it is; `header` fixes `cover` over it, as upstream does.
 */
export function ImageView({
  url,
  description,
  fit = 'fill',
  variant = 'mediumFeature',
  style,
}: {
  url: string;
  description?: string;
  fit?: ImageFit;
  variant?: ImageVariant;
  style?: CSSProperties;
}) {
  return (
    <img
      src={url}
      alt={description ?? ''}
      style={{
        display: 'block',
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-2)',
        objectFit: fit === 'scaleDown' ? 'scale-down' : fit,
        ...VARIANTS[variant],
        ...style,
      }}
    />
  );
}

/** Catalog entry: `url` and `description` arrive resolved. */
export const ImageComponent = createComponentImplementation(ImageApi, ({props}) => (
  <ImageView
    url={props.url}
    description={props.description}
    fit={props.fit}
    variant={props.variant}
    style={weightStyle(props.weight)}
  />
));
