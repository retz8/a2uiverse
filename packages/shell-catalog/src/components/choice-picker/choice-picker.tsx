import {useState, type CSSProperties} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {ChoicePickerApi} from '@a2ui/web_core/v0_9';
import {MagnifyingGlassIcon} from '@radix-ui/react-icons';
import {
  Button,
  CheckboxGroup,
  Flex,
  RadioGroup,
  SegmentedControl,
  Text,
  TextField,
} from '@radix-ui/themes';
import {weightStyle} from '../shared/layout.js';

export type ChoicePickerVariant = 'multipleSelection' | 'mutuallyExclusive';
export type ChoicePickerDisplayStyle = 'checkbox' | 'chips';

export interface ChoiceOption {
  label: string;
  value: string;
}

/**
 * `ChoicePicker` on the Radix control its two axes name: one-of × checkbox is `RadioGroup`,
 * many-of × checkbox is `CheckboxGroup`, one-of × chips is `SegmentedControl`, and many-of ×
 * chips — which Radix has no group for — is a wrapped run of toggle `Button`s. The selection is
 * always the schema's string list, written back whole. `filterable` puts a Radix `TextField`
 * above the options; the filter is local state, as upstream keeps it.
 */
export function ChoicePickerView({
  label,
  variant = 'mutuallyExclusive',
  displayStyle = 'checkbox',
  filterable = false,
  options,
  value,
  errors,
  onChange,
  style,
}: {
  label?: string;
  variant?: ChoicePickerVariant;
  displayStyle?: ChoicePickerDisplayStyle;
  filterable?: boolean;
  options: ChoiceOption[];
  value?: string[];
  errors?: string[];
  onChange?: (value: string[]) => void;
  style?: CSSProperties;
}) {
  const [filter, setFilter] = useState('');
  const selected = Array.isArray(value) ? value : [];
  const exclusive = variant === 'mutuallyExclusive';
  const shown = options.filter(
    option =>
      !filterable || filter === '' || option.label.toLowerCase().includes(filter.toLowerCase()),
  );
  const error = errors?.[0];

  const toggle = (option: string) =>
    onChange?.(
      selected.includes(option) ? selected.filter(v => v !== option) : [...selected, option],
    );

  let control;
  if (displayStyle === 'chips') {
    control = exclusive ? (
      <SegmentedControl.Root
        size="1"
        value={selected[0] ?? ''}
        onValueChange={next => onChange?.([next])}
        style={{width: 'fit-content', maxWidth: '100%'}}
      >
        {shown.map(option => (
          <SegmentedControl.Item key={option.value} value={option.value}>
            {option.label}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl.Root>
    ) : (
      <Flex gap="1" wrap="wrap">
        {shown.map(option => {
          const on = selected.includes(option.value);
          return (
            <Button
              key={option.value}
              size="1"
              radius="full"
              variant={on ? 'solid' : 'soft'}
              color={on ? undefined : 'gray'}
              aria-pressed={on}
              onClick={() => toggle(option.value)}
            >
              {option.label}
            </Button>
          );
        })}
      </Flex>
    );
  } else {
    control = exclusive ? (
      <RadioGroup.Root
        size="2"
        value={selected[0] ?? ''}
        onValueChange={next => onChange?.([next])}
        aria-label={label}
      >
        {shown.map(option => (
          <RadioGroup.Item key={option.value} value={option.value}>
            {option.label}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    ) : (
      <CheckboxGroup.Root
        size="2"
        value={selected}
        onValueChange={next => onChange?.(next)}
        aria-label={label}
      >
        {shown.map(option => (
          <CheckboxGroup.Item key={option.value} value={option.value}>
            {option.label}
          </CheckboxGroup.Item>
        ))}
      </CheckboxGroup.Root>
    );
  }

  return (
    <Flex direction="column" gap="2" style={style}>
      {label && (
        <Text as="span" size="2" weight="medium">
          {label}
        </Text>
      )}
      {filterable && (
        <TextField.Root
          size="1"
          placeholder="Filter options…"
          aria-label="Filter options"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon />
          </TextField.Slot>
        </TextField.Root>
      )}
      {control}
      {error && (
        <Text as="span" size="1" color="red" data-field-error="">
          {error}
        </Text>
      )}
    </Flex>
  );
}

/** Catalog entry: option labels and the selection arrive resolved; `setValue` is the binder's two-way write of the whole list. */
export const ChoicePickerComponent = createComponentImplementation(ChoicePickerApi, ({props}) => (
  <ChoicePickerView
    label={props.label}
    variant={props.variant}
    displayStyle={props.displayStyle}
    filterable={props.filterable}
    options={(props.options ?? []).map(option => ({
      label: typeof option.label === 'string' ? option.label : String(option.label ?? ''),
      value: option.value,
    }))}
    value={props.value}
    errors={props.validationErrors}
    onChange={props.setValue}
    style={weightStyle(props.weight)}
  />
));
