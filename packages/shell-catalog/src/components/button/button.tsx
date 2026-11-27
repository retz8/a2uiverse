import type {CSSProperties, ReactNode} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {ButtonApi} from '@a2ui/web_core/v0_9';
import {Button} from '@radix-ui/themes';
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
 * false), as upstream disables it; the child is whatever the tree put there. It keeps its label's
 * width: a `Column` stretches its children across by default, and a button is not stretched
 * (task-11.8 decision 19); `weight` still grows it along a `Row`. `accessibilityRef` marks the
 * element that carries the component's `accessibility`.
 */
export function ButtonView({
  variant = 'default',
  disabled,
  accessibilityRef,
  onClick,
  style,
  children,
}: {
  variant?: ButtonVariant;
  disabled?: boolean;
  accessibilityRef?: (element: Element | null) => void;
  onClick?: () => void;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const radix = VARIANTS[variant];
  return (
    <Button
      ref={accessibilityRef}
      size="2"
      variant={radix.variant}
      color={radix.color}
      disabled={disabled}
      onClick={onClick}
      style={{width: 'fit-content', maxWidth: '100%', ...style}}
    >
      {children}
    </Button>
  );
}

/**
 * Catalog entry: `action` arrives as a ready-to-call closure (the renderer routes event vs
 * function call); `child` is a component id the renderer builds. The renderer puts
 * `accessibility`'s label and description on the element `accessibilityRef` marks, here the
 * button itself, and leaves the element hosting the component unlabelled (task-21.4 decision 2).
 */
export const ButtonComponent = createComponentImplementation(
  ButtonApi,
  ({props, buildChild, accessibilityRef}) => (
    <ButtonView
      variant={props.variant}
      disabled={props.isValid === false}
      accessibilityRef={accessibilityRef}
      onClick={props.action}
      style={weightStyle(props.weight)}
    >
      {props.child ? buildChild(props.child) : null}
    </ButtonView>
  ),
);
