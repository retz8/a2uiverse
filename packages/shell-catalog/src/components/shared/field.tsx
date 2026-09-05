import type {CSSProperties, ReactNode} from 'react';
import {Flex, Text} from '@radix-ui/themes';

/**
 * The shape every labelled input shares: a Radix `Text` label above the control, the first
 * validation error below it in red — the binder's `validationErrors` for the component's
 * `checks`. A `label` is only rendered when there is text for it.
 */
export function Field({
  id,
  label,
  errors,
  style,
  children,
}: {
  id?: string;
  label?: string;
  errors?: string[];
  style?: CSSProperties;
  children: ReactNode;
}) {
  const error = errors?.[0];
  return (
    <Flex direction="column" gap="1" style={style}>
      {label && (
        <Text as="label" htmlFor={id} size="2" weight="medium">
          {label}
        </Text>
      )}
      {children}
      {error && (
        <Text as="span" size="1" color="red" data-field-error="">
          {error}
        </Text>
      )}
    </Flex>
  );
}
