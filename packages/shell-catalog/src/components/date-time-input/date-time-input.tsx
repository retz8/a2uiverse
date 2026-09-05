import {useId, type CSSProperties} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {DateTimeInputApi} from '@a2ui/web_core/v0_9';
import {TextField} from '@radix-ui/themes';
import {Field} from '../shared/field.js';
import {weightStyle} from '../shared/layout.js';

type InputType = 'date' | 'time' | 'datetime-local';

/** The ISO 8601 value cut to what the native input of that type accepts, as upstream normalizes it. */
export function normalizeDateTimeValue(value: string | undefined, type: InputType): string {
  if (!value) return '';
  const hasT = value.includes('T');
  const [first, second] = value.split('T');
  const datePart = (hasT ? first : value).substring(0, 10);
  const timePart = (hasT ? (second ?? '') : value).substring(0, 5);
  switch (type) {
    case 'date':
      return datePart;
    case 'time':
      return timePart;
    case 'datetime-local':
      return `${datePart}T${timePart}`;
  }
}

/**
 * `DateTimeInput` has no Radix Themes counterpart (decision 2): the native date, time or
 * date-time input, rendered through Radix `TextField` so it shares the fields' look, under the
 * shared field shape. With neither date nor time enabled there is nothing to render, as upstream
 * renders nothing.
 */
export function DateTimeInputView({
  label,
  value,
  enableDate = false,
  enableTime = false,
  min,
  max,
  errors,
  onChange,
  style,
}: {
  label?: string;
  value?: string;
  enableDate?: boolean;
  enableTime?: boolean;
  min?: string;
  max?: string;
  errors?: string[];
  onChange?: (value: string) => void;
  style?: CSSProperties;
}) {
  const id = useId();
  if (!enableDate && !enableTime) return null;
  const type: InputType =
    enableDate && enableTime ? 'datetime-local' : enableDate ? 'date' : 'time';
  const invalid = (errors?.length ?? 0) > 0;
  return (
    <Field id={id} label={label} errors={errors} style={style}>
      <TextField.Root
        id={id}
        size="2"
        type={type}
        color={invalid ? 'red' : undefined}
        value={normalizeDateTimeValue(value, type)}
        min={min}
        max={max}
        onChange={e => onChange?.(e.target.value)}
      />
    </Field>
  );
}

/**
 * Catalog entry: `value` and `label` arrive resolved; `min`/`max` are strings once resolved (a
 * bound one is dead upstream — `_dev/a2ui-findings.md` §6 — and is passed through as it comes).
 */
export const DateTimeInputComponent = createComponentImplementation(DateTimeInputApi, ({props}) => (
  <DateTimeInputView
    label={props.label}
    value={props.value}
    enableDate={props.enableDate}
    enableTime={props.enableTime}
    min={typeof props.min === 'string' ? props.min : undefined}
    max={typeof props.max === 'string' ? props.max : undefined}
    errors={props.validationErrors}
    onChange={props.setValue}
    style={weightStyle(props.weight)}
  />
));
