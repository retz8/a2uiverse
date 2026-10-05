import {useId, type CSSProperties} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {TextArea, TextField} from '@radix-ui/themes';
import {Field} from '../shared/field.js';
import {weightStyle} from '../shared/layout.js';
import {TEXT_FIELD_VARIANTS, TextFieldApi} from './text-field.schema.js';

export type TextFieldVariant = (typeof TEXT_FIELD_VARIANTS)[number];

const INPUT_TYPES: Record<Exclude<TextFieldVariant, 'longText'>, 'text' | 'number'> = {
  shortText: 'text',
  number: 'number',
};

/**
 * `TextField` on Radix `TextField` — or Radix `TextArea` for `longText` — under the shared
 * field shape, with no `obscured` variant: the shell catalog carries no credential input. Edits write back through `onChange` (the binder's two-way setter); a failing
 * check turns the control red and shows its first error. `validationRegexp` is carried by the
 * schema and, as in upstream's implementation, not evaluated here: checks are the mechanism.
 */
export function TextFieldView({
  label,
  value,
  variant = 'shortText',
  errors,
  onChange,
  style,
}: {
  label?: string;
  value?: string;
  variant?: TextFieldVariant;
  errors?: string[];
  onChange?: (value: string) => void;
  style?: CSSProperties;
}) {
  const id = useId();
  const invalid = (errors?.length ?? 0) > 0;
  return (
    <Field id={id} label={label} errors={errors} style={style}>
      {variant === 'longText' ? (
        <TextArea
          id={id}
          size="2"
          color={invalid ? 'red' : undefined}
          value={value ?? ''}
          onChange={e => onChange?.(e.target.value)}
        />
      ) : (
        <TextField.Root
          id={id}
          size="2"
          type={INPUT_TYPES[variant]}
          color={invalid ? 'red' : undefined}
          value={value ?? ''}
          onChange={e => onChange?.(e.target.value)}
        />
      )}
    </Field>
  );
}

/** Catalog entry: `label` and `value` arrive resolved; `setValue` is the binder's two-way write to the bound path. */
export const TextFieldComponent = createComponentImplementation(TextFieldApi, ({props}) => (
  <TextFieldView
    label={props.label}
    value={props.value}
    variant={props.variant}
    errors={props.validationErrors}
    onChange={props.setValue}
    style={weightStyle(props.weight)}
  />
));
