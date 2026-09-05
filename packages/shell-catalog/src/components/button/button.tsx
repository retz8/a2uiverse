import type {CSSProperties, ReactNode} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {ButtonApi} from '@a2ui/web_core/v0_9';
import {Button} from '@radix-ui/themes';
import {ariaProps, type ResolvedAccessibility} from '../shared/accessibility.js';
import {weightStyle} from '../shared/layout.js';

export type ButtonVariant = 'default' | 'primary' | 'borderless';

/**
 * The basic catalog's three variants onto Radix `Button`'s: the plain button is a neutral
 * `surface`, the call to action is the accent `solid`, and `borderless` — "its child content
 * appears like a clickable link" — is `ghost`.
 */
const VARIANTS: Record<ButtonVariant, {variant: 'surface' | 'solid' | 'ghost'; color?: 'gray'}> = {
  default: {variant: 'surface', color: 'gray'},
  primary: {variant: 'solid'},
  borderless: {variant: 'ghost'},
};

/**
 * `Button` on Radix `Button` at size 2. Disabled while the component's checks fail (`isValid`
 * false), as upstream disables it; the child is whatever the tree put there.
 */
export function ButtonView({
  variant = 'default',
  disabled,
  accessibility,
  onClick,
  style,
  children,
}: {
  variant?: ButtonVariant;
  disabled?: boolean;
  accessibility?: ResolvedAccessibility;
  onClick?: () => void;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const radix = VARIANTS[variant];
  return (
    <Button
      size="2"
      variant={radix.variant}
      color={radix.color}
      disabled={disabled}
      onClick={onClick}
      style={style}
      {...ariaProps(accessibility)}
    >
      {children}
    </Button>
  );
}

/**
 * Catalog entry: `action` arrives as a ready-to-call closure (the renderer routes event vs
 * function call); `child` is a component id the renderer builds; `accessibility` is resolved to
 * plain strings at runtime though its inferred type still shows the nested union.
 */
export const ButtonComponent = createComponentImplementation(ButtonApi, ({props, buildChild}) => (
  <ButtonView
    variant={props.variant}
    disabled={props.isValid === false}
    accessibility={props.accessibility as ResolvedAccessibility | undefined}
    onClick={props.action}
    style={weightStyle(props.weight)}
  >
    {props.child ? buildChild(props.child) : null}
  </ButtonView>
));
