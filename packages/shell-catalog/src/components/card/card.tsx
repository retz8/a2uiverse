import type {CSSProperties, ReactNode} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {CardApi} from '@a2ui/web_core/v0_9';
import {Card} from '@radix-ui/themes';
import {weightStyle} from '../shared/layout.js';

/** `Card` on Radix `Card`: the `surface` variant at size 2, its one child inside. */
export function CardView({style, children}: {style?: CSSProperties; children?: ReactNode}) {
  return (
    <Card size="2" variant="surface" style={style}>
      {children}
    </Card>
  );
}

/** Catalog entry: `child` is a component id, built by the renderer. */
export const CardComponent = createComponentImplementation(CardApi, ({props, buildChild}) => (
  <CardView style={weightStyle(props.weight)}>
    {props.child ? buildChild(props.child) : null}
  </CardView>
));
