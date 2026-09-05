import type {CSSProperties} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {CheckBoxApi} from '@a2ui/web_core/v0_9';
import {Checkbox, Flex, Text} from '@radix-ui/themes';
import {weightStyle} from '../shared/layout.js';

/**
 * `CheckBox` on Radix `Checkbox`, the label wrapping the control the way Radix's own examples
 * do, so the label is the control's accessible name and a click on either toggles it. A failing
 * check colours the label and shows its first error.
 */
export function CheckBoxView({
  label,
  value,
  errors,
  onChange,
  style,
}: {
  label?: string;
  value?: boolean;
  errors?: string[];
  onChange?: (value: boolean) => void;
  style?: CSSProperties;
}) {
  const error = errors?.[0];
  return (
    <Flex direction="column" gap="1" style={style}>
      <Text as="label" size="2" color={error ? 'red' : undefined}>
        <Flex gap="2" align="center">
          <Checkbox
            size="2"
            checked={Boolean(value)}
            color={error ? 'red' : undefined}
            onCheckedChange={checked => onChange?.(checked === true)}
          />
          {label}
        </Flex>
      </Text>
      {error && (
        <Text as="span" size="1" color="red" data-field-error="">
          {error}
        </Text>
      )}
    </Flex>
  );
}

/** Catalog entry: `label` and `value` arrive resolved; `setValue` is the binder's two-way write. */
export const CheckBoxComponent = createComponentImplementation(CheckBoxApi, ({props}) => (
  <CheckBoxView
    label={props.label}
    value={props.value}
    errors={props.validationErrors}
    onChange={props.setValue}
    style={weightStyle(props.weight)}
  />
));
